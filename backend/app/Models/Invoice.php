<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable(['invoice_number', 'date', 'customer_id', 'status', 'discount', 'note'])]
class Invoice extends Model
{
    public const DRAFT = 'draft';
    public const PAID = 'lunas';
    public const STATUSES = ['draft', 'terkirim', 'lunas'];

    protected static function booted(): void
    {
        // Kode acak untuk QR verifikasi di nota cetak.
        static::creating(fn (Invoice $invoice) => $invoice->verify_token ??= Str::random(32));
    }

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d', 'discount' => 'integer'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('item_date')->orderBy('id');
    }

    public function isOpen(): bool
    {
        return $this->status === self::DRAFT;
    }

    /** Jumlah semua barang (dibulatkan per baris), dihitung dari item agar tidak bisa selisih. */
    protected function subtotal(): Attribute
    {
        return Attribute::get(fn () => (int) $this->items->sum(fn (InvoiceItem $i) => $i->lineTotal()));
    }

    protected function total(): Attribute
    {
        return Attribute::get(fn () => max(0, $this->subtotal - $this->discount));
    }
}
