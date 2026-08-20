'use client';
import { useState } from 'react';
import type { Artifact } from '../lib/types';
import type { NormalizedDataset } from '../lib/importer';
import { Dashboard } from './Dashboard';
import { QualityGate } from './QualityGate';
import { UploadStudio } from './UploadStudio';

type Stage = 'upload' | 'quality' | 'dashboard';

export function AppShell() {
  const [stage, setStage] = useState<Stage>('upload');
  const [dataset, setDataset] = useState<NormalizedDataset | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

  async function loadSample() {
    setSampleLoading(true); setSampleError(null);
    try {
      const response = await fetch('/analytics.json');
      if (!response.ok) throw new Error(`Sample data returned HTTP ${response.status}`);
      const artifact = await response.json() as Artifact;
      setDataset({ artifact, quality: { totalRows: artifact.metadata.row_count, validRows: artifact.metadata.row_count, rejectedRows: 0, duplicateRows: 0, issueCount: 0, score: 100, issues: [], warnings: ['Demo mode uses deterministic synthetic data. Upload your own file for real business analysis.'], checks: artifact.metadata.validation_checks }, sourceLabel: 'Sample company · synthetic demo' });
      setStage('dashboard');
    } catch (reason) { setSampleError(reason instanceof Error ? reason.message : 'Unable to load the sample company.'); }
    finally { setSampleLoading(false); }
  }

  if (stage === 'quality' && dataset) return <QualityGate report={dataset.quality} onBack={() => setStage('upload')} onContinue={() => setStage('dashboard')} />;
  if (stage === 'dashboard' && dataset) return <Dashboard artifact={dataset.artifact} sourceLabel={dataset.sourceLabel} quality={dataset.quality} onNewDataset={() => { setDataset(null); setStage('upload'); }} />;
  return <><UploadStudio sampleLoading={sampleLoading} onSample={() => void loadSample()} onDataset={(next) => { setDataset(next); setStage('quality'); }} />{sampleError && <div className="upload-error">{sampleError}</div>}</>;
}
