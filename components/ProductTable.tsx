import type { ProductPoint } from '../lib/types';
import { formatMoney, formatPercent } from '../lib/view';

export function ProductTable({ rows }: { rows: ProductPoint[] }) {
  if (!rows.length) return <div className="empty-state">No products match this view.</div>;
  return (
    <div className="table-scroll">
      <table>
        <caption className="sr-only">Product economics ranked by net revenue</caption>
        <thead>
          <tr><th>Product</th><th>Revenue</th><th>Profit</th><th>Margin</th><th>Discount</th><th>Units</th></tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((row) => (
            <tr key={row.product}>
              <td><strong>{row.product}</strong></td>
              <td>{formatMoney(row.revenue)}</td>
              <td>{formatMoney(row.profit)}</td>
              <td><span className={row.margin < 0.25 ? 'pill pill--risk' : 'pill'}>{formatPercent(row.margin)}</span></td>
              <td>{formatPercent(row.discountRate)}</td>
              <td>{row.units.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
