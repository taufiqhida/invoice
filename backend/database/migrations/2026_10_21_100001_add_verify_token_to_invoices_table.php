<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // Kode acak untuk QR verifikasi di nota cetak (tidak bisa ditebak, beda dari nomor nota).
            $table->string('verify_token', 40)->nullable()->unique()->after('invoice_number');
        });

        // Nota yang sudah ada sebelum kolom ini dibuat ikut diberi kode.
        DB::table('invoices')->whereNull('verify_token')->orderBy('id')->each(
            fn ($row) => DB::table('invoices')->where('id', $row->id)->update(['verify_token' => Str::random(32)])
        );
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique(['verify_token']);
            $table->dropColumn('verify_token');
        });
    }
};
