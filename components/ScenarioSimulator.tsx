'use client';
import { useMemo, useState } from 'react';
import type { TransactionFact } from '../lib/types';
import { simulateScenario } from '../lib/intelligence';
import { formatMoney, formatPercent } from '../lib/view';

export function ScenarioSimulator({ records }: { records: TransactionFact[] }) {
  const [price, setPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [cost, setCost] = useState(0);
  const result = useMemo(() => simulateScenario(records, price, discount, cost), [records, price, discount, cost]);
  const profitDelta = result.projectedProfit - result.baselineProfit;
  return <div className="scenario-grid"><div className="scenario-controls"><label><span>Price change</span><b>{price > 0 ? '+' : ''}{price}%</b><input type="range" min="-15" max="15" step="1" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label><label><span>Discount rate change</span><b>{discount > 0 ? '+' : ''}{discount} pp</b><input type="range" min="-10" max="10" step="0.5" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></label><label><span>Cost change</span><b>{cost > 0 ? '+' : ''}{cost}%</b><input type="range" min="-15" max="15" step="1" value={cost} onChange={(e) => setCost(Number(e.target.value))} /></label><button className="button button--ghost" onClick={() => { setPrice(0); setDiscount(0); setCost(0); }}>Reset assumptions</button></div><div className="scenario-output"><p className="eyebrow">Estimated outcome</p><div><span>Projected revenue</span><strong>{formatMoney(result.projectedRevenue)}</strong><small>{formatMoney(result.projectedRevenue - result.baselineRevenue)} vs baseline</small></div><div><span>Projected gross profit</span><strong className={profitDelta >= 0 ? 'positive' : 'negative'}>{formatMoney(result.projectedProfit)}</strong><small>{profitDelta >= 0 ? '+' : ''}{formatMoney(profitDelta)} vs baseline</small></div><div><span>Projected margin</span><strong>{formatPercent(result.projectedMargin)}</strong><small>{((result.projectedMargin - result.baselineMargin) * 100).toFixed(1)} pp vs baseline</small></div><p className="scenario-note">Sensitivity model holds unit volume constant. It does not assume price changes have no demand effect in the real world.</p></div></div>;
}
