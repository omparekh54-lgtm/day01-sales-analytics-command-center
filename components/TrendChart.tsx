import type { MonthlyPoint } from '../lib/types';
import { formatMoney, formatPercent } from '../lib/view';

type Metric = 'revenue' | 'profit' | 'margin';

const WIDTH = 900;
const HEIGHT = 300;
const PAD = { left: 58, right: 20, top: 30, bottom: 44 };

export function TrendChart({ data, metric }: { data: MonthlyPoint[]; metric: Metric }) {
  if (!data.length) return <div className="empty-state">No monthly data matches the selected filters.</div>;
  const values = data.map((point) => point[metric]);
  const min = metric === 'margin' ? Math.min(...values) * 0.96 : 0;
  const max = Math.max(...values) * 1.06 || 1;
  const x = (index: number) => PAD.left + (index / Math.max(1, data.length - 1)) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + (1 - (value - min) / Math.max(1e-9, max - min)) * (HEIGHT - PAD.top - PAD.bottom);
  const points = data.map((point, index) => `${x(index)},${y(point[metric])}`).join(' ');
  const formatter = metric === 'margin' ? formatPercent : formatMoney;
  const gridValues = Array.from({ length: 5 }, (_, index) => min + ((max - min) * index) / 4).reverse();
  return (
    <div className="chart-wrap" role="img" aria-label={`${metric} monthly trend across ${data.length} months`}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="trend-chart" preserveAspectRatio="none">
        {gridValues.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} className="chart-gridline" />
            <text x={PAD.left - 10} y={y(tick) + 4} textAnchor="end" className="chart-label">{formatter(tick)}</text>
          </g>
        ))}
        <polyline points={points} fill="none" className="trend-line" />
        {data.map((point, index) => (
          <g key={point.month} className="chart-point">
            <circle cx={x(index)} cy={y(point[metric])} r="4" tabIndex={0}>
              <title>{`${point.month}: ${formatter(point[metric])}`}</title>
            </circle>
            {(index === 0 || index === data.length - 1 || index % 4 === 0) && (
              <text x={x(index)} y={HEIGHT - 15} textAnchor="middle" className="chart-label">{point.month.slice(2)}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
