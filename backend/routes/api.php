<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\VerifyController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Cek kesehatan: Nginx -> PHP-FPM -> Laravel -> MySQL. Dipakai untuk memastikan deployment tersambung.
Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
        $db = 'ok';
    } catch (Throwable $e) {
        $db = 'error';
    }

    return response()->json([
        'app' => config('app.name'),
        'status' => $db === 'ok' ? 'ok' : 'degraded',
        'database' => $db,
        'time' => now()->toIso8601String(),
    ], $db === 'ok' ? 200 : 503);
});

// Tidak ada pendaftaran publik: akun pemilik dibuat dari OWNER_EMAIL / OWNER_PASSWORD di .env.
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// Verifikasi nota dari QR di nota cetak: publik (tanpa login), dibatasi lajunya agar kode tidak bisa ditebak-tebak.
Route::get('/verify/{token}', [VerifyController::class, 'show'])->middleware('throttle:60,1');

// Profil toko dibaca publik (tampil di halaman login dan verifikasi); mengubahnya perlu login.
Route::get('/store', [StoreController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::put('/store', [StoreController::class, 'update']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::patch('/customers/{customer}', [CustomerController::class, 'update']);

    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::post('/invoices', [InvoiceController::class, 'store']);
    Route::get('/invoices/{invoice}', [InvoiceController::class, 'show']);
    Route::patch('/invoices/{invoice}', [InvoiceController::class, 'update']);
    Route::put('/invoices/{invoice}', [InvoiceController::class, 'replace']);
    Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy']);
});
