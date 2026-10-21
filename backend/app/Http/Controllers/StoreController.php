<?php

namespace App\Http\Controllers;

use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoreController extends Controller
{
    /** Publik: nama, alamat, dan telepon toko memang tercetak di setiap nota. */
    public function show(): JsonResponse
    {
        return response()->json($this->format(Store::current()));
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'regex:/^[0-9+\-\s()]{6,30}$/'],
        ]);

        $store = Store::current();
        $store->update($data);

        return response()->json($this->format($store));
    }

    private function format(Store $s): array
    {
        return ['name' => $s->name, 'address' => $s->address ?? '', 'phone' => $s->phone ?? ''];
    }
}
