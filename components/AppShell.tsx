'use client';
import { useState } from 'react';
import type { NormalizedDataset } from '../lib/importer';
import { buildSampleArtifact } from '../lib/sample';
import { Dashboard } from './Dashboard';
import { QualityGate } from './QualityGate';
import { UploadStudio } from './UploadStudio';

type Stage = 'upload' | 'quality' | 'dashboard';

export function AppShell() {
  const [stage, setStage] = useState<Stage>('upload');
  const [dataset, setDataset] = useState<NormalizedDataset | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);

  function loadSample() {
    setSampleLoading(true);
    try {
      const artifact = buildSampleArtifact();
      setDataset({ artifact, quality: { totalRows: artifact.metadata.row_count, validRows: artifact.metadata.row_count, rejectedRows: 0, duplicateRows: 0, issueCount: 0, score: 100, issues: [], warnings: ['Demo mode uses deterministic synthetic data. Upload your own file for real business analysis.'], checks: artifact.metadata.validation_checks }, sourceLabel: 'Sample company · synthetic demo' });
      setStage('dashboard');
    } finally { setSampleLoading(false); }
  }

  if (stage === 'quality' && dataset) return <QualityGate report={dataset.quality} onBack={() => setStage('upload')} onContinue={() => setStage('dashboard')} />;
  if (stage === 'dashboard' && dataset) return <Dashboard artifact={dataset.artifact} sourceLabel={dataset.sourceLabel} quality={dataset.quality} onNewDataset={() => { setDataset(null); setStage('upload'); }} />;
  return <UploadStudio sampleLoading={sampleLoading} onSample={loadSample} onDataset={(next) => { setDataset(next); setStage('quality'); }} />;
}
