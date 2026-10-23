<?php

namespace App\Http\Resources;

use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Invoice */
class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoiceNumber' => $this->invoice_number,
            'verifyToken' => $this->verify_token,
            'date' => $this->date->toDateString(),
            'customerId' => $this->customer_id,
            'customerName' => $this->customer->name,
            'customerPhone' => $this->customer->phone ?? '',
            'items' => $this->items->map(fn ($i) => [
                'id' => $i->id,
                'date' => $i->item_date->toDateString(),
                'name' => $i->name,
                'qty' => $i->qty,
                'price' => $i->price,
                // Modal: hanya untuk pemilik (endpoint ini butuh login). Tidak dipakai nota cetak maupun halaman verifikasi.
                'supplierId' => $i->supplier_id,
                'supplierName' => $i->supplier_name,
                'costPrice' => $i->cost_price,
            ])->all(),
            'subtotal' => $this->subtotal,
            'discount' => $this->discount,
            'total' => $this->total,
            'note' => $this->note ?? '',
            'status' => $this->status,
        ];
    }
}
