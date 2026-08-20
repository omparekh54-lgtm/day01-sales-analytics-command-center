import type { Artifact, Metadata, Recommendation, TransactionFact } from './types';
import { buildDynamicRecommendations, detectRevenueAnomalies } from './intelligence.ts';

export type CanonicalField = 'order_date' | 'order_id' | 'product' | 'category' | 'region' | 'channel' | 'customer_segment' | 'quantity' | 'net_revenue' | 'cost' | 'gross_profit' | 'discount_rate' | 'discount_amount';
export type ColumnMapping = Record<CanonicalField, string>;
export interface ParsedFile { fileName: string; rows: Record<string, unknown>[]; columns: string[]; }
export interface QualityIssue { row: number; field: string; value: string; issue: string; }
export interface QualityReport { totalRows: number; validRows: number; rejectedRows: number; duplicateRows: number; issueCount: number; score: number; issues: QualityIssue[]; warnings: string[]; checks: string[]; }
export interface NormalizedDataset { artifact: Artifact; quality: QualityReport; sourceLabel: string; }

export const FIELD_LABELS: Array<{ key: CanonicalField; label: string; required: boolean; note: string }> = [
  { key: 'order_date', label: 'Order date', required: true, note: 'Invoice / transaction date' },
  { key: 'order_id', label: 'Order or invoice ID', required: false, note: 'Recommended for order count & AOV' },
  { key: 'product', label: 'Product / SKU', required: true, note: 'Item or service name' },
  { key: 'category', label: 'Category', required: false, note: 'Product group' },
  { key: 'region', label: 'Region', required: false, note: 'Territory / state / zone' },
  { key: 'channel', label: 'Channel', required: false, note: 'Online / retail / distributor etc.' },
  { key: 'customer_segment', label: 'Customer segment', required: false, note: 'B2B / consumer / enterprise etc.' },
  { key: 'quantity', label: 'Quantity', required: false, note: 'Defaults to 1 if unavailable' },
  { key: 'net_revenue', label: 'Net revenue / sales', required: true, note: 'Revenue after discount, per row' },
  { key: 'cost', label: 'Cost / COGS', required: false, note: 'Use this OR gross profit' },
  { key: 'gross_profit', label: 'Gross profit', required: false, note: 'Use this OR cost / COGS' },
  { key: 'discount_rate', label: 'Discount rate', required: false, note: 'Decimal or percentage' },
  { key: 'discount_amount', label: 'Discount amount', required: false, note: 'Absolute discount value' },
];

const ALIASES: Record<CanonicalField, string[]> = {
  order_date: ['order date', 'invoice date', 'date', 'transaction date', 'bill date', 'sale date'],
  order_id: ['order id', 'invoice no', 'invoice number', 'invoice id', 'order no', 'bill no', 'receipt no', 'transaction id'],
  product: ['product', 'product name', 'sku', 'sku name', 'item', 'item name', 'service', 'description'],
  category: ['category', 'product category', 'department', 'group', 'product group'],
  region: ['region', 'territory', 'state', 'zone', 'area', 'market'],
  channel: ['channel', 'sales channel', 'source', 'order channel', 'store type'],
  customer_segment: ['customer segment', 'segment', 'customer type', 'client type', 'account type'],
  quantity: ['quantity', 'qty', 'units', 'units sold', 'volume'],
  net_revenue: ['net revenue', 'revenue', 'sales', 'sales value', 'net sales', 'amount', 'net amount', 'invoice value', 'total'],
  cost: ['cost', 'cogs', 'cost of goods sold', 'total cost', 'product cost', 'landed cost'],
  gross_profit: ['gross profit', 'profit', 'contribution', 'margin value', 'gp'],
  discount_rate: ['discount rate', 'discount %', 'discount percentage', 'discount pct', 'discount'],
  discount_amount: ['discount amount', 'discount value', 'discount amt', 'discount spend'],
};

function cleanName(value: string): string { return value.toLowerCase().replace(/[_\-]+/g, ' ').replace(/[^a-z0-9% ]/g, '').replace(/\s+/g, ' ').trim(); }
export function inferMapping(columns: string[]): ColumnMapping {
  const normalized = columns.map((name) => ({ raw: name, clean: cleanName(name) }));
  const output = {} as ColumnMapping;
  for (const field of FIELD_LABELS) {
    const aliases = ALIASES[field.key];
    const exact = normalized.find((col) => aliases.includes(col.clean));
    const fuzzy = normalized.find((col) => aliases.some((alias) => col.clean.includes(alias) || alias.includes(col.clean)));
    output[field.key] = (exact ?? fuzzy)?.raw ?? '';
  }
  return output;
}

function parseCsv(text: string): Record<string, unknown>[] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]; const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && next === '\n') i += 1; row.push(cell); if (row.some((value) => value.trim() !== '')) rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  row.push(cell); if (row.some((value) => value.trim() !== '')) rows.push(row); if (rows.length < 2) return [];
  const headers = rows[0].map((value) => value.trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

export async function parseSalesFile(file: File): Promise<ParsedFile> {
  const lower = file.name.toLowerCase(); let rows: Record<string, unknown>[];
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) rows = parseCsv(await file.text());
  else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const XLSX = await import('xlsx'); const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }); const firstSheet = workbook.Sheets[workbook.SheetNames[0]]; rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' }) as Record<string, unknown>[];
  } else throw new Error('Unsupported file type. Please upload CSV, XLSX, or XLS.');
  const columns = rows.length ? Object.keys(rows[0]) : []; if (!rows.length || !columns.length) throw new Error('The uploaded file does not contain a readable table.'); return { fileName: file.name, rows, columns };
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value; if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[$€£₹,%()\s]/g, '').replace(/,/g, ''); if (!cleaned) return null; const number = Number(cleaned); if (!Number.isFinite(number)) return null; return value.includes('(') && value.includes(')') ? -number : number;
}
function toDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 20_000 && value < 80_000) { const excelEpoch = new Date(Date.UTC(1899, 11, 30)); return new Date(excelEpoch.getTime() + value * 86_400_000).toISOString().slice(0, 10); }
  const raw = String(value ?? '').trim(); if (!raw) return null; const date = new Date(raw); if (!Number.isNaN(date.valueOf())) return date.toISOString().slice(0, 10);
  const dmy = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/); if (dmy) { const year = Number(dmy[3]) < 100 ? 2000 + Number(dmy[3]) : Number(dmy[3]); const candidate = new Date(Date.UTC(year, Number(dmy[2]) - 1, Number(dmy[1]))); if (!Number.isNaN(candidate.valueOf())) return candidate.toISOString().slice(0, 10); } return null;
}
function textValue(row: Record<string, unknown>, column: string, fallback: string): string { const value = column ? String(row[column] ?? '').trim() : ''; return value || fallback; }
function buildFilterOptions(records: TransactionFact[]) { const values = (key: keyof TransactionFact) => Array.from(new Set(records.map((row) => String(row[key])))).filter(Boolean).sort(); return { regions: values('region'), channels: values('channel'), segments: values('customer_segment'), categories: values('category'), products: values('product') }; }

export function normalizeUploadedRows(parsed: ParsedFile, mapping: ColumnMapping): NormalizedDataset {
  for (const key of ['order_date', 'product', 'net_revenue'] as CanonicalField[]) if (!mapping[key]) throw new Error(`${FIELD_LABELS.find((item) => item.key === key)?.label} must be mapped.`);
  if (!mapping.cost && !mapping.gross_profit) throw new Error('Map either Cost / COGS or Gross profit so profitability is real rather than invented.');
  const issues: QualityIssue[] = []; const warnings: string[] = []; const valid: TransactionFact[] = []; const exactRows = new Set<string>(); let duplicateRows = 0;
  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 2; const fingerprint = JSON.stringify(row); if (exactRows.has(fingerprint)) { duplicateRows += 1; issues.push({ row: rowNumber, field: 'row', value: '', issue: 'Exact duplicate row' }); return; } exactRows.add(fingerprint);
    const date = toDate(row[mapping.order_date]); const product = textValue(row, mapping.product, 'Unspecified product'); const revenue = toNumber(row[mapping.net_revenue]); const quantity = mapping.quantity ? toNumber(row[mapping.quantity]) : 1; let cost = mapping.cost ? toNumber(row[mapping.cost]) : null; let profit = mapping.gross_profit ? toNumber(row[mapping.gross_profit]) : null; let discountRate = mapping.discount_rate ? toNumber(row[mapping.discount_rate]) : 0; let discountAmount = mapping.discount_amount ? toNumber(row[mapping.discount_amount]) : null;
    const rowIssues: QualityIssue[] = [];
    if (!date) rowIssues.push({ row: rowNumber, field: 'order_date', value: String(row[mapping.order_date] ?? ''), issue: 'Unparseable or missing date' });
    if (!product.trim()) rowIssues.push({ row: rowNumber, field: 'product', value: '', issue: 'Missing product' });
    if (revenue === null || revenue < 0) rowIssues.push({ row: rowNumber, field: 'net_revenue', value: String(row[mapping.net_revenue] ?? ''), issue: 'Revenue must be a non-negative number' });
    if (quantity === null || quantity <= 0) rowIssues.push({ row: rowNumber, field: 'quantity', value: String(row[mapping.quantity] ?? ''), issue: 'Quantity must be positive' });
    if (cost === null && profit === null) rowIssues.push({ row: rowNumber, field: 'cost/profit', value: '', issue: 'Cost or gross profit is required' });
    if (rowIssues.length) { issues.push(...rowIssues); return; }
    const netRevenue = revenue as number; const units = quantity as number; if (cost === null && profit !== null) cost = netRevenue - profit; if (profit === null && cost !== null) profit = netRevenue - cost;
    if (cost === null || profit === null || !Number.isFinite(cost) || !Number.isFinite(profit)) { issues.push({ row: rowNumber, field: 'cost/profit', value: '', issue: 'Unable to derive cost and gross profit' }); return; }
    if (cost < 0) { issues.push({ row: rowNumber, field: 'cost', value: String(cost), issue: 'Cost cannot be negative' }); return; }
    if (discountRate === null) discountRate = 0; if (discountRate > 1 && discountRate <= 100) discountRate /= 100; if (discountRate < 0 || discountRate >= 1) { issues.push({ row: rowNumber, field: 'discount_rate', value: String(row[mapping.discount_rate] ?? ''), issue: 'Discount rate must be between 0% and <100%' }); return; }
    if (discountAmount === null) discountAmount = discountRate ? netRevenue * discountRate / Math.max(1 - discountRate, 0.0001) : 0; const grossRevenue = netRevenue + Math.max(discountAmount, 0); const derivedDiscountRate = grossRevenue ? Math.max(discountAmount, 0) / grossRevenue : 0;
    valid.push({ transaction_id: `upload-${String(index + 1).padStart(7, '0')}`, order_id: textValue(row, mapping.order_id, `ROW-${String(index + 1).padStart(7, '0')}`), order_date: date as string, region: textValue(row, mapping.region, 'Unspecified'), channel: textValue(row, mapping.channel, 'Unspecified'), customer_segment: textValue(row, mapping.customer_segment, 'Unspecified'), category: textValue(row, mapping.category, 'Unspecified'), product, quantity: units, gross_revenue: grossRevenue, discount_amount: Math.max(discountAmount, 0), discount_rate: derivedDiscountRate, net_revenue: netRevenue, cost, gross_profit: profit, gross_margin: netRevenue ? profit / netRevenue : 0, month: (date as string).slice(0, 7) });
  });
  if (!mapping.order_id) warnings.push('Order ID was not mapped. Each row is treated as one order, so AOV may be approximate.');
  for (const field of ['region', 'channel', 'customer_segment', 'category'] as CanonicalField[]) if (!mapping[field]) warnings.push(`${FIELD_LABELS.find((item) => item.key === field)?.label} was not mapped; that drilldown will use “Unspecified”.`);
  const rejected = parsed.rows.length - valid.length; const rejectionRate = parsed.rows.length ? rejected / parsed.rows.length : 1; const score = Math.max(0, Math.round(100 - rejectionRate * 100 - Math.min(warnings.length * 1.5, 8)));
  const quality: QualityReport = { totalRows: parsed.rows.length, validRows: valid.length, rejectedRows: rejected, duplicateRows, issueCount: issues.length, score, issues: issues.slice(0, 500), warnings, checks: ['schema_mapping', 'date_parse', 'numeric_sales', 'positive_quantity', 'cost_or_profit', 'discount_bounds', 'exact_duplicates'] };
  if (!valid.length) throw new Error('No valid rows remain after validation. Review the mapping and source data.');
  const dates = valid.map((row) => row.order_date).sort(); const totalRevenue = valid.reduce((sum, row) => sum + row.net_revenue, 0); const totalProfit = valid.reduce((sum, row) => sum + row.gross_profit, 0); const totalGross = valid.reduce((sum, row) => sum + row.gross_revenue, 0); const totalDiscount = valid.reduce((sum, row) => sum + row.discount_amount, 0); const totalCost = valid.reduce((sum, row) => sum + row.cost, 0); const orders = new Set(valid.map((row) => row.order_id)).size; const units = valid.reduce((sum, row) => sum + row.quantity, 0);
  const metadata: Metadata = { schema_version: '3.0.0-user-data', build_id: `BYOD-${Date.now().toString(36).toUpperCase()}`, build_mode: 'browser_private_upload', source_file: parsed.fileName, source_sha256: `browser-${parsed.fileName}-${parsed.rows.length}-${valid.length}`, row_count: valid.length, column_count: parsed.columns.length, validation_status: 'passed', validation_checks: quality.checks, random_seed: 0, date_min: dates[0], date_max: dates[dates.length - 1] };
  const recommendations: Recommendation[] = buildDynamicRecommendations(valid);
  const artifact: Artifact = { metadata, filter_options: buildFilterOptions(valid), summary: { net_revenue: totalRevenue, gross_revenue: totalGross, gross_profit: totalProfit, gross_margin: totalRevenue ? totalProfit / totalRevenue : 0, discount_amount: totalDiscount, discount_rate: totalGross ? totalDiscount / totalGross : 0, orders, units, average_order_value: orders ? totalRevenue / orders : 0, average_selling_price: units ? totalRevenue / units : 0, cost: totalCost }, monthly_performance: [], dimensions: {}, combinations: {}, pareto: {}, discount: {}, product_economics: [], anomalies: detectRevenueAnomalies(valid), seasonality: {}, recommendations, methodology: { upload_processing: 'The uploaded workbook is parsed and analyzed locally in the browser. The file is not sent to an application server.', validation: 'Rows with unparseable dates, invalid revenue, non-positive quantities, missing cost/profit, invalid discounts, or exact duplicates are rejected and reported.', economics: 'Gross profit = net revenue − cost. If gross profit is mapped instead of cost, cost is derived as net revenue − gross profit.', anomaly_detection: 'Monthly revenue anomalies use median absolute deviation robust z-scores with a threshold of 3.0.', forecast: 'Forecasts use a lightweight trend + seasonality model with expanding-window error estimation. Forecasts are directional, not guarantees.', scenarios: 'Scenario simulation holds unit volume constant and changes price, discount, and cost assumptions to estimate commercial sensitivity.' }, records: valid };
  return { artifact, quality, sourceLabel: parsed.fileName };
}

export function templateCsv(): string {
  return [
    ['Order Date', 'Invoice No', 'Product', 'Category', 'Region', 'Channel', 'Customer Segment', 'Quantity', 'Net Revenue', 'COGS', 'Discount %'].join(','),
    ['2026-08-01', 'INV-1001', 'Example Product', 'Example Category', 'West', 'Online', 'SMB', '2', '2400', '1500', '10'].join(','),
    ['2026-08-02', 'INV-1002', 'Example Product 2', 'Example Category', 'South', 'Retail', 'Consumer', '1', '1800', '1050', '5'].join(','),
  ].join('\n');
}
