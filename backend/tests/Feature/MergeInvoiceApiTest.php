<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MergeInvoiceApiTest extends TestCase
{
    use RefreshDatabase;

    private function login(): void
    {
        Sanctum::actingAs(User::factory()->create());
    }

    /** Buat nota terpisah milik pelanggan (separate = true agar tidak digabung otomatis). */
    private function make(Customer $c, array $items, array $extra = []): array
    {
        return $this->postJson('/api/invoices', [
            'customer_id' => $c->id, 'date' => '2026-10-19', 'items' => $items, 'separate' => true,
        ] + $extra)->assertCreated()->json('invoice');
    }

    private function item(string $date, string $name = 'Gula', int $qty = 1, int $price = 10000, array $extra = []): array
    {
        return ['date' => $date, 'name' => $name, 'qty' => $qty, 'price' => $price] + $extra;
    }

    private function merge(array $target, array $sources)
    {
        return $this->postJson("/api/invoices/{$target['id']}/merge", ['source_ids' => array_column($sources, 'id')]);
    }

    public function test_merge_requires_login(): void
    {
        $this->postJson('/api/invoices/1/merge', ['source_ids' => [2]])->assertUnauthorized();
    }

    public function test_separate_invoices_of_one_customer_can_be_merged_into_one(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $a = $this->make($budi, [$this->item('2026-10-19', 'Gula', 2, 10000)], ['discount' => 1000, 'note' => 'Catatan A']);
        $b = $this->make($budi, [$this->item('2026-10-20', 'Garam', 3, 5000)], ['note' => 'Catatan B', 'discount' => 500]);
        $this->assertNotSame($a['id'], $b['id']);

        $res = $this->merge($a, [$b])->assertOk();

        $res->assertJsonPath('id', $a['id'])
            ->assertJsonPath('invoiceNumber', $a['invoiceNumber'])
            ->assertJsonCount(2, 'items')
            ->assertJsonPath('subtotal', 35000)
            ->assertJsonPath('discount', 1500)
            ->assertJsonPath('total', 33500)
            ->assertJsonPath('note', "Catatan A\nCatatan B");
        $this->assertDatabaseMissing('invoices', ['id' => $b['id']]);
        $this->assertDatabaseCount('invoices', 1);
        $this->assertDatabaseCount('invoice_items', 2);
    }

    public function test_the_target_invoice_is_never_deleted_and_many_can_be_merged_at_once(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $a = $this->make($budi, [$this->item('2026-10-19')]);
        $b = $this->make($budi, [$this->item('2026-10-20')]);
        $c = $this->make($budi, [$this->item('2026-10-21')]);

        $this->merge($b, [$a, $c])->assertOk()->assertJsonCount(3, 'items')->assertJsonPath('id', $b['id']);

        $this->assertSame([$b['id']], Invoice::pluck('id')->all());
        $this->assertSame(3, InvoiceItem::where('invoice_id', $b['id'])->count());
    }

    public function test_items_keep_their_dates_and_cost_when_merged(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $a = $this->make($budi, [$this->item('2026-10-19', 'Gula', 1, 30000, ['supplier_id' => null, 'cost_price' => 17000])]);
        $b = $this->make($budi, [$this->item('2026-10-21', 'Gula', 2, 30000, ['cost_price' => 22000])]);

        $res = $this->merge($a, [$b])->assertOk();

        $items = collect($res->json('items'));
        $this->assertSame(['2026-10-19', '2026-10-21'], $items->pluck('date')->all());
        $this->assertSame([17000, 22000], $items->pluck('costPrice')->all());
    }

    public function test_merged_invoice_takes_the_earliest_date(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $late = $this->postJson('/api/invoices', ['customer_id' => $budi->id, 'date' => '2026-10-25', 'items' => [$this->item('2026-10-25')], 'separate' => true])->json('invoice');
        $early = $this->postJson('/api/invoices', ['customer_id' => $budi->id, 'date' => '2026-10-02', 'items' => [$this->item('2026-10-02')], 'separate' => true])->json('invoice');

        $this->merge($late, [$early])->assertOk()->assertJsonPath('date', '2026-10-02');
    }

    public function test_only_invoices_of_the_same_customer_can_be_merged(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $siti = Customer::create(['name' => 'Siti']);
        $a = $this->make($budi, [$this->item('2026-10-19')]);
        $b = $this->make($siti, [$this->item('2026-10-19')]);

        $this->merge($a, [$b])->assertUnprocessable()->assertJsonValidationErrors('source_ids');

        $this->assertDatabaseCount('invoices', 2);
        $this->assertDatabaseCount('invoice_items', 2);
    }

    public function test_an_invoice_cannot_be_merged_into_itself_or_with_unknown_ids(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $a = $this->make($budi, [$this->item('2026-10-19')]);

        $this->merge($a, [$a])->assertUnprocessable()->assertJsonValidationErrors('source_ids');
        $this->postJson("/api/invoices/{$a['id']}/merge", ['source_ids' => [999]])->assertUnprocessable();
        $this->postJson("/api/invoices/{$a['id']}/merge", ['source_ids' => []])->assertUnprocessable();
        $this->postJson("/api/invoices/{$a['id']}/merge", [])->assertUnprocessable();

        $this->assertDatabaseCount('invoices', 1);
        $this->assertDatabaseCount('invoice_items', 1);
    }

    public function test_result_status_is_the_least_finished_one(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);

        // lunas + lunas = lunas
        $a = $this->make($budi, [$this->item('2026-10-19')]);
        $b = $this->make($budi, [$this->item('2026-10-20')]);
        $this->patchJson("/api/invoices/{$a['id']}", ['status' => 'lunas'])->assertOk();
        $this->patchJson("/api/invoices/{$b['id']}", ['status' => 'lunas'])->assertOk();
        $this->merge($a, [$b])->assertOk()->assertJsonPath('status', 'lunas');

        // lunas + terkirim = terkirim
        $c = $this->make($budi, [$this->item('2026-10-21')]);
        $this->patchJson("/api/invoices/{$c['id']}", ['status' => 'terkirim'])->assertOk();
        $this->merge($a, [$c])->assertOk()->assertJsonPath('status', 'terkirim');

        // terkirim + berjalan = berjalan (dan tetap hanya satu nota berjalan untuk pelanggan ini)
        $d = $this->make($budi, [$this->item('2026-10-22')]);
        $this->merge($a, [$d])->assertOk()->assertJsonPath('status', 'draft');
        $this->assertSame(1, Invoice::where('customer_id', $budi->id)->where('status', 'draft')->count());
    }

    public function test_discount_is_capped_at_the_new_subtotal(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $a = $this->make($budi, [$this->item('2026-10-19', 'Gula', 1, 1000)], ['discount' => 900]);
        $b = $this->make($budi, [$this->item('2026-10-20', 'Garam', 1, 1000)], ['discount' => 900]);

        // 900 + 900 = 1800 <= subtotal 2000, jadi utuh.
        $this->merge($a, [$b])->assertOk()->assertJsonPath('discount', 1800)->assertJsonPath('total', 200);
    }

    public function test_a_merged_invoice_qr_code_stops_working_but_the_target_still_does(): void
    {
        $this->login();
        $budi = Customer::create(['name' => 'Budi']);
        $a = $this->make($budi, [$this->item('2026-10-19')]);
        $b = $this->make($budi, [$this->item('2026-10-20')]);

        $this->merge($a, [$b])->assertOk();

        $this->getJson("/api/verify/{$a['verifyToken']}")->assertOk()->assertJsonPath('itemCount', 2);
        $this->getJson("/api/verify/{$b['verifyToken']}")->assertNotFound();
    }
}
