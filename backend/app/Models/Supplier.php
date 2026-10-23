<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name'])]
class Supplier extends Model
{
    public function prices(): HasMany
    {
        return $this->hasMany(SupplierPrice::class)->orderBy('product_name');
    }

    /** Cari toko menurut nama tanpa membedakan huruf besar/kecil, atau buat baru. */
    public static function findOrCreateByName(string $name): self
    {
        $name = trim(preg_replace('/\s+/', ' ', $name));

        return static::whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->first()
            ?? static::create(['name' => $name]);
    }
}
