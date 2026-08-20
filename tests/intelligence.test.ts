import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDynamicRecommendations, computeWhatChanged, forecastRevenue, simulateScenario } from '../lib/intelligence.ts';
import type { TransactionFact } from '../lib/types.ts';

function row(month: string, revenue: number, cost: number, product: string, region = 'West'): TransactionFact {
  return { transaction_id: `${month}-${product}-${revenue}`, order_id: `${month}-${product}`, order_date: `${month}-15`, region, channel: product === 'A' ? 'Distributor' : 'Online', customer_segment: 'SMB', category: product === 'A' ? 'Office' : 'Electronics', product, quantity: 1, gross_revenue: revenue / .9, discount_amount: revenue / .9 - revenue, discount_rate: .1, net_revenue: revenue, cost, gross_profit: revenue-cost, gross_margin: (revenue-cost)/revenue, month };
}
const months = ['2025-01','2025-02','2025-03','2025-04','2025-05','2025-06','2025-07','2025-08'];
const facts = months.flatMap((m,i)=>[row(m,100+i*10,80+i*8,'A'),row(m,80+i*9,40+i*3,'B','South')]);

test('what changed decomposes the latest month', () => {
  const brief = computeWhatChanged(facts);
  assert.ok(brief);
  assert.equal(brief?.currentMonth, '2025-08');
  assert.ok((brief?.revenueDelta ?? 0) > 0);
  assert.ok((brief?.topPositive.length ?? 0) > 0);
});

test('forecast produces three future months from sufficient history', () => {
  const forecast = forecastRevenue(facts, 3);
  assert.ok(forecast);
  assert.equal(forecast?.points.length, 3);
  assert.equal(forecast?.points[0].month, '2025-09');
  assert.ok((forecast?.points[0].upper ?? 0) >= (forecast?.points[0].lower ?? 0));
});

test('scenario simulator responds to lower discount', () => {
  const base = simulateScenario(facts, 0, 0, 0);
  const improved = simulateScenario(facts, 0, -2, 0);
  assert.ok(improved.projectedProfit > base.projectedProfit);
});

test('dynamic recommendations are evidence based', () => {
  const recs = buildDynamicRecommendations(facts);
  assert.ok(recs.length > 0);
  assert.ok(recs.every((r) => r.evidence.length > 0 && r.recommendation.length > 0));
});
