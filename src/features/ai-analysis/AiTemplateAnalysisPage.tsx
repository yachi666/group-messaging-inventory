import { useEffect, useMemo, useState } from 'react';

import { StatusChip } from '../../components/StatusChip';
import { useI18n } from '../../i18n/LanguageProvider';
import type { MessageKey } from '../../i18n/messages';
import { initialAnalysisResults } from './analysisData';
import type {
  AiMessageType,
  AiTemplateAnalysisResult,
  AnalysisLifecycleStatus,
  AnalysisReviewStatus,
  GovernanceClassification,
} from './analysisTypes';

type StatusChipTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

const messageTypes = [
  'Alert',
  'Marketing',
  'OTP',
  'Profile update',
  'Transaction',
] as const satisfies ReadonlyArray<AiMessageType>;

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

function getReviewTone(status: AnalysisReviewStatus): StatusChipTone {
  if (status === 'merged') {
    return 'success';
  }

  if (status === 'reviewed') {
    return 'info';
  }

  return 'warning';
}

function getLifecycleTone(status: AnalysisLifecycleStatus): StatusChipTone {
  return status === 'active' ? 'accent' : 'danger';
}

function getGovernanceTone(classification: GovernanceClassification): StatusChipTone {
  if (classification === 'Regulatory') {
    return 'warning';
  }

  if (classification === 'Marketing') {
    return 'accent';
  }

  return 'info';
}

function getScoreWidth(score: number) {
  return `${Math.max(0, Math.min(100, score))}%`;
}

export function AiTemplateAnalysisPage() {
  const { t } = useI18n();
  const [results, setResults] = useState<ReadonlyArray<AiTemplateAnalysisResult>>(
    initialAnalysisResults,
  );
  const [selectedId, setSelectedId] = useState<string>(initialAnalysisResults[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [messageType, setMessageType] = useState<AiMessageType | 'all'>('all');
  const [reviewStatus, setReviewStatus] = useState<AnalysisReviewStatus | 'all'>('all');
  const [owner, setOwner] = useState<string | 'all'>('all');
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [ownerDraft, setOwnerDraft] = useState('');
  const [noticeKey, setNoticeKey] = useState<MessageKey | null>(null);

  const ownerOptions = useMemo(() => {
    return Array.from(new Set(results.map((result) => result.owner))).sort((left, right) =>
      left.localeCompare(right),
    );
  }, [results]);

  const visibleResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return results.filter((result) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        result.name.toLowerCase().includes(normalizedQuery) ||
        result.templateId.toLowerCase().includes(normalizedQuery) ||
        result.owner.toLowerCase().includes(normalizedQuery) ||
        result.extractedPattern.toLowerCase().includes(normalizedQuery);

      return (
        matchesQuery &&
        (messageType === 'all' || result.aiMessageType === messageType) &&
        (reviewStatus === 'all' || result.reviewStatus === reviewStatus) &&
        (owner === 'all' || result.owner === owner)
      );
    });
  }, [messageType, owner, query, results, reviewStatus]);

  const selectedResult = useMemo(() => {
    return visibleResults.find((result) => result.id === selectedId) ?? visibleResults[0] ?? null;
  }, [selectedId, visibleResults]);

  const highConfidenceCount = useMemo(() => {
    return results.filter((result) => result.confidence >= 90).length;
  }, [results]);

  const needsReviewCount = useMemo(() => {
    return results.filter((result) => result.reviewStatus === 'needs-review').length;
  }, [results]);

  useEffect(() => {
    if (!selectedResult) {
      return;
    }

    if (selectedResult.id !== selectedId) {
      setSelectedId(selectedResult.id);
    }
  }, [selectedId, selectedResult]);

  useEffect(() => {
    if (!selectedResult || isEditingOwner) {
      return;
    }

    setOwnerDraft(selectedResult.owner);
  }, [isEditingOwner, selectedResult]);

  function updateSelectedResult(changes: Partial<AiTemplateAnalysisResult>) {
    if (!selectedResult) {
      return;
    }

    setResults((current) =>
      current.map((result) =>
        result.id === selectedResult.id ? { ...result, ...changes } : result,
      ),
    );
  }

  function confirmAnalysis() {
    if (!selectedResult || selectedResult.reviewStatus === 'merged') {
      return;
    }

    updateSelectedResult({ reviewStatus: 'reviewed' });
    setNoticeKey('analysis.noticeConfirmed');
  }

  function mergeCandidate() {
    if (!selectedResult?.nearestMatch) {
      return;
    }

    updateSelectedResult({ reviewStatus: 'merged' });
    setNoticeKey('analysis.noticeMerged');
  }

  function demiseTemplate() {
    updateSelectedResult({ lifecycleStatus: 'demised' });
    setNoticeKey('analysis.noticeDemised');
  }

  function startOwnerEdit() {
    if (!selectedResult) {
      return;
    }

    setOwnerDraft(selectedResult.owner);
    setIsEditingOwner(true);
    setNoticeKey(null);
  }

  function cancelOwnerEdit() {
    setOwnerDraft(selectedResult?.owner ?? '');
    setIsEditingOwner(false);
  }

  function saveOwner() {
    const trimmedOwner = ownerDraft.trim();

    if (trimmedOwner.length === 0) {
      setNoticeKey('analysis.noticeOwnerRequired');
      return;
    }

    updateSelectedResult({ owner: trimmedOwner });
    if (owner !== 'all' && owner === selectedResult?.owner && owner !== trimmedOwner) {
      setOwner('all');
    }
    setOwnerDraft(trimmedOwner);
    setIsEditingOwner(false);
    setNoticeKey('analysis.noticeOwnerSaved');
  }

  return (
    <section className="analysis-page" data-testid="ai-template-analysis-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('analysis.eyebrow')}</p>
          <h1 className="page-title">{t('analysis.title')}</h1>
          <p className="page-subtitle">{t('analysis.subtitle')}</p>
        </div>
        <div className="header-actions">
          <StatusChip tone="info">
            {visibleResults.length} / {results.length}
          </StatusChip>
        </div>
      </header>

      {noticeKey ? (
        <div className="analysis-notice card" data-testid="analysis-notice">
          {t(noticeKey)}
        </div>
      ) : null}

      <section className="filters analysis-filters" aria-label={t('analysis.filters')}>
        <label className="filter-control analysis-search-control">
          <span>{t('analysis.searchLabel')}</span>
          <input
            className="analysis-search-input"
            data-testid="analysis-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('analysis.searchPlaceholder')}
            type="search"
            value={query}
          />
        </label>
        <label className="filter-control">
          <span>{t('analysis.messageType')}</span>
          <select
            className="filter-select"
            data-testid="analysis-type-filter"
            onChange={(event) => setMessageType(event.target.value as AiMessageType | 'all')}
            value={messageType}
          >
            <option value="all">{t('analysis.allTypes')}</option>
            {messageTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-control">
          <span>{t('analysis.reviewStatus')}</span>
          <select
            className="filter-select"
            data-testid="analysis-status-filter"
            onChange={(event) =>
              setReviewStatus(event.target.value as AnalysisReviewStatus | 'all')
            }
            value={reviewStatus}
          >
            <option value="all">{t('analysis.allStatuses')}</option>
            <option value="needs-review">{t('analysis.statusNeedsReview')}</option>
            <option value="reviewed">{t('analysis.statusReviewed')}</option>
            <option value="merged">{t('analysis.statusMerged')}</option>
          </select>
        </label>
        <label className="filter-control">
          <span>{t('analysis.ownerFilter')}</span>
          <select
            className="filter-select"
            data-testid="analysis-owner-filter"
            onChange={(event) => setOwner(event.target.value)}
            value={owner}
          >
            <option value="all">{t('analysis.allOwners')}</option>
            {ownerOptions.map((ownerOption) => (
              <option key={ownerOption} value={ownerOption}>
                {ownerOption}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="analysis-metrics">
        <article className="metric-card">
          <div className="metric-card-top">
            <p className="metric-label">{t('analysis.analyzedTemplates')}</p>
            <StatusChip tone="info">{results.length}</StatusChip>
          </div>
          <p className="metric-value">{results.length}</p>
          <p className="metric-note">{t('analysis.analyzedTemplatesNote')}</p>
        </article>
        <article className="metric-card">
          <div className="metric-card-top">
            <p className="metric-label">{t('analysis.highConfidence')}</p>
            <StatusChip tone="success">{highConfidenceCount}</StatusChip>
          </div>
          <p className="metric-value">{highConfidenceCount}</p>
          <p className="metric-note">{t('analysis.highConfidenceNote')}</p>
        </article>
        <article className="metric-card">
          <div className="metric-card-top">
            <p className="metric-label">{t('analysis.needsReviewMetric')}</p>
            <StatusChip tone="warning">{needsReviewCount}</StatusChip>
          </div>
          <p className="metric-value">{needsReviewCount}</p>
          <p className="metric-note">{t('analysis.needsReviewNote')}</p>
        </article>
      </section>

      <div className="analysis-workbench">
        <section className="table-card analysis-results-panel">
          <div className="card-header">
            <div>
              <h2 className="card-title">{t('analysis.resultsTitle')}</h2>
              <p className="card-kicker">{t('analysis.resultsKicker')}</p>
            </div>
          </div>

          {visibleResults.length > 0 ? (
            <>
              <div className="analysis-column-headings" aria-hidden="true">
                <span>{t('analysis.tableTemplate')}</span>
                <span>{t('analysis.tableType')}</span>
                <span>{t('analysis.tableClassification')}</span>
                <span>{t('analysis.tableConfidence')}</span>
                <span>{t('analysis.tableOwner')}</span>
                <span>{t('analysis.tableStatus')}</span>
              </div>
              <div className="analysis-results" data-testid="analysis-results-table">
                {visibleResults.map((result) => (
                  <button
                    aria-pressed={result.id === selectedResult?.id}
                    className="analysis-row-button"
                    data-testid={`analysis-result-${result.id}`}
                    key={result.id}
                    onClick={() => {
                      setSelectedId(result.id);
                      setIsEditingOwner(false);
                    }}
                    type="button"
                  >
                    <div className="analysis-row-primary">
                      <strong>{result.name}</strong>
                      <span>{result.extractedPattern}</span>
                    </div>
                    <span className="analysis-row-value">{result.aiMessageType}</span>
                    <span className="analysis-row-value">
                      {t(governanceLabelKeys[result.governanceClassification])}
                    </span>
                    <span className="analysis-row-value">
                      <span className="analysis-score">
                        <span className="analysis-score-value">{result.confidence}%</span>
                        <span className="analysis-score-track" aria-hidden="true">
                          <span
                            className="analysis-score-fill analysis-score-fill-blue"
                            style={{ width: getScoreWidth(result.confidence) }}
                          />
                        </span>
                      </span>
                    </span>
                    <span className="analysis-row-value">{result.owner}</span>
                    <span className="analysis-row-value">
                      {t(reviewStatusLabelKeys[result.reviewStatus])}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" data-testid="analysis-results-table">
              <strong>{t('analysis.emptyTitle')}</strong>
              <span>{t('analysis.emptyBody')}</span>
            </div>
          )}
        </section>

        <aside className="detail-panel">
          {selectedResult ? (
            <section className="card analysis-inspector-card" data-testid="analysis-inspector">
              <div className="analysis-inspector-header">
                <div>
                  <p className="eyebrow analysis-inspector-eyebrow">{t('analysis.inspectorTitle')}</p>
                  <h2 className="detail-title">{selectedResult.name}</h2>
                </div>
                <div className="analysis-inspector-status">
                  <StatusChip tone="accent">{selectedResult.templateId}</StatusChip>
                  <StatusChip
                    tone={getGovernanceTone(selectedResult.governanceClassification)}
                  >
                    {t(governanceLabelKeys[selectedResult.governanceClassification])}
                  </StatusChip>
                  <StatusChip tone={getReviewTone(selectedResult.reviewStatus)}>
                    <span data-testid="analysis-review-status">
                      {t(reviewStatusLabelKeys[selectedResult.reviewStatus])}
                    </span>
                  </StatusChip>
                  <StatusChip tone={getLifecycleTone(selectedResult.lifecycleStatus)}>
                    <span data-testid="analysis-lifecycle-status">
                      {t(lifecycleLabelKeys[selectedResult.lifecycleStatus])}
                    </span>
                  </StatusChip>
                </div>
              </div>

              <div className="analysis-metadata-grid">
                <div className="field">
                  <span>{t('analysis.messageType')}</span>
                  <strong>{selectedResult.aiMessageType}</strong>
                </div>
                <div className="field">
                  <span>{t('analysis.templateOwner')}</span>
                  <strong data-testid="analysis-selected-owner">{selectedResult.owner}</strong>
                </div>
                <div className="field">
                  <span>{t('analysis.channel')}</span>
                  <strong>{selectedResult.channel}</strong>
                </div>
                <div className="field">
                  <span>{t('analysis.analyzedAt')}</span>
                  <strong>{selectedResult.analyzedAt}</strong>
                </div>
                <div className="field">
                  <span>{t('analysis.confidenceScore')}</span>
                  <strong className="analysis-score">
                    <span className="analysis-score-value">{selectedResult.confidence}%</span>
                    <span className="analysis-score-track" aria-hidden="true">
                      <span
                        className="analysis-score-fill analysis-score-fill-teal"
                        style={{ width: getScoreWidth(selectedResult.confidence) }}
                      />
                    </span>
                  </strong>
                </div>
                <div className="field">
                  <span>{t('analysis.qualityScore')}</span>
                  <strong>{selectedResult.qualityScore}%</strong>
                </div>
              </div>

              <section className="detail-block">
                <h3>{t('analysis.maskedMessage')}</h3>
                <p>{selectedResult.maskedMessage}</p>
              </section>

              <section className="detail-block">
                <h3>{t('analysis.extractedTemplate')}</h3>
                <p>{selectedResult.extractedPattern}</p>
              </section>

              <section className="detail-block">
                <h3>{t('analysis.placeholders')}</h3>
                <div className="analysis-placeholder-list">
                  {selectedResult.placeholders.map((placeholder) => (
                    <code className="analysis-placeholder" key={placeholder}>
                      {placeholder}
                    </code>
                  ))}
                </div>
              </section>

              <section className="detail-block">
                <h3>{t('analysis.aiExplanation')}</h3>
                <ol className="analysis-explanation-list">
                  {selectedResult.explanation.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </section>

              <section className="detail-block">
                <h3>{t('analysis.nearestMatch')}</h3>
                {selectedResult.nearestMatch ? (
                  <div className="analysis-match-summary">
                    <strong>{selectedResult.nearestMatch.name}</strong>
                    <span>
                      {selectedResult.nearestMatch.templateId} ·{' '}
                      {selectedResult.nearestMatch.similarity}% {t('analysis.similarity')}
                    </span>
                  </div>
                ) : (
                  <p>{t('analysis.noNearestMatch')}</p>
                )}
              </section>

              <section className="detail-block">
                <h3>{t('analysis.anomalies')}</h3>
                {selectedResult.anomalies.length > 0 ? (
                  <ul className="analysis-bullet-list">
                    {selectedResult.anomalies.map((anomaly) => (
                      <li key={anomaly}>{anomaly}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{t('analysis.noAnomalies')}</p>
                )}
              </section>

              <section className="detail-block">
                <h3>{t('analysis.ownerEditor')}</h3>
                {isEditingOwner ? (
                  <div className="analysis-owner-editor">
                    <label className="form-field">
                      <span>{t('analysis.ownerDraftLabel')}</span>
                      <input
                        data-testid="analysis-owner-input"
                        onChange={(event) => setOwnerDraft(event.target.value)}
                        type="text"
                        value={ownerDraft}
                      />
                    </label>
                    <div className="action-strip">
                      <button
                        className="button button-primary"
                        data-testid="analysis-owner-save"
                        onClick={saveOwner}
                        type="button"
                      >
                        {t('analysis.saveOwner')}
                      </button>
                      <button
                        className="button"
                        data-testid="analysis-owner-cancel"
                        onClick={cancelOwnerEdit}
                        type="button"
                      >
                        {t('analysis.cancelOwnerEdit')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p>{selectedResult.owner}</p>
                )}
              </section>

              <div className="action-strip">
                <button
                  className="button button-primary"
                  data-testid="analysis-confirm"
                  disabled={selectedResult.reviewStatus === 'merged'}
                  onClick={confirmAnalysis}
                  type="button"
                >
                  {t('analysis.confirm')}
                </button>
                <button
                  className="button"
                  data-testid="analysis-merge"
                  disabled={!selectedResult.nearestMatch || selectedResult.reviewStatus === 'merged'}
                  onClick={mergeCandidate}
                  type="button"
                >
                  {t('analysis.merge')}
                </button>
                <button
                  className="button"
                  data-testid="analysis-edit-owner"
                  onClick={startOwnerEdit}
                  type="button"
                >
                  {t('analysis.editOwner')}
                </button>
                <button
                  className="button"
                  data-testid="analysis-demise"
                  disabled={selectedResult.lifecycleStatus === 'demised'}
                  onClick={demiseTemplate}
                  type="button"
                >
                  {t('analysis.demise')}
                </button>
              </div>
            </section>
          ) : (
            <section className="card analysis-empty-panel" data-testid="analysis-inspector">
              <div className="empty-state">
                <strong>{t('analysis.emptyTitle')}</strong>
                <span>{t('analysis.inspectorEmptyBody')}</span>
              </div>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}
