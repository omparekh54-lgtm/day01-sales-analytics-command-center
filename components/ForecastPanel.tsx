import type { TransactionFact } from '../lib/types';
import { forecastRevenue } from '../lib/intelligence';
import { formatMoney, formatPercent } from '../lib/view';

export function ForecastPanel({ records }: { records: TransactionFact[] }) {
  const result = forecastRevenue(records, 3);
  if (!result) return <div className="empty-state">At least six months of history are required for the lightweight revenue forecast.</div>;
  return <div className="forecast-layout"><div className="forecast-list">{result.points.map((point) => <div className="forecast-row" key={point.month}><div><span>{point.month}</span><strong>{formatMoney(point.revenue)}</strong></div><div className="forecast-range">Expected range {formatMoney(point.lower)} – {formatMoney(point.upper)}</div></div>)}</div><div className="forecast-meta"><p className="eyebrow">Model card</p><h3>{result.method}</h3><p>{result.validationMape === null ? 'Not enough rolling history for validation.' : `Expanding-window one-step MAPE: ${formatPercent(result.validationMape)}.`}</p><p>Use this as directional planning input, not a guaranteed sales target.</p></div></div>;
}
