import { MetricCard } from '../../components/MetricCard';
import { StatusChip } from '../../components/StatusChip';
import {
  auditRecords,
  candidateUseCases,
  coverageFlow,
  dashboardMetrics,
  triageItems,
} from '../../data/mockInventory';
import type { CandidateUseCase, DriftType } from '../../domain/inventory';
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

export function DashboardPage() {
  const { locale, t } = useI18n();

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('dashboard.eyebrow')}</p>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        </div>

        <div className="header-actions" aria-label={t('nav.dashboard')}>
          <button className="button" type="button">
            {t('action.exportCsv')}
          </button>
          <button className="button button-primary" type="button">
            {t('action.buildResponsePack')}
          </button>
        </div>
      </header>

      <section className="filters" aria-label={t('nav.dashboard')}>
        <button className="filter-pill filter-pill-active" type="button">
          {t('filter.pilotMarkets')}
        </button>
        <button className="filter-pill" type="button">
          {t('filter.allPlatforms')}
        </button>
        <button className="filter-pill" type="button">
          {t('filter.smsEmail')}
        </button>
        <button className="filter-pill" type="button">
          {t('filter.ownerStatus')}
        </button>
        <button className="filter-pill" type="button">
          {t('filter.lastSixMonths')}
        </button>
      </section>

      <section className="kpi-grid" aria-label={t('nav.analytics')}>
        <MetricCard
          label={t('kpi.trafficMatched')}
          note={t('kpi.trafficMatchedNote')}
          tone="success"
          trend="+4.8%"
          value={formatPercentage(dashboardMetrics.trafficMatchedPercentage)}
        />
        <MetricCard
          label={t('kpi.unknownTraffic')}
          note={t('kpi.unknownTrafficNote')}
          tone="warning"
          trend="-28"
          value={String(dashboardMetrics.unknownTrafficCount)}
        />
        <MetricCard
          label={t('kpi.driftExceptions')}
          note={t('kpi.driftExceptionsNote')}
          tone="danger"
          trend="+3"
          value={String(dashboardMetrics.driftExceptionCount)}
        />
        <MetricCard
          label={t('kpi.ownerConfirmed')}
          note={t('kpi.ownerConfirmedNote')}
          tone="accent"
          trend="+9.1%"
          value={formatPercentage(dashboardMetrics.ownerConfirmedPercentage)}
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
            <StatusChip tone="accent">
              {formatPercentage(dashboardMetrics.trafficMatchedPercentage)} {t('chart.matched')}
            </StatusChip>
          </div>

          <div className="coverage-chart" aria-label={t('section.coverageFlow')}>
            {coverageFlow.map((point) => {
              const total = point.matched + point.unknown;
              const stackHeight = (total / maxCoverageVolume) * 100;
              const matchedHeight = (point.matched / total) * 100;
              const unknownHeight = (point.unknown / total) * 100;
              const monthLabel = t(monthLabelKeys[point.month]);
              const matchedVolume = formatVolume(point.matched, locale);
              const unknownVolume = formatVolume(point.unknown, locale);
              const totalVolume = formatVolume(total, locale);

              return (
                <div className="coverage-bar-group" key={point.month}>
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
                </div>
              );
            })}
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

          <table className="data-table">
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
              {candidateUseCases.map((useCase) => (
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
              {triageItems.map((item) => (
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
