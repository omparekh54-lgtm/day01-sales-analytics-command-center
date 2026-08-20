import type { CSSProperties } from 'react';
import type { TransactionFact } from '../lib/types';
import { buildEconomicBridge, buildOpportunityRadar, type DrillFilterKey } from '../lib/decision';
import { formatMoney, formatPercent } from '../lib/view';

export function OpportunityPanel({ records, onDrillDown }: { records: TransactionFact[]; onDrillDown: (key: DrillFilterKey, value: string) => void }) {
  const opportunities = buildOpportunityRadar(records);
  const bridge = buildEconomicBridge(records);
  const gross = Math.max(bridge.grossRevenue, 1);

  return <div className="opportunity-layout">
    <div className="opportunity-list">
      {opportunities.length ? opportunities.slice(0, 4).map((item, index) => <article className={`opportunity-card opportunity-card--${item.priority}`} key={item.id} style={{ '--delay': `${index * 70}ms` } as CSSProperties}>
        <div className="opportunity-head"><div><span className="opportunity-rank">0{index + 1}</span><p className="eyebrow">{item.dimension}</p></div><span className={`priority-chip priority-chip--${item.priority}`}>{item.priority} priority</span></div>
        <h3>{item.value}</h3>
        <div className="opportunity-metrics"><div><span>Revenue</span><strong>{formatMoney(item.revenue)}</strong></div><div><span>Margin</span><strong className={item.marginGap > .03 ? 'negative' : ''}>{formatPercent(item.margin)}</strong></div><div><span>Discount</span><strong>{formatPercent(item.discountRate)}</strong><small>peer median {formatPercent(item.peerDiscountRate)}</small></div></div>
        {item.estimatedDiscountRecovery > 0 ? <p className="opportunity-impact"><strong>{formatMoney(item.estimatedDiscountRecovery)}</strong> gross-to-net sensitivity if discount matched the peer median, holding volume and price constant.</p> : <p className="opportunity-impact">Margin trails the selected-view average by <strong>{(item.marginGap * 100).toFixed(1)} pp</strong>. Investigate mix, pricing and unit cost.</p>}
        <button type="button" className="inspect-button no-print" onClick={() => onDrillDown(item.filterKey, item.value)}>Inspect this slice →</button>
      </article>) : <div className="empty-state">No material peer-benchmark discount leakage or margin gap is visible in this selected view.</div>}
    </div>

    <aside className="bridge-card">
      <p className="eyebrow">Gross-to-profit bridge</p>
      <h3>Where the sales dollar goes</h3>
      <p>Use this bridge to separate pricing leakage from the cost base before deciding what to fix.</p>
      <div className="bridge-rows">
        <div><div className="bridge-label"><span>Gross revenue</span><strong>{formatMoney(bridge.grossRevenue)}</strong></div><span className="bridge-track"><i style={{ width: '100%' }} /></span></div>
        <div><div className="bridge-label"><span>Discount spend</span><strong className="negative">−{formatMoney(bridge.discountAmount)}</strong></div><span className="bridge-track bridge-track--risk"><i style={{ width: `${Math.min(100, bridge.discountAmount / gross * 100)}%` }} /></span></div>
        <div><div className="bridge-label"><span>Net revenue</span><strong>{formatMoney(bridge.netRevenue)}</strong></div><span className="bridge-track"><i style={{ width: `${Math.min(100, bridge.netRevenue / gross * 100)}%` }} /></span></div>
        <div><div className="bridge-label"><span>Cost</span><strong className="negative">−{formatMoney(bridge.cost)}</strong></div><span className="bridge-track bridge-track--cost"><i style={{ width: `${Math.min(100, bridge.cost / gross * 100)}%` }} /></span></div>
        <div><div className="bridge-label"><span>Gross profit</span><strong className={bridge.grossProfit >= 0 ? 'positive' : 'negative'}>{formatMoney(bridge.grossProfit)}</strong></div><span className="bridge-track bridge-track--profit"><i style={{ width: `${Math.min(100, Math.max(0, bridge.grossProfit) / gross * 100)}%` }} /></span></div>
      </div>
      <p className="bridge-note">Opportunity estimates are sensitivities, not promises: they do not assume customer demand is unchanged in the real world.</p>
    </aside>
  </div>;
}
