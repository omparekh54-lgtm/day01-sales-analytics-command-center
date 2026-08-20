'use client';
import type { QualityReport } from '../lib/importer';

function downloadIssues(report: QualityReport) {
  const lines = ['row,field,value,issue', ...report.issues.map((item) => [item.row, item.field, JSON.stringify(item.value), JSON.stringify(item.issue)].join(','))];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'signal-data-quality-issues.csv'; anchor.click(); URL.revokeObjectURL(url);
}

export function QualityGate({ report, onContinue, onBack }: { report: QualityReport; onContinue: () => void; onBack: () => void }) {
  return <main className="quality-page"><section className="quality-gate"><p className="eyebrow">Data quality gate</p><h1>{report.score}/100</h1><h2>{report.validRows.toLocaleString()} rows are ready for analysis</h2><p>Signal rejected invalid records instead of silently repairing them. Review the exceptions before continuing.</p><div className="quality-stats"><div><span>Source rows</span><strong>{report.totalRows.toLocaleString()}</strong></div><div><span>Valid</span><strong className="positive">{report.validRows.toLocaleString()}</strong></div><div><span>Rejected</span><strong className={report.rejectedRows ? 'negative' : ''}>{report.rejectedRows.toLocaleString()}</strong></div><div><span>Exact duplicates</span><strong>{report.duplicateRows.toLocaleString()}</strong></div></div>{report.warnings.length > 0 && <div className="quality-warnings"><strong>Warnings</strong>{report.warnings.map((warning) => <p key={warning}>• {warning}</p>)}</div>}{report.issues.length > 0 && <div className="issues-preview"><div className="panel-heading"><div><h3>Rejected row preview</h3><p>Showing the first {Math.min(report.issues.length, 12)} issues.</p></div><button className="button button--ghost" onClick={() => downloadIssues(report)}>Download issues CSV</button></div><div className="table-scroll"><table><thead><tr><th>Row</th><th>Field</th><th>Issue</th><th>Value</th></tr></thead><tbody>{report.issues.slice(0, 12).map((issue, index) => <tr key={`${issue.row}-${issue.field}-${index}`}><td>{issue.row}</td><td>{issue.field}</td><td>{issue.issue}</td><td>{issue.value || '—'}</td></tr>)}</tbody></table></div></div>}<div className="gate-actions"><button className="button button--ghost" onClick={onBack}>Back to mapping</button><button className="button button--large" onClick={onContinue}>Continue with {report.validRows.toLocaleString()} valid rows →</button></div></section></main>;
}
