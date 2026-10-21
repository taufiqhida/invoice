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
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'regex:/^[0-9+\-\s]{6,20}$/'],
        ]);

        return response()->json($this->format(Customer::create($data)), 201);
    }

    private function format(Customer $c): array
    {
        return ['id' => $c->id, 'name' => $c->name, 'phone' => $c->phone ?? ''];
    }
}
