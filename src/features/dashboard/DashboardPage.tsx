import { useMemo, useState } from 'react';

import { MetricCard } from '../../components/MetricCard';
import { StatusChip } from '../../components/StatusChip';
import {
  auditRecords,
  candidateUseCases,
  coverageFlow,
  dashboardMetrics,
  triageItems,
} from '../../data/mockInventory';
import type { CandidateUseCase, Channel, DriftType, Platform } from '../../domain/inventory';
import { useI18n } from '../../i18n/LanguageProvider';
import type { MessageKey } from '../../i18n/messages';
import { formatPercentage, formatVolume } from '../../lib/format';

const maxCoverageVolume = Math.max(
  ...coverageFlow.map((point) => point.matched + point.unknown),
);

const confidenceBands = [
  { labelKey: 'confidence.high', value: 68, tone: 'success' },
  { labelKey: 'confidence.medium', value: 24, tone: 'warning' },
  { labelKey: 'confidence.low', value: 8, tone: 'danger' },
] as const satisfies ReadonlyArray<{
  labelKey: MessageKey;
  value: number;
  tone: 'success' | 'warning' | 'danger';
}>;

const driftLabelKeys = {
  'retired-but-live': 'drift.retiredButLive',
  'new-sender-identity': 'drift.newSenderIdentity',
  'new-template': 'drift.newTemplate',
  'unknown-traffic': 'drift.unknownTraffic',
  'volume-anomaly': 'drift.volumeAnomaly',
} satisfies Record<DriftType, MessageKey>;

const statusLabelKeys = {
  confirmed: 'status.confirmed',
  candidate: 'status.candidate',
  retired: 'status.retired',
} satisfies Record<CandidateUseCase['status'], MessageKey>;

const ownerStatusLabelKeys = {
  confirmed: 'status.confirmed',
  'pending-checker': 'status.pendingChecker',
  'needs-owner': 'status.needsOwner',
} satisfies Record<CandidateUseCase['ownerStatus'], MessageKey>;

const auditStatusLabelKeys = {
  approved: 'status.approved',
  'pending-checker': 'status.pendingChecker',
  'needs-evidence': 'status.needsEvidence',
} satisfies Record<CandidateUseCase['auditStatus'], MessageKey>;

const approvalStatusLabelKeys = {
  approved: 'status.approved',
  submitted: 'status.submitted',
  rejected: 'status.needsEvidence',
} satisfies Record<(typeof auditRecords)[number]['approvalStatus'], MessageKey>;

const monthLabelKeys: Record<string, MessageKey> = {
  Jan: 'month.jan',
  Feb: 'month.feb',
  Mar: 'month.mar',
  Apr: 'month.apr',
  May: 'month.may',
  Jun: 'month.jun',
};

type DashboardPlatformFilter = 'all' | Platform;
type DashboardChannelFilter = 'all' | Channel;
type DashboardMarketFilter = 'all' | string;

const platformOptions = ['all', 'MDP', 'SFMC', 'ICCM', 'IRIS'] as const satisfies ReadonlyArray<
  DashboardPlatformFilter
>;

const channelOptions = ['all', 'SMS', 'Email', 'Push'] as const satisfies ReadonlyArray<
  DashboardChannelFilter
>;

const marketOptions = ['all', 'UK', 'HK', 'SG', 'UAE'] as const satisfies ReadonlyArray<
  DashboardMarketFilter
>;

const useCaseNameKeys: Record<string, MessageKey> = {
  'UC-1024': 'useCase.UC-1024.name',
  'UC-1031': 'useCase.UC-1031.name',
  'UC-1040': 'useCase.UC-1040.name',
  'UC-0997': 'useCase.UC-0997.name',
};

const triageTitleKeys: Record<string, MessageKey> = {
  'TRI-221': 'triage.TRI-221.title',
  'TRI-224': 'triage.TRI-224.title',
  'TRI-228': 'triage.TRI-228.title',
};

const triageActionKeys: Record<string, MessageKey> = {
  'TRI-221': 'triage.TRI-221.action',
  'TRI-224': 'triage.TRI-224.action',
  'TRI-228': 'triage.TRI-228.action',
};

const auditActionKeys: Record<string, MessageKey> = {
  'AUD-9081': 'audit.AUD-9081.action',
  'AUD-9076': 'audit.AUD-9076.action',
  'AUD-9068': 'audit.AUD-9068.action',
};

function getStatusTone(status: CandidateUseCase['status']) {
  if (status === 'confirmed') {
    return 'success';
  }

  if (status === 'retired') {
    return 'danger';
  }

  return 'accent';
}

function getOwnerTone(status: CandidateUseCase['ownerStatus']) {
  if (status === 'confirmed') {
    return 'success';
  }

  if (status === 'pending-checker') {
    return 'warning';
  }

  return 'danger';
}

function getAuditTone(status: CandidateUseCase['auditStatus']) {
  if (status === 'approved') {
    return 'success';
  }

  if (status === 'pending-checker') {
    return 'warning';
  }

  return 'danger';
}

function getTranslatedValue(
  t: (key: MessageKey) => string,
  keysById: Record<string, MessageKey>,
  id: string,
  fallback: string,
) {
  const messageKey = keysById[id];
  return messageKey ? t(messageKey) : fallback;
}

function isUseCaseVisible(
  useCase: CandidateUseCase,
  platformFilter: DashboardPlatformFilter,
  channelFilter: DashboardChannelFilter,
  marketFilter: DashboardMarketFilter,
) {
  return (
    (platformFilter === 'all' || useCase.platform === platformFilter) &&
    (channelFilter === 'all' || useCase.channel === channelFilter) &&
    (marketFilter === 'all' || useCase.market === marketFilter)
  );
}

function isTriageVisible(
  item: (typeof triageItems)[number],
  platformFilter: DashboardPlatformFilter,
  channelFilter: DashboardChannelFilter,
  marketFilter: DashboardMarketFilter,
) {
  return (
    (platformFilter === 'all' || item.platform === platformFilter) &&
    (channelFilter === 'all' || item.channel === channelFilter) &&
    (marketFilter === 'all' || item.market === marketFilter)
  );
}

function getWeightedConfidence(useCases: CandidateUseCase[]) {
  const totalVolume = useCases.reduce((sum, useCase) => sum + useCase.monthlyVolume, 0);

  if (totalVolume === 0) {
    return 0;
  }

  return Math.round(
    useCases.reduce(
      (sum, useCase) => sum + useCase.monthlyVolume * useCase.confidence,
      0,
    ) / totalVolume,
  );
}

function getOwnerConfirmedPercentage(useCases: CandidateUseCase[]) {
  if (useCases.length === 0) {
    return 0;
  }

  const confirmedCount = useCases.filter((useCase) => useCase.ownerStatus === 'confirmed').length;
  return Math.round((confirmedCount / useCases.length) * 100);
}

function downloadInventoryCsv(useCases: CandidateUseCase[]) {
  const rows = [
    [
      'Use case',
      'Status',
      'Market',
      'Platform',
      'Channel',
      'Sender identity',
      'Template reference',
      'Monthly volume',
      'Classification',
      'Confidence',
      'Owner status',
      'Audit status',
    ],
    ...useCases.map((useCase) => [
      useCase.name,
      useCase.status,
      useCase.market,
      useCase.platform,
      useCase.channel,
      useCase.senderIdentity,
      useCase.templateReference,
      String(useCase.monthlyVolume),
      useCase.classification,
      String(useCase.confidence),
      useCase.ownerStatus,
      useCase.auditStatus,
    ]),
  ];

  const csv = rows
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'messaging-inventory-baseline.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DashboardPage() {
  const { locale, t } = useI18n();
  const [platformFilter, setPlatformFilter] = useState<DashboardPlatformFilter>('all');
  const [channelFilter, setChannelFilter] = useState<DashboardChannelFilter>('all');
  const [marketFilter, setMarketFilter] = useState<DashboardMarketFilter>('all');
  const [isPackStaged, setIsPackStaged] = useState(false);
  const [isCsvReady, setIsCsvReady] = useState(false);

  const filteredUseCases = useMemo(
    () =>
      candidateUseCases.filter((useCase) =>
        isUseCaseVisible(useCase, platformFilter, channelFilter, marketFilter),
      ),
    [channelFilter, marketFilter, platformFilter],
  );

  const filteredTriageItems = useMemo(
    () =>
      triageItems.filter((item) =>
        isTriageVisible(item, platformFilter, channelFilter, marketFilter),
      ),
    [channelFilter, marketFilter, platformFilter],
  );

  const totalUseCaseVolume = candidateUseCases.reduce(
    (sum, useCase) => sum + useCase.monthlyVolume,
    0,
  );
  const filteredUseCaseVolume = filteredUseCases.reduce(
    (sum, useCase) => sum + useCase.monthlyVolume,
    0,
  );
  const coverageScale = totalUseCaseVolume > 0 ? filteredUseCaseVolume / totalUseCaseVolume : 1;
  const visibleCoverageFlow = coverageFlow.map((point) => ({
    ...point,
    matched: Math.max(0, Math.round(point.matched * coverageScale)),
    unknown: Math.max(0, Math.round(point.unknown * coverageScale)),
  }));
  const visibleMaxCoverageVolume = Math.max(
    1,
    ...visibleCoverageFlow.map((point) => point.matched + point.unknown),
  );
  const coverageAxisValues = [
    visibleMaxCoverageVolume,
    Math.round(visibleMaxCoverageVolume / 2),
    0,
  ];
  const trafficMatchedPercentage =
    filteredUseCases.length === candidateUseCases.length
      ? dashboardMetrics.trafficMatchedPercentage
      : getWeightedConfidence(filteredUseCases);
  const ownerConfirmedPercentage =
    filteredUseCases.length === candidateUseCases.length
      ? dashboardMetrics.ownerConfirmedPercentage
      : getOwnerConfirmedPercentage(filteredUseCases);
  const evidenceGapCount = filteredUseCases.filter(
    (useCase) => useCase.auditStatus === 'needs-evidence',
  ).length;
  const ownerGapCount = filteredUseCases.filter(
    (useCase) => useCase.ownerStatus !== 'confirmed',
  ).length;

  function resetPilotScope() {
    setPlatformFilter('all');
    setChannelFilter('all');
    setMarketFilter('all');
    setIsPackStaged(false);
  }

  function handleExportCsv() {
    downloadInventoryCsv(filteredUseCases);
    setIsCsvReady(true);
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('dashboard.eyebrow')}</p>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        </div>

        <div className="header-actions" aria-label={t('nav.dashboard')}>
          <button className="button" onClick={handleExportCsv} type="button">
            {t('action.exportCsv')}
          </button>
          <button className="button button-primary" onClick={() => setIsPackStaged(true)} type="button">
            {t('action.buildResponsePack')}
          </button>
        </div>
      </header>

      <section className="filters" aria-label={t('nav.dashboard')}>
        <button
          className={`filter-pill ${
            platformFilter === 'all' && channelFilter === 'all' && marketFilter === 'all'
              ? 'filter-pill-active'
              : ''
          }`}
          onClick={resetPilotScope}
          type="button"
        >
          {t('filter.pilotMarkets')}
        </button>

        <label className="filter-control">
          <span>{t('filter.platformLabel')}</span>
          <select
            className="filter-select"
            data-testid="dashboard-platform-filter"
            onChange={(event) =>
              setPlatformFilter(event.target.value as DashboardPlatformFilter)
            }
            value={platformFilter}
          >
            {platformOptions.map((platform) => (
              <option key={platform} value={platform}>
                {platform === 'all' ? t('filter.allPlatforms') : platform}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-control">
          <span>{t('filter.channelLabel')}</span>
          <select
            className="filter-select"
            data-testid="dashboard-channel-filter"
            onChange={(event) => setChannelFilter(event.target.value as DashboardChannelFilter)}
            value={channelFilter}
          >
            {channelOptions.map((channel) => (
              <option key={channel} value={channel}>
                {channel === 'all' ? t('filter.allChannels') : channel}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-control">
          <span>{t('filter.marketLabel')}</span>
          <select
            className="filter-select"
            data-testid="dashboard-market-filter"
            onChange={(event) => setMarketFilter(event.target.value as DashboardMarketFilter)}
            value={marketFilter}
          >
            {marketOptions.map((market) => (
              <option key={market} value={market}>
                {market === 'all' ? t('filter.allMarkets') : market}
              </option>
            ))}
          </select>
        </label>

        <StatusChip tone="info">
          {filteredUseCases.length} {t('dashboard.useCasesSelected')}
        </StatusChip>
      </section>

      {(isPackStaged || isCsvReady) && (
        <section className="status-banner" data-testid="response-pack-status">
          <div>
            <strong>
              {isPackStaged ? t('responsePack.staged') : t('responsePack.csvReady')}
            </strong>
            <span>
              {t('responsePack.scope')}: {filteredUseCases.length}{' '}
              {t('responsePack.inventoryRows')} · {ownerGapCount} {t('responsePack.ownerGaps')} ·{' '}
              {evidenceGapCount} {t('responsePack.evidenceGaps')}
            </span>
          </div>
          <StatusChip tone={evidenceGapCount === 0 ? 'success' : 'warning'}>
            {evidenceGapCount === 0 ? t('legend.approved') : t('legend.needsEvidence')}
          </StatusChip>
        </section>
      )}

      <section className="highlight-grid" aria-label={t('nav.dashboard')}>
        <article className="highlight-card highlight-card-aqua">
          <div className="highlight-card-top">
            <span className="highlight-icon" aria-hidden="true">
              84
            </span>
            <button
              className="icon-button"
              type="button"
              aria-label={`${t('section.coverageFlow')} options`}
            >
              ...
            </button>
          </div>
          <div>
            <h2 className="highlight-title">{t('section.coverageFlow')}</h2>
            <p className="highlight-copy">{t('section.coverageFlowKicker')}</p>
          </div>
          <div className="highlight-chip-row">
            <StatusChip tone="success">{t('chart.matched')}</StatusChip>
            <StatusChip tone="warning">{t('chart.unknown')}</StatusChip>
          </div>
          <div className="highlight-progress" aria-hidden="true">
            <span style={{ width: formatPercentage(trafficMatchedPercentage) }} />
          </div>
        </article>

        <article className="highlight-card highlight-card-blue">
          <div className="highlight-card-top">
            <span className="highlight-icon" aria-hidden="true">
              67
            </span>
            <button
              className="icon-button"
              onClick={() => setIsPackStaged(true)}
              type="button"
              aria-label={`${t('section.auditReadiness')} options`}
            >
              ...
            </button>
          </div>
          <div>
            <h2 className="highlight-title">{t('section.auditReadiness')}</h2>
            <p className="highlight-copy">{t('section.auditReadinessKicker')}</p>
          </div>
          <div className="highlight-chip-row">
            <StatusChip tone="success">{t('legend.approved')}</StatusChip>
            <StatusChip tone="danger">{t('legend.needsEvidence')}</StatusChip>
          </div>
          <div className="highlight-progress" aria-hidden="true">
            <span style={{ width: '67%' }} />
          </div>
        </article>

        <article className="highlight-card highlight-card-lavender">
          <div className="highlight-card-top">
            <span className="highlight-icon" aria-hidden="true">
              {ownerConfirmedPercentage}
            </span>
            <button
              className="icon-button"
              onClick={resetPilotScope}
              type="button"
              aria-label={`${t('kpi.ownerConfirmed')} options`}
            >
              ...
            </button>
          </div>
          <div>
            <h2 className="highlight-title">{t('kpi.ownerConfirmed')}</h2>
            <p className="highlight-copy">{t('kpi.ownerConfirmedNote')}</p>
          </div>
          <div className="highlight-chip-row">
            <StatusChip tone="accent">
              {filteredUseCases.length} {t('dashboard.useCasesSelected')}
            </StatusChip>
            <StatusChip tone={ownerGapCount === 0 ? 'success' : 'warning'}>
              {ownerGapCount} {t('responsePack.ownerGaps')}
            </StatusChip>
          </div>
          <div className="highlight-progress" aria-hidden="true">
            <span style={{ width: formatPercentage(ownerConfirmedPercentage) }} />
          </div>
        </article>
      </section>

      <section className="kpi-grid" aria-label={t('nav.analytics')}>
        <MetricCard
          label={t('kpi.trafficMatched')}
          note={t('kpi.trafficMatchedNote')}
          tone="success"
          trend="+4.8%"
          value={formatPercentage(trafficMatchedPercentage)}
        />
        <MetricCard
          label={t('kpi.unknownTraffic')}
          note={t('kpi.unknownTrafficNote')}
          tone="warning"
          trend={filteredUseCases.length === candidateUseCases.length ? '-28' : 'scope'}
          value={String(
            filteredUseCases.length === candidateUseCases.length
              ? dashboardMetrics.unknownTrafficCount
              : filteredTriageItems.filter((item) => item.type === 'unknown-traffic').length,
          )}
        />
        <MetricCard
          label={t('kpi.driftExceptions')}
          note={t('kpi.driftExceptionsNote')}
          tone="danger"
          trend={filteredUseCases.length === candidateUseCases.length ? '+3' : 'scope'}
          value={String(
            filteredUseCases.length === candidateUseCases.length
              ? dashboardMetrics.driftExceptionCount
              : filteredTriageItems.length,
          )}
        />
        <MetricCard
          label={t('kpi.ownerConfirmed')}
          note={t('kpi.ownerConfirmedNote')}
          tone="accent"
          trend="+9.1%"
          value={formatPercentage(ownerConfirmedPercentage)}
        />
      </section>

      <section className="dashboard-grid">
        <article className="card" aria-labelledby="coverage-flow-title">
          <div className="card-header">
            <div>
              <h2 className="card-title" id="coverage-flow-title">
                {t('section.coverageFlow')}
              </h2>
              <p className="card-kicker">{t('section.coverageFlowKicker')}</p>
            </div>
            <div className="coverage-legend" aria-hidden="true">
              <span>
                <span className="coverage-legend-marker coverage-legend-matched" />
                {t('chart.matched')}
              </span>
              <span>
                <span className="coverage-legend-marker coverage-legend-unknown" />
                {t('chart.unknown')}
              </span>
            </div>
          </div>

          <div className="coverage-chart" aria-label={t('section.coverageFlow')}>
            <div className="coverage-axis" aria-hidden="true">
              {coverageAxisValues.map((value) => (
                <span key={value}>{formatVolume(value, locale)}</span>
              ))}
            </div>

            <div className="coverage-plot">
              <span className="coverage-grid-line coverage-grid-line-top" aria-hidden="true" />
              <span className="coverage-grid-line coverage-grid-line-middle" aria-hidden="true" />
              <span className="coverage-grid-line coverage-grid-line-bottom" aria-hidden="true" />

              {visibleCoverageFlow.map((point) => {
                const total = point.matched + point.unknown;
                const stackHeight = (total / visibleMaxCoverageVolume) * 100;
                const matchedHeight = total > 0 ? (point.matched / total) * 100 : 0;
                const unknownHeight = total > 0 ? (point.unknown / total) * 100 : 0;
                const unknownPercentage = total > 0 ? Math.round((point.unknown / total) * 100) : 0;
                const monthLabel = t(monthLabelKeys[point.month]);
                const matchedVolume = formatVolume(point.matched, locale);
                const unknownVolume = formatVolume(point.unknown, locale);
                const totalVolume = formatVolume(total, locale);

                return (
                  <div className="coverage-bar-group" key={point.month}>
                    <span className="coverage-total">{totalVolume}</span>
                    <div
                      aria-label={`${monthLabel}: ${matchedVolume} ${t(
                        'chart.matched',
                      )}, ${unknownVolume} ${t('chart.unknown')}`}
                      className="coverage-stack-frame"
                      title={`${monthLabel}: ${totalVolume} ${t('chart.totalVolume')}`}
                    >
                      <span className="coverage-stack" style={{ height: `${stackHeight}%` }}>
                        <span
                          className="coverage-segment coverage-segment-unknown"
                          style={{ height: `${unknownHeight}%` }}
                        />
                        <span
                          className="coverage-segment coverage-segment-matched"
                          style={{ height: `${matchedHeight}%` }}
                        />
                      </span>
                    </div>
                    <span className="coverage-label">{monthLabel}</span>
                    <span className="coverage-unknown">{formatPercentage(unknownPercentage)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <div className="insight-stack">
          <article className="card" aria-labelledby="audit-readiness-title">
            <div className="card-header">
              <div>
                <h2 className="card-title" id="audit-readiness-title">
                  {t('section.auditReadiness')}
                </h2>
                <p className="card-kicker">{t('section.auditReadinessKicker')}</p>
              </div>
            </div>

            <div className="donut-wrap">
              <div aria-label={t('chart.auditReadyLabel')} className="donut" />
              <div className="legend">
                <div className="legend-row">
                  <span>
                    <span className="legend-marker marker-success" />
                    {t('legend.approved')}
                  </span>
                  <strong>67%</strong>
                </div>
                <div className="legend-row">
                  <span>
                    <span className="legend-marker marker-warning" />
                    {t('legend.pendingChecker')}
                  </span>
                  <strong>19%</strong>
                </div>
                <div className="legend-row">
                  <span>
                    <span className="legend-marker marker-danger" />
                    {t('legend.needsEvidence')}
                  </span>
                  <strong>14%</strong>
                </div>
              </div>
            </div>
          </article>

          <article className="card" aria-labelledby="confidence-title">
            <div className="card-header">
              <div>
                <h2 className="card-title" id="confidence-title">
                  {t('section.confidenceBands')}
                </h2>
                <p className="card-kicker">{t('section.confidenceBandsKicker')}</p>
              </div>
            </div>

            <div className="confidence-list">
              {confidenceBands.map((band) => (
                <div className="progress-row" key={band.labelKey}>
                  <div className="progress-label">
                    <span>{t(band.labelKey)}</span>
                    <StatusChip tone={band.tone}>{formatPercentage(band.value)}</StatusChip>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill progress-fill-${band.tone}`}
                      style={{ width: `${band.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="card table-card" aria-labelledby="inventory-title">
          <div className="table-header">
            <div>
              <h2 className="card-title" id="inventory-title">
                {t('section.inventoryCandidates')}
              </h2>
              <p className="card-kicker">{t('section.inventoryCandidatesKicker')}</p>
            </div>
            <StatusChip tone="info">{t('source.count')}</StatusChip>
          </div>

          <table className="data-table" data-testid="dashboard-inventory-table">
            <thead>
              <tr>
                <th>{t('table.useCase')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.market')}</th>
                <th>{t('table.platform')}</th>
                <th>{t('table.volume')}</th>
                <th>{t('table.owner')}</th>
                <th>{t('table.audit')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUseCases.map((useCase) => (
                <tr key={useCase.id}>
                  <td>
                    <span className="use-case-name">
                      <strong>
                        {getTranslatedValue(t, useCaseNameKeys, useCase.id, useCase.name)}
                      </strong>
                      <span>{useCase.templateReference}</span>
                    </span>
                  </td>
                  <td>
                    <StatusChip tone={getStatusTone(useCase.status)}>
                      {t(statusLabelKeys[useCase.status])}
                    </StatusChip>
                  </td>
                  <td>{useCase.market}</td>
                  <td>{useCase.platform}</td>
                  <td>{formatVolume(useCase.monthlyVolume, locale)}</td>
                  <td>
                    <StatusChip tone={getOwnerTone(useCase.ownerStatus)}>
                      {t(ownerStatusLabelKeys[useCase.ownerStatus])}
                    </StatusChip>
                  </td>
                  <td>
                    <StatusChip tone={getAuditTone(useCase.auditStatus)}>
                      {t(auditStatusLabelKeys[useCase.auditStatus])}
                    </StatusChip>
                  </td>
                </tr>
              ))}
              {filteredUseCases.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <strong>{t('inventory.emptyTitle')}</strong>
                      <span>{t('inventory.emptyBody')}</span>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </article>

        <div className="insight-stack">
          <article className="card" aria-labelledby="triage-title">
            <div className="card-header">
              <div>
                <h2 className="card-title" id="triage-title">
                  {t('section.recentTriageItems')}
                </h2>
                <p className="card-kicker">{t('section.recentTriageItemsKicker')}</p>
              </div>
              <button className="button" type="button">
                {t('action.resolveSelected')}
              </button>
            </div>

            <div className="triage-list">
              {filteredTriageItems.map((item) => (
                <article className="triage-item" key={item.id}>
                  <div className="triage-title-row">
                    <p className="triage-title">
                      {getTranslatedValue(t, triageTitleKeys, item.id, item.title)}
                    </p>
                    <StatusChip tone={item.ageingDays > 7 ? 'danger' : 'warning'}>
                      {item.ageingDays}
                      {t('date.daysShort')}
                    </StatusChip>
                  </div>
                  <p className="triage-meta meta-line">
                    <span>{t(driftLabelKeys[item.type])}</span>
                    <span>{item.market}</span>
                    <span>{item.platform}</span>
                    <span>{item.channel}</span>
                    <span>
                      {formatPercentage(item.confidence)} {t('triage.confidenceSuffix')}
                    </span>
                  </p>
                  <p className="triage-action">
                    {getTranslatedValue(t, triageActionKeys, item.id, item.recommendedAction)}
                  </p>
                </article>
              ))}
              {filteredTriageItems.length === 0 ? (
                <div className="empty-state">
                  <strong>{t('triage.emptyTitle')}</strong>
                  <span>{t('triage.emptyBody')}</span>
                </div>
              ) : null}
            </div>
          </article>

          <article className="card" aria-labelledby="audit-log-title">
            <div className="card-header">
              <div>
                <h2 className="card-title" id="audit-log-title">
                  {t('section.auditTrailPreview')}
                </h2>
                <p className="card-kicker">{t('section.auditTrailPreviewKicker')}</p>
              </div>
            </div>

            <div className="triage-list">
              {auditRecords.map((record) => (
                <article className="triage-item" key={record.id}>
                  <div className="triage-title-row">
                    <p className="triage-title">
                      {getTranslatedValue(t, auditActionKeys, record.id, record.action)}
                    </p>
                    <StatusChip
                      tone={record.approvalStatus === 'approved' ? 'success' : 'warning'}
                    >
                      {t(approvalStatusLabelKeys[record.approvalStatus])}
                    </StatusChip>
                  </div>
                  <p className="triage-meta meta-line">
                    <span>{record.target}</span>
                    <span>{record.actor}</span>
                    <span>{record.timestamp}</span>
                  </p>
                </article>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
