import { useMemo, useState } from 'react';

import {
  ArrowLongRightIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import { StatusChip } from '../../components/StatusChip';
import { useI18n } from '../../i18n/LanguageProvider';
import type { MessageKey } from '../../i18n/messages';
import { initialAnalysisResults } from './analysisData';
import type {
  AiTemplateAnalysisResult,
  AnalysisLifecycleStatus,
  AnalysisReviewStatus,
  GovernanceClassification,
} from './analysisTypes';

type StatusChipTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

const reviewStatusLabelKeys = {
  'needs-review': 'analysis.statusNeedsReview',
  reviewed: 'analysis.statusReviewed',
  merged: 'analysis.statusMerged',
} satisfies Record<AnalysisReviewStatus, MessageKey>;

const governanceLabelKeys = {
  Marketing: 'analysis.classificationMarketing',
  Regulatory: 'analysis.classificationRegulatory',
  Servicing: 'analysis.classificationServicing',
} satisfies Record<GovernanceClassification, MessageKey>;

const lifecycleLabelKeys = {
  active: 'analysis.lifecycleActive',
  demised: 'analysis.lifecycleDemised',
} satisfies Record<AnalysisLifecycleStatus, MessageKey>;

const extractionSteps = [
  'analysis.flowIngestion',
  'analysis.flowNormalization',
  'analysis.flowDetection',
  'analysis.flowGeneralization',
  'analysis.flowGenerated',
] as const satisfies ReadonlyArray<MessageKey>;

const extractionStepIcons = [
  DocumentTextIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  SparklesIcon,
] as const;

const confidenceFactors = [
  ['analysis.factorPlaceholder', 'High', 35],
  ['analysis.factorSemantic', 'High', 30],
  ['analysis.factorTraining', 'Medium', 15],
  ['analysis.factorLength', 'High', 10],
  ['analysis.factorChannel', 'High', 5],
] as const;

function getReviewTone(status: AnalysisReviewStatus): StatusChipTone {
  if (status === 'merged') return 'success';
  if (status === 'reviewed') return 'info';
  return 'warning';
}

function getLifecycleTone(status: AnalysisLifecycleStatus): StatusChipTone {
  return status === 'active' ? 'success' : 'danger';
}

function getGovernanceTone(classification: GovernanceClassification): StatusChipTone {
  if (classification === 'Regulatory') return 'warning';
  if (classification === 'Marketing') return 'accent';
  return 'info';
}

function getScoreWidth(score: number) {
  return `${Math.max(0, Math.min(100, score))}%`;
}

function getPlaceholderKind(placeholder: string) {
  const normalized = placeholder.toLowerCase();
  if (normalized.includes('amount') || normalized.includes('balance')) return 'Currency';
  if (normalized.includes('date') || normalized.includes('month') || normalized.includes('year')) {
    return 'Date';
  }
  if (normalized.includes('otp') || normalized.includes('minutes')) return 'Numeric';
  return 'Text';
}

function getPlaceholderExample(placeholder: string) {
  const normalized = placeholder.toLowerCase();
  if (normalized.includes('amount')) return '1,250.00';
  if (normalized.includes('balance')) return '3,246.78';
  if (normalized.includes('date')) return '05/12/2026';
  if (normalized.includes('last4')) return '1234';
  if (normalized.includes('otp')) return '482913';
  return 'Sample value';
}

export function AiTemplateAnalysisPage() {
  const { t } = useI18n();
  const [results, setResults] = useState<ReadonlyArray<AiTemplateAnalysisResult>>(
    initialAnalysisResults,
  );
  const [selectedId, setSelectedId] = useState<string>(initialAnalysisResults[0]?.id ?? '');
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [ownerDraft, setOwnerDraft] = useState('');
  const [noticeKey, setNoticeKey] = useState<MessageKey | null>(null);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(true);
  const [showLifecycle, setShowLifecycle] = useState(false);

  const selectedResult =
    results.find((result) => result.id === selectedId) ?? results[0] ?? null;

  const nearbyMatches = useMemo(() => {
    if (!selectedResult) return [];

    const primary = selectedResult.nearestMatch
      ? [
          {
            templateId: selectedResult.nearestMatch.templateId,
            name: selectedResult.nearestMatch.name,
            similarity: selectedResult.nearestMatch.similarity,
          },
        ]
      : [];
    const secondary = results
      .filter((result) => result.id !== selectedResult.id)
      .map((result, index) => ({
        templateId: result.templateId,
        name: result.name,
        similarity: Math.max(71, selectedResult.confidence - 5 - index * 5),
      }));
    return [...primary, ...secondary].slice(0, 5);
  }, [results, selectedResult]);

  if (!selectedResult) {
    return null;
  }

  function updateSelectedResult(changes: Partial<AiTemplateAnalysisResult>) {
    setResults((current) =>
      current.map((result) =>
        result.id === selectedResult.id ? { ...result, ...changes } : result,
      ),
    );
  }

  function selectResult(resultId: string) {
    setSelectedId(resultId);
    setIsEditingOwner(false);
    setNoticeKey(null);
    setShowLifecycle(false);
  }

  function confirmAnalysis() {
    updateSelectedResult({ reviewStatus: 'reviewed' });
    setNoticeKey('analysis.noticeConfirmed');
  }

  function mergeCandidate() {
    if (!selectedResult.nearestMatch) return;
    updateSelectedResult({ reviewStatus: 'merged' });
    setNoticeKey('analysis.noticeMerged');
  }

  function demiseTemplate() {
    updateSelectedResult({ lifecycleStatus: 'demised' });
    setNoticeKey('analysis.noticeDemised');
  }

  function startOwnerEdit() {
    setOwnerDraft(selectedResult.owner);
    setIsEditingOwner(true);
    setNoticeKey(null);
  }

  function saveOwner() {
    const owner = ownerDraft.trim();
    if (!owner) {
      setNoticeKey('analysis.noticeOwnerRequired');
      return;
    }
    updateSelectedResult({ owner });
    setIsEditingOwner(false);
    setNoticeKey('analysis.noticeOwnerSaved');
  }

  async function copyTemplate() {
    await navigator.clipboard.writeText(selectedResult.extractedPattern);
    setNoticeKey('analysis.noticeCopied');
  }

  const visibleMatches = showAllMatches ? nearbyMatches : nearbyMatches.slice(0, 3);
  const variableDensity = Math.round(
    (selectedResult.placeholders.length / Math.max(1, selectedResult.extractedPattern.split(' ').length)) *
      100,
  );

  return (
    <section className="analysis-page analysis-workbench-page" data-testid="ai-template-analysis-page">
      <header className="analysis-workbench-header">
        <div className="analysis-breadcrumb">
          <span>{t('analysis.title')}</span>
          <span aria-hidden="true">/</span>
          <span>{t('analysis.templateLabel')} {selectedResult.templateId}</span>
        </div>
        <div className="analysis-title-row">
          <div className="analysis-title-group">
            <h1>{t('analysis.templateLabel')} {selectedResult.templateId}</h1>
            <StatusChip tone={getReviewTone(selectedResult.reviewStatus)}>
              {t(reviewStatusLabelKeys[selectedResult.reviewStatus])}
            </StatusChip>
            <div className="analysis-header-confidence">
              <span>{t('analysis.confidenceScore')}</span>
              <strong>{selectedResult.confidence}%</strong>
            </div>
          </div>
          <div className="analysis-header-actions">
            <button className="button button-primary" data-testid="analysis-confirm" onClick={confirmAnalysis} type="button">
              {t('analysis.confirmClassification')}
            </button>
            <button className="button" data-testid="analysis-edit-owner" onClick={startOwnerEdit} type="button">
              {t('analysis.editOwner')}
            </button>
            <button className="button" data-testid="analysis-merge" disabled={!selectedResult.nearestMatch} onClick={mergeCandidate} type="button">
              {t('analysis.mergeCandidate')}
            </button>
            <button className="button button-danger" data-testid="analysis-demise" disabled={selectedResult.lifecycleStatus === 'demised'} onClick={demiseTemplate} type="button">
              {t('analysis.demise')}
            </button>
          </div>
        </div>
      </header>

      {noticeKey ? <div className="analysis-workbench-notice" data-testid="analysis-notice">{t(noticeKey)}</div> : null}

      <section className="analysis-recent-strip" data-testid="analysis-results-table">
        <strong>{t('analysis.recentResults')}</strong>
        <div className="analysis-recent-list">
          {results.map((result) => (
            <button
              aria-pressed={result.id === selectedResult.id}
              className="analysis-recent-item"
              data-testid={`analysis-result-${result.id}`}
              key={result.id}
              onClick={() => selectResult(result.id)}
              type="button"
            >
              <span><i aria-hidden="true" />{result.templateId}<b>{result.confidence}%</b></span>
              <small>{result.name}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="analysis-deep-grid" data-testid="analysis-inspector">
        <section className="analysis-deep-column analysis-source-column">
          <h2>1. {t('analysis.sourceAndTemplate')}</h2>
          <div className="analysis-column-body">
            <section className="analysis-deep-section">
              <h3>{t('analysis.maskedMessage')}</h3>
              <div className="analysis-message-box">{selectedResult.maskedMessage}</div>
              <p className="analysis-inline-meta">{t('analysis.channel')}: {selectedResult.channel} · {t('analysis.analyzedAt')}: {selectedResult.analyzedAt}</p>
            </section>

            <section className="analysis-deep-section">
              <div className="analysis-section-heading">
                <h3>{t('analysis.extractedTemplate')}</h3>
                <button className="analysis-text-button" onClick={copyTemplate} type="button">{t('analysis.copy')}</button>
              </div>
              <div className="analysis-message-box analysis-template-box">{selectedResult.extractedPattern}</div>
            </section>

            <section className="analysis-deep-section">
              <h3>{t('analysis.placeholders')} ({selectedResult.placeholders.length})</h3>
              <div className="analysis-placeholder-table">
                {selectedResult.placeholders.map((placeholder) => (
                  <div className="analysis-placeholder-row" key={placeholder}>
                    <code>{placeholder}</code>
                    <span>{getPlaceholderKind(placeholder)}</span>
                    <span>{getPlaceholderExample(placeholder)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <footer className="analysis-source-footer">
            <span><small>{t('analysis.templateLength')}</small><strong>{selectedResult.extractedPattern.length} {t('analysis.characters')}</strong></span>
            <span><small>{t('analysis.variableDensity')}</small><strong>{variableDensity}%</strong></span>
          </footer>
        </section>

        <section className="analysis-deep-column analysis-evidence-column">
          <h2>2. {t('analysis.analysisEvidence')}</h2>
          <div className="analysis-column-body">
            <section className="analysis-deep-section">
              <h3>{t('analysis.extractionFlow')}</h3>
              <ol className="analysis-flow-list">
                {extractionSteps.map((step, index) => {
                  const StepIcon = extractionStepIcons[index];

                  return (
                    <li key={step}>
                      <span className={index === extractionSteps.length - 1 ? 'analysis-flow-icon analysis-flow-icon-final' : 'analysis-flow-icon'}>
                        <StepIcon aria-hidden="true" />
                        <CheckCircleIcon aria-hidden="true" className="analysis-flow-check" />
                      </span>
                      {index < extractionSteps.length - 1 ? <ArrowLongRightIcon aria-hidden="true" className="analysis-flow-arrow" /> : null}
                      <small>{t(step)}</small>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="analysis-classification-map">
              <article>
                <BuildingLibraryIcon aria-hidden="true" />
                <div><small>{t('analysis.messageType')}</small><strong>{selectedResult.aiMessageType}</strong><span>{selectedResult.channel} transaction</span></div>
              </article>
              <ArrowLongRightIcon aria-hidden="true" className="analysis-classification-arrow" />
              <article>
                <ShieldCheckIcon aria-hidden="true" />
                <div><small>{t('analysis.governanceClassification')}</small><strong>{t(governanceLabelKeys[selectedResult.governanceClassification])}</strong><span>{t('analysis.lowRisk')}</span></div>
              </article>
            </section>

            <section className="analysis-explanation-panel">
              <h3>{t('analysis.aiExplanation')}</h3>
              <p>{selectedResult.explanation.join(' ')}</p>
            </section>

            <section className="analysis-confidence-panel">
              <div className="analysis-panel-title"><h3>{t('analysis.confidenceFactors')}</h3><span>{t('analysis.impact')}</span></div>
              {confidenceFactors.map(([label, strength, impact]) => (
                <div className="analysis-factor-row" key={label}>
                  <span>{t(label)}</span>
                  <b>{strength === 'High' ? t('analysis.high') : t('analysis.medium')}</b>
                  <i><span style={{ width: `${impact * 2.4}%` }} /></i>
                  <small>+{(impact / 100).toFixed(2)}</small>
                </div>
              ))}
              <div className="analysis-factor-total"><strong>{t('analysis.totalConfidence')}</strong><b>{selectedResult.confidence}%</b></div>
            </section>

            <section className="analysis-score-grid">
              <article className="analysis-quality-score"><h3>{t('analysis.qualityScore')}</h3><strong>{selectedResult.qualityScore}</strong><span>/100</span><i><span style={{ width: getScoreWidth(selectedResult.qualityScore) }} /></i></article>
              <article><h3>{t('analysis.qualityBreakdown')}</h3>{[
                ['analysis.completeness', 3],
                ['analysis.clarity', -2],
                ['analysis.consistency', -1],
                ['analysis.placeholderQuality', 1],
              ].map(([label, offset]) => {
                const score = Math.min(100, selectedResult.qualityScore + Number(offset));
                return <div className="analysis-mini-score" key={label}><span>{t(label as MessageKey)}</span><i><span style={{ width: `${score}%` }} /></i><b>{score}</b></div>;
              })}</article>
              <article><h3>{t('analysis.anomalyChecks')}</h3><ul className="analysis-check-list">
                {[
                  ['analysis.piiDetected', false],
                  ['analysis.policyViolations', false],
                  ['analysis.outOfScopeContent', false],
                  ['analysis.unusualFormatting', selectedResult.anomalies.length > 0],
                  ['analysis.newPayeePattern', selectedResult.anomalies.length > 0],
                ].map(([label, detected]) => <li key={label as string}><span>{t(label as MessageKey)}</span><b className={detected ? 'analysis-check-warning' : undefined}>{detected ? <ExclamationTriangleIcon aria-hidden="true" /> : <CheckCircleIcon aria-hidden="true" />}{detected ? t('analysis.detected') : t('analysis.none')}</b></li>)}
              </ul></article>
            </section>

            <section className="analysis-evidence-disclosure">
              <button aria-expanded={isEvidenceOpen} onClick={() => setIsEvidenceOpen((open) => !open)} type="button"><span>{t('analysis.evidence')} ({selectedResult.explanation.length + selectedResult.placeholders.length + selectedResult.anomalies.length})</span><span>{isEvidenceOpen ? '−' : '+'}</span></button>
              {isEvidenceOpen ? <ul>{selectedResult.explanation.map((item) => <li key={item}>{item}</li>)}</ul> : null}
            </section>
          </div>
        </section>

        <aside className="analysis-deep-column analysis-context-column">
          <h2>3. {t('analysis.nearestMatches')}</h2>
          <div className="analysis-column-body">
            <section className="analysis-match-list">
              {visibleMatches.map((match, index) => (
                <article key={`${match.templateId}-${index}`}>
                  <span>{index + 1}</span>
                  <div><strong>{match.templateId}</strong><small>{match.name}</small></div>
                  <div className="analysis-match-score"><b>{match.similarity}%</b><i><span style={{ width: getScoreWidth(match.similarity) }} /></i></div>
                </article>
              ))}
              <button className="analysis-link-button" onClick={() => setShowAllMatches((show) => !show)} type="button">{showAllMatches ? t('analysis.showLess') : t('analysis.viewAllMatches')}</button>
            </section>

            <section className="analysis-side-panel">
              <h3>{t('analysis.ownership')}</h3>
              {isEditingOwner ? (
                <div className="analysis-owner-editor">
                  <label><span>{t('analysis.ownerDraftLabel')}</span><input data-testid="analysis-owner-input" onChange={(event) => setOwnerDraft(event.target.value)} value={ownerDraft} /></label>
                  <div><button className="button button-primary" data-testid="analysis-save-owner" onClick={saveOwner} type="button">{t('analysis.saveOwner')}</button><button className="button" data-testid="analysis-owner-cancel" onClick={() => setIsEditingOwner(false)} type="button">{t('analysis.cancelOwnerEdit')}</button></div>
                </div>
              ) : (
                <div className="analysis-owner-row"><span className="analysis-owner-avatar">{selectedResult.owner.slice(0, 2).toUpperCase()}</span><div><small>{t('analysis.templateOwner')}</small><strong data-testid="analysis-selected-owner">{selectedResult.owner}</strong></div><button onClick={startOwnerEdit} type="button">{t('analysis.edit')}</button></div>
              )}
              <div className="analysis-owner-row"><span className="analysis-owner-avatar">GR</span><div><small>{t('analysis.backupOwner')}</small><strong>Governance Review</strong></div></div>
            </section>

            <section className="analysis-side-panel">
              <h3>{t('analysis.lifecycleStatus')}</h3>
              <dl className="analysis-lifecycle-list">
                <div><dt>{t('analysis.reviewStatus')}</dt><dd><StatusChip tone={getReviewTone(selectedResult.reviewStatus)}><span data-testid="analysis-review-status">{t(reviewStatusLabelKeys[selectedResult.reviewStatus])}</span></StatusChip></dd></div>
                <div><dt>{t('analysis.lifecycle')}</dt><dd><StatusChip tone={getLifecycleTone(selectedResult.lifecycleStatus)}><span data-testid="analysis-lifecycle-status">{t(lifecycleLabelKeys[selectedResult.lifecycleStatus])}</span></StatusChip></dd></div>
                <div><dt>{t('analysis.created')}</dt><dd>{selectedResult.analyzedAt}</dd></div>
                <div><dt>{t('analysis.occurrences')}</dt><dd>3 messages</dd></div>
                <div><dt>{t('analysis.firstSeen')}</dt><dd>{selectedResult.analyzedAt}</dd></div>
              </dl>
              <button className="analysis-link-button" onClick={() => setShowLifecycle((show) => !show)} type="button">{t('analysis.viewLifecycle')}</button>
              {showLifecycle ? <ol className="analysis-lifecycle-history"><li>{t('analysis.lifecycleAnalyzed')}</li><li>{t('analysis.lifecycleCandidate')}</li></ol> : null}
            </section>
          </div>
        </aside>
      </div>

      <footer className="analysis-autosave">{t('analysis.autosaved')}</footer>
    </section>
  );
}
