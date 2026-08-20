import assert from 'node:assert/strict';
import test from 'node:test';
import { inferMapping, normalizeUploadedRows } from '../lib/importer.ts';

const parsed = {
  fileName: 'sales.csv',
  columns: ['Invoice Date','Invoice No','SKU Name','Qty','Sales Value','COGS','Region','Discount %'],
  rows: [
    { 'Invoice Date':'2026-01-05','Invoice No':'INV-1','SKU Name':'Alpha','Qty':'2','Sales Value':'1000','COGS':'600','Region':'West','Discount %':'10' },
    { 'Invoice Date':'bad-date','Invoice No':'INV-2','SKU Name':'Beta','Qty':'1','Sales Value':'500','COGS':'300','Region':'South','Discount %':'0' },
  ],
};

test('column inference recognizes common business headings', () => {
  const mapping = inferMapping(parsed.columns);
  assert.equal(mapping.order_date, 'Invoice Date');
  assert.equal(mapping.product, 'SKU Name');
  assert.equal(mapping.net_revenue, 'Sales Value');
  assert.equal(mapping.cost, 'COGS');
});

test('normalization rejects invalid rows and derives economics', () => {
  const mapping = inferMapping(parsed.columns);
  const result = normalizeUploadedRows(parsed, mapping);
  assert.equal(result.quality.validRows, 1);
  assert.equal(result.quality.rejectedRows, 1);
  assert.equal(result.artifact.records[0].gross_profit, 400);
  assert.equal(result.artifact.records[0].discount_rate > 0, true);
});
