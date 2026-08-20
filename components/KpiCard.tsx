interface KpiCardProps {
  label: string;
  value: string;
  delta?: number | null;
  context: string;
  tone?: 'default' | 'profit' | 'risk';
}

export function KpiCard({ label, value, delta, context, tone = 'default' }: KpiCardProps) {
  const deltaLabel = delta == null ? 'No prior comparable period' : `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}% vs prior`;
  return (
    <article className={`kpi-card kpi-card--${tone}`} aria-label={`${label}: ${value}`}>
      <div className="kpi-card__topline">
        <span>{label}</span>
        <span className="kpi-card__dot" aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <div className="kpi-card__meta">
        <span className={delta != null && delta < 0 ? 'delta delta--down' : 'delta'}>{deltaLabel}</span>
        <span>{context}</span>
      </div>
    </article>
  );
}
