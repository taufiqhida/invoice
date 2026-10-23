<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierPrice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Daftar toko tempat membeli barang beserta harga belinya per barang (modal). */
class SupplierController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Supplier::with('prices')->orderBy('name')->get()->map(fn (Supplier $s) => $this->format($s))
        );
    }

    /**
     * Simpan harga beli satu barang di satu toko. Toko dibuat otomatis bila namanya belum ada,
     * dan harga lama untuk barang yang sama di toko itu diganti.
     */
    public function savePrice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'supplier_name' => ['required', 'string', 'max:120'],
            'product' => ['required', 'string', 'max:255'],
            'price' => ['required', 'integer', 'min:0', 'max:9999999999'],
        ]);

        $supplier = DB::transaction(function () use ($data) {
            $supplier = Supplier::findOrCreateByName($data['supplier_name']);
            $product = trim(preg_replace('/\s+/', ' ', $data['product']));

            SupplierPrice::updateOrCreate(
                ['supplier_id' => $supplier->id, 'product_key' => SupplierPrice::keyFor($product)],
                ['product_name' => $product, 'price' => $data['price']],
            );

            return $supplier;
        });

        return response()->json($this->format($supplier->load('prices')));
    }

    public function destroyPrice(SupplierPrice $price): JsonResponse
    {
        $supplier = $price->supplier;
        $price->delete();

        return response()->json($this->format($supplier->load('prices')));
    }

    /** Hapus toko beserta daftar harganya. Nota lama tetap menyimpan nama toko dan harga belinya. */
    public function destroy(Supplier $supplier): JsonResponse
    {
        $supplier->delete();

        return response()->json(['ok' => true]);
    }

    private function format(Supplier $s): array
    {
        return [
            'id' => $s->id,
            'name' => $s->name,
            'prices' => $s->prices->map(fn (SupplierPrice $p) => [
                'id' => $p->id,
                'product' => $p->product_name,
                'productKey' => $p->product_key,
                'price' => $p->price,
            ])->all(),
        ];
    }
}
