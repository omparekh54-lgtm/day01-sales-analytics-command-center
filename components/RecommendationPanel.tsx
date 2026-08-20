import type { Recommendation } from '../lib/types';

export function RecommendationPanel({ recommendations }: { recommendations: Recommendation[] }) {
  if (!recommendations.length) {
    return <div className="empty-state">No precomputed recommendation is scoped to this exact filter. Broaden a dimension to see validated guidance.</div>;
  }
  return (
    <div className="recommendation-stack">
      {recommendations.slice(0, 5).map((item) => (
        <article key={item.id} className={`recommendation recommendation--${item.severity}`}>
          <div className="recommendation__header">
            <span className="recommendation__severity">{item.severity}</span>
            <span>{item.scope.value ? `Scoped to ${item.scope.value}` : 'Executive view'}</span>
          </div>
          <h3>{item.observation}</h3>
          <dl>
            <div><dt>Evidence</dt><dd>{item.evidence}</dd></div>
            <div><dt>Implication</dt><dd>{item.implication}</dd></div>
            <div><dt>Action</dt><dd>{item.recommendation}</dd></div>
          </dl>
        </article>
      ))}
    </div>
  );
}
