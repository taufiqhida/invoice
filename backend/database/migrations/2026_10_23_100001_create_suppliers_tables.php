<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Toko tempat barang dibeli (supplier / modal).
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->timestamps();
        });

        // Daftar harga beli tersimpan: satu barang bisa punya harga berbeda di tiap toko.
        // product_key = nama barang yang dinormalkan (huruf kecil, spasi dirapikan) supaya "Gula" dan "gula " dianggap sama.
        Schema::create('supplier_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->string('product_key');
            $table->string('product_name');
            $table->unsignedBigInteger('price');
            $table->timestamps();

            $table->unique(['supplier_id', 'product_key']);
            $table->index('product_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_prices');
        Schema::dropIfExists('suppliers');
    }
};
