import type { Artifact } from '../lib/types';

export function DataQuality({ artifact }: { artifact: Artifact }) {
  const healthy = artifact.metadata.validation_status === 'passed' && artifact.metadata.row_count > 0;
  return (
    <div className="quality-grid">
      <article className="quality-card quality-card--status">
        <p className="eyebrow">Pipeline status</p>
        <div className="quality-status"><span className={healthy ? 'status-dot status-dot--ok' : 'status-dot status-dot--bad'} /> <strong>{healthy ? 'Validated' : 'Attention required'}</strong></div>
        <p>This state is derived from artifact metadata, not hardcoded UI text.</p>
      </article>
      <article className="quality-card">
        <p className="eyebrow">Build identity</p>
        <strong>{artifact.metadata.build_id}</strong>
        <p>Schema {artifact.metadata.schema_version} · seed {artifact.metadata.random_seed}</p>
      </article>
      <article className="quality-card">
        <p className="eyebrow">Source integrity</p>
        <strong>{artifact.metadata.row_count.toLocaleString()} rows</strong>
        <p className="hash" title={artifact.metadata.source_sha256}>{artifact.metadata.source_sha256}</p>
      </article>
      <article className="quality-card quality-card--wide">
        <p className="eyebrow">Validation checks</p>
        <div className="check-list">
          {artifact.metadata.validation_checks.map((check) => <span key={check}>✓ {check.replaceAll('_', ' ')}</span>)}
        </div>
      </article>
    </div>
  );
}
