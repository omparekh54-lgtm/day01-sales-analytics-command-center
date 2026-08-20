'use client';

import { useRef, useState } from 'react';
import type { ColumnMapping, NormalizedDataset, ParsedFile } from '../lib/importer';
import { FIELD_LABELS, inferMapping, normalizeUploadedRows, parseSalesFile, templateCsv } from '../lib/importer';

interface Props {
  onDataset: (dataset: NormalizedDataset) => void;
  onSample: () => void;
  sampleLoading: boolean;
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function UploadStudio({ onDataset, onSample, sampleLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function receive(file: File) {
    setBusy(true);
    setError(null);
    try {
      const result = await parseSalesFile(file);
      setParsed(result);
      setMapping(inferMapping(result.columns));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to read the file.');
    } finally {
      setBusy(false);
    }
  }

  function process() {
    if (!parsed || !mapping) return;
    setError(null);
    try {
      onDataset(normalizeUploadedRows(parsed, mapping));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to process this dataset.');
    }
  }

  return (
    <main className="upload-page">
      <nav className="upload-nav"><a className="brand" href="#"><span className="brand-mark">S</span><span>Signal / Sales Intelligence</span></a><span>Day 01 · 100 Days of Data Science</span></nav>
      <section className="upload-hero">
        <div>
          <p className="eyebrow">Bring your own data</p>
          <h1>Turn a sales file into<br /><span>management intelligence.</span></h1>
          <p>Upload CSV or Excel. Signal maps your columns, rejects bad rows, computes commercial economics, explains what changed, forecasts revenue, simulates decisions, and produces an executive-ready report.</p>
          <div className="upload-actions">
            <button className="button button--large" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? 'Reading file…' : 'Upload sales file'}</button>
            <button className="button button--ghost button--large" onClick={onSample} disabled={sampleLoading}>{sampleLoading ? 'Loading sample…' : 'Try sample company'}</button>
            <button className="text-button" onClick={() => download('signal-sales-template.csv', templateCsv(), 'text/csv')}>Download CSV template ↓</button>
          </div>
          <input ref={inputRef} hidden type="file" accept=".csv,.xlsx,.xls,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void receive(file); }} />
        </div>
        <aside className="privacy-card"><div className="privacy-icon">✓</div><strong>Private by design</strong><p>Your workbook is processed locally in the browser. The file is not uploaded to an application database.</p><ul><li>CSV / XLSX / XLS</li><li>Automatic column suggestions</li><li>Bad-row rejection report</li><li>No account required</li></ul></aside>
      </section>

      {!parsed && <section className="workflow-strip"><div><b>01</b><span>Upload</span><small>CSV or Excel</small></div><div><b>02</b><span>Map</span><small>Match your columns</small></div><div><b>03</b><span>Validate</span><small>See rejected rows</small></div><div><b>04</b><span>Decide</span><small>Insights + scenarios</small></div></section>}

      {parsed && mapping && <section className="mapping-shell">
        <div className="section-heading"><div><p className="eyebrow">Column mapping</p><h2>Tell Signal what your columns mean</h2><p>We suggested matches from <strong>{parsed.fileName}</strong>. Review them before analysis; nothing is silently guessed after this step.</p></div><button className="button button--ghost" onClick={() => { setParsed(null); setMapping(null); }}>Choose another file</button></div>
        <div className="mapping-grid">
          {FIELD_LABELS.map((field) => <label className="mapping-field" key={field.key}><span>{field.label} {field.required && <em>required</em>}</span><small>{field.note}</small><select value={mapping[field.key]} onChange={(event) => setMapping({ ...mapping, [field.key]: event.target.value })}><option value="">Not mapped</option>{parsed.columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label>)}
        </div>
        {error && <div className="inline-error">{error}</div>}
        <div className="mapping-footer"><span>{parsed.rows.length.toLocaleString()} source rows · {parsed.columns.length} columns</span><button className="button button--large" onClick={process}>Validate & build analysis →</button></div>
      </section>}
      {error && !parsed && <div className="upload-error">{error}</div>}
    </main>
  );
}
