<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'address', 'phone'])]
class Store extends Model
{
    public const DEFAULT_NAME = 'Toko Saya';

    /** Profil toko (satu baris); dibuat bila belum ada. */
    public static function current(): self
    {
        return static::query()->orderBy('id')->first() ?? static::create(['name' => self::DEFAULT_NAME]);
    }
}
