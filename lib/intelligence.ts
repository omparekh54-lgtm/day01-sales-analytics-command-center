import type { Anomaly, Recommendation, TransactionFact } from './types';
import { calculateKpis, monthlySeries } from './view.ts';

export interface ChangeDriver {
  dimension: string;
  value: string;
  delta: number;
  current: number;
  previous: number;
}

export interface ChangeBrief {
  currentMonth: string;
  previousMonth: string;
  revenueDelta: number;
  revenueGrowth: number | null;
  profitDelta: number;
  profitGrowth: number | null;
  marginDelta: number;
  topPositive: ChangeDriver[];
  topNegative: ChangeDriver[];
}

export interface ForecastPoint {
  month: string;
  revenue: number;
  lower: number;
  upper: number;
}

export interface ForecastResult {
  points: ForecastPoint[];
  validationMape: number | null;
  method: string;
}

export interface ScenarioResult {
  baselineRevenue: number;
  baselineProfit: number;
  baselineMargin: number;
  projectedRevenue: number;
  projectedProfit: number;
  projectedMargin: number;
}

function pctChange(current: number, previous: number): number | null {
  return previous === 0 ? null : current / previous - 1;
}

function aggregateDimension(records: TransactionFact[], key: 'region' | 'channel' | 'customer_segment' | 'category' | 'product') {
  const map = new Map<string, number>();
  for (const row of records) map.set(String(row[key]), (map.get(String(row[key])) ?? 0) + row.net_revenue);
  return map;
}

export function computeWhatChanged(records: TransactionFact[]): ChangeBrief | null {
  const months = Array.from(new Set(records.map((row) => row.month))).sort();
  if (months.length < 2) return null;
  const currentMonth = months.at(-1) as string;
  const previousMonth = months.at(-2) as string;
  const currentRows = records.filter((row) => row.month === currentMonth);
  const previousRows = records.filter((row) => row.month === previousMonth);
  const current = calculateKpis(currentRows);
  const previous = calculateKpis(previousRows);
  const drivers: ChangeDriver[] = [];
  const dimensions: Array<['region' | 'channel' | 'customer_segment' | 'category' | 'product', string]> = [
    ['region', 'Region'], ['channel', 'Channel'], ['customer_segment', 'Segment'], ['category', 'Category'], ['product', 'Product'],
  ];
  for (const [key, label] of dimensions) {
    const a = aggregateDimension(currentRows, key);
    const b = aggregateDimension(previousRows, key);
    const values = new Set([...a.keys(), ...b.keys()]);
    for (const value of values) drivers.push({ dimension: label, value, delta: (a.get(value) ?? 0) - (b.get(value) ?? 0), current: a.get(value) ?? 0, previous: b.get(value) ?? 0 });
  }
  return {
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

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function detectRevenueAnomalies(records: TransactionFact[]): Anomaly[] {
  const monthly = monthlySeries(records);
  if (monthly.length < 6) return [];
  const values = monthly.map((item) => item.revenue);
  const med = median(values);
  const mad = median(values.map((value) => Math.abs(value - med)));
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sd = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(values.length - 1, 1));
  return monthly.flatMap((item) => {
    const z = mad > 1e-9 ? 0.6745 * (item.revenue - med) / mad : sd ? (item.revenue - med) / sd : 0;
    if (Math.abs(z) < 3) return [];
    return [{ month: item.month, metric: 'revenue' as const, value: item.revenue, robust_z_score: z, direction: z > 0 ? 'high' as const : 'low' as const, method: mad > 1e-9 ? 'MAD robust z-score' : 'standard deviation fallback', threshold: 3 }];
  });
}

function recommendation(id: string, severity: Recommendation['severity'], dimension: string | null, value: string | null, observation: string, evidence: string, implication: string, action: string): Recommendation {
  return { id, severity, scope: { dimension, value }, observation, evidence, implication, recommendation: action };
}

function dimensionMetrics(records: TransactionFact[], key: 'region' | 'channel' | 'customer_segment' | 'category' | 'product') {
  const groups = new Map<string, TransactionFact[]>();
  for (const row of records) groups.set(String(row[key]), [...(groups.get(String(row[key])) ?? []), row]);
  return Array.from(groups.entries()).map(([value, rows]) => ({ value, ...calculateKpis(rows) }));
}

export function buildDynamicRecommendations(records: TransactionFact[]): Recommendation[] {
  const overall = calculateKpis(records);
  const result: Recommendation[] = [];
  const products = dimensionMetrics(records, 'product').sort((a, b) => b.revenue - a.revenue);
  const medianMargin = median(products.map((item) => item.margin));
  const tension = products.find((item) => item.revenue >= products[Math.min(Math.floor(products.length / 4), products.length - 1)]?.revenue && item.margin < medianMargin * 0.75);
  if (tension) result.push(recommendation('product-tension', 'high', 'product', tension.value, `${tension.value} is a revenue leader with weak realized margin.`, `Revenue is ${Math.round(tension.revenue).toLocaleString()} while gross margin is ${(tension.margin * 100).toFixed(1)}%, versus a product median of ${(medianMargin * 100).toFixed(1)}%.`, 'Scaling demand without fixing economics can grow low-quality revenue.', 'Review pricing, discount approval, and unit cost before increasing acquisition spend.'));

  if (overall.discountRate > 0.08) result.push(recommendation('discount-spend', overall.discountRate > 0.15 ? 'high' : 'medium', null, null, `Discounting consumes ${(overall.discountRate * 100).toFixed(1)}% of gross revenue.`, `${Math.round(overall.discountAmount).toLocaleString()} of gross-to-net value is currently given away.`, 'Discount is a commercial investment and should be measured against incremental volume and profit.', 'Rank customers, channels, and products by discount leakage and introduce approval bands for the weakest economics.'));

  for (const [key, label] of [['region', 'region'], ['channel', 'channel'], ['customer_segment', 'segment'], ['category', 'category']] as const) {
    const metrics = dimensionMetrics(records, key);
    if (metrics.length < 2) continue;
    const weakest = [...metrics].sort((a, b) => a.margin - b.margin)[0];
    const best = [...metrics].sort((a, b) => b.margin - a.margin)[0];
    const gap = best.margin - weakest.margin;
    if (gap >= 0.03) result.push(recommendation(`${label}-margin-gap`, 'medium', key, weakest.value, `${weakest.value} has the weakest ${label} margin at ${(weakest.margin * 100).toFixed(1)}%.`, `The gap to ${best.value} is ${(gap * 100).toFixed(1)} percentage points on ${Math.round(weakest.revenue).toLocaleString()} of revenue.`, 'The performance gap is large enough to justify a mix, pricing, or cost investigation.', `Decompose ${weakest.value} by product and channel/customer mix before setting a blanket growth target.`));
  }
  return result.slice(0, 8);
}

function addMonths(month: string, count: number): string {
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + count, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function linearForecast(values: number[], horizon: number, monthKeys: string[]): ForecastPoint[] {
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  const slope = denominator ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  const fitted = values.map((_, i) => intercept + slope * i);
  const rmse = Math.sqrt(values.reduce((sum, value, i) => sum + (value - fitted[i]) ** 2, 0) / Math.max(n - 2, 1));
  const monthFactors = new Map<number, number[]>();
  if (n >= 18) {
    monthKeys.forEach((key, i) => {
      const m = Number(key.slice(5, 7));
      monthFactors.set(m, [...(monthFactors.get(m) ?? []), values[i] / Math.max(fitted[i], 1)]);
    });
  }
  return Array.from({ length: horizon }, (_, index) => {
    const futureIndex = n + index;
    const month = addMonths(monthKeys.at(-1) as string, index + 1);
    const seasonRaw = monthFactors.get(Number(month.slice(5, 7)));
    const season = seasonRaw?.length ? 0.5 + 0.5 * (seasonRaw.reduce((a, b) => a + b, 0) / seasonRaw.length) : 1;
    const revenue = Math.max(0, (intercept + slope * futureIndex) * season);
    const band = 1.96 * rmse * Math.sqrt(1 + (index + 1) / Math.max(n, 1));
    return { month, revenue, lower: Math.max(0, revenue - band), upper: revenue + band };
  });
}

export function forecastRevenue(records: TransactionFact[], horizon = 3): ForecastResult | null {
  const monthly = monthlySeries(records);
  if (monthly.length < 6) return null;
  const values = monthly.map((item) => item.revenue);
  const months = monthly.map((item) => item.month);
  const points = linearForecast(values, horizon, months);
  const backtests: number[] = [];
  const start = Math.max(5, values.length - 6);
  for (let i = start; i < values.length; i += 1) {
    const prediction = linearForecast(values.slice(0, i), 1, months.slice(0, i))[0]?.revenue;
    if (prediction && values[i]) backtests.push(Math.abs(values[i] - prediction) / Math.abs(values[i]));
  }
  const validationMape = backtests.length ? backtests.reduce((sum, value) => sum + value, 0) / backtests.length : null;
  return { points, validationMape, method: monthly.length >= 18 ? 'Trend + shrunk month-of-year seasonality' : 'Linear trend (insufficient history for seasonality)' };
}

export function simulateScenario(records: TransactionFact[], priceChangePct: number, discountPointChange: number, costChangePct: number): ScenarioResult {
  const base = calculateKpis(records);
  const projectedGross = base.grossRevenue * (1 + priceChangePct / 100);
  const projectedDiscountRate = Math.min(0.95, Math.max(0, base.discountRate + discountPointChange / 100));
  const projectedRevenue = projectedGross * (1 - projectedDiscountRate);
  const projectedCost = base.cost * (1 + costChangePct / 100);
  const projectedProfit = projectedRevenue - projectedCost;
  return {
    baselineRevenue: base.revenue,
    baselineProfit: base.profit,
    baselineMargin: base.margin,
    projectedRevenue,
    projectedProfit,
    projectedMargin: projectedRevenue ? projectedProfit / projectedRevenue : 0,
  };
}
