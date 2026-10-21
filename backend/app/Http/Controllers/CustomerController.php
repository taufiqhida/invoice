<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Customer::orderBy('name')->get()->map(fn (Customer $c) => $this->format($c))
        );
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json($this->format(Customer::create($this->validated($request))), 201);
    }

    /** Ubah nama / nomor pelanggan. Berlaku di semua nota pelanggan ini, termasuk yang lama. */
    public function update(Request $request, Customer $customer): JsonResponse
    {
        $customer->update($this->validated($request));

        return response()->json($this->format($customer));
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'regex:/^[0-9+\-\s]{6,20}$/'],
        ]);
        $data['name'] = trim($data['name']);

        return $data;
    }

    private function format(Customer $c): array
    {
        return ['id' => $c->id, 'name' => $c->name, 'phone' => $c->phone ?? ''];
    }
}
