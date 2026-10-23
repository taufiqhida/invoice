<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfitApiTest extends TestCase
{
    use RefreshDatabase;

    private function login(): void
    {
        Sanctum::actingAs(User::factory()->create());
    }

    private function price(string $supplier, string $product, int $price): array
    {
        return $this->putJson('/api/supplier-prices', [
            'supplier_name' => $supplier, 'product' => $product, 'price' => $price,
        ])->assertOk()->json();
    }

    private function save(Customer $c, array $items, array $extra = [])
    {
        return $this->postJson('/api/invoices', [
            'customer_id' => $c->id, 'date' => '2026-10-19', 'items' => $items, 'separate' => true,
        ] + $extra);
    }

    public function test_cost_endpoints_require_login(): void
    {
        $this->getJson('/api/suppliers')->assertUnauthorized();
        $this->putJson('/api/supplier-prices', [])->assertUnauthorized();
        $this->getJson('/api/reports/profit?from=2026-10-01&to=2026-10-31')->assertUnauthorized();
    }

    public function test_same_product_can_have_a_different_price_in_each_supplier(): void
    {
        $this->login();

        $this->price('Toko A', 'Gula', 17000);
        $this->price('Toko B', 'gula ', 22000); // huruf & spasi berbeda = barang yang sama
        $res = $this->price('Toko C', 'Gula', 25000);

        $list = $this->getJson('/api/suppliers')->assertOk()->assertJsonCount(3);
        $this->assertSame(['Toko A', 'Toko B', 'Toko C'], array_column($list->json(), 'name'));
        $this->assertSame('gula', $res['prices'][0]['productKey']);
        $this->assertDatabaseCount('supplier_prices', 3);
    }

    public function test_saving_a_price_again_replaces_it_and_reuses_the_supplier(): void
    {
        $this->login();

        $this->price('Toko A', 'Gula', 17000);
        $res = $this->price('toko a', 'GULA', 18000);

        $this->assertDatabaseCount('suppliers', 1);
        $this->assertDatabaseCount('supplier_prices', 1);
        $this->assertSame(18000, $res['prices'][0]['price']);
    }

    public function test_price_validation(): void
    {
        $this->login();

        $this->putJson('/api/supplier-prices', ['supplier_name' => '', 'product' => 'Gula', 'price' => 1])
            ->assertUnprocessable()->assertJsonValidationErrors('supplier_name');
        $this->putJson('/api/supplier-prices', ['supplier_name' => 'A', 'product' => 'Gula', 'price' => -5])
            ->assertUnprocessable()->assertJsonValidationErrors('price');
        $this->putJson('/api/supplier-prices', ['supplier_name' => 'A', 'product' => 'Gula', 'price' => 1.5])
            ->assertUnprocessable()->assertJsonValidationErrors('price');
    }

    public function test_item_takes_the_stored_price_of_the_chosen_supplier_when_cost_is_omitted(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $b = $this->price('Toko B', 'Gula', 22000)['id'];

        $res = $this->save($budi, [
            ['date' => '2026-10-19', 'name' => 'Gula', 'qty' => 2, 'price' => 30000, 'supplier_id' => $b],
        ])->assertCreated();

        $res->assertJsonPath('invoice.items.0.supplierId', $b)
            ->assertJsonPath('invoice.items.0.supplierName', 'Toko B')
            ->assertJsonPath('invoice.items.0.costPrice', 22000);
    }

    public function test_an_explicit_cost_wins_over_the_stored_price(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $a = $this->price('Toko A', 'Gula', 17000)['id'];

        $this->save($budi, [
            ['date' => '2026-10-19', 'name' => 'Gula', 'qty' => 1, 'price' => 30000, 'supplier_id' => $a, 'cost_price' => 19000],
        ])->assertCreated()->assertJsonPath('invoice.items.0.costPrice', 19000);
    }

    public function test_item_without_cost_stays_without_cost(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);

        $this->save($budi, [['date' => '2026-10-19', 'name' => 'Garam', 'qty' => 1, 'price' => 5000]])
            ->assertCreated()
            ->assertJsonPath('invoice.items.0.supplierId', null)
            ->assertJsonPath('invoice.items.0.costPrice', null);
    }

    public function test_cost_is_a_snapshot_that_survives_price_and_supplier_changes(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $a = $this->price('Toko A', 'Gula', 17000)['id'];
        $inv = $this->save($budi, [
            ['date' => '2026-10-19', 'name' => 'Gula', 'qty' => 1, 'price' => 30000, 'supplier_id' => $a],
        ])->json('invoice');

        $this->price('Toko A', 'Gula', 99000); // harga di daftar naik
        $this->deleteJson("/api/suppliers/{$a}")->assertOk(); // lalu tokonya dihapus

        $item = $this->getJson("/api/invoices/{$inv['id']}")->assertOk()->json('items.0');
        $this->assertSame(17000, $item['costPrice']);
        $this->assertSame('Toko A', $item['supplierName']);
        $this->assertNull($item['supplierId']);
    }

    public function test_replace_can_set_and_clear_cost(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $a = $this->price('Toko A', 'Gula', 17000)['id'];
        $inv = $this->save($budi, [['date' => '2026-10-19', 'name' => 'Gula', 'qty' => 1, 'price' => 30000]])->json('invoice');
        $itemId = $inv['items'][0]['id'];

        $this->putJson("/api/invoices/{$inv['id']}", ['items' => [
            ['id' => $itemId, 'date' => '2026-10-19', 'name' => 'Gula', 'qty' => 1, 'price' => 30000, 'supplier_id' => $a],
        ]])->assertOk()->assertJsonPath('items.0.costPrice', 17000);

        $this->putJson("/api/invoices/{$inv['id']}", ['items' => [
            ['id' => $itemId, 'date' => '2026-10-19', 'name' => 'Gula', 'qty' => 1, 'price' => 30000],
        ]])->assertOk()->assertJsonPath('items.0.costPrice', null)->assertJsonPath('items.0.supplierId', null);
    }

    public function test_unknown_supplier_or_negative_cost_is_rejected(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);

        $this->save($budi, [['date' => '2026-10-19', 'name' => 'Gula', 'qty' => 1, 'price' => 1000, 'supplier_id' => 999]])
            ->assertUnprocessable()->assertJsonValidationErrors('items.0.supplier_id');
        $this->save($budi, [['date' => '2026-10-19', 'name' => 'Gula', 'qty' => 1, 'price' => 1000, 'cost_price' => -1]])
            ->assertUnprocessable()->assertJsonValidationErrors('items.0.cost_price');
    }

    public function test_deleting_a_supplier_removes_its_price_list(): void
    {
        $this->login();
        $a = $this->price('Toko A', 'Gula', 17000)['id'];
        $this->price('Toko A', 'Garam', 4000);

        $this->deleteJson("/api/suppliers/{$a}")->assertOk();

        $this->assertDatabaseCount('suppliers', 0);
        $this->assertDatabaseCount('supplier_prices', 0);
    }

    public function test_a_single_price_can_be_removed(): void
    {
        $this->login();
        $res = $this->price('Toko A', 'Gula', 17000);
        $this->price('Toko A', 'Garam', 4000);
        $gula = collect($res['prices'])->firstWhere('productKey', 'gula')['id'];

        $this->deleteJson("/api/supplier-prices/{$gula}")->assertOk()->assertJsonCount(1, 'prices');
        $this->assertDatabaseCount('supplier_prices', 1);
    }

    public function test_profit_report_groups_by_item_date_and_subtracts_cost_and_discount(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $a = $this->price('Toko A', 'Gula', 17000)['id'];
        $b = $this->price('Toko B', 'Garam', 4000)['id'];

        // Senin: 2 gula @30.000 (modal 17.000) -> jual 60.000, modal 34.000.
        // Selasa: 3 garam @6.000 (modal 4.000) -> jual 18.000, modal 12.000.
        // Selasa: 1 kopi @10.000 tanpa modal -> tidak ikut untung, tapi dihitung.
        $this->save($budi, [
            ['date' => '2026-10-19', 'name' => 'Gula', 'qty' => 2, 'price' => 30000, 'supplier_id' => $a],
            ['date' => '2026-10-20', 'name' => 'Garam', 'qty' => 3, 'price' => 6000, 'supplier_id' => $b],
            ['date' => '2026-10-20', 'name' => 'Kopi', 'qty' => 1, 'price' => 10000],
        ], ['discount' => 3000])->assertCreated();

        $res = $this->getJson('/api/reports/profit?from=2026-10-01&to=2026-10-31&group=day')->assertOk();

        $res->assertJsonCount(2, 'rows')
            ->assertJsonPath('rows.0.period', '2026-10-19')
            ->assertJsonPath('rows.0.sales', 60000)
            ->assertJsonPath('rows.0.cost', 34000)
            ->assertJsonPath('rows.0.discount', 3000) // diskon di tanggal nota (19)
            ->assertJsonPath('rows.0.profit', 60000 - 34000 - 3000)
            ->assertJsonPath('rows.1.period', '2026-10-20')
            ->assertJsonPath('rows.1.sales', 28000)
            ->assertJsonPath('rows.1.cost', 12000)
            ->assertJsonPath('rows.1.uncostedItems', 1)
            ->assertJsonPath('rows.1.profit', 18000 - 12000)
            ->assertJsonPath('totals.sales', 88000)
            ->assertJsonPath('totals.cost', 46000)
            ->assertJsonPath('totals.profit', (60000 - 34000 - 3000) + (18000 - 12000));
    }

    public function test_profit_report_can_group_by_month_and_filter_paid_only(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $a = $this->price('Toko A', 'Gula', 10000)['id'];

        $open = $this->save($budi, [['date' => '2026-10-19', 'name' => 'Gula', 'qty' => 1, 'price' => 15000, 'supplier_id' => $a]])->json('invoice');
        $paid = $this->save($budi, [['date' => '2026-11-02', 'name' => 'Gula', 'qty' => 1, 'price' => 16000, 'supplier_id' => $a]])->json('invoice');
        $this->patchJson("/api/invoices/{$paid['id']}", ['status' => 'lunas'])->assertOk();

        $all = $this->getJson('/api/reports/profit?from=2026-10-01&to=2026-11-30&group=month')->assertOk();
        $all->assertJsonCount(2, 'rows')
            ->assertJsonPath('rows.0.period', '2026-10')->assertJsonPath('rows.0.profit', 5000)
            ->assertJsonPath('rows.1.period', '2026-11')->assertJsonPath('rows.1.profit', 6000);

        $onlyPaid = $this->getJson('/api/reports/profit?from=2026-10-01&to=2026-11-30&group=month&paid_only=1')->assertOk();
        $onlyPaid->assertJsonCount(1, 'rows')->assertJsonPath('rows.0.period', '2026-11');
        $this->assertNotSame($open['id'], $paid['id']);
    }

    public function test_profit_report_validates_the_range(): void
    {
        $this->login();

        $this->getJson('/api/reports/profit')->assertUnprocessable();
        $this->getJson('/api/reports/profit?from=2026-10-10&to=2026-10-01')->assertUnprocessable();
        $this->getJson('/api/reports/profit?from=2020-01-01&to=2026-10-01')->assertUnprocessable();
        $this->getJson('/api/reports/profit?from=2026-10-01&to=2026-10-31')->assertOk()->assertJsonPath('totals.profit', 0);
    }

    public function test_cost_never_leaks_to_the_public_verify_page(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $a = $this->price('Toko Rahasia', 'Gula', 17123)['id'];
        $inv = $this->save($budi, [['date' => '2026-10-19', 'name' => 'Gula', 'qty' => 1, 'price' => 30000, 'supplier_id' => $a]])->json('invoice');

        $this->app['auth']->forgetGuards();
        $body = $this->getJson("/api/verify/{$inv['verifyToken']}")->assertOk()->getContent();

        $this->assertStringNotContainsString('Rahasia', $body);
        $this->assertStringNotContainsString('17123', $body);
        $this->assertStringNotContainsStringIgnoringCase('cost', $body);
        $this->assertSame(1, Supplier::count());
    }
}
