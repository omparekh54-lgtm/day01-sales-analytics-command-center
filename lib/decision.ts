import type { TransactionFact } from './types';
import { calculateKpis } from './view.ts';

export type ComparisonMode = 'mom' | 'yoy';
export type DrillFilterKey = 'region' | 'channel' | 'segment' | 'category' | 'product';

export interface PeriodDriver {
  dimension: string;
  filterKey: DrillFilterKey;
  value: string;
  delta: number;
  current: number;
  previous: number;
}

export interface PeriodBrief {
  mode: ComparisonMode;
  currentMonth: string;
  previousMonth: string;
  revenueDelta: number;
  revenueGrowth: number | null;
  profitDelta: number;
  profitGrowth: number | null;
  marginDelta: number;
  topPositive: PeriodDriver[];
  topNegative: PeriodDriver[];
}

export interface Opportunity {
  id: string;
  dimension: string;
  filterKey: DrillFilterKey;
  value: string;
  revenue: number;
  margin: number;
  discountRate: number;
  peerDiscountRate: number;
  estimatedDiscountRecovery: number;
  marginGap: number;
  priority: 'high' | 'medium';
}

export interface EconomicBridge {
  grossRevenue: number;
  discountAmount: number;
  netRevenue: number;
  cost: number;
  grossProfit: number;
}

function addMonths(month: string, count: number): string {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + count, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function pctChange(current: number, previous: number): number | null {
  return previous === 0 ? null : current / previous - 1;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function aggregateRevenue(records: TransactionFact[], key: 'region' | 'channel' | 'customer_segment' | 'category' | 'product') {
  const map = new Map<string, number>();
  for (const row of records) map.set(String(row[key]), (map.get(String(row[key])) ?? 0) + row.net_revenue);
  return map;
}

export function buildPeriodBrief(records: TransactionFact[], mode: ComparisonMode): PeriodBrief | null {
  const months = Array.from(new Set(records.map((row) => row.month))).sort();
  if (months.length < 2) return null;
  const currentMonth = months.at(-1) as string;
  const requestedPrevious = addMonths(currentMonth, mode === 'yoy' ? -12 : -1);
  let previousMonth = requestedPrevious;
  if (!months.includes(previousMonth)) {
    if (mode === 'yoy') return null;
    previousMonth = months.at(-2) as string;
  }

  const currentRows = records.filter((row) => row.month === currentMonth);
  const previousRows = records.filter((row) => row.month === previousMonth);
  if (!previousRows.length) return null;

  const current = calculateKpis(currentRows);
  const previous = calculateKpis(previousRows);
  const drivers: PeriodDriver[] = [];
  const dimensions: Array<[
    'region' | 'channel' | 'customer_segment' | 'category' | 'product',
    string,
    DrillFilterKey,
  ]> = [
    ['region', 'Region', 'region'],
    ['channel', 'Channel', 'channel'],
    ['customer_segment', 'Segment', 'segment'],
    ['category', 'Category', 'category'],
    ['product', 'Product', 'product'],
  ];

  for (const [key, label, filterKey] of dimensions) {
    const a = aggregateRevenue(currentRows, key);
    const b = aggregateRevenue(previousRows, key);
    const values = new Set([...a.keys(), ...b.keys()]);
    for (const value of values) {
      drivers.push({
        dimension: label,
        filterKey,
        value,
        delta: (a.get(value) ?? 0) - (b.get(value) ?? 0),
        current: a.get(value) ?? 0,
        previous: b.get(value) ?? 0,
      });
    }
  }

  return {
    mode,
    currentMonth,
    previousMonth,
    revenueDelta: current.revenue - previous.revenue,
    revenueGrowth: pctChange(current.revenue, previous.revenue),
    profitDelta: current.profit - previous.profit,
    profitGrowth: pctChange(current.profit, previous.profit),
    marginDelta: current.margin - previous.margin,
    topPositive: drivers.filter((item) => item.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5),
    topNegative: drivers.filter((item) => item.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5),
  };
}

function groupRows(records: TransactionFact[], key: 'region' | 'channel' | 'customer_segment' | 'category' | 'product') {
  const groups = new Map<string, TransactionFact[]>();
  for (const row of records) groups.set(String(row[key]), [...(groups.get(String(row[key])) ?? []), row]);
  return groups;
}

export function buildOpportunityRadar(records: TransactionFact[]): Opportunity[] {
  if (!records.length) return [];
  const overall = calculateKpis(records);
  const definitions: Array<[
    'region' | 'channel' | 'customer_segment' | 'category' | 'product',
    string,
    DrillFilterKey,
  ]> = [
    ['channel', 'Channel', 'channel'],
    ['customer_segment', 'Segment', 'segment'],
    ['category', 'Category', 'category'],
    ['region', 'Region', 'region'],
    ['product', 'Product', 'product'],
  ];

  const opportunities: Opportunity[] = [];
  for (const [key, dimension, filterKey] of definitions) {
    const groups = groupRows(records, key);
    if (groups.size < 2) continue;
    const metrics = Array.from(groups.entries()).map(([value, rows]) => ({ value, ...calculateKpis(rows) }));
    const peerDiscountRate = median(metrics.map((item) => item.discountRate));

    for (const item of metrics) {
      const estimatedDiscountRecovery = Math.max(0, item.grossRevenue * (item.discountRate - peerDiscountRate));
      const marginGap = overall.margin - item.margin;
      const materialDiscount = estimatedDiscountRecovery >= Math.max(1, overall.revenue * 0.001);
      const materialMarginGap = marginGap >= 0.03 && item.revenue >= overall.revenue * 0.03;
      if (!materialDiscount && !materialMarginGap) continue;

      const priorityScore = estimatedDiscountRecovery + Math.max(0, marginGap) * item.revenue * 0.25;
      const highThreshold = Math.max(overall.profit * 0.025, overall.revenue * 0.004);
      opportunities.push({
        id: `${filterKey}-${item.value}`,
        dimension,
        filterKey,
        value: item.value,
        revenue: item.revenue,
        margin: item.margin,
        discountRate: item.discountRate,
        peerDiscountRate,
        estimatedDiscountRecovery,
        marginGap,
        priority: priorityScore >= highThreshold ? 'high' : 'medium',
      });
    }
  }

  return opportunities
    .sort((a, b) => {
      const aScore = a.estimatedDiscountRecovery + Math.max(0, a.marginGap) * a.revenue * 0.25;
      const bScore = b.estimatedDiscountRecovery + Math.max(0, b.marginGap) * b.revenue * 0.25;
      return bScore - aScore;
    })
    .slice(0, 5);
}

export function buildEconomicBridge(records: TransactionFact[]): EconomicBridge {
  const kpis = calculateKpis(records);
  return {
    grossRevenue: kpis.grossRevenue,
    discountAmount: kpis.discountAmount,
    netRevenue: kpis.revenue,
    cost: kpis.cost,
    grossProfit: kpis.profit,
  };
}

export function breakEvenPriceChange(records: TransactionFact[], discountPointChange: number, costChangePct: number): number | null {
  const base = calculateKpis(records);
  if (!base.grossRevenue) return null;
  const newDiscountRate = Math.min(0.95, Math.max(0, base.discountRate + discountPointChange / 100));
  const projectedCost = base.cost * (1 + costChangePct / 100);
  const denominator = base.grossRevenue * (1 - newDiscountRate);
  if (denominator <= 0) return null;
  const requiredMultiplier = (base.profit + projectedCost) / denominator;
  return (requiredMultiplier - 1) * 100;
}
