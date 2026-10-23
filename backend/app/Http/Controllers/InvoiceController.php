<?php

namespace App\Http\Controllers;

use App\Http\Resources\InvoiceResource;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Supplier;
use App\Models\SupplierPrice;
use Carbon\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InvoiceController extends Controller
{
    public function index(): JsonResponse
    {
        $invoices = Invoice::with(['customer', 'items'])->latest('id')->limit(1000)->get();

        return response()->json(InvoiceResource::collection($invoices)->resolve());
    }

    public function show(Invoice $invoice): JsonResponse
    {
        return response()->json((new InvoiceResource($invoice->load(['customer', 'items'])))->resolve());
    }

    /**
     * Satu pelanggan = satu nota berjalan. Bila pelanggan sudah punya nota berjalan,
     * barang ditambahkan ke nota itu; kalau tidak (atau "separate" = true), dibuat nota baru.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'date' => ['required', 'date_format:Y-m-d'],
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.date' => ['required', 'date_format:Y-m-d'],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.qty' => ['required', 'numeric', 'gt:0', 'max:999999'],
            'items.*.price' => ['required', 'integer', 'gt:0', 'max:9999999999'],
            'items.*.supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'items.*.cost_price' => ['nullable', 'integer', 'min:0', 'max:9999999999'],
            'discount' => ['nullable', 'integer', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
            'separate' => ['sometimes', 'boolean'],
        ]);

        // Nomor nota dibuat dari nomor terakhir bulan itu; bila bentrok (nota pelanggan lain
        // tersimpan bersamaan) coba lagi dengan nomor berikutnya.
        [$invoice, $appended] = retry(
            3,
            fn () => DB::transaction(fn () => $this->saveItems($data)),
            50,
            fn ($e) => $e instanceof UniqueConstraintViolationException,
        );

        return response()->json(
            ['invoice' => (new InvoiceResource($invoice))->resolve(), 'appended' => $appended],
            $appended ? 200 : 201,
        );
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(Invoice::STATUSES)]]);

        DB::transaction(function () use ($invoice, $data) {
            // Kunci pelanggan supaya dua perubahan bersamaan tidak membuat dua nota berjalan.
            Customer::whereKey($invoice->customer_id)->lockForUpdate()->first();

            if ($data['status'] === Invoice::DRAFT && ! $invoice->isOpen()) {
                $other = Invoice::where('customer_id', $invoice->customer_id)
                    ->where('status', Invoice::DRAFT)->where('id', '!=', $invoice->id)->exists();
                if ($other) {
                    throw ValidationException::withMessages([
                        'status' => 'Pelanggan ini sudah punya nota berjalan lain, jadi nota ini tidak bisa dibuka lagi.',
                    ]);
                }
            }

            $invoice->update(['status' => $data['status']]);
        });

        return response()->json((new InvoiceResource($invoice->load(['customer', 'items'])))->resolve());
    }

    /**
     * Ubah isi nota sekaligus: edit, tambah, dan hapus barang, diskon, catatan, tanggal nota.
     * Daftar barang yang dikirim menjadi isi nota yang baru: barang ber-"id" diperbarui,
     * tanpa "id" ditambahkan, dan barang lama yang tidak ada di daftar dihapus.
     * Berlaku untuk semua status, supaya salah ketik di nota yang sudah ditutup tetap bisa dibetulkan.
     */
    public function replace(Request $request, Invoice $invoice): JsonResponse
    {
        $data = $request->validate([
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.id' => ['nullable', 'integer'],
            'items.*.date' => ['required', 'date_format:Y-m-d'],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.qty' => ['required', 'numeric', 'gt:0', 'max:999999'],
            'items.*.price' => ['required', 'integer', 'gt:0', 'max:9999999999'],
            'items.*.supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'items.*.cost_price' => ['nullable', 'integer', 'min:0', 'max:9999999999'],
            'discount' => ['nullable', 'integer', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $ids = array_filter(array_column($data['items'], 'id'));
        if (count($ids) !== count(array_unique($ids))) {
            throw ValidationException::withMessages(['items' => 'Ada barang yang terkirim dua kali.']);
        }

        DB::transaction(function () use ($invoice, $data, $ids) {
            $invoice = Invoice::whereKey($invoice->id)->lockForUpdate()->firstOrFail();

            $ownIds = $invoice->items()->pluck('id')->all();
            if (array_diff($ids, $ownIds)) {
                throw ValidationException::withMessages(['items' => 'Ada barang yang bukan bagian dari nota ini.']);
            }

            $keep = [];
            foreach ($data['items'] as $row) {
                $attrs = $this->itemAttributes($row);
                if (! empty($row['id'])) {
                    $invoice->items()->whereKey($row['id'])->first()->update($attrs);
                    $keep[] = (int) $row['id'];
                } else {
                    $keep[] = $invoice->items()->create($attrs)->id;
                }
            }
            $invoice->items()->whereNotIn('id', $keep)->delete();
            $invoice->unsetRelation('items')->load('items');

            // Diskon tidak boleh melebihi subtotal (mis. setelah barang dihapus).
            $fields = ['discount' => min((int) (array_key_exists('discount', $data) ? $data['discount'] : $invoice->discount), $invoice->subtotal)];
            if (array_key_exists('note', $data)) {
                $fields['note'] = trim((string) $data['note']) ?: null;
            }
            if (isset($data['date'])) {
                $fields['date'] = $data['date'];
            }
            $invoice->update($fields);
            $invoice->touch(); // penanda "diperbarui" di halaman verifikasi
        });

        return response()->json((new InvoiceResource($invoice->refresh()->load(['customer', 'items'])))->resolve());
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        $invoice->delete(); // barang ikut terhapus (cascade)

        return response()->json(['ok' => true]);
    }

    /** @return array{0: Invoice, 1: int} nota dan jumlah barang yang ditambahkan ke nota lama (0 = nota baru) */
    private function saveItems(array $data): array
    {
        // Kunci baris pelanggan: permintaan bersamaan untuk pelanggan yang sama dijalankan bergantian.
        Customer::whereKey($data['customer_id'])->lockForUpdate()->first();

        $invoice = empty($data['separate'])
            ? Invoice::where('customer_id', $data['customer_id'])->where('status', Invoice::DRAFT)->latest('id')->first()
            : null;
        $appended = $invoice ? count($data['items']) : 0;

        $invoice ??= Invoice::create([
            'invoice_number' => $this->nextNumber($data['date']),
            'date' => $data['date'],
            'customer_id' => $data['customer_id'],
            'status' => Invoice::DRAFT,
        ]);

        $invoice->items()->createMany(array_map(fn ($i) => $this->itemAttributes($i), $data['items']));
        $invoice->unsetRelation('items')->load('items');

        $fields = [];
        // Diskon dikirim sebagai nilai akhir untuk nota ini; tidak dikirim = pertahankan. Maksimal sebesar subtotal.
        if (array_key_exists('discount', $data) && $data['discount'] !== null) {
            $fields['discount'] = min((int) $data['discount'], $invoice->subtotal);
        }
        $note = trim((string) ($data['note'] ?? ''));
        if ($note !== '') {
            $fields['note'] = $invoice->note ? $invoice->note."\n".$note : $note;
        }
        if ($fields) {
            $invoice->update($fields);
        }
        $invoice->touch(); // penanda "diperbarui" di halaman verifikasi

        return [$invoice->load('customer'), $appended];
    }

    /**
     * Kolom barang dari data yang dikirim. Toko dan harga beli disalin ke barang (bukan hanya direferensikan),
     * supaya rekap lama tidak berubah bila daftar harga atau tokonya diubah kemudian.
     * Bila toko dipilih tapi harga beli tidak dikirim, dipakai harga tersimpan toko itu untuk barang ini.
     */
    private function itemAttributes(array $row): array
    {
        $name = trim($row['name']);
        $supplier = empty($row['supplier_id']) ? null : Supplier::find($row['supplier_id']);
        $cost = $row['cost_price'] ?? null;

        if ($supplier && $cost === null) {
            $cost = SupplierPrice::where('supplier_id', $supplier->id)
                ->where('product_key', SupplierPrice::keyFor($name))
                ->value('price');
        }

        return [
            'item_date' => $row['date'],
            'name' => $name,
            'qty' => $row['qty'],
            'price' => $row['price'],
            'supplier_id' => $supplier?->id,
            'supplier_name' => $supplier?->name,
            'cost_price' => $cost,
        ];
    }

    private function nextNumber(string $date): string
    {
        $prefix = 'NOTA-'.Carbon::parse($date)->format('Ym').'-';
        $last = Invoice::where('invoice_number', 'like', $prefix.'%')->orderByDesc('invoice_number')->value('invoice_number');
        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }
}
