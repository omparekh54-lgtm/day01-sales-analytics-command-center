import type { Filters, MonthlyPoint, ProductPoint, TransactionFact, ViewKpis } from './types';

export const ALL = 'All';

export function defaultFilters(minDate: string, maxDate: string): Filters {
  return { startDate: minDate, endDate: maxDate, region: ALL, channel: ALL, segment: ALL, category: ALL, product: ALL };
}

export function filterFacts(records: TransactionFact[], filters: Filters): TransactionFact[] {
  return records.filter((row) => {
    if (row.order_date < filters.startDate || row.order_date > filters.endDate) return false;
    if (filters.region !== ALL && row.region !== filters.region) return false;
    if (filters.channel !== ALL && row.channel !== filters.channel) return false;
    if (filters.segment !== ALL && row.customer_segment !== filters.segment) return false;
    if (filters.category !== ALL && row.category !== filters.category) return false;
    if (filters.product !== ALL && row.product !== filters.product) return false;
    return true;
  });
}

export function calculateKpis(records: TransactionFact[]): ViewKpis {
  if (!records.length) return { revenue: 0, grossRevenue: 0, profit: 0, margin: 0, discountAmount: 0, discountRate: 0, orders: 0, units: 0, aov: 0, asp: 0, cost: 0 };
  let revenue = 0, grossRevenue = 0, profit = 0, discountAmount = 0, units = 0, cost = 0;
  const orders = new Set<string>();
  for (const row of records) { revenue += row.net_revenue; grossRevenue += row.gross_revenue; profit += row.gross_profit; discountAmount += row.discount_amount; units += row.quantity; cost += row.cost; orders.add(row.order_id); }
  return { revenue, grossRevenue, profit, margin: revenue ? profit / revenue : 0, discountAmount, discountRate: grossRevenue ? discountAmount / grossRevenue : 0, orders: orders.size, units, aov: orders.size ? revenue / orders.size : 0, asp: units ? revenue / units : 0, cost };
}

export function monthlySeries(records: TransactionFact[]): MonthlyPoint[] {
  const groups = new Map<string, { revenue: number; profit: number; gross: number; discount: number }>();
  for (const row of records) { const bucket = groups.get(row.month) ?? { revenue: 0, profit: 0, gross: 0, discount: 0 }; bucket.revenue += row.net_revenue; bucket.profit += row.gross_profit; bucket.gross += row.gross_revenue; bucket.discount += row.discount_amount; groups.set(row.month, bucket); }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, revenue: value.revenue, profit: value.profit, margin: value.revenue ? value.profit / value.revenue : 0, discountRate: value.gross ? value.discount / value.gross : 0 }));
}

export function productSeries(records: TransactionFact[]): ProductPoint[] {
  const groups = new Map<string, ProductPoint & { gross: number; discount: number }>();
  for (const row of records) { const bucket = groups.get(row.product) ?? { product: row.product, revenue: 0, profit: 0, margin: 0, discountRate: 0, units: 0, gross: 0, discount: 0 }; bucket.revenue += row.net_revenue; bucket.profit += row.gross_profit; bucket.units += row.quantity; bucket.gross += row.gross_revenue; bucket.discount += row.discount_amount; groups.set(row.product, bucket); }
  return Array.from(groups.values()).map((row) => ({ product: row.product, revenue: row.revenue, profit: row.profit, margin: row.revenue ? row.profit / row.revenue : 0, discountRate: row.gross ? row.discount / row.gross : 0, units: row.units })).sort((a, b) => b.revenue - a.revenue);
}

export function previousPeriodFilters(filters: Filters, minDate: string): Filters | null {
  const start = new Date(`${filters.startDate}T00:00:00Z`); const end = new Date(`${filters.endDate}T00:00:00Z`); if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end < start) return null;
  const durationMs = end.getTime() - start.getTime() + 86_400_000; const previousEnd = new Date(start.getTime() - 86_400_000); const previousStart = new Date(previousEnd.getTime() - durationMs + 86_400_000); const min = new Date(`${minDate}T00:00:00Z`); if (previousStart < min) return null; const iso = (date: Date) => date.toISOString().slice(0, 10); return { ...filters, startDate: iso(previousStart), endDate: iso(previousEnd) };
}

let displayCurrency = 'USD';
export function setDisplayCurrency(currency: string): void { displayCurrency = currency; }
export function formatMoney(value: number): string { return new Intl.NumberFormat(undefined, { style: 'currency', currency: displayCurrency, maximumFractionDigits: 0 }).format(value); }
export function formatNumber(value: number): string { return new Intl.NumberFormat('en-US', { notation: value >= 1_000_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value); }
export function formatPercent(value: number): string { return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value); }
