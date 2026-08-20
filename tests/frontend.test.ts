import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL, calculateKpis, defaultFilters, filterFacts, monthlySeries, previousPeriodFilters, productSeries } from '../lib/view.ts';
import type { TransactionFact } from '../lib/types.ts';

const facts: TransactionFact[] = [
  { transaction_id: 'TXN-1', order_id: 'ORD-1', order_date: '2024-01-10', region: 'North', channel: 'Online', customer_segment: 'SMB', category: 'Office', product: 'A', quantity: 2, gross_revenue: 200, discount_amount: 20, discount_rate: 0.1, net_revenue: 180, cost: 100, gross_profit: 80, gross_margin: 80/180, month: '2024-01' },
  { transaction_id: 'TXN-2', order_id: 'ORD-2', order_date: '2024-02-10', region: 'South', channel: 'Retail', customer_segment: 'Consumer', category: 'Home', product: 'B', quantity: 1, gross_revenue: 120, discount_amount: 0, discount_rate: 0, net_revenue: 120, cost: 70, gross_profit: 50, gross_margin: 50/120, month: '2024-02' },
  { transaction_id: 'TXN-3', order_id: 'ORD-3', order_date: '2024-02-11', region: 'North', channel: 'Online', customer_segment: 'SMB', category: 'Office', product: 'A', quantity: 1, gross_revenue: 100, discount_amount: 10, discount_rate: 0.1, net_revenue: 90, cost: 50, gross_profit: 40, gross_margin: 40/90, month: '2024-02' },
];

test('default filters span the full artifact date range', () => {
  const filters = defaultFilters('2024-01-01', '2024-12-31');
  assert.equal(filters.startDate, '2024-01-01');
  assert.equal(filters.region, ALL);
});

test('filters consistently restrict facts', () => {
  const filters = { ...defaultFilters('2024-01-01', '2024-12-31'), region: 'North', product: 'A' };
  assert.deepEqual(filterFacts(facts, filters).map((row) => row.transaction_id), ['TXN-1', 'TXN-3']);
});

test('KPI rendering inputs use net economics from filtered facts', () => {
  const result = calculateKpis(facts.slice(0, 1));
  assert.equal(result.revenue, 180);
  assert.equal(result.profit, 80);
  assert.equal(result.orders, 1);
  assert.equal(result.units, 2);
  assert.equal(result.aov, 180);
  assert.equal(result.discountRate, 0.1);
});

test('monthly and product rankings are filter-ready aggregations', () => {
  const monthly = monthlySeries(facts);
  assert.equal(monthly.length, 2);
  assert.equal(monthly[1].revenue, 210);
  const products = productSeries(facts);
  assert.equal(products[0].product, 'A');
  assert.equal(products[0].revenue, 270);
});

test('previous period returns null when history is unavailable', () => {
  const filters = defaultFilters('2024-01-01', '2024-01-31');
  assert.equal(previousPeriodFilters(filters, '2024-01-01'), null);
});
