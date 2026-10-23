<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Rekap penjualan, modal, dan untung. Hanya untuk pemilik (login); tidak pernah tampil di nota cetak. */
class ReportController extends Controller
{
    /**
     * Rekap per hari atau per bulan. Penjualan dan modal dihitung per tanggal barang
     * (satu nota bisa mencakup beberapa hari); diskon dihitung pada tanggal nota.
     * Untung = penjualan barang yang modalnya sudah diisi - modalnya - diskon.
     * Barang tanpa modal tidak ikut untung, tapi dihitung di "uncostedItems" supaya terlihat.
     */
    public function profit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'group' => ['sometimes', 'in:day,month'],
            'paid_only' => ['sometimes', 'boolean'],
        ]);

        if (Carbon::parse($data['from'])->diffInDays(Carbon::parse($data['to'])) > 732) {
            $message = 'Rentang tanggal maksimal 2 tahun.';

            return response()->json(['message' => $message, 'errors' => ['to' => [$message]]], 422);
        }

        $group = $data['group'] ?? 'day';
        $paidOnly = (bool) ($data['paid_only'] ?? false);
        $keyOf = fn (string $date) => $group === 'month' ? substr($date, 0, 7) : $date;

        $rows = [];

        InvoiceItem::query()
            ->whereBetween('item_date', [$data['from'], $data['to']])
            ->when($paidOnly, fn ($q) => $q->whereHas('invoice', fn ($i) => $i->where('status', Invoice::PAID)))
            ->get(['id', 'item_date', 'qty', 'price', 'cost_price'])
            ->each(function (InvoiceItem $item) use (&$rows, $keyOf) {
                $key = $keyOf($item->item_date->toDateString());
                $rows[$key] ??= self::blank($key);
                $line = $item->lineTotal();
                $rows[$key]['sales'] += $line;
                $rows[$key]['items']++;
                if (($cost = $item->lineCost()) === null) {
                    $rows[$key]['uncostedItems']++;
                } else {
                    $rows[$key]['cost'] += $cost;
                    $rows[$key]['costedSales'] += $line;
                }
            });

        Invoice::query()
            ->whereBetween('date', [$data['from'], $data['to']])
            ->where('discount', '>', 0)
            ->when($paidOnly, fn ($q) => $q->where('status', Invoice::PAID))
            ->get(['id', 'date', 'discount'])
            ->each(function (Invoice $invoice) use (&$rows, $keyOf) {
                $key = $keyOf($invoice->date->toDateString());
                $rows[$key] ??= self::blank($key);
                $rows[$key]['discount'] += $invoice->discount;
            });

        ksort($rows);
        $rows = array_values(array_map(
            fn (array $r) => $r + ['profit' => $r['costedSales'] - $r['cost'] - $r['discount']],
            $rows,
        ));

        $totals = array_fill_keys(['sales', 'discount', 'cost', 'costedSales', 'items', 'uncostedItems', 'profit'], 0);
        foreach ($rows as $r) {
            foreach ($totals as $k => $_) {
                $totals[$k] += $r[$k];
            }
        }

        return response()->json(['group' => $group, 'rows' => $rows, 'totals' => $totals]);
    }

    private static function blank(string $period): array
    {
        return [
            'period' => $period, 'sales' => 0, 'discount' => 0, 'cost' => 0,
            'costedSales' => 0, 'items' => 0, 'uncostedItems' => 0,
        ];
    }
}
