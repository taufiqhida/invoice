<?php

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
