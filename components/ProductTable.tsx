'use client';

import { useMemo, useState } from 'react';
import type { ProductPoint } from '../lib/types';
import { formatMoney, formatPercent } from '../lib/view';

type SortKey = 'product' | 'revenue' | 'profit' | 'margin' | 'discountRate' | 'units';

export function ProductTable({ rows, onInspect }: { rows: ProductPoint[]; onInspect?: (product: string) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const left = a[sortKey]; const right = b[sortKey];
    const comparison = typeof left === 'string' ? left.localeCompare(String(right)) : Number(left) - Number(right);
    return direction === 'asc' ? comparison : -comparison;
  }), [rows, sortKey, direction]);

  if (!rows.length) return <div className="empty-state">No products match this view.</div>;

  function choose(key: SortKey) {
    if (key === sortKey) setDirection((value) => value === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setDirection(key === 'product' ? 'asc' : 'desc'); }
  }

  const header = (label: string, key: SortKey) => <button type="button" className="sort-button" onClick={() => choose(key)}>{label}<span>{sortKey === key ? (direction === 'desc' ? '↓' : '↑') : '↕'}</span></button>;
  const visible = showAll ? sorted : sorted.slice(0, 12);

  return (
    <div>
      <div className="table-summary"><span>Sort the economics to find revenue leaders, weak margins or heavy discounting.</span><strong>{rows.length.toLocaleString()} products</strong></div>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">Sortable product economics</caption>
          <thead><tr><th>{header('Product', 'product')}</th><th>{header('Revenue', 'revenue')}</th><th>{header('Profit', 'profit')}</th><th>{header('Margin', 'margin')}</th><th>{header('Discount', 'discountRate')}</th><th>{header('Units', 'units')}</th>{onInspect && <th className="no-print">Action</th>}</tr></thead>
          <tbody>{visible.map((row) => <tr key={row.product}><td><strong>{row.product}</strong></td><td>{formatMoney(row.revenue)}</td><td>{formatMoney(row.profit)}</td><td><span className={row.margin < 0.25 ? 'pill pill--risk' : 'pill'}>{formatPercent(row.margin)}</span></td><td>{formatPercent(row.discountRate)}</td><td>{row.units.toLocaleString()}</td>{onInspect && <td className="no-print"><button type="button" className="table-inspect" onClick={() => onInspect(row.product)}>Inspect</button></td>}</tr>)}</tbody>
        </table>
      </div>
      {rows.length > 12 && <button type="button" className="text-button table-more no-print" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Show top 12' : `Show all ${rows.length} products`} →</button>}
    </div>
  );
}
