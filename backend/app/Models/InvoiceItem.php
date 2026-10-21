<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['item_date', 'name', 'qty', 'price'])]
class InvoiceItem extends Model
{
    protected function casts(): array
    {
        return ['item_date' => 'date:Y-m-d', 'qty' => 'float', 'price' => 'integer'];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function lineTotal(): int
    {
        return (int) round($this->qty * $this->price);
    }
}
