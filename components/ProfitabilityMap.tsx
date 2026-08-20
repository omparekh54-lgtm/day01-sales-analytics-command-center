import type { ProductPoint } from '../lib/types';
import { formatMoney, formatPercent } from '../lib/view';

const W = 760;
const H = 330;
const P = { l: 64, r: 26, t: 26, b: 52 };

export function ProfitabilityMap({ rows }: { rows: ProductPoint[] }) {
  if (!rows.length) return <div className="empty-state">No products to plot.</div>;
  const maxRevenue = Math.max(...rows.map((row) => row.revenue), 1);
  const minMargin = Math.min(...rows.map((row) => row.margin), 0);
  const maxMargin = Math.max(...rows.map((row) => row.margin), 0.01);
  const x = (revenue: number) => P.l + (revenue / maxRevenue) * (W - P.l - P.r);
  const y = (margin: number) => P.t + (1 - (margin - minMargin) / Math.max(0.001, maxMargin - minMargin)) * (H - P.t - P.b);
  const medianMargin = [...rows].sort((a, b) => a.margin - b.margin)[Math.floor(rows.length / 2)]?.margin ?? 0;
  return (
    <div className="chart-wrap" role="img" aria-label="Product profitability map with revenue on x-axis and margin on y-axis">
      <svg viewBox={`0 0 ${W} ${H}`} className="scatter-chart">
        <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} className="chart-axis" />
        <line x1={P.l} x2={P.l} y1={P.t} y2={H - P.b} className="chart-axis" />
        <line x1={P.l} x2={W - P.r} y1={y(medianMargin)} y2={y(medianMargin)} className="chart-benchmark" />
        <text x={W - P.r} y={y(medianMargin) - 7} textAnchor="end" className="chart-label">median margin {formatPercent(medianMargin)}</text>
        {rows.map((row) => {
          const radius = 7 + Math.min(10, row.units / Math.max(1, Math.max(...rows.map((item) => item.units))) * 10);
          return (
            <g key={row.product} className={row.margin < medianMargin ? 'scatter-point scatter-point--risk' : 'scatter-point'}>
              <circle cx={x(row.revenue)} cy={y(row.margin)} r={radius} tabIndex={0}>
                <title>{`${row.product} — ${formatMoney(row.revenue)} revenue, ${formatPercent(row.margin)} margin, ${formatPercent(row.discountRate)} discount`}</title>
              </circle>
            </g>
          );
        })}
        <text x={(P.l + W - P.r) / 2} y={H - 12} textAnchor="middle" className="chart-label chart-axis-title">Net revenue</text>
        <text x="18" y={(P.t + H - P.b) / 2} textAnchor="middle" transform={`rotate(-90 18 ${(P.t + H - P.b) / 2})`} className="chart-label chart-axis-title">Gross margin</text>
        <text x={P.l} y={H - P.b + 20} className="chart-label">$0</text>
        <text x={W - P.r} y={H - P.b + 20} textAnchor="end" className="chart-label">{formatMoney(maxRevenue)}</text>
      </svg>
    </div>
  );
}
