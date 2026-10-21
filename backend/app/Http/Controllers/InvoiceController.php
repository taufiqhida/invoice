<?php

namespace App\Http\Controllers;

use App\Http\Resources\InvoiceResource;
use App\Models\Customer;
use App\Models\Invoice;
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

        $invoice->items()->createMany(array_map(fn ($i) => [
            'item_date' => $i['date'],
            'name' => trim($i['name']),
            'qty' => $i['qty'],
            'price' => $i['price'],
        ], $data['items']));
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

        return [$invoice->load('customer'), $appended];
    }

    private function nextNumber(string $date): string
    {
        $prefix = 'NOTA-'.Carbon::parse($date)->format('Ym').'-';
        $last = Invoice::where('invoice_number', 'like', $prefix.'%')->orderByDesc('invoice_number')->value('invoice_number');
        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }
}
