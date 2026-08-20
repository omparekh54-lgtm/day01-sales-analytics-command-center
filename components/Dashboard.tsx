'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataQuality } from './DataQuality';
import { FilterBar } from './FilterBar';
import { KpiCard } from './KpiCard';
import { ProductTable } from './ProductTable';
import { ProfitabilityMap } from './ProfitabilityMap';
import { RecommendationPanel } from './RecommendationPanel';
import { TrendChart } from './TrendChart';
import type { Artifact, Filters, Recommendation } from '../lib/types';
import { ALL, calculateKpis, defaultFilters, filterFacts, formatMoney, formatPercent, monthlySeries, previousPeriodFilters, productSeries } from '../lib/view';

type Metric = 'revenue' | 'profit' | 'margin';

function delta(current: number, previous: number): number | null {
  if (!previous) return null;
  return current / previous - 1;
}

function recommendationsForFilters(artifact: Artifact, filters: Filters): Recommendation[] {
  const active: Array<[string, string]> = [
    ['region', filters.region],
    ['channel', filters.channel],
    ['customer_segment', filters.segment],
    ['category', filters.category],
    ['product', filters.product],
  ].filter(([, value]) => value !== ALL) as Array<[string, string]>;
  const scoped = artifact.recommendations.filter((item) => {
    if (!item.scope.dimension) return active.length === 0;
    return active.some(([dimension, value]) => item.scope.dimension === dimension && item.scope.value === value);
  });
  if (scoped.length) return scoped;
  return artifact.recommendations.filter((item) => !item.scope.dimension);
}

function MetricToggle({ metric, onChange }: { metric: Metric; onChange: (metric: Metric) => void }) {
  return (
    <div className="segmented" role="group" aria-label="Trend metric">
      {(['revenue', 'profit', 'margin'] as Metric[]).map((item) => (
        <button type="button" aria-pressed={metric === item} className={metric === item ? 'segmented__active' : ''} onClick={() => onChange(item)} key={item}>{item}</button>
      ))}
    </div>
  );
}

export function Dashboard() {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [metric, setMetric] = useState<Metric>('revenue');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/analytics.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Analytics artifact returned HTTP ${response.status}`);
        return response.json() as Promise<Artifact>;
      })
      .then((data) => {
        if (data.metadata.validation_status !== 'passed') throw new Error('Analytics artifact is not validated.');
        setArtifact(data);
        setFilters(defaultFilters(data.metadata.date_min, data.metadata.date_max));
      })
      .catch((reason: unknown) => {
        if ((reason as Error).name !== 'AbortError') setError(reason instanceof Error ? reason.message : 'Unable to load analytics artifact.');
      });
    return () => controller.abort();
  }, []);

  const filteredFacts = useMemo(() => artifact && filters ? filterFacts(artifact.records, filters) : [], [artifact, filters]);
  const current = useMemo(() => calculateKpis(filteredFacts), [filteredFacts]);
  const trend = useMemo(() => monthlySeries(filteredFacts), [filteredFacts]);
  const products = useMemo(() => productSeries(filteredFacts), [filteredFacts]);
  const previous = useMemo(() => {
    if (!artifact || !filters) return null;
    const previousFilters = previousPeriodFilters(filters, artifact.metadata.date_min);
    if (!previousFilters) return null;
    return calculateKpis(filterFacts(artifact.records, previousFilters));
  }, [artifact, filters]);

  if (error) {
    return <main className="state-page"><div className="state-card"><p className="eyebrow">Data error</p><h1>Command center unavailable</h1><p>{error}</p><button className="button" onClick={() => window.location.reload()}>Retry</button></div></main>;
  }
  if (!artifact || !filters) {
    return <main className="state-page" aria-busy="true"><div className="state-card"><div className="loader" /><p className="eyebrow">Loading validated artifact</p><h1>Building your decision view</h1><p>Reading commercial facts and quality metadata…</p></div></main>;
  }

  const scopedRecommendations = recommendationsForFilters(artifact, filters);
  const activeCount = [filters.region, filters.channel, filters.segment, filters.category, filters.product].filter((value) => value !== ALL).length;
  const anomalyCount = artifact.anomalies.filter((item) => item.month >= filters.startDate.slice(0, 7) && item.month <= filters.endDate.slice(0, 7)).length;

  return (
    <main>
      <header className="hero" id="overview">
        <nav className="topnav" aria-label="Primary navigation">
          <a className="brand" href="#overview"><span className="brand-mark">S</span><span>Signal / Sales Intelligence</span></a>
          <div className="nav-links"><a href="#performance">Performance</a><a href="#products">Products</a><a href="#recommendations">Actions</a><a href="#quality">Data quality</a></div>
        </nav>
        <div className="hero-grid">
          <div>
            <p className="eyebrow">100 Days of Data Science · Day 01</p>
            <h1>Sales Analytics<br /><span>Command Center</span></h1>
            <p className="hero-copy">A commercial decision system for finding profitable growth, margin leakage, concentration risk, and evidence-backed actions across 12,000 transactions.</p>
          </div>
          <div className="hero-status">
            <div><span className="status-dot status-dot--ok" /><strong>Artifact validated</strong></div>
            <p>{artifact.metadata.row_count.toLocaleString()} rows · {artifact.metadata.date_min} → {artifact.metadata.date_max}</p>
            <p>Build {artifact.metadata.build_id} · schema {artifact.metadata.schema_version}</p>
          </div>
        </div>
      </header>

      <div className="page-shell">
        <FilterBar artifact={artifact} filters={filters} onChange={setFilters} onReset={() => setFilters(defaultFilters(artifact.metadata.date_min, artifact.metadata.date_max))} />

        <section className="section" aria-labelledby="executive-heading">
          <div className="section-heading"><div><p className="eyebrow">Executive pulse</p><h2 id="executive-heading">Economics of the selected view</h2></div><p>{filteredFacts.length.toLocaleString()} transaction lines · {activeCount} dimension filters active</p></div>
          {filteredFacts.length === 0 ? <div className="empty-state">No transactions match the selected filters. Reset or broaden the date/dimension filters.</div> : (
            <div className="kpi-grid">
              <KpiCard label="Net revenue" value={formatMoney(current.revenue)} delta={previous ? delta(current.revenue, previous.revenue) : null} context={`${current.orders.toLocaleString()} orders`} />
              <KpiCard label="Gross profit" value={formatMoney(current.profit)} delta={previous ? delta(current.profit, previous.profit) : null} context={`${formatPercent(current.margin)} realized margin`} tone="profit" />
              <KpiCard label="Gross margin" value={formatPercent(current.margin)} delta={previous ? current.margin - previous.margin : null} context={`${formatMoney(current.cost)} cost base`} />
              <KpiCard label="Discount spend" value={formatMoney(current.discountAmount)} delta={previous ? delta(current.discountAmount, previous.discountAmount) : null} context={`${formatPercent(current.discountRate)} weighted rate`} tone="risk" />
              <KpiCard label="Average order value" value={formatMoney(current.aov)} delta={previous ? delta(current.aov, previous.aov) : null} context={`${current.units.toLocaleString()} units sold`} />
              <KpiCard label="Average selling price" value={formatMoney(current.asp)} delta={previous ? delta(current.asp, previous.asp) : null} context="Net revenue per unit" />
            </div>
          )}
        </section>

        <section className="section section--split" id="performance" aria-labelledby="performance-heading">
          <div className="panel panel--wide">
            <div className="panel-heading"><div><p className="eyebrow">Growth & trajectory</p><h2 id="performance-heading">Monthly performance</h2><p>Switch the metric to test whether growth is translating into profit and margin.</p></div><MetricToggle metric={metric} onChange={setMetric} /></div>
            <TrendChart data={trend} metric={metric} />
          </div>
          <aside className="panel panel--compact">
            <p className="eyebrow">Risk monitor</p>
            <h2>{anomalyCount} validated anomalies</h2>
            <p>Global monthly anomalies are precomputed in Python using MAD robust z-scores. Date filters restrict the displayed window.</p>
            <div className="anomaly-list">
              {artifact.anomalies.filter((item) => item.month >= filters.startDate.slice(0, 7) && item.month <= filters.endDate.slice(0, 7)).slice(0, 4).map((item) => (
                <div key={`${item.month}-${item.metric}`}><strong>{item.month}</strong><span>{item.metric} · z {item.robust_z_score.toFixed(2)}</span></div>
              ))}
              {anomalyCount === 0 && <div className="mini-empty">No global month crosses the documented threshold in this date window.</div>}
            </div>
          </aside>
        </section>

        <section className="section" id="products" aria-labelledby="products-heading">
          <div className="section-heading"><div><p className="eyebrow">Product intelligence</p><h2 id="products-heading">Revenue is not the same as value</h2></div><p>Bubble size = units · benchmark line = median product margin</p></div>
          <div className="panel"><ProfitabilityMap rows={products} /></div>
          <div className="panel table-panel"><div className="panel-heading"><div><h3>Product economics ranking</h3><p>Revenue, profit, margin, discount and unit volume update with every filter.</p></div></div><ProductTable rows={products} /></div>
        </section>

        <section className="section" id="recommendations" aria-labelledby="recommendations-heading">
          <div className="section-heading"><div><p className="eyebrow">Decision intelligence</p><h2 id="recommendations-heading">Computed actions, not canned advice</h2></div><p>Recommendations are generated in Python and selected by filter scope in the UI.</p></div>
          <RecommendationPanel recommendations={scopedRecommendations} />
        </section>

        <section className="section" id="quality" aria-labelledby="quality-heading">
          <div className="section-heading"><div><p className="eyebrow">Trust layer</p><h2 id="quality-heading">Data quality & lineage</h2></div><p>No “pipeline healthy” badge is hardcoded; status comes from the build artifact.</p></div>
          <DataQuality artifact={artifact} />
        </section>

        <section className="section methodology" id="methodology" aria-labelledby="methodology-heading">
          <div className="section-heading"><div><p className="eyebrow">Methodology</p><h2 id="methodology-heading">How the evidence is calculated</h2></div></div>
          <div className="method-grid">
            {Object.entries(artifact.methodology).map(([key, value]) => <article key={key}><h3>{key.replaceAll('_', ' ')}</h3><p>{value}</p></article>)}
          </div>
        </section>
      </div>

      <footer><span>Day 01 · Sales Analytics Command Center</span><span>Reproducible Python pipeline → validated JSON artifact → Next.js decision UI</span></footer>
    </main>
  );
}
