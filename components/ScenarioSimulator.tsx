'use client';
import { useMemo, useState } from 'react';
import type { TransactionFact } from '../lib/types';
import { simulateScenario } from '../lib/intelligence';
import { breakEvenPriceChange } from '../lib/decision';
import { formatMoney, formatPercent } from '../lib/view';

export function ScenarioSimulator({ records }: { records: TransactionFact[] }) {
  const [price, setPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [cost, setCost] = useState(0);
  const result = useMemo(() => simulateScenario(records, price, discount, cost), [records, price, discount, cost]);
  const breakEven = useMemo(() => breakEvenPriceChange(records, discount, cost), [records, discount, cost]);
  const profitDelta = result.projectedProfit - result.baselineProfit;
  const breakEvenGap = breakEven === null ? null : price - breakEven;

  function preset(next: { price?: number; discount?: number; cost?: number }) {
    setPrice(next.price ?? 0);
    setDiscount(next.discount ?? 0);
    setCost(next.cost ?? 0);
  }

  return <div className="scenario-grid">
    <div className="scenario-controls">
      <div className="scenario-presets no-print" aria-label="Scenario presets">
        <span>Quick tests</span>
        <button type="button" onClick={() => preset({ discount: -2 })}>Tighten discount 2pp</button>
        <button type="button" onClick={() => preset({ cost: 5 })}>Cost +5% shock</button>
        <button type="button" onClick={() => preset({ price: 3 })}>Price +3%</button>
      </div>
      <label><span>Price change</span><b>{price > 0 ? '+' : ''}{price}%</b><input type="range" min="-15" max="15" step="1" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label>
      <label><span>Discount rate change</span><b>{discount > 0 ? '+' : ''}{discount} pp</b><input type="range" min="-10" max="10" step="0.5" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></label>
      <label><span>Cost change</span><b>{cost > 0 ? '+' : ''}{cost}%</b><input type="range" min="-15" max="15" step="1" value={cost} onChange={(e) => setCost(Number(e.target.value))} /></label>
      <button className="button button--ghost" onClick={() => preset({})}>Reset assumptions</button>
    </div>
    <div className="scenario-output"><p className="eyebrow">Estimated outcome</p>
      <div><span>Projected revenue</span><strong>{formatMoney(result.projectedRevenue)}</strong><small>{formatMoney(result.projectedRevenue - result.baselineRevenue)} vs baseline</small></div>
      <div><span>Projected gross profit</span><strong className={profitDelta >= 0 ? 'positive' : 'negative'}>{formatMoney(result.projectedProfit)}</strong><small>{profitDelta >= 0 ? '+' : ''}{formatMoney(profitDelta)} vs baseline</small></div>
      <div><span>Projected margin</span><strong>{formatPercent(result.projectedMargin)}</strong><small>{((result.projectedMargin - result.baselineMargin) * 100).toFixed(1)} pp vs baseline</small></div>
      <div className="break-even-row"><span>Break-even price move</span><strong>{breakEven === null ? 'n/a' : `${breakEven >= 0 ? '+' : ''}${breakEven.toFixed(1)}%`}</strong><small>{breakEvenGap === null ? 'Insufficient baseline revenue' : breakEvenGap >= 0 ? `${breakEvenGap.toFixed(1)} pp above profit-protection threshold` : `${Math.abs(breakEvenGap).toFixed(1)} pp below profit-protection threshold`}</small></div>
      <p className="scenario-note">Sensitivity model holds unit volume constant. Break-even shows the price move required to preserve current gross profit after the selected discount and cost changes; it is not a demand forecast.</p>
    </div>
  </div>;
}
