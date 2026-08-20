export type Severity = 'high' | 'medium' | 'info';

export interface Metadata {
  schema_version: string;
  build_id: string;
  build_mode: string;
  source_file: string;
  source_sha256: string;
  row_count: number;
  column_count: number;
  validation_status: 'passed' | 'failed';
  validation_checks: string[];
  random_seed: number;
  date_min: string;
  date_max: string;
}

export interface TransactionFact {
  transaction_id: string;
  order_id: string;
  order_date: string;
  region: string;
  channel: string;
  customer_segment: string;
  category: string;
  product: string;
  quantity: number;
  gross_revenue: number;
  discount_amount: number;
  discount_rate: number;
  net_revenue: number;
  cost: number;
  gross_profit: number;
  gross_margin: number;
  month: string;
}

export interface Recommendation {
  id: string;
  severity: Severity;
  scope: { dimension: string | null; value: string | null };
  observation: string;
  evidence: string;
  implication: string;
  recommendation: string;
}

export interface Anomaly {
  month: string;
  metric: 'revenue' | 'profit' | 'margin';
  value: number;
  robust_z_score: number;
  direction: 'high' | 'low';
  method: string;
  threshold: number;
}

export interface Artifact {
  metadata: Metadata;
  filter_options: {
    regions: string[];
    channels: string[];
    segments: string[];
    categories: string[];
    products: string[];
  };
  summary: Record<string, number>;
  monthly_performance: Array<Record<string, string | number | null>>;
  dimensions: Record<string, Array<Record<string, string | number>>>;
  combinations: Record<string, Array<Record<string, string | number>>>;
  pareto: Record<string, Record<string, unknown>>;
  discount: Record<string, unknown>;
  product_economics: Array<Record<string, string | number>>;
  anomalies: Anomaly[];
  seasonality: Record<string, unknown>;
  recommendations: Recommendation[];
  methodology: Record<string, string>;
  records: TransactionFact[];
}

export interface Filters {
  startDate: string;
  endDate: string;
  region: string;
  channel: string;
  segment: string;
  category: string;
  product: string;
}

export interface ViewKpis {
  revenue: number;
  grossRevenue: number;
  profit: number;
  margin: number;
  discountAmount: number;
  discountRate: number;
  orders: number;
  units: number;
  aov: number;
  asp: number;
  cost: number;
}

export interface MonthlyPoint {
  month: string;
  revenue: number;
  profit: number;
  margin: number;
  discountRate: number;
}

export interface ProductPoint {
  product: string;
  revenue: number;
  profit: number;
  margin: number;
  discountRate: number;
  units: number;
}
