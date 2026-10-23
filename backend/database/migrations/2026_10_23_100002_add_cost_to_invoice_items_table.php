<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            // Salinan saat barang dijual: nama toko dan harga beli satuan tetap utuh
            // walau daftar harga atau tokonya diubah / dihapus kemudian. null = modal belum diisi.
            $table->foreignId('supplier_id')->nullable()->after('price')->constrained()->nullOnDelete();
            $table->string('supplier_name', 120)->nullable()->after('supplier_id');
            $table->unsignedBigInteger('cost_price')->nullable()->after('supplier_name');
        });
    }

    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('supplier_id');
            $table->dropColumn(['supplier_name', 'cost_price']);
        });
    }
};
