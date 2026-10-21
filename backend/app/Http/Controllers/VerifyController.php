<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use Illuminate\Http\JsonResponse;

/**
 * Halaman verifikasi publik (tanpa login) yang dibuka dari QR di nota cetak.
 * Hanya menampilkan ringkasan; tidak ada daftar barang, nomor telepon, atau data pelanggan lain.
 */
class VerifyController extends Controller
{
    public function show(string $token): JsonResponse
    {
        $invoice = Invoice::with(['customer', 'items'])->where('verify_token', $token)->firstOrFail();

        return response()->json([
            'store' => config('app.name'),
            'invoiceNumber' => $invoice->invoice_number,
            'date' => $invoice->date->toDateString(),
            'customerName' => $invoice->customer->name,
            'itemCount' => $invoice->items->count(),
            'total' => $invoice->total,
            'status' => $invoice->status,
            // Waktu perubahan terakhir: bila setelah tanggal cetak, nota sudah diubah.
            'updatedAt' => $invoice->updated_at->toIso8601String(),
        ]);
    }
}
