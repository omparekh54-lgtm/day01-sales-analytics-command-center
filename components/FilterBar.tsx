import { ALL } from '../lib/view';
import type { Artifact, Filters } from '../lib/types';

interface FilterBarProps {
  artifact: Artifact;
  filters: Filters;
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value={ALL}>All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function FilterBar({ artifact, filters, onChange, onReset }: FilterBarProps) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  return (
    <section className="filter-shell" aria-labelledby="filters-heading">
      <div className="filter-heading-row">
        <div>
          <p className="eyebrow">Decision lens</p>
          <h2 id="filters-heading">Filter the commercial system</h2>
        </div>
        <button className="button button--ghost" type="button" onClick={onReset}>Reset filters</button>
      </div>
      <div className="filter-grid">
        <label className="filter-field filter-field--date">
          <span>Start date</span>
          <input min={artifact.metadata.date_min} max={filters.endDate} type="date" value={filters.startDate} onChange={(event) => set('startDate', event.target.value)} />
        </label>
        <label className="filter-field filter-field--date">
          <span>End date</span>
          <input min={filters.startDate} max={artifact.metadata.date_max} type="date" value={filters.endDate} onChange={(event) => set('endDate', event.target.value)} />
        </label>
        <SelectField label="Region" value={filters.region} options={artifact.filter_options.regions} onChange={(value) => set('region', value)} />
        <SelectField label="Channel" value={filters.channel} options={artifact.filter_options.channels} onChange={(value) => set('channel', value)} />
        <SelectField label="Segment" value={filters.segment} options={artifact.filter_options.segments} onChange={(value) => set('segment', value)} />
        <SelectField label="Category" value={filters.category} options={artifact.filter_options.categories} onChange={(value) => set('category', value)} />
        <SelectField label="Product" value={filters.product} options={artifact.filter_options.products} onChange={(value) => set('product', value)} />
      </div>
    </section>
  );
}
