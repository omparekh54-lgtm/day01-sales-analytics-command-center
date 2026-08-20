import assert from 'node:assert/strict';
import test from 'node:test';
import { breakEvenPriceChange, buildEconomicBridge, buildOpportunityRadar, buildPeriodBrief } from '../lib/decision.ts';
import type { TransactionFact } from '../lib/types.ts';

function fact(month: string, channel: string, product: string, net: number, cost: number, discountRate: number, region = 'West'): TransactionFact {
  const gross = net / (1 - discountRate);
  return {
    transaction_id: `${month}-${channel}-${product}-${net}`,
    order_id: `${month}-${channel}-${product}`,
    order_date: `${month}-15`,
    region,
    channel,
    customer_segment: channel === 'Distributor' ? 'Enterprise' : 'SMB',
    category: product === 'Desk' ? 'Office' : 'Electronics',
    product,
    quantity: 1,
    gross_revenue: gross,
    discount_amount: gross - net,
    discount_rate: discountRate,
    net_revenue: net,
    cost,
    gross_profit: net - cost,
    gross_margin: (net - cost) / net,
    month,
  };
}

const months = Array.from({ length: 14 }, (_, index) => {
  const date = new Date(Date.UTC(2024, index, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
});
const facts = months.flatMap((month, index) => [
  fact(month, 'Distributor', 'Desk', 120 + index * 7, 100 + index * 4, .22),
  fact(month, 'Online', 'Headset', 100 + index * 6, 45 + index * 2, .06, 'South'),
]);

test('period brief supports month over month and year over year comparisons', () => {
  const mom = buildPeriodBrief(facts, 'mom');
  const yoy = buildPeriodBrief(facts, 'yoy');
  assert.ok(mom);
  assert.ok(yoy);
  assert.equal(mom?.currentMonth, '2025-02');
  assert.equal(mom?.previousMonth, '2025-01');
  assert.equal(yoy?.previousMonth, '2024-02');
  assert.ok((yoy?.topPositive.length ?? 0) > 0);
});

test('opportunity radar quantifies above-peer discount sensitivity', () => {
  const opportunities = buildOpportunityRadar(facts);
  const distributor = opportunities.find((item) => item.value === 'Distributor');
  assert.ok(distributor);
  assert.ok((distributor?.estimatedDiscountRecovery ?? 0) > 0);
  assert.ok((distributor?.discountRate ?? 0) > (distributor?.peerDiscountRate ?? 0));
});

test('economic bridge reconciles gross revenue to gross profit', () => {
  const bridge = buildEconomicBridge(facts);
  assert.ok(Math.abs(bridge.grossRevenue - bridge.discountAmount - bridge.netRevenue) < 1e-6);
  assert.ok(Math.abs(bridge.netRevenue - bridge.cost - bridge.grossProfit) < 1e-6);
});

test('break-even price move rises when costs increase', () => {
  const baseline = breakEvenPriceChange(facts, 0, 0);
  const costShock = breakEvenPriceChange(facts, 0, 5);
  assert.ok(baseline !== null && Math.abs(baseline) < 1e-9);
  assert.ok(costShock !== null && costShock > 0);
});
