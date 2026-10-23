<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['item_date', 'name', 'qty', 'price', 'supplier_id', 'supplier_name', 'cost_price'])]
class InvoiceItem extends Model
{
    protected function casts(): array
    {
        return [
            'item_date' => 'date:Y-m-d',
            'qty' => 'float',
            'price' => 'integer',
            'cost_price' => 'integer',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function lineTotal(): int
    {
        return (int) round($this->qty * $this->price);
    }

    /** Total modal baris ini; null bila harga beli belum diisi. */
    public function lineCost(): ?int
    {
        return $this->cost_price === null ? null : (int) round($this->qty * $this->cost_price);
    }
}
