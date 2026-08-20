'use client';

import { useMemo, useState } from 'react';
import type { TransactionFact } from '../lib/types';
import { buildPeriodBrief, type ComparisonMode, type DrillFilterKey } from '../lib/decision';
import { formatMoney, formatPercent } from '../lib/view';

export function WhatChanged({ records, onDrillDown }: { records: TransactionFact[]; onDrillDown?: (key: DrillFilterKey, value: string) => void }) {
  const [mode, setMode] = useState<ComparisonMode>('mom');
  const mom = useMemo(() => buildPeriodBrief(records, 'mom'), [records]);
  const yoy = useMemo(() => buildPeriodBrief(records, 'yoy'), [records]);
  const brief = mode === 'yoy' ? yoy : mom;

  if (!mom && !yoy) return <div className="empty-state">At least two comparable months of data are required for a change brief.</div>;

  const activeBrief = brief ?? mom ?? yoy;
  if (!activeBrief) return null;
  const growth = activeBrief.revenueGrowth === null ? 'n/a' : `${activeBrief.revenueGrowth >= 0 ? '+' : ''}${formatPercent(activeBrief.revenueGrowth)}`;
  const modeLabel = activeBrief.mode === 'yoy' ? 'Year over year' : 'Month over month';

  const renderDriver = (driver: (typeof activeBrief.topPositive)[number], positive: boolean) => (
    <div className="driver-row driver-row--action" key={`${driver.dimension}-${driver.value}`}>
      <div><strong>{driver.value}</strong><span>{driver.dimension}</span></div>
      <div className="driver-value"><b>{positive ? '+' : ''}{formatMoney(driver.delta)}</b>{onDrillDown && <button type="button" onClick={() => onDrillDown(driver.filterKey, driver.value)}>Inspect</button>}</div>
    </div>
  );

  return <div className="change-wrap">
    <div className="change-toolbar no-print">
      <span>Compare latest complete month</span>
      <div className="segmented" role="group" aria-label="Comparison period">
        <button type="button" aria-pressed={mode === 'mom'} className={mode === 'mom' ? 'segmented__active' : ''} onClick={() => setMode('mom')} disabled={!mom}>MoM</button>
        <button type="button" aria-pressed={mode === 'yoy'} className={mode === 'yoy' ? 'segmented__active' : ''} onClick={() => setMode('yoy')} disabled={!yoy} title={!yoy ? '12 months of comparable history required' : undefined}>YoY</button>
      </div>
    </div>
    <div className="change-grid" key={`${activeBrief.mode}-${activeBrief.currentMonth}-${activeBrief.previousMonth}`}>
      <article className="change-summary"><p className="eyebrow">{modeLabel}</p><h3>{activeBrief.currentMonth} vs {activeBrief.previousMonth}</h3><div className="change-metrics"><div><span>Revenue</span><strong className={activeBrief.revenueDelta >= 0 ? 'positive' : 'negative'}>{activeBrief.revenueDelta >= 0 ? '+' : ''}{formatMoney(activeBrief.revenueDelta)}</strong><small>{growth}</small></div><div><span>Gross profit</span><strong className={activeBrief.profitDelta >= 0 ? 'positive' : 'negative'}>{activeBrief.profitDelta >= 0 ? '+' : ''}{formatMoney(activeBrief.profitDelta)}</strong><small>{activeBrief.profitGrowth === null ? 'n/a' : `${activeBrief.profitGrowth >= 0 ? '+' : ''}${formatPercent(activeBrief.profitGrowth)}`}</small></div><div><span>Margin</span><strong className={activeBrief.marginDelta >= 0 ? 'positive' : 'negative'}>{activeBrief.marginDelta >= 0 ? '+' : ''}{(activeBrief.marginDelta * 100).toFixed(1)} pp</strong><small>quality of revenue</small></div></div></article>
      <article className="driver-card"><div className="driver-title"><span className="driver-dot driver-dot--up" />Largest positive contributors</div>{activeBrief.topPositive.map((driver) => renderDriver(driver, true))}{!activeBrief.topPositive.length && <p className="muted">No positive contributors in this comparison.</p>}</article>
      <article className="driver-card"><div className="driver-title"><span className="driver-dot driver-dot--down" />Largest negative contributors</div>{activeBrief.topNegative.map((driver) => renderDriver(driver, false))}{!activeBrief.topNegative.length && <p className="muted">No negative contributors in this comparison.</p>}</article>
    </div>
  </div>;
}
