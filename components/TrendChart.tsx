'use client';

import { useState } from 'react';
import type { MonthlyPoint } from '../lib/types';
import { formatMoney, formatPercent } from '../lib/view';

type Metric = 'revenue' | 'profit' | 'margin';

const WIDTH = 900;
const HEIGHT = 300;
const PAD = { left: 58, right: 20, top: 30, bottom: 44 };

export function TrendChart({ data, metric }: { data: MonthlyPoint[]; metric: Metric }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!data.length) return <div className="empty-state">No monthly data matches the selected filters.</div>;
  const values = data.map((point) => point[metric]);
  const min = metric === 'margin' ? Math.min(...values) * 0.96 : 0;
  const max = Math.max(...values) * 1.06 || 1;
  const x = (index: number) => PAD.left + (index / Math.max(1, data.length - 1)) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + (1 - (value - min) / Math.max(1e-9, max - min)) * (HEIGHT - PAD.top - PAD.bottom);
  const points = data.map((point, index) => `${x(index)},${y(point[metric])}`).join(' ');
  const areaPoints = `${PAD.left},${HEIGHT - PAD.bottom} ${points} ${x(data.length - 1)},${HEIGHT - PAD.bottom}`;
  const formatter = metric === 'margin' ? formatPercent : formatMoney;
  const gridValues = Array.from({ length: 5 }, (_, index) => min + ((max - min) * index) / 4).reverse();
  const active = hovered === null ? null : data[hovered];

  return (
    <div className="chart-wrap chart-wrap--interactive" role="img" aria-label={`${metric} monthly trend across ${data.length} months`}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="trend-chart" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`trend-fill-${metric}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridValues.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} className="chart-gridline" />
            <text x={PAD.left - 10} y={y(tick) + 4} textAnchor="end" className="chart-label">{formatter(tick)}</text>
          </g>
        ))}
        <polygon points={areaPoints} className="trend-area" fill={`url(#trend-fill-${metric})`} />
        <polyline key={`${metric}-${data.length}-${data.at(-1)?.month}`} points={points} fill="none" className="trend-line" pathLength="1" />
        {hovered !== null && <line x1={x(hovered)} x2={x(hovered)} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="chart-crosshair" />}
        {data.map((point, index) => (
          <g key={point.month} className={`chart-point ${hovered === index ? 'chart-point--active' : ''}`}>
            <circle cx={x(index)} cy={y(point[metric])} r="4" tabIndex={0} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} onClick={() => setHovered(index)}>
              <title>{`${point.month}: ${formatter(point[metric])}`}</title>
            </circle>
            <circle className="chart-hit" cx={x(index)} cy={y(point[metric])} r="15" fill="transparent" onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} />
            {(index === 0 || index === data.length - 1 || index % 4 === 0) && (
              <text x={x(index)} y={HEIGHT - 15} textAnchor="middle" className="chart-label">{point.month.slice(2)}</text>
            )}
          </g>
        ))}
      </svg>
      {active && hovered !== null && <div className="chart-tooltip" style={{ left: `${(x(hovered) / WIDTH) * 100}%`, top: `${Math.max(5, (y(active[metric]) / HEIGHT) * 100 - 8)}%` }}>
        <span>{active.month}</span><strong>{formatter(active[metric])}</strong><small>Profit {formatMoney(active.profit)} · Margin {formatPercent(active.margin)}</small>
      </div>}
    </div>
  );
}
