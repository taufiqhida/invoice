<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 30)->unique();
            $table->date('date');
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            // draft = nota berjalan (boleh ditambah barang), terkirim / lunas = tertutup.
            $table->string('status', 20)->default('draft');
            $table->unsignedBigInteger('discount')->default(0);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'status']);
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->date('item_date');
            $table->string('name');
            $table->decimal('qty', 12, 3);
            $table->unsignedBigInteger('price');
            $table->timestamps();

            $table->index(['invoice_id', 'item_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
    }
};
