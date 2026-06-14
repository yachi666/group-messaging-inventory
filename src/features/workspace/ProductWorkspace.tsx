import { useMemo, useState } from 'react';

import { StatusChip } from '../../components/StatusChip';
import {
  analyticsSignals,
  auditRecords,
  candidateUseCases,
  evidenceReadiness,
  governanceEvents,
  policyControls,
  triageItems,
} from '../../data/mockInventory';
import type {
  CandidateUseCase,
  Classification,
  DriftType,
  PolicyControl,
  SignalSeverity,
} from '../../domain/inventory';
import { useI18n } from '../../i18n/LanguageProvider';
import type { MessageKey } from '../../i18n/messages';
import type { AppView } from '../../layout/AppShell';
import { formatPercentage, formatVolume } from '../../lib/format';

type ProductWorkspaceProps = {
  activeView: Exclude<AppView, 'dashboard'>;
};

type InventoryFilter = 'all' | 'candidate' | 'needs-evidence' | 'pending-checker';

const inventoryFilters = [
  { id: 'all', labelKey: 'filter.all' },
  { id: 'candidate', labelKey: 'filter.candidates' },
  { id: 'needs-evidence', labelKey: 'filter.needsEvidence' },
  { id: 'pending-checker', labelKey: 'filter.pendingChecker' },
] as const satisfies ReadonlyArray<{ id: InventoryFilter; labelKey: MessageKey }>;

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

const analyticsSignalLabelKeys: Record<string, MessageKey> = {
  'SIG-501': 'analytics.SIG-501.label',
  'SIG-504': 'analytics.SIG-504.label',
  'SIG-509': 'analytics.SIG-509.label',
};

const analyticsSignalActionKeys: Record<string, MessageKey> = {
  'SIG-501': 'analytics.SIG-501.action',
  'SIG-504': 'analytics.SIG-504.action',
  'SIG-509': 'analytics.SIG-509.action',
};

const governanceEventKeys: Record<string, MessageKey> = {
  'GOV-8102': 'governance.GOV-8102.event',
  'GOV-8098': 'governance.GOV-8098.event',
  'GOV-8089': 'governance.GOV-8089.event',
};

const governanceTargetKeys: Record<string, MessageKey> = {
  'GOV-8102': 'governance.GOV-8102.target',
  'GOV-8098': 'governance.GOV-8098.target',
  'GOV-8089': 'governance.GOV-8089.target',
};

const policyLabelKeys: Record<string, MessageKey> = {
  'POL-101': 'policy.POL-101.label',
  'POL-117': 'policy.POL-117.label',
  'POL-124': 'policy.POL-124.label',
};

const policyDescriptionKeys: Record<string, MessageKey> = {
  'POL-101': 'policy.POL-101.description',
  'POL-117': 'policy.POL-117.description',
  'POL-124': 'policy.POL-124.description',
};

const policyImpactKeys: Record<string, MessageKey> = {
  'POL-101': 'policy.POL-101.impact',
  'POL-117': 'policy.POL-117.impact',
  'POL-124': 'policy.POL-124.impact',
};

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

const policyStatusLabelKeys = {
  enabled: 'status.enabled',
  monitoring: 'status.monitoring',
  draft: 'status.draft',
} satisfies Record<PolicyControl['status'], MessageKey>;

const severityLabelKeys = {
  high: 'severity.high',
  medium: 'severity.medium',
  low: 'severity.low',
} satisfies Record<SignalSeverity, MessageKey>;

const classificationLabelKeys = {
  Regulatory: 'classification.regulatory',
  Servicing: 'classification.servicing',
  Marketing: 'classification.marketing',
} satisfies Record<Classification, MessageKey>;

const driftLabelKeys = {
  'retired-but-live': 'drift.retiredButLive',
  'new-sender-identity': 'drift.newSenderIdentity',
  'new-template': 'drift.newTemplate',
  'unknown-traffic': 'drift.unknownTraffic',
  'volume-anomaly': 'drift.volumeAnomaly',
} satisfies Record<DriftType, MessageKey>;

function getTranslatedValue(
  t: (key: MessageKey) => string,
  keysById: Record<string, MessageKey>,
  id: string,
  fallback: string,
) {
  const messageKey = keysById[id];
  return messageKey ? t(messageKey) : fallback;
}

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

function getSeverityTone(severity: SignalSeverity) {
  if (severity === 'high') {
    return 'danger';
  }

  if (severity === 'medium') {
    return 'warning';
  }

  return 'success';
}

function getPolicyTone(status: PolicyControl['status']) {
  if (status === 'enabled') {
    return 'success';
  }

  if (status === 'monitoring') {
    return 'warning';
  }

  return 'neutral';
}

function matchesInventoryFilter(useCase: CandidateUseCase, filter: InventoryFilter) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'candidate') {
    return useCase.status === 'candidate';
  }

  if (filter === 'needs-evidence') {
    return useCase.auditStatus === 'needs-evidence';
  }

  return useCase.ownerStatus === 'pending-checker' || useCase.auditStatus === 'pending-checker';
}

export function ProductWorkspace({ activeView }: ProductWorkspaceProps) {
  if (activeView === 'inventory') {
    return <InventoryPage />;
  }

  if (activeView === 'triage') {
    return <TriagePage />;
  }

  if (activeView === 'evidence') {
    return <EvidencePage />;
  }

  if (activeView === 'analytics') {
    return <AnalyticsPage />;
  }

  if (activeView === 'audit-trail') {
    return <AuditTrailPage />;
  }

  return <SettingsPage />;
}

function InventoryPage() {
  const { locale, t } = useI18n();
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [selectedUseCaseId, setSelectedUseCaseId] = useState(candidateUseCases[0].id);

  const visibleUseCases = useMemo(
    () => candidateUseCases.filter((useCase) => matchesInventoryFilter(useCase, filter)),
    [filter],
  );

  const selectedUseCase =
    candidateUseCases.find((useCase) => useCase.id === selectedUseCaseId) ??
    visibleUseCases[0] ??
    candidateUseCases[0];

  return (
    <>
      <PageHeader
        actionLabel={t('action.submitChecker')}
        eyebrow={t('inventory.eyebrow')}
        subtitle={t('inventory.subtitle')}
        title={t('inventory.title')}
      />

      <section className="workspace-grid">
        <div className="workspace-main">
          <div className="filters" aria-label={t('nav.inventory')}>
            {inventoryFilters.map((item) => (
              <button
                className={`filter-pill ${filter === item.id ? 'filter-pill-active' : ''}`}
                data-testid={`inventory-filter-${item.id}`}
                key={item.id}
                onClick={() => setFilter(item.id)}
                type="button"
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>

          <article className="card table-card" data-testid="inventory-table">
            <div className="table-header">
              <div>
                <h2 className="card-title">{t('section.inventoryCandidates')}</h2>
                <p className="card-kicker">{t('section.inventoryCandidatesKicker')}</p>
              </div>
              <StatusChip tone="info">{visibleUseCases.length} / {candidateUseCases.length}</StatusChip>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('table.useCase')}</th>
                  <th>{t('table.status')}</th>
                  <th>{t('table.platform')}</th>
                  <th>{t('table.volume')}</th>
                  <th>{t('table.classification')}</th>
                  <th>{t('table.owner')}</th>
                  <th>{t('table.audit')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleUseCases.map((useCase) => (
                  <tr key={useCase.id}>
                    <td>
                      <button
                        className="row-action"
                        data-testid={`use-case-${useCase.id}`}
                        onClick={() => setSelectedUseCaseId(useCase.id)}
                        type="button"
                      >
                        <span className="use-case-name">
                          <strong>
                            {getTranslatedValue(t, useCaseNameKeys, useCase.id, useCase.name)}
                          </strong>
                          <span>{useCase.templateReference}</span>
                        </span>
                      </button>
                    </td>
                    <td>
                      <StatusChip tone={getStatusTone(useCase.status)}>
                        {t(statusLabelKeys[useCase.status])}
                      </StatusChip>
                    </td>
                    <td>{useCase.platform}</td>
                    <td>{formatVolume(useCase.monthlyVolume, locale)}</td>
                    <td>{t(classificationLabelKeys[useCase.classification])}</td>
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
        </div>

        <UseCaseInspector useCase={selectedUseCase} />
      </section>
    </>
  );
}

function UseCaseInspector({ useCase }: { useCase: CandidateUseCase }) {
  const { locale, t } = useI18n();

  return (
    <aside className="card detail-panel" data-testid="use-case-inspector">
      <div className="card-header">
        <div>
          <h2 className="card-title">{t('inventory.inspectorTitle')}</h2>
          <p className="card-kicker">
            {useCase.id} · {useCase.platform} · {useCase.channel}
          </p>
        </div>
        <StatusChip tone={getStatusTone(useCase.status)}>{t(statusLabelKeys[useCase.status])}</StatusChip>
      </div>

      <h3 className="detail-title">
        {getTranslatedValue(t, useCaseNameKeys, useCase.id, useCase.name)}
      </h3>

      <div className="field-grid">
        <Field label={t('field.market')} value={`${useCase.market} · ${useCase.entity}`} />
        <Field label={t('field.lob')} value={useCase.lob} />
        <Field label={t('field.tenant')} value={useCase.tenant} />
        <Field label={t('field.owner')} value={useCase.messageOwner} />
        <Field label={t('field.integratingOwner')} value={useCase.integratingSystemOwner} />
        <Field label={t('field.evidence')} value={useCase.evidenceReference} />
        <Field label={t('inventory.validationDate')} value={useCase.latestValidationDate} />
        <Field label={t('table.confidence')} value={formatPercentage(useCase.confidence)} />
      </div>

      <div className="detail-block">
        <h3>{t('inventory.matchExplanation')}</h3>
        <p>
          {t('inventory.rulesHit')}: {useCase.matchExplanation.rulesHit.join(', ')}
        </p>
        <p>
          Cluster: {useCase.matchExplanation.clusterId ?? 'unknown'} ·{' '}
          {useCase.matchExplanation.contentFingerprint ?? 'metadata only'}
        </p>
      </div>

      <div className="detail-block">
        <h3>{t('inventory.deliveryOutcomes')}</h3>
        <div className="outcome-grid">
          <Field label={t('field.sent')} value={formatVolume(useCase.deliveryOutcomes.sent, locale)} />
          <Field
            label={t('field.delivered')}
            value={formatVolume(useCase.deliveryOutcomes.delivered, locale)}
          />
          <Field
            label={t('field.bounced')}
            value={formatVolume(useCase.deliveryOutcomes.bounced, locale)}
          />
          <Field
            label={t('field.failed')}
            value={formatVolume(useCase.deliveryOutcomes.failed, locale)}
          />
        </div>
      </div>

      <div className="action-strip">
        <button className="button" type="button">
          {t('action.linkEvidence')}
        </button>
        <button className="button button-primary" type="button">
          {t('action.submitChecker')}
        </button>
      </div>
    </aside>
  );
}

function TriagePage() {
  const { t } = useI18n();
  const [selectedTriageId, setSelectedTriageId] = useState(triageItems[0].id);
  const [reviewedIds, setReviewedIds] = useState<ReadonlySet<string>>(() => new Set());

  const openItems = triageItems.filter((item) => !reviewedIds.has(item.id));
  const selectedItem =
    triageItems.find((item) => item.id === selectedTriageId) ?? openItems[0] ?? triageItems[0];

  function markReviewed() {
    setReviewedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(selectedItem.id);
      return nextIds;
    });
  }

  return (
    <>
      <PageHeader
        actionLabel={t('action.resolveSelected')}
        eyebrow={t('triage.eyebrow')}
        subtitle={t('triage.subtitle')}
        title={t('triage.title')}
      />

      <section className="workspace-grid">
        <div className="workspace-main">
          <section className="kpi-grid">
            <MetricLite label={t('triage.openItems')} tone="warning" value={String(openItems.length)} />
            <MetricLite label={t('triage.readyForChecker')} tone="success" value="7" />
            <MetricLite label={t('kpi.unknownTraffic')} tone="warning" value="126" />
            <MetricLite label={t('kpi.driftExceptions')} tone="danger" value="18" />
          </section>

          <div className="queue-list" data-testid="triage-queue">
            {triageItems.map((item) => {
              const isReviewed = reviewedIds.has(item.id);

              return (
                <button
                  className={`queue-card ${selectedItem.id === item.id ? 'queue-card-active' : ''}`}
                  data-testid={`triage-item-${item.id}`}
                  key={item.id}
                  onClick={() => setSelectedTriageId(item.id)}
                  type="button"
                >
                  <span>
                    <strong>{getTranslatedValue(t, triageTitleKeys, item.id, item.title)}</strong>
                    <small>
                      {t(driftLabelKeys[item.type])} · {item.market} · {item.platform}
                    </small>
                  </span>
                  <StatusChip tone={isReviewed ? 'success' : item.ageingDays > 7 ? 'danger' : 'warning'}>
                    {isReviewed ? t('status.approved') : `${item.ageingDays}${t('date.daysShort')}`}
                  </StatusChip>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="card detail-panel" data-testid="triage-detail">
          <div className="card-header">
            <div>
              <h2 className="card-title">{t('triage.detailTitle')}</h2>
              <p className="card-kicker">
                {selectedItem.id} · {formatPercentage(selectedItem.confidence)}{' '}
                {t('triage.confidenceSuffix')}
              </p>
            </div>
            <StatusChip tone={selectedItem.ageingDays > 7 ? 'danger' : 'warning'}>
              {selectedItem.ageingDays}
              {t('date.daysShort')}
            </StatusChip>
          </div>

          <h3 className="detail-title">
            {getTranslatedValue(t, triageTitleKeys, selectedItem.id, selectedItem.title)}
          </h3>
          <p className="detail-copy">
            {getTranslatedValue(t, triageActionKeys, selectedItem.id, selectedItem.recommendedAction)}
          </p>

          <div className="field-grid">
            <Field label={t('table.market')} value={selectedItem.market} />
            <Field label={t('table.platform')} value={selectedItem.platform} />
            <Field label={t('field.channel')} value={selectedItem.channel} />
            <Field label={t('table.status')} value={t(driftLabelKeys[selectedItem.type])} />
          </div>

          <div className="action-strip">
            <button className="button" type="button">
              {t('action.assignOwner')}
            </button>
            <button className="button" type="button">
              {t('action.linkEvidence')}
            </button>
            <button
              className="button button-primary"
              data-testid="mark-reviewed"
              onClick={markReviewed}
              type="button"
            >
              {t('action.markReviewed')}
            </button>
          </div>
        </aside>
      </section>
    </>
  );
}

function EvidencePage() {
  const { locale, t } = useI18n();
  const missingEvidence = candidateUseCases.filter(
    (useCase) => useCase.auditStatus === 'needs-evidence',
  );

  return (
    <>
      <PageHeader
        actionLabel={t('action.exportPack')}
        eyebrow={t('evidence.eyebrow')}
        subtitle={t('evidence.subtitle')}
        title={t('evidence.title')}
      />

      <section className="workspace-grid">
        <div className="workspace-main">
          <article className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">{t('evidence.completeness')}</h2>
                <p className="card-kicker">{t('evidence.subtitle')}</p>
              </div>
            </div>

            <div className="readiness-list">
              {evidenceReadiness.map((item) => (
                <div className="readiness-row" key={item.market}>
                  <div className="progress-label">
                    <span>{item.market}</span>
                    <span>
                      {item.complete}% {t('evidence.complete')} · {item.missing}%{' '}
                      {t('evidence.missing')}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${item.complete}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card table-card" data-testid="evidence-export-preview">
            <div className="table-header">
              <div>
                <h2 className="card-title">{t('evidence.exportPreview')}</h2>
                <p className="card-kicker">{t('action.buildResponsePack')}</p>
              </div>
              <StatusChip tone="accent">{t('source.count')}</StatusChip>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('table.useCase')}</th>
                  <th>{t('field.market')}</th>
                  <th>{t('table.platform')}</th>
                  <th>{t('field.template')}</th>
                  <th>{t('field.owner')}</th>
                  <th>{t('table.volume')}</th>
                </tr>
              </thead>
              <tbody>
                {candidateUseCases.slice(0, 3).map((useCase) => (
                  <tr key={useCase.id}>
                    <td>{getTranslatedValue(t, useCaseNameKeys, useCase.id, useCase.name)}</td>
                    <td>{useCase.market}</td>
                    <td>{useCase.platform}</td>
                    <td>{useCase.templateReference}</td>
                    <td>{useCase.messageOwner}</td>
                    <td>{formatVolume(useCase.monthlyVolume, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </div>

        <aside className="card detail-panel">
          <div className="card-header">
            <div>
              <h2 className="card-title">{t('evidence.missingList')}</h2>
              <p className="card-kicker">{t('legend.needsEvidence')}</p>
            </div>
            <StatusChip tone="danger">{missingEvidence.length}</StatusChip>
          </div>

          <div className="triage-list">
            {missingEvidence.map((useCase) => (
              <article className="triage-item" key={useCase.id}>
                <div className="triage-title-row">
                  <p className="triage-title">
                    {getTranslatedValue(t, useCaseNameKeys, useCase.id, useCase.name)}
                  </p>
                  <StatusChip tone="danger">{t(auditStatusLabelKeys[useCase.auditStatus])}</StatusChip>
                </div>
                <p className="triage-meta">
                  {useCase.market} · {useCase.platform} · {useCase.templateReference}
                </p>
              </article>
            ))}
          </div>

          <div className="action-strip">
            <button className="button" type="button">
              {t('action.exportCsv')}
            </button>
            <button className="button button-primary" type="button">
              {t('action.exportPack')}
            </button>
          </div>
        </aside>
      </section>
    </>
  );
}

function AnalyticsPage() {
  const { t } = useI18n();
  const highRiskSignals = analyticsSignals.filter((signal) => signal.severity === 'high').length;
  const ownerGaps = candidateUseCases.filter((useCase) => useCase.ownerStatus !== 'confirmed').length;
  const evidenceGaps = candidateUseCases.filter(
    (useCase) => useCase.auditStatus === 'needs-evidence',
  ).length;

  return (
    <>
      <PageHeader
        actionLabel={t('action.resolveSelected')}
        eyebrow={t('analytics.eyebrow')}
        subtitle={t('analytics.subtitle')}
        title={t('analytics.title')}
      />

      <section className="kpi-grid">
        <MetricLite label={t('analytics.highRiskSignals')} tone="danger" value={String(highRiskSignals)} />
        <MetricLite label={t('analytics.ownerGaps')} tone="warning" value={String(ownerGaps)} />
        <MetricLite label={t('analytics.evidenceGaps')} tone="danger" value={String(evidenceGaps)} />
        <MetricLite label={t('analytics.readyMarkets')} tone="success" value="1 / 4" />
      </section>

      <section className="workspace-grid">
        <article className="card table-card" data-testid="analytics-signal-board">
          <div className="table-header">
            <div>
              <h2 className="card-title">{t('analytics.signalBoard')}</h2>
              <p className="card-kicker">{t('analytics.signalBoardKicker')}</p>
            </div>
            <StatusChip tone="accent">{analyticsSignals.length}</StatusChip>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.signal')}</th>
                <th>{t('table.market')}</th>
                <th>{t('table.platform')}</th>
                <th>{t('table.current')}</th>
                <th>{t('table.baseline')}</th>
                <th>{t('table.severity')}</th>
              </tr>
            </thead>
            <tbody>
              {analyticsSignals.map((signal) => (
                <tr key={signal.id}>
                  <td>
                    <span className="use-case-name">
                      <strong>
                        {getTranslatedValue(t, analyticsSignalLabelKeys, signal.id, signal.label)}
                      </strong>
                      <span>
                        {getTranslatedValue(
                          t,
                          analyticsSignalActionKeys,
                          signal.id,
                          signal.recommendedAction,
                        )}
                      </span>
                    </span>
                  </td>
                  <td>{signal.market}</td>
                  <td>{signal.platform}</td>
                  <td>{signal.currentValue}</td>
                  <td>{signal.baselineValue}</td>
                  <td>
                    <StatusChip tone={getSeverityTone(signal.severity)}>
                      {t(severityLabelKeys[signal.severity])}
                    </StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <aside className="card detail-panel" data-testid="analytics-decision-brief">
          <div className="card-header">
            <div>
              <h2 className="card-title">{t('analytics.decisionBrief')}</h2>
              <p className="card-kicker">{t('analytics.decisionBriefKicker')}</p>
            </div>
            <StatusChip tone="warning">{t(severityLabelKeys.medium)}</StatusChip>
          </div>

          <div className="decision-list">
            <DecisionItem label={t('analytics.focusNow')} value={t('analytics.focusNowValue')} />
            <DecisionItem label={t('analytics.releaseRisk')} value={t('analytics.releaseRiskValue')} />
            <DecisionItem label={t('analytics.nextMetric')} value={t('analytics.nextMetricValue')} />
          </div>
        </aside>
      </section>
    </>
  );
}

function AuditTrailPage() {
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        actionLabel={t('action.exportCsv')}
        eyebrow={t('auditTrail.eyebrow')}
        subtitle={t('auditTrail.subtitle')}
        title={t('auditTrail.title')}
      />

      <section className="workspace-grid">
        <article className="card table-card" data-testid="audit-ledger">
          <div className="table-header">
            <div>
              <h2 className="card-title">{t('auditTrail.ledgerTitle')}</h2>
              <p className="card-kicker">{t('auditTrail.ledgerKicker')}</p>
            </div>
            <StatusChip tone="info">{governanceEvents.length}</StatusChip>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.event')}</th>
                <th>{t('table.actor')}</th>
                <th>{t('table.scope')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.timestamp')}</th>
              </tr>
            </thead>
            <tbody>
              {governanceEvents.map((event) => (
                <tr key={event.id}>
                  <td>
                    <span className="use-case-name">
                      <strong>{getTranslatedValue(t, governanceEventKeys, event.id, event.event)}</strong>
                      <span>
                        {getTranslatedValue(t, governanceTargetKeys, event.id, event.target)}
                      </span>
                    </span>
                  </td>
                  <td>{event.actor}</td>
                  <td>{event.scope}</td>
                  <td>
                    <StatusChip tone={getAuditTone(event.controlStatus)}>
                      {t(auditStatusLabelKeys[event.controlStatus])}
                    </StatusChip>
                  </td>
                  <td>{event.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <aside className="card detail-panel" data-testid="audit-control-summary">
          <div className="card-header">
            <div>
              <h2 className="card-title">{t('auditTrail.controlSummary')}</h2>
              <p className="card-kicker">{t('auditTrail.controlSummaryKicker')}</p>
            </div>
            <StatusChip tone="success">{t('status.approved')}</StatusChip>
          </div>

          <div className="field-grid">
            <Field label={t('auditTrail.retention')} value="180 days" />
            <Field label={t('auditTrail.exportScope')} value="4 platforms" />
            <Field label={t('auditTrail.checkerSla')} value="2 days" />
            <Field label={t('auditTrail.evidenceCoverage')} value="67%" />
          </div>

          <div className="detail-block">
            <h3>{t('auditTrail.pmReadout')}</h3>
            <p>{t('auditTrail.pmReadoutBody')}</p>
          </div>
        </aside>
      </section>
    </>
  );
}

function SettingsPage() {
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        actionLabel={t('action.submitChecker')}
        eyebrow={t('settings.eyebrow')}
        subtitle={t('settings.subtitle')}
        title={t('settings.title')}
      />

      <section className="workspace-grid">
        <article className="card" data-testid="policy-controls">
          <div className="card-header">
            <div>
              <h2 className="card-title">{t('settings.policyControls')}</h2>
              <p className="card-kicker">{t('settings.policyControlsKicker')}</p>
            </div>
          </div>

          <div className="policy-list">
            {policyControls.map((control) => (
              <article className="policy-item" key={control.id}>
                <div>
                  <p className="triage-title">
                    {getTranslatedValue(t, policyLabelKeys, control.id, control.label)}
                  </p>
                  <p className="triage-meta">
                    {getTranslatedValue(
                      t,
                      policyDescriptionKeys,
                      control.id,
                      control.description,
                    )}
                  </p>
                </div>
                <StatusChip tone={getPolicyTone(control.status)}>
                  {t(policyStatusLabelKeys[control.status])}
                </StatusChip>
              </article>
            ))}
          </div>
        </article>

        <aside className="card detail-panel" data-testid="settings-impact">
          <div className="card-header">
            <div>
              <h2 className="card-title">{t('settings.changeImpact')}</h2>
              <p className="card-kicker">{t('settings.changeImpactKicker')}</p>
            </div>
          </div>

          <div className="triage-list">
            {policyControls.map((control) => (
              <article className="triage-item" key={control.id}>
                <div className="triage-title-row">
                  <p className="triage-title">
                    {getTranslatedValue(t, policyLabelKeys, control.id, control.label)}
                  </p>
                  <StatusChip tone={getPolicyTone(control.status)}>
                    {t(policyStatusLabelKeys[control.status])}
                  </StatusChip>
                </div>
                <p className="triage-meta">
                  {control.owner} · {getTranslatedValue(t, policyImpactKeys, control.id, control.impact)}
                </p>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}

function PageHeader({
  actionLabel,
  eyebrow,
  subtitle,
  title,
}: {
  actionLabel: string;
  eyebrow: string;
  subtitle: string;
  title: string;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      <div className="header-actions">
        <button className="button button-primary" type="button">
          {actionLabel}
        </button>
      </div>
    </header>
  );
}

function DecisionItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="decision-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricLite({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'accent';
  value: string;
}) {
  return (
    <article className="metric-card metric-card-compact">
      <div className="metric-card-top">
        <p className="metric-label">{label}</p>
        <StatusChip tone={tone}>{value}</StatusChip>
      </div>
    </article>
  );
}
