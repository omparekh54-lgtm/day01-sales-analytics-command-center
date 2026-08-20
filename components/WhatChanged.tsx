import type { TransactionFact } from '../lib/types';
import { computeWhatChanged } from '../lib/intelligence';
import { formatMoney, formatPercent } from '../lib/view';

export function WhatChanged({ records }: { records: TransactionFact[] }) {
  const brief = computeWhatChanged(records);
  if (!brief) return <div className="empty-state">At least two months of data are required for a month-over-month change brief.</div>;
  const growth = brief.revenueGrowth === null ? 'n/a' : `${brief.revenueGrowth >= 0 ? '+' : ''}${formatPercent(brief.revenueGrowth)}`;
  return <div className="change-grid">
    <article className="change-summary"><p className="eyebrow">Latest movement</p><h3>{brief.currentMonth} vs {brief.previousMonth}</h3><div className="change-metrics"><div><span>Revenue</span><strong className={brief.revenueDelta >= 0 ? 'positive' : 'negative'}>{brief.revenueDelta >= 0 ? '+' : ''}{formatMoney(brief.revenueDelta)}</strong><small>{growth}</small></div><div><span>Gross profit</span><strong className={brief.profitDelta >= 0 ? 'positive' : 'negative'}>{brief.profitDelta >= 0 ? '+' : ''}{formatMoney(brief.profitDelta)}</strong><small>{brief.profitGrowth === null ? 'n/a' : `${brief.profitGrowth >= 0 ? '+' : ''}${formatPercent(brief.profitGrowth)}`}</small></div><div><span>Margin</span><strong className={brief.marginDelta >= 0 ? 'positive' : 'negative'}>{brief.marginDelta >= 0 ? '+' : ''}{(brief.marginDelta * 100).toFixed(1)} pp</strong><small>quality of revenue</small></div></div></article>
    <article className="driver-card"><div className="driver-title"><span className="driver-dot driver-dot--up" />Largest positive contributors</div>{brief.topPositive.map((driver) => <div className="driver-row" key={`${driver.dimension}-${driver.value}`}><div><strong>{driver.value}</strong><span>{driver.dimension}</span></div><b>+{formatMoney(driver.delta)}</b></div>)}{!brief.topPositive.length && <p className="muted">No positive contributors in the latest month.</p>}</article>
    <article className="driver-card"><div className="driver-title"><span className="driver-dot driver-dot--down" />Largest negative contributors</div>{brief.topNegative.map((driver) => <div className="driver-row" key={`${driver.dimension}-${driver.value}`}><div><strong>{driver.value}</strong><span>{driver.dimension}</span></div><b>{formatMoney(driver.delta)}</b></div>)}{!brief.topNegative.length && <p className="muted">No negative contributors in the latest month.</p>}</article>
  </div>;
}
