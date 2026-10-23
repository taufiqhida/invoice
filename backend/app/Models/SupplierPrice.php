<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['supplier_id', 'product_key', 'product_name', 'price'])]
class SupplierPrice extends Model
{
    protected function casts(): array
    {
        return ['price' => 'integer'];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /** Nama barang dinormalkan agar "Gula" dan " gula " dianggap barang yang sama. */
    public static function keyFor(string $product): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/', ' ', $product)));
    }
}
