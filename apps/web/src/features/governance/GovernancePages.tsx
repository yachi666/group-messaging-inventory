import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ChartBarSquareIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import type { GovernanceTemplate, GovernanceUseCase } from '../../domain/governance';
import type { GovernanceEvent } from '../../domain/inventory';
import { useI18n } from '../../i18n/LanguageProvider';
import { useProductInventory, type ProductInventory } from '../inventory/productInventoryApi';

const DashboardPage = lazy(() =>
  import('../dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);

type Navigate = (view: 'use-cases' | 'templates' | 'review-queue', id?: string) => void;

const number = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const modelConfigStorageKey = 'gmi:model-config:v1';
const modelConfigSessionKey = 'gmi:model-config-api-key:v1';

type ModelProviderDraft = 'noop' | 'openai' | 'openai-compatible' | 'deepseek';

type ModelConfigurationDraft = {
  provider: ModelProviderDraft;
  baseUrl: string;
  model: string;
  providerName: string;
  apiKey: string;
  extraBodyJson: string;
  timeoutMs: string;
  maxRetries: string;
  retryBackoffMs: string;
};

const defaultModelConfiguration: ModelConfigurationDraft = {
  provider: 'noop',
  baseUrl: '',
  model: 'noop-local',
  providerName: 'noop',
  apiKey: '',
  extraBodyJson: '',
  timeoutMs: '60000',
  maxRetries: '2',
  retryBackoffMs: '250',
};

export function GovernanceDashboardPage({ onNavigate }: { onNavigate: Navigate }) {
  return (
    <Suspense fallback={<div className="dashboard-loading">Loading traffic analytics…</div>}>
      <DashboardPage onNavigate={onNavigate} />
    </Suspense>
  );
}

export function UseCasesPage({ initialId, onNavigate }: { initialId?: string; onNavigate: Navigate }) {
  const { locale } = useI18n(); const zh = locale === 'zh-CN';
  const { data: inventory, error, loading } = useProductInventory();
  const [query, setQuery] = useState('');
  const [view, setView] = useState('All');
  const governanceUseCases = inventory?.governanceUseCases ?? [];
  const governanceTemplates = inventory?.governanceTemplates ?? [];
  if (loading) return <div className="dashboard-loading" role="status">Loading live use cases…</div>;
  if (error) return <div className="g-page"><EmptyState title={`Live use case API unavailable: ${error}`} /></div>;
  const selected = governanceUseCases.find((item) => item.id === initialId);
  if (selected) return <UseCaseDetail governanceTemplates={governanceTemplates} governanceUseCases={governanceUseCases} useCase={selected} onBack={() => onNavigate('use-cases')} onNavigate={onNavigate} />;
  const rows = governanceUseCases.filter((item) => `${item.id} ${item.name} ${item.messageOwner}`.toLowerCase().includes(query.toLowerCase()) && (view === 'All' || item.lifecycle === view.slice(0, -1) || item.lifecycle === view));
  return <div className="g-page"><PageIntro eyebrow={zh ? '业务资产清单' : 'Business inventory'} title={zh ? 'Use Case 管理' : 'Use Cases'} subtitle={zh ? `${rows.length} 个从生产流量发现的业务消息场景。` : `${rows.length} business messaging scenarios discovered from production traffic.`}><button className="g-button"><ArrowDownTrayIcon />{zh ? '导出' : 'Export'}</button></PageIntro><ListControls query={query} setQuery={setQuery} views={['All', 'Active', 'Candidates', 'Governance Gaps', 'Recently Changed', 'Retired']} active={view} setActive={setView} />
    <div className="g-table-card"><table className="g-data-table"><thead><tr><th>Use case</th><th>Classification</th><th>Market</th><th>Platform / Channel</th><th>Templates</th><th>Message owner</th><th>Lifecycle</th><th>Approval</th><th>Monthly volume</th><th>Last activity</th><th /></tr></thead><tbody>{rows.map((item) => <tr key={item.id} onClick={() => onNavigate('use-cases', item.id)}><td><strong>{item.name}</strong><small>{item.id}{item.pendingChanges ? ` · ${item.pendingChanges} pending changes` : ''}</small></td><td><Tag value={item.classification} /></td><td>{item.markets.join(', ')}</td><td><strong>{item.platforms.join(', ')}</strong><small>{item.channels.join(', ')}</small></td><td>{item.templateIds.length}</td><td>{item.messageOwner}</td><td><Status value={item.lifecycle} /></td><td><Status value={item.approval} /></td><td>{number.format(item.monthlyVolume)}</td><td>{item.lastActivity}</td><td><EllipsisHorizontalIcon /></td></tr>)}</tbody></table>{!rows.length && <EmptyState title="No use cases match this view" />}</div>
  </div>;
}

function UseCaseDetail({ governanceTemplates, governanceUseCases, useCase, onBack, onNavigate }: { governanceTemplates: GovernanceTemplate[]; governanceUseCases: GovernanceUseCase[]; useCase: GovernanceUseCase; onBack: () => void; onNavigate: Navigate }) {
  const [tab, setTab] = useState('Overview'); const [editing, setEditing] = useState(false); const [splitting, setSplitting] = useState(false); const [merging, setMerging] = useState(false); const [notice, setNotice] = useState('');
  const templates = governanceTemplates.filter((item) => useCase.templateIds.includes(item.uuid));
  const candidate = useCase.lifecycle === 'Candidate';
  return <div className="g-page g-detail-page"><ObjectHeader onBack={onBack} badge="UC" title={useCase.name} subtitle={`${useCase.id} · ${useCase.markets.join(', ')} · ${useCase.classification}`} statuses={[useCase.lifecycle, useCase.approval, `${useCase.confidence}% AI confidence`]}>
    <button className="g-button" onClick={() => setNotice('New immutable analysis run created')}><ArrowPathIcon />Request re-analysis</button><button className="g-button" onClick={() => setMerging(true)}>Merge</button>{candidate && <button className="g-button" onClick={() => setSplitting(true)}>Split Candidate</button>}<button className="g-button g-button-primary" onClick={() => setEditing(true)}><PencilSquareIcon />{candidate ? 'Edit Candidate' : 'Propose changes'}</button>
  </ObjectHeader><DetailTabs tabs={['Overview', 'Templates & Traffic', 'AI Analysis', 'Governance', 'Activity']} active={tab} setActive={setTab} />
    {tab === 'Overview' && <div className="g-detail-grid"><Panel title="Business definition" kicker="Effective record"><DefinitionRows rows={[['Name', useCase.name], ['Description', useCase.description], ['Classification', useCase.classification], ['Markets', useCase.markets.join(', ')], ['Purpose', 'Customer servicing and account lifecycle communication']]} /></Panel><Panel title="Ownership" kicker="Named accountable teams"><DefinitionRows rows={[['Message owner', useCase.messageOwner], ['Integrating system owner', useCase.integratingOwner], ['Contact point', 'messaging-governance@example.com'], ['Evidence', `${useCase.evidenceCount} references`]]} /></Panel><Panel title="Governance summary" kicker={useCase.pendingChanges ? 'Approved record remains effective' : 'No open change request'}><div className="g-governance-score"><ShieldCheckIcon /><strong>{useCase.governanceIssues.length ? 'Needs attention' : 'Complete'}</strong><span>{useCase.governanceIssues.length ? useCase.governanceIssues.join(' · ') : 'Owner, classification and evidence complete'}</span></div></Panel><Panel title="Operational summary" kicker="Last 30 days"><div className="g-mini-metrics"><Metric label="Monthly volume" value={number.format(useCase.monthlyVolume)} /><Metric label="Templates" value={String(templates.length)} /><Metric label="Delivery" value="98.7%" /><Metric label="Last seen" value={useCase.lastActivity} /></div></Panel></div>}
    {tab === 'Templates & Traffic' && <div className="g-detail-stack"><Panel title={`Templates (${templates.length})`} kicker="Current version and approved mapping"><TemplateMiniTable templates={templates} onOpen={(id) => onNavigate('templates', id)} /></Panel><Panel title="Volume trend" kicker="Production traffic by channel"><div className="g-bars g-bars-short">{[42, 48, 55, 61, 58, 67, 74, 82].map((v, i) => <div key={i}><i style={{ height: `${v}%` }} /><span>W{i + 1}</span></div>)}</div></Panel></div>}
    {tab === 'AI Analysis' && <AnalysisPanel confidence={useCase.confidence} />}
    {tab === 'Governance' && <GovernanceDiff pending={useCase.pendingChanges ?? 0} maker="Alex Morgan" checker="Priya Desai" />}
    {tab === 'Activity' && <ActivityTimeline object={useCase.name} />}
    {editing && <EditDrawer title={candidate ? 'Edit candidate' : 'Propose changes'} initialName={useCase.name} onClose={() => setEditing(false)} onSave={() => { setEditing(false); setNotice(candidate ? 'Candidate draft saved' : 'Change request draft saved — approved values unchanged'); }} />}{splitting && <CandidateSplitModal useCase={useCase} templates={templates} onClose={() => setSplitting(false)} onSubmit={() => { setSplitting(false); setNotice('Split approval package submitted as one governed change'); }} />}{merging && <MergeModal governanceUseCases={governanceUseCases} source={useCase} onClose={() => setMerging(false)} onSubmit={() => { setMerging(false); setNotice('Merge change request submitted — source history retained'); }} />}{notice && <Toast message={notice} onDone={() => setNotice('')} />}
  </div>;
}

export function TemplatesPage({ initialId, onNavigate }: { initialId?: string; onNavigate: Navigate }) {
  const { locale } = useI18n(); const zh = locale === 'zh-CN';
  const { data: inventory, error, loading } = useProductInventory();
  const [query, setQuery] = useState(''); const [view, setView] = useState('All');
  const governanceTemplates = inventory?.governanceTemplates ?? [];
  const governanceUseCases = inventory?.governanceUseCases ?? [];
  if (loading) return <div className="dashboard-loading" role="status">Loading live templates…</div>;
  if (error) return <div className="g-page"><EmptyState title={`Live template API unavailable: ${error}`} /></div>;
  const selected = governanceTemplates.find((item) => item.uuid === initialId || item.templateId === initialId);
  if (selected) return <TemplateDetail governanceUseCases={governanceUseCases} template={selected} onBack={() => onNavigate('templates')} onNavigate={onNavigate} />;
  const rows = governanceTemplates.filter((item) => `${item.templateId} ${item.platform} ${item.tenant} ${item.sender}`.toLowerCase().includes(query.toLowerCase()) && (view === 'All' || (view === 'Unassigned' && item.mapping === 'Unassigned') || (view === 'Candidate Versions' && item.candidateVersion) || (view === 'No Recent Traffic' && item.lifecycle === 'No Traffic') || (view === 'Retired but Live' && item.lifecycle === 'Retired')));
  return <div className="g-page"><PageIntro eyebrow={zh ? '技术资产清单' : 'Technical inventory'} title={zh ? '模板管理' : 'Templates'} subtitle={zh ? `${rows.length} 个从生产流量发现的技术消息资产。组合身份为 Platform + Tenant + Template ID。` : `${rows.length} production-discovered technical message assets. Composite identity is Platform + Tenant + Template ID.`}><button className="g-button"><ArrowDownTrayIcon />{zh ? '导出' : 'Export'}</button></PageIntro><ListControls query={query} setQuery={setQuery} views={['All', 'Unassigned', 'New Templates', 'Candidate Versions', 'No Recent Traffic', 'Retired but Live']} active={view} setActive={setView} />
    <div className="g-table-card"><table className="g-data-table"><thead><tr><th>Template identity</th><th>Parent use case</th><th>Version</th><th>Channel / Market</th><th>Sender</th><th>Mapping</th><th>Lifecycle</th><th>Volume</th><th>Last seen</th><th>Confidence</th><th /></tr></thead><tbody>{rows.map((item) => { const parent = governanceUseCases.find((uc) => uc.id === item.parentUseCaseId); return <tr key={item.uuid} onClick={() => onNavigate('templates', item.uuid)}><td><strong>{item.templateId}</strong><small>{item.platform} · {item.tenant}</small></td><td>{parent?.name ?? 'Unassigned'}</td><td><strong>{item.currentVersion}</strong>{item.candidateVersion && <small className="g-pending-copy">{item.candidateVersion}</small>}</td><td><strong>{item.channel}</strong><small>{item.market}</small></td><td>{item.sender}</td><td><Status value={item.mapping} /></td><td><Status value={item.lifecycle} /></td><td>{number.format(item.monthlyVolume)}</td><td>{item.lastSeen}</td><td><Confidence value={item.confidence} /></td><td><EllipsisHorizontalIcon /></td></tr>; })}</tbody></table>{!rows.length && <EmptyState title="No templates match this view" />}</div>
  </div>;
}

function TemplateDetail({ governanceUseCases, template, onBack, onNavigate }: { governanceUseCases: GovernanceUseCase[]; template: GovernanceTemplate; onBack: () => void; onNavigate: Navigate }) {
  const [tab, setTab] = useState('Overview'); const [notice, setNotice] = useState(''); const [mapping, setMapping] = useState(false); const parent = governanceUseCases.find((item) => item.id === template.parentUseCaseId);
  return <div className="g-page g-detail-page"><ObjectHeader onBack={onBack} badge="TP" title={template.templateId} subtitle={`${template.platform} · ${template.tenant} · ${template.uuid}`} statuses={[template.mapping, template.lifecycle, template.approval]}><button className="g-button" onClick={() => setNotice('New analysis run queued')}><ArrowPathIcon />Request re-analysis</button><button className="g-button g-button-primary" onClick={() => setMapping(true)}>Review mapping</button></ObjectHeader><DetailTabs tabs={['Overview', 'Versions & Content', 'Traffic', 'AI Analysis', 'Governance', 'Activity']} active={tab} setActive={setTab} />
    {tab === 'Overview' && <div className="g-detail-grid"><Panel title="Template identity" kicker="Stable technical identity"><DefinitionRows rows={[['Internal UUID', template.uuid], ['Composite identity', `${template.platform} / ${template.tenant} / ${template.templateId}`], ['Channel', template.channel], ['Market', template.market], ['Sender identity', template.sender]]} /></Panel><Panel title="Mapping" kicker="Classification inherited from parent"><DefinitionRows rows={[['Parent Use Case', parent?.name ?? 'Unassigned'], ['Mapping state', template.mapping], ['Confidence', `${template.confidence}%`], ['Reason', template.mapping === 'Unassigned' ? 'No sufficiently similar approved Use Case' : 'Content pattern and sender lineage match'], ['Effective date', 'Jun 12, 2026']]} />{parent && <button className="g-text-link" onClick={() => onNavigate('use-cases', parent.id)}>View parent Use Case →</button>}</Panel><Panel title="Production activity" kicker="Last 30 days"><div className="g-mini-metrics"><Metric label="Volume" value={number.format(template.monthlyVolume)} /><Metric label="Delivery" value="98.9%" /><Metric label="Last seen" value={template.lastSeen} /><Metric label="Anomalies" value={template.lifecycle === 'Retired' ? '1 critical' : 'None'} /></div></Panel></div>}
    {tab === 'Versions & Content' && <div className="g-detail-stack"><Panel title="Version timeline" kicker="Candidate never overwrites Current"><div className="g-version-line"><div className="g-version-current"><span>Current</span><strong>{template.currentVersion}</strong><small>Effective Jun 01, 2026</small></div>{template.candidateVersion && <><i /><div className="g-version-candidate"><span>Candidate</span><strong>{template.candidateVersion}</strong><small>Detected Jun 18, 2026 · Pending review</small></div></>}</div></Panel><Panel title="Masked content" kicker="Restricted production values removed"><pre className="g-code">{template.maskedContent}</pre><div className="g-variable-list">{template.variables.map((variable) => <span key={variable}>{`{{${variable}}}`}</span>)}</div></Panel></div>}
    {tab === 'Traffic' && <Panel title="Traffic & delivery" kicker="Volume, outcomes and sender lineage"><div className="g-bars g-bars-tall">{[48, 62, 55, 72, 68, 80, 76, 88, 92, 84].map((v, i) => <div key={i}><i style={{ height: `${v}%` }} /><span>{i + 1} Jun</span></div>)}</div></Panel>}
    {tab === 'AI Analysis' && <AnalysisPanel confidence={template.confidence} />}{tab === 'Governance' && <GovernanceDiff pending={template.approval === 'Approved' ? 0 : 1} maker="Jamie Liu" checker="Governance Pool" />}{tab === 'Activity' && <ActivityTimeline object={template.templateId} />}{mapping && <MappingDrawer governanceUseCases={governanceUseCases} template={template} onClose={() => setMapping(false)} onSubmit={(message) => { setMapping(false); setNotice(message); }} />}{notice && <Toast message={notice} onDone={() => setNotice('')} />}</div>;
}

export function AdministrationPage() {
  const { locale } = useI18n(); const zh = locale === 'zh-CN';
  const { data: inventory, error, loading } = useProductInventory();
  const [section, setSection] = useState('Users & Access'); const [notice, setNotice] = useState('');
  const sections = ['Users & Access', 'Model Configuration', 'Reference Data', 'Matching & Classification', 'Workflow & SLA', 'Analysis Runs', 'Audit Trail', 'Data Processing'];
  if (loading) return <div className="dashboard-loading" role="status">Loading live administration data…</div>;
  if (error || !inventory) return <div className="g-page"><EmptyState title={`Live administration API unavailable: ${error ?? 'no data'}`} /></div>;
  return <div className="g-page"><PageIntro eyebrow={zh ? '受控配置' : 'Controlled configuration'} title={zh ? '系统管理' : 'Administration'} subtitle={zh ? '全局治理、分析可见性、访问控制与不可变审计记录。' : 'Global governance, analysis visibility, access controls, and immutable audit records.'} /><div className="g-admin-layout"><nav>{sections.map((item) => <button className={section === item ? 'active' : ''} onClick={() => setSection(item)} key={item}>{item}<span>›</span></button>)}</nav><div className="g-admin-content"><Panel title={section} kicker={adminKicker(section)} action={<button className="g-button" onClick={() => setNotice('Export prepared for your authorized scope')}><ArrowDownTrayIcon />{zh ? '导出' : 'Export'}</button>}><AdminSection inventory={inventory} section={section} /></Panel></div></div>{notice && <Toast message={notice} onDone={() => setNotice('')} />}</div>;
}

function AdminSection({ inventory, section }: { inventory: ProductInventory; section: string }) {
  if (section === 'Users & Access') {
    const users = Array.from(new Set(inventory.candidateUseCases.map((useCase) => useCase.messageOwner).filter((owner) => owner !== 'Unassigned'))).slice(0, 8);
    return <table className="g-data-table"><thead><tr><th>User</th><th>Role</th><th>Scope</th><th>Status</th><th>Last login</th></tr></thead><tbody>{users.map((user, index) => <tr key={user}><td>{user}</td><td>{index === 0 ? 'Admin' : 'Governance'}</td><td>{inventory.evidenceReadiness.map((item) => item.market).join(', ') || 'Global'}</td><td><Status value="Active" /></td><td>{index + 1}h ago</td></tr>)}</tbody></table>;
  }
  if (section === 'Analysis Runs') return <table className="g-data-table"><thead><tr><th>Run ID</th><th>Object</th><th>Trigger</th><th>Model / ruleset</th><th>Status</th><th>Duration</th><th>Confidence</th></tr></thead><tbody>{inventory.governanceReviews.slice(0, 12).map((review) => <tr key={review.id}><td>{review.id}</td><td>{review.object}</td><td>{review.kind}</td><td>repository projection</td><td><Status value={review.status} /></td><td>{review.ageing}d age</td><td>{review.confidence}%</td></tr>)}</tbody></table>;
  if (section === 'Model Configuration') return <ModelConfigurationPanel />;
  if (section === 'Audit Trail') return <AuditTrailSection />;
  if (section === 'Data Processing') return <div className="g-processing">{Array.from(new Set(inventory.governanceTemplates.map((template) => template.platform))).map((source) => { const accepted = inventory.governanceTemplates.filter((template) => template.platform === source).length; return <div key={source}><strong>{source}</strong><span>Last projection {inventory.generatedAt.slice(11, 16)} UTC</span><Status value="Healthy" /><small>{accepted} accepted · {inventory.csvUploadJob.rejectedRows} rejected</small></div>; })}</div>;
  const referenceRows = [
    ['Platforms', `${new Set(inventory.governanceTemplates.map((template) => template.platform)).size} active values`, Array.from(new Set(inventory.governanceTemplates.map((template) => template.platform))).join(', ')],
    ['Channels', `${new Set(inventory.governanceTemplates.map((template) => template.channel)).size} active values`, Array.from(new Set(inventory.governanceTemplates.map((template) => template.channel))).join(', ')],
    ['Markets', `${new Set(inventory.governanceTemplates.map((template) => template.market)).size} active values`, Array.from(new Set(inventory.governanceTemplates.map((template) => template.market))).join(', ')],
    ['Classifications', `${new Set(inventory.governanceUseCases.map((useCase) => useCase.classification)).size} controlled values`, Array.from(new Set(inventory.governanceUseCases.map((useCase) => useCase.classification))).join(', ')],
  ];
  const workflowRows = [
    ['Open review tasks', String(inventory.governanceReviews.filter((review) => review.status !== 'Resolved').length), 'Derived from review task and change request projections'],
    ['Maker-Checker', 'Always enabled', 'No self-approval through protected API commands'],
    ['Assignment', `${inventory.dashboardMetrics.ownerConfirmedPercentage}% owners confirmed`, 'Scope-aware via actor and tenant headers'],
  ];
  const matchingRows = [
    ['High confidence', `${inventory.candidateUseCases.filter((useCase) => useCase.confidence >= 85).length} records`, 'Auto-link candidates require approved mapping'],
    ['Medium confidence', `${inventory.candidateUseCases.filter((useCase) => useCase.confidence >= 60 && useCase.confidence < 85).length} records`, 'Route to review'],
    ['Low confidence', `${inventory.candidateUseCases.filter((useCase) => useCase.confidence < 60).length} records`, 'Unassigned and review required'],
  ];
  return <div className="g-config-grid">{(section === 'Reference Data' ? referenceRows : section === 'Workflow & SLA' ? workflowRows : matchingRows).map(([title, value, note]) => <div key={title}><span>{title}</span><strong>{value}</strong><small>{note}</small></div>)}</div>;
}

function ModelConfigurationPanel() {
  const [draft, setDraft] = useState<ModelConfigurationDraft>(defaultModelConfiguration);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setDraft(loadModelConfigurationDraft());
  }, []);

  const validation = validateModelConfiguration(draft);
  const envPreview = buildModelEnvironment(draft, false);
  const envForClipboard = buildModelEnvironment(draft, true);
  const providerLabel = draft.provider === 'deepseek' ? 'openai-compatible / deepseek' : draft.provider;

  function update<K extends keyof ModelConfigurationDraft>(key: K, value: ModelConfigurationDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice('');
  }

  function selectProvider(provider: ModelProviderDraft) {
    const preset = getModelProviderPreset(provider);
    setDraft((current) => ({ ...current, ...preset, provider, apiKey: provider === current.provider ? current.apiKey : '' }));
    setNotice('');
  }

  function saveConfiguration() {
    const { apiKey, ...safeDraft } = draft;
    window.localStorage.setItem(modelConfigStorageKey, JSON.stringify(safeDraft));
    if (apiKey.trim()) {
      window.sessionStorage.setItem(modelConfigSessionKey, apiKey.trim());
    } else {
      window.sessionStorage.removeItem(modelConfigSessionKey);
    }
    setNotice('Saved locally. Apply the generated env to API and worker, then restart them.');
  }

  async function copyEnvironment() {
    await window.navigator.clipboard.writeText(envForClipboard);
    setNotice('Environment block copied. Secrets are included only from this browser session.');
  }

  return (
    <div className="model-config" data-testid="model-config-panel">
      <div className="model-config-summary">
        <div>
          <span>Current draft</span>
          <strong>{providerLabel}</strong>
          <small>Maps to the existing worker runtime config. The frontend does not hot-swap running workers.</small>
        </div>
        <Status value={validation.valid ? 'Ready' : 'Needs configuration'} />
      </div>

      <div className="model-config-grid">
        <label>
          Provider
          <select data-testid="model-provider-select" value={draft.provider} onChange={(event) => selectProvider(event.target.value as ModelProviderDraft)}>
            <option value="noop">No model provider</option>
            <option value="openai">OpenAI Agents SDK</option>
            <option value="openai-compatible">OpenAI-compatible gateway</option>
            <option value="deepseek">DeepSeek preset</option>
          </select>
        </label>
        <label>
          Model
          <input data-testid="model-name-input" value={draft.model} onChange={(event) => update('model', event.target.value)} placeholder="gpt-5.4-mini" />
        </label>
        <label>
          Request URL
          <input data-testid="model-base-url-input" value={draft.baseUrl} onChange={(event) => update('baseUrl', event.target.value)} placeholder="https://api.provider.com" disabled={draft.provider === 'noop' || draft.provider === 'openai'} />
        </label>
        <label>
          API key
          <input data-testid="model-api-key-input" value={draft.apiKey} onChange={(event) => update('apiKey', event.target.value)} placeholder={draft.provider === 'noop' ? 'Not required' : 'Stored in this browser tab only'} type="password" disabled={draft.provider === 'noop'} autoComplete="off" />
        </label>
        <label>
          Provider name
          <input data-testid="model-provider-name-input" value={draft.providerName} onChange={(event) => update('providerName', event.target.value)} placeholder="deepseek" disabled={draft.provider === 'noop' || draft.provider === 'openai'} />
        </label>
        <label>
          Timeout
          <input value={draft.timeoutMs} onChange={(event) => update('timeoutMs', event.target.value)} inputMode="numeric" />
        </label>
        <label>
          Max retries
          <input value={draft.maxRetries} onChange={(event) => update('maxRetries', event.target.value)} inputMode="numeric" />
        </label>
        <label>
          Retry backoff
          <input value={draft.retryBackoffMs} onChange={(event) => update('retryBackoffMs', event.target.value)} inputMode="numeric" />
        </label>
        <label className="model-config-wide">
          Extra request body JSON
          <textarea data-testid="model-extra-body-input" value={draft.extraBodyJson} onChange={(event) => update('extraBodyJson', event.target.value)} placeholder='{"thinking":{"type":"enabled"},"reasoning_effort":"high"}' disabled={draft.provider === 'noop' || draft.provider === 'openai'} />
        </label>
      </div>

      {!validation.valid && (
        <div className="model-config-errors">
          {validation.issues.map((issue) => (
            <span key={issue}>{issue}</span>
          ))}
        </div>
      )}

      <div className="model-config-preview">
        <header>
          <div>
            <span>Generated runtime environment</span>
            <strong>Apply to API and worker process</strong>
          </div>
          <button className="g-button" disabled={!validation.valid} onClick={copyEnvironment}>Copy env</button>
        </header>
        <pre className="g-code">{envPreview}</pre>
      </div>

      <footer className="model-config-actions">
        <p>Provider settings are stored in local browser storage. The API key is kept only in session storage and appears in the copied env block when present.</p>
        <button className="g-button" onClick={() => setDraft(getModelProviderPreset(draft.provider))}>Reset preset</button>
        <button className="g-button g-button-primary" data-testid="model-save-button" disabled={!validation.valid} onClick={saveConfiguration}>Save draft</button>
      </footer>
      {notice && <div className="model-config-notice" role="status">{notice}</div>}
    </div>
  );
}

function loadModelConfigurationDraft(): ModelConfigurationDraft {
  try {
    const saved = window.localStorage.getItem(modelConfigStorageKey);
    const apiKey = window.sessionStorage.getItem(modelConfigSessionKey) ?? '';
    if (!saved) return { ...defaultModelConfiguration, apiKey };
    const parsed = JSON.parse(saved) as Partial<ModelConfigurationDraft>;
    return { ...defaultModelConfiguration, ...parsed, apiKey };
  } catch {
    return defaultModelConfiguration;
  }
}

function getModelProviderPreset(provider: ModelProviderDraft): ModelConfigurationDraft {
  if (provider === 'openai') {
    return { ...defaultModelConfiguration, provider, model: 'gpt-5.4-mini', providerName: 'openai' };
  }
  if (provider === 'openai-compatible') {
    return { ...defaultModelConfiguration, provider, baseUrl: 'http://127.0.0.1:4001/v1', model: 'provider-model-name', providerName: 'internal-gateway' };
  }
  if (provider === 'deepseek') {
    return { ...defaultModelConfiguration, provider, baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash', providerName: 'deepseek', extraBodyJson: '{"thinking":{"type":"enabled"},"reasoning_effort":"high"}' };
  }
  return defaultModelConfiguration;
}

function validateModelConfiguration(draft: ModelConfigurationDraft) {
  const issues: string[] = [];
  const needsProvider = draft.provider !== 'noop';
  const needsCompatible = draft.provider === 'openai-compatible' || draft.provider === 'deepseek';
  if (needsProvider && !draft.apiKey.trim()) issues.push('API key is required before copying or saving provider env.');
  if (needsProvider && !draft.model.trim()) issues.push('Model is required.');
  if (needsCompatible) {
    if (!draft.baseUrl.trim()) issues.push('Request URL is required.');
    try {
      if (draft.baseUrl.trim()) new URL(draft.baseUrl);
    } catch {
      issues.push('Request URL must be a valid URL.');
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(draft.providerName.trim())) issues.push('Provider name can use letters, numbers, dots, underscores, or hyphens.');
    if (draft.extraBodyJson.trim()) {
      try {
        const parsed = JSON.parse(draft.extraBodyJson);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') issues.push('Extra request body JSON must be an object.');
      } catch {
        issues.push('Extra request body JSON must be valid JSON.');
      }
    }
  }
  for (const [label, value] of [['Timeout', draft.timeoutMs], ['Max retries', draft.maxRetries], ['Retry backoff', draft.retryBackoffMs]]) {
    if (!/^\d+$/.test(value.trim())) issues.push(`${label} must be a non-negative integer.`);
  }
  return { valid: issues.length === 0, issues };
}

function buildModelEnvironment(draft: ModelConfigurationDraft, includeSecret: boolean) {
  if (draft.provider === 'noop') return 'AI_PROVIDER=noop';
  const keyValue = includeSecret && draft.apiKey.trim() ? draft.apiKey.trim() : '<browser-session-api-key>';
  if (draft.provider === 'openai') {
    return [`AI_PROVIDER=openai`, `OPENAI_API_KEY=${keyValue}`, `OPENAI_MODEL=${draft.model.trim()}`, `OPENAI_TRACE_INCLUDE_SENSITIVE_DATA=false`].join('\n');
  }
  const rows = [
    'AI_PROVIDER=openai-compatible',
    `OPENAI_COMPATIBLE_BASE_URL=${draft.baseUrl.trim()}`,
    `OPENAI_COMPATIBLE_API_KEY=${keyValue}`,
    `OPENAI_COMPATIBLE_MODEL=${draft.model.trim()}`,
    `OPENAI_COMPATIBLE_PROVIDER_NAME=${draft.providerName.trim()}`,
  ];
  if (draft.extraBodyJson.trim()) rows.push(`OPENAI_COMPATIBLE_EXTRA_BODY_JSON='${draft.extraBodyJson.trim()}'`);
  rows.push(`OPENAI_COMPATIBLE_TIMEOUT_MS=${draft.timeoutMs.trim()}`);
  rows.push(`OPENAI_COMPATIBLE_MAX_RETRIES=${draft.maxRetries.trim()}`);
  rows.push(`OPENAI_COMPATIBLE_RETRY_BACKOFF_MS=${draft.retryBackoffMs.trim()}`);
  return rows.join('\n');
}

function AuditTrailSection() {
  const { data: inventory, error, loading } = useProductInventory();
  const events: ReadonlyArray<GovernanceEvent> = inventory?.governanceEvents ?? [];

  if (loading) {
    return <div className="dashboard-loading" role="status">Loading live audit events…</div>;
  }

  if (error) {
    return <EmptyState title={`Live audit API unavailable: ${error}`} />;
  }

  return (
    <div className="g-audit-list">
      {events.map((event) => (
        <div key={event.id}>
          <ClockIcon />
          <span>{event.timestamp}</span>
          <strong>{event.actor}</strong>
          <p>
            {event.event}
            <b>{event.target}</b>
          </p>
        </div>
      ))}
    </div>
  );
}

function PageIntro({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children?: ReactNode }) { return <header className="g-page-intro"><div><span>{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div><div>{children}</div></header>; }
function ObjectHeader({ onBack, badge, title, subtitle, statuses, children }: { onBack: () => void; badge: string; title: string; subtitle: string; statuses: string[]; children: ReactNode }) { return <header className="g-object-header"><button className="g-back" onClick={onBack}><ArrowLeftIcon /></button><span className="g-object-badge">{badge}</span><div><h1>{title}</h1><p>{subtitle}</p><div className="g-object-statuses">{statuses.map((status) => <Status key={status} value={status} />)}</div></div><div className="g-object-actions">{children}</div></header>; }
function DetailTabs({ tabs, active, setActive }: { tabs: string[]; active: string; setActive: (tab: string) => void }) { return <div className="g-tabs">{tabs.map((tab) => <button className={tab === active ? 'active' : ''} onClick={() => setActive(tab)} key={tab}>{tab}</button>)}</div>; }
function ListControls({ query, setQuery, views, active, setActive }: { query: string; setQuery: (v: string) => void; views: string[]; active: string; setActive: (v: string) => void }) { return <><div className="g-list-tools"><label><MagnifyingGlassIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, ID, owner or identity" /></label><button className="g-button"><FunnelIcon />Filters <span>3</span></button><button className="g-button">Clear all</button></div><div className="g-saved-views">{views.map((view) => <button className={active === view ? 'active' : ''} onClick={() => setActive(view)} key={view}>{view}</button>)}</div></>; }
function Panel({ title, kicker, action, children, className = '' }: { title: string; kicker?: string; action?: ReactNode; children: ReactNode; className?: string }) { return <section className={`g-panel ${className}`}><header><div><h2>{title}</h2>{kicker && <p>{kicker}</p>}</div>{action}</header>{children}</section>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Tag({ value }: { value: string }) { return <span className="g-tag">{value}</span>; }
function Status({ value }: { value: string }) { const tone = /Approved|Active|Assigned|Complete|Healthy|Fresh/i.test(value) ? 'success' : /Candidate|Suggested|Pending|Partial|Review/i.test(value) ? 'warning' : /Retired|Critical|Overdue|Delayed|Changes|Warning/i.test(value) ? 'danger' : 'neutral'; return <span className={`g-status g-status-${tone}`}>{value}</span>; }
function Confidence({ value }: { value: number }) { return <span className={`g-confidence ${value >= 85 ? 'high' : value >= 60 ? 'medium' : 'low'}`}>{value}%</span>; }
function EmptyState({ title }: { title: string }) { return <div className="g-empty"><DocumentTextIcon /><strong>{title}</strong><span>Try clearing filters or changing the saved view.</span></div>; }
function DefinitionRows({ rows }: { rows: string[][] }) { return <dl className="g-definition">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>; }
function TemplateMiniTable({ templates, onOpen }: { templates: GovernanceTemplate[]; onOpen: (id: string) => void }) { return <table className="g-data-table"><thead><tr><th>Template</th><th>Current version</th><th>Platform / Tenant</th><th>Channel / Market</th><th>Volume</th><th>Mapping</th></tr></thead><tbody>{templates.map((item) => <tr key={item.uuid} onClick={() => onOpen(item.uuid)}><td><strong>{item.templateId}</strong></td><td>{item.currentVersion}{item.candidateVersion && <small>{item.candidateVersion}</small>}</td><td><strong>{item.platform}</strong><small>{item.tenant}</small></td><td><strong>{item.channel}</strong><small>{item.market}</small></td><td>{number.format(item.monthlyVolume)}</td><td><Status value={item.mapping} /></td></tr>)}</tbody></table>; }
function AnalysisPanel({ confidence }: { confidence: number }) { const [technical, setTechnical] = useState(false); return <div className="g-analysis-layout"><Panel title="Business summary" kicker="AI-assisted, reviewer-controlled"><div className="g-ai-summary"><SparklesIcon /><div><strong>{confidence}% overall confidence</strong><p>Message pattern, sender lineage and production behavior indicate a servicing use case. Human decisions remain authoritative.</p><div><Tag value="Servicing" /><Tag value="Repayment Management" /><Tag value="Hong Kong" /></div></div></div></Panel><Panel title="Extraction flow" kicker="Latest immutable analysis run"><ol className="g-analysis-flow">{['Ingestion', 'Normalization', 'Template detection', 'Variable extraction', 'Use Case matching', 'Classification'].map((step, index) => <li key={step}><span>{index + 1}</span><div><strong>{step}</strong><small>{index === 5 ? 'In progress' : 'Completed'}</small></div></li>)}</ol><button className="g-text-link" onClick={() => setTechnical(!technical)}>{technical ? 'Hide' : 'Show'} technical details <ChevronDownIcon /></button>{technical && <pre className="g-code">{`run_id: RUN-88104\nmodel: gmi-2.3\nruleset: r42\ncluster: CL-2841\nfingerprint: sha256:91be...44af\nduration_ms: 8421`}</pre>}</Panel><Panel title="Field confidence" kicker="Suggestion strength"><div className="g-field-confidence">{[['Use Case match', confidence], ['Classification', 94], ['Market', 99], ['Owner', 61], ['Variables', 96]].map(([label, score]) => <div key={label}><span>{label}</span><b><i style={{ width: `${score}%` }} /></b><strong>{score}%</strong></div>)}</div></Panel></div>; }
function GovernanceDiff({ pending, maker, checker }: { pending: number; maker: string; checker: string }) { return <div className="g-detail-stack"><Panel title="Effective record" kicker="Approved values remain active"><DefinitionRows rows={[['Revision', 'rev-18'], ['Status', 'Approved'], ['Effective since', 'Jun 01, 2026'], ['Evidence', '5 documents · 2 production samples']]} /></Panel>{pending ? <Panel title={`Proposed changes (${pending})`} kicker="Pending values are not yet effective"><div className="g-diff-table"><div><span>Field</span><span>Effective</span><span>Proposed</span><span>Reason</span></div><div><strong>Name</strong><span>Card repayment reminder</span><span>Card repayment reminder (HK)</span><span>Clarify market specificity</span></div><div><strong>Owner</strong><span>Unassigned</span><span>Alex Morgan</span><span>Confirmed business owner</span></div></div><div className="g-approval-meta"><span>Maker <strong>{maker}</strong></span><span>Checker <strong>{checker}</strong></span><span>Self-approval <strong>Blocked</strong></span></div></Panel> : <Panel title="No pending changes" kicker="The approved record is current"><div className="g-governance-score"><CheckCircleIcon /><strong>Governance current</strong><span>No draft or pending change request exists.</span></div></Panel>}</div>; }
function ActivityTimeline({ object }: { object: string }) { return <Panel title="Activity" kicker="Immutable object and governance history"><div className="g-activity">{[['Today, 12:48', 'Analysis completed', `RUN-88104 evaluated ${object}`], ['Today, 11:32', 'Approval package submitted', 'Maker submitted fields, evidence and linked templates'], ['Yesterday, 16:20', 'Business fields updated', 'Description and ownership enriched'], ['Jun 12, 09:14', 'Object discovered', 'Generated from production template clustering']].map(([time, title, text]) => <div key={time}><span /><small>{time}</small><strong>{title}</strong><p>{text}</p></div>)}</div></Panel>; }
function EditDrawer({ title, initialName, onClose, onSave }: { title: string; initialName: string; onClose: () => void; onSave: () => void }) { const [name, setName] = useState(initialName); return <div className="g-drawer-backdrop" onMouseDown={onClose}><aside className="g-drawer" onMouseDown={(event) => event.stopPropagation()}><header><div><span>Draft change request</span><h2>{title}</h2></div><button onClick={onClose}>×</button></header><label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Description<textarea defaultValue="Customer-facing message scenario discovered from production traffic." /></label><label>Classification<select><option>Servicing</option><option>Regulatory</option><option>Marketing</option></select></label><label>Change reason<textarea placeholder="Required for governance review" /></label><footer><button className="g-button" onClick={onClose}>Cancel</button><button className="g-button g-button-primary" onClick={onSave}>Save draft</button></footer></aside></div>; }
export function CandidateSplitModal({ useCase, templates, onClose, onSubmit }: { useCase: GovernanceUseCase; templates: GovernanceTemplate[]; onClose: () => void; onSubmit: () => void }) { const [assignments, setAssignments] = useState<Record<string, 'A' | 'B'>>(() => Object.fromEntries(templates.map((item, index) => [item.uuid, index === 0 ? 'A' : 'B']))); const [names, setNames] = useState({ A: `${useCase.name} · SMS`, B: `${useCase.name} · Email` }); const a = templates.filter((item) => assignments[item.uuid] === 'A'); const b = templates.filter((item) => assignments[item.uuid] === 'B'); const valid = a.length > 0 && b.length > 0 && names.A.trim() && names.B.trim(); return <div className="g-modal-backdrop"><section className="g-split-modal"><header><div><span>Candidate-only operation</span><h2>Split {useCase.id}</h2><p>Every discovered template must belong to exactly one group. Both groups are submitted as one approval package.</p></div><button onClick={onClose}>×</button></header><div className="g-split-source"><strong>Original candidate</strong><span>{useCase.name}</span><small>{templates.length} templates · {number.format(useCase.monthlyVolume)} monthly volume · source lineage preserved</small></div><div className="g-split-groups">{(['A', 'B'] as const).map((group) => { const grouped = group === 'A' ? a : b; return <section key={group}><header><span>Candidate group {group}</span><strong>{grouped.length} templates</strong></header><label>Use Case name<input value={names[group]} onChange={(event) => setNames({ ...names, [group]: event.target.value })} /></label><label>Classification<select defaultValue={useCase.classification}><option>Servicing</option><option>Regulatory</option><option>Marketing</option></select></label><div className="g-split-templates">{templates.map((template) => <label className={assignments[template.uuid] === group ? 'assigned' : ''} key={template.uuid}><input checked={assignments[template.uuid] === group} onChange={() => setAssignments({ ...assignments, [template.uuid]: group })} type="radio" name={template.uuid} /><span><strong>{template.templateId}</strong><small>{template.platform} · {template.channel} · {number.format(template.monthlyVolume)}</small></span></label>)}</div>{!grouped.length && <p className="g-validation-error">Each group must contain at least one template.</p>}</section>; })}</div><footer><span><ShieldCheckIcon />One package · no empty groups · approved record unchanged until decision</span><div><button className="g-button" onClick={onClose}>Cancel</button><button className="g-button g-button-primary" disabled={!valid} onClick={onSubmit}>Submit split for approval</button></div></footer></section></div>; }
function MergeModal({ governanceUseCases, source, onClose, onSubmit }: { governanceUseCases: GovernanceUseCase[]; source: GovernanceUseCase; onClose: () => void; onSubmit: () => void }) { const targets = governanceUseCases.filter((item) => item.id !== source.id && item.lifecycle !== 'Retired'); const [target, setTarget] = useState(targets[0]?.id ?? ''); const selected = targets.find((item) => item.id === target); return <div className="g-modal-backdrop"><section className="g-merge-modal"><header><div><span>Governed merge</span><h2>Merge Use Case</h2><p>The source object remains in history with a redirect and audit relationship.</p></div><button onClick={onClose}>×</button></header><div className="g-merge-flow"><div><span>Source</span><strong>{source.name}</strong><small>{source.id} · {source.templateIds.length} templates</small></div><span>→</span><div><span>Retained object</span><select value={target} onChange={(event) => setTarget(event.target.value)}>{targets.map((item) => <option value={item.id} key={item.id}>{item.id} · {item.name}</option>)}</select><small>{selected?.templateIds.length ?? 0} existing templates</small></div></div><div className="g-conflict-list"><h3>Field conflicts</h3><div><span>Classification</span><strong>{source.classification}</strong><span>→</span><strong>{selected?.classification}</strong></div><div><span>Message owner</span><strong>{source.messageOwner}</strong><span>→</span><strong>{selected?.messageOwner}</strong></div><div><span>Template result</span><strong>{source.templateIds.length} move</strong><span>→</span><strong>{(selected?.templateIds.length ?? 0) + source.templateIds.length} total</strong></div></div><label className="g-modal-reason">Merge reason<textarea placeholder="Required for governance approval" /></label><footer><button className="g-button" onClick={onClose}>Cancel</button><button className="g-button g-button-primary" onClick={onSubmit}>Submit merge for approval</button></footer></section></div>; }
function MappingDrawer({ governanceUseCases, template, onClose, onSubmit }: { governanceUseCases: GovernanceUseCase[]; template: GovernanceTemplate; onClose: () => void; onSubmit: (message: string) => void }) { const [choice, setChoice] = useState<'assign' | 'unassigned' | 'reanalyze'>('assign'); const [target, setTarget] = useState(template.parentUseCaseId ?? governanceUseCases[0]?.id ?? ''); return <div className="g-drawer-backdrop" onMouseDown={onClose}><aside className="g-drawer g-mapping-drawer" onMouseDown={(event) => event.stopPropagation()}><header><div><span>Template mapping review</span><h2>{template.templateId}</h2></div><button onClick={onClose}>×</button></header><div className="g-composite-key"><span>Composite identity</span><strong>{template.platform} / {template.tenant} / {template.templateId}</strong></div><div className="g-choice-list"><label className={choice === 'assign' ? 'selected' : ''}><input checked={choice === 'assign'} onChange={() => setChoice('assign')} type="radio" /><span><strong>Assign to existing Use Case</strong><small>Creates a governed mapping change.</small></span></label><label className={choice === 'unassigned' ? 'selected' : ''}><input checked={choice === 'unassigned'} onChange={() => setChoice('unassigned')} type="radio" /><span><strong>Keep unassigned</strong><small>No suitable approved Use Case exists.</small></span></label><label className={choice === 'reanalyze' ? 'selected' : ''}><input checked={choice === 'reanalyze'} onChange={() => setChoice('reanalyze')} type="radio" /><span><strong>Request re-analysis</strong><small>Creates a new immutable Analysis Run.</small></span></label></div>{choice === 'assign' && <label>Existing Use Case<select value={target} onChange={(event) => setTarget(event.target.value)}>{governanceUseCases.filter((item) => item.lifecycle !== 'Retired').map((item) => <option value={item.id} key={item.id}>{item.id} · {item.name}</option>)}</select></label>}{choice === 'unassigned' && <label>Reason<textarea placeholder="Required — manual Use Case creation is not available" /></label>}<footer><button className="g-button" onClick={onClose}>Cancel</button><button className="g-button g-button-primary" onClick={() => onSubmit(choice === 'reanalyze' ? 'New immutable analysis run queued' : choice === 'unassigned' ? 'Template remains unassigned with reviewer reason' : `Mapping change submitted for ${target}`)}>Continue</button></footer></aside></div>; }
function Toast({ message, onDone }: { message: string; onDone: () => void }) { window.setTimeout(onDone, 2400); return <div className="g-toast"><CheckCircleIcon />{message}</div>; }
function adminKicker(section: string) { const map: Record<string, string> = { 'Users & Access': 'Roles, market scope and access status', 'Model Configuration': 'AI provider, request endpoint and runtime env handoff', 'Reference Data': 'Controlled values and downstream impact', 'Matching & Classification': 'Effective ruleset and confidence bands', 'Workflow & SLA': 'Assignment, priority and maker–checker controls', 'Analysis Runs': 'Immutable technical execution history', 'Audit Trail': 'Immutable human and system actions', 'Data Processing': 'Source health, freshness and rejected records' }; return map[section]; }
