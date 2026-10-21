<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Profil toko: hanya satu baris. Dipakai di header nota cetak dan halaman verifikasi.
        Schema::create('stores', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('address')->nullable();
            $table->string('phone', 30)->nullable();
            $table->timestamps();
        });

        DB::table('stores')->insert(['name' => 'Toko Saya', 'created_at' => now(), 'updated_at' => now()]);
    }

    public function down(): void
    {
        Schema::dropIfExists('stores');
    }
};
