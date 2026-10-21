<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InvoiceApiTest extends TestCase
{
    use RefreshDatabase;

    private function login(): void
    {
        Sanctum::actingAs(User::factory()->create());
    }

    private function payload(Customer $c, array $items, array $extra = []): array
    {
        return ['customer_id' => $c->id, 'date' => '2026-10-19', 'items' => $items] + $extra;
    }

    private function item(string $date, string $name = 'Gula', $qty = 1, int $price = 15000): array
    {
        return ['date' => $date, 'name' => $name, 'qty' => $qty, 'price' => $price];
    }

    public function test_api_requires_login(): void
    {
        $this->getJson('/api/invoices')->assertUnauthorized();
        $this->getJson('/api/customers')->assertUnauthorized();
        $this->postJson('/api/invoices', [])->assertUnauthorized();
    }

    public function test_unauthenticated_request_without_accept_header_still_gets_json_401(): void
    {
        $this->get('/api/invoices')->assertUnauthorized()->assertHeader('Content-Type', 'application/json');
    }

    public function test_login_returns_token_and_rejects_wrong_password(): void
    {
        $user = User::factory()->create(['password' => 'rahasia-123']);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'salah'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');

        $token = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'rahasia-123'])
            ->assertOk()->json('token');

        $this->withToken($token)->getJson('/api/me')->assertOk()->assertJsonPath('email', $user->email);
    }

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create(['password' => 'rahasia-123']);
        $token = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'rahasia-123'])->json('token');

        $this->withToken($token)->postJson('/api/logout')->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_customer_can_be_created_and_listed(): void
    {
        $this->login();

        $this->postJson('/api/customers', ['name' => 'Budi', 'phone' => '081234567890'])->assertCreated();
        $this->postJson('/api/customers', ['name' => ''])->assertUnprocessable();
        $this->postJson('/api/customers', ['name' => 'X', 'phone' => 'abc'])->assertUnprocessable();

        $this->getJson('/api/customers')->assertOk()->assertJsonCount(1)->assertJsonPath('0.name', 'Budi');
    }

    public function test_first_save_creates_open_invoice_with_totals(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);

        $res = $this->postJson('/api/invoices', $this->payload($budi, [
            $this->item('2026-10-19', 'Gula', 2, 15000),
            $this->item('2026-10-20', 'Garam', 3, 5000),
        ]))->assertCreated();

        $res->assertJsonPath('appended', 0)
            ->assertJsonPath('invoice.invoiceNumber', 'NOTA-202610-0001')
            ->assertJsonPath('invoice.status', 'draft')
            ->assertJsonPath('invoice.subtotal', 45000)
            ->assertJsonPath('invoice.total', 45000)
            ->assertJsonCount(2, 'invoice.items');
    }

    public function test_next_purchase_of_same_customer_is_appended_to_open_invoice(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);

        $first = $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-19', 'Gula', 2)]))->json('invoice');
        $second = $this->postJson('/api/invoices', $this->payload($budi, [
            $this->item('2026-10-20', 'Gula', 4),
            $this->item('2026-10-20', 'Garam', 1, 5000),
        ]));

        $second->assertOk()
            ->assertJsonPath('appended', 2)
            ->assertJsonPath('invoice.id', $first['id'])
            ->assertJsonPath('invoice.invoiceNumber', $first['invoiceNumber'])
            ->assertJsonPath('invoice.subtotal', 30000 + 60000 + 5000)
            ->assertJsonCount(3, 'invoice.items');

        $this->assertDatabaseCount('invoices', 1);
        // Barang diurutkan per tanggal barang.
        $this->assertSame(['2026-10-19', '2026-10-20', '2026-10-20'], array_column($second->json('invoice.items'), 'date'));
    }

    public function test_separate_flag_creates_a_new_invoice_even_when_one_is_open(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);

        $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-19')]));
        $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-20')], ['separate' => true]))
            ->assertCreated()->assertJsonPath('invoice.invoiceNumber', 'NOTA-202610-0002');

        $this->assertDatabaseCount('invoices', 2);
    }

    public function test_closed_invoice_is_not_appended_and_a_new_one_is_created(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);

        $id = $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-19')]))->json('invoice.id');
        $this->patchJson("/api/invoices/$id", ['status' => 'lunas'])->assertOk()->assertJsonPath('status', 'lunas');

        $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-22')]))
            ->assertCreated()->assertJsonPath('appended', 0);

        $this->assertSame(1, Invoice::where('id', $id)->count());
        $this->assertSame(1, Invoice::where('id', $id)->first()->items()->count());
        $this->assertDatabaseCount('invoices', 2);
    }

    public function test_each_customer_has_own_open_invoice(): void
    {
        $this->login();
        $a = Customer::create(['name' => 'A']);
        $b = Customer::create(['name' => 'B']);

        $ia = $this->postJson('/api/invoices', $this->payload($a, [$this->item('2026-10-19')]))->json('invoice.id');
        $ib = $this->postJson('/api/invoices', $this->payload($b, [$this->item('2026-10-19')]))->json('invoice.id');

        $this->assertNotSame($ia, $ib);
        $this->assertSame(['NOTA-202610-0001', 'NOTA-202610-0002'], Invoice::orderBy('id')->pluck('invoice_number')->all());
    }

    public function test_invoice_number_restarts_each_month(): void
    {
        $this->login();
        $a = Customer::create(['name' => 'A']);
        $b = Customer::create(['name' => 'B']);

        $this->postJson('/api/invoices', $this->payload($a, [$this->item('2026-10-19')]));
        $this->postJson('/api/invoices', ['date' => '2026-11-02'] + $this->payload($b, [$this->item('2026-11-02')]))
            ->assertJsonPath('invoice.invoiceNumber', 'NOTA-202611-0001');
    }

    public function test_discount_is_capped_at_subtotal_and_kept_when_not_sent(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);

        $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-19', 'Gula', 1, 10000)], ['discount' => 99999]))
            ->assertJsonPath('invoice.discount', 10000)->assertJsonPath('invoice.total', 0);

        // Tidak mengirim diskon saat menambah barang: diskon lama dipertahankan.
        $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-20', 'Gula', 1, 10000)]))
            ->assertJsonPath('invoice.discount', 10000)->assertJsonPath('invoice.total', 10000);
    }

    public function test_notes_are_appended_not_overwritten(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);

        $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-19')], ['note' => 'Kirim pagi']));
        $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-20')], ['note' => 'Tambah gula']))
            ->assertJsonPath('invoice.note', "Kirim pagi\nTambah gula");
    }

    public function test_decimal_quantity_is_rounded_per_line(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);

        $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-19', 'Ikan', 1.5, 33333)]))
            ->assertJsonPath('invoice.subtotal', 50000)->assertJsonPath('invoice.items.0.qty', 1.5);
    }

    public function test_validation_rejects_bad_items(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);

        $this->postJson('/api/invoices', $this->payload($budi, []))->assertUnprocessable()->assertJsonValidationErrors('items');
        $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-19', '', 1)]))->assertUnprocessable();
        $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-19', 'Gula', 0)]))->assertUnprocessable();
        $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-19', 'Gula', 1, -5)]))->assertUnprocessable();
        $this->postJson('/api/invoices', $this->payload($budi, [$this->item('19/10/2026')]))->assertUnprocessable();
        $this->postJson('/api/invoices', ['customer_id' => 999] + $this->payload($budi, [$this->item('2026-10-19')]))->assertUnprocessable();

        $this->assertDatabaseCount('invoices', 0);
    }

    public function test_status_must_be_valid_and_reopen_is_blocked_when_another_is_open(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);

        $old = $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-19')]))->json('invoice.id');
        $this->patchJson("/api/invoices/$old", ['status' => 'bebas'])->assertUnprocessable();
        $this->patchJson("/api/invoices/$old", ['status' => 'lunas'])->assertOk();

        $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-22')]));

        $this->patchJson("/api/invoices/$old", ['status' => 'draft'])
            ->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_list_and_show_return_camel_case_shape(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi', 'phone' => '0812']);
        $id = $this->postJson('/api/invoices', $this->payload($budi, [$this->item('2026-10-19')]))->json('invoice.id');

        $this->getJson('/api/invoices')->assertOk()->assertJsonCount(1)
            ->assertJsonPath('0.customerName', 'Budi')->assertJsonPath('0.customerPhone', '0812');
        $this->getJson("/api/invoices/$id")->assertOk()->assertJsonStructure(
            ['id', 'invoiceNumber', 'date', 'customerId', 'customerName', 'items', 'subtotal', 'discount', 'total', 'note', 'status'],
        );
        $this->getJson('/api/invoices/9999')->assertNotFound();
    }
}
