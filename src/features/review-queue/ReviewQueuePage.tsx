import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { governanceReviews, governanceTemplates, governanceUseCases } from '../../data/governanceMock';
import { CandidateSplitModal } from '../governance/GovernancePages';
import { useI18n } from '../../i18n/LanguageProvider';

type QueueStatus = 'Needs review' | 'Pending approval' | 'Overdue';

type QueueItem = {
  id: string;
  name: string;
  platform: string;
  channel: string;
  market: string;
  confidence: number;
  priority: 'High' | 'Medium' | 'Low';
  age: string;
  status: QueueStatus;
};

const queueItems: QueueItem[] = [
  { id: 'UC-76821', name: 'Card repayment reminder', platform: 'MDP', channel: 'SMS', market: 'Hong Kong', confidence: 87, priority: 'High', age: '3d', status: 'Needs review' },
  { id: 'TPL-55411', name: 'Order confirmation v3', platform: 'SFMC', channel: 'Email', market: 'UK', confidence: 64, priority: 'Medium', age: '5d', status: 'Needs review' },
  { id: 'UC-76818', name: 'Password reset email', platform: 'ICCM', channel: 'Email', market: 'Singapore', confidence: 91, priority: 'High', age: '1d', status: 'Pending approval' },
  { id: 'VER-33109', name: 'Marketing opt-in email v2', platform: 'MDP', channel: 'SMS', market: 'UK', confidence: 77, priority: 'Medium', age: '2d', status: 'Needs review' },
  { id: 'RL-85512', name: 'Spring promo SMS (Retired)', platform: 'SFMC', channel: 'SMS', market: 'Hong Kong', confidence: 93, priority: 'High', age: '7d', status: 'Overdue' },
  { id: 'TPL-55398', name: 'Shipping delay SMS', platform: 'MDP', channel: 'SMS', market: 'Singapore', confidence: 58, priority: 'Low', age: '6d', status: 'Needs review' },
  { id: 'UC-76790', name: 'Account security alert email', platform: 'ICCM', channel: 'Email', market: 'UK', confidence: 87, priority: 'High', age: '4d', status: 'Needs review' },
  { id: 'VER-33077', name: 'Welcome series email v2', platform: 'MDP', channel: 'Email', market: 'Hong Kong', confidence: 73, priority: 'Medium', age: '3d', status: 'Pending approval' },
  { id: 'TPL-55321', name: 'Two-factor code SMS', platform: 'SFMC', channel: 'SMS', market: 'Singapore', confidence: 61, priority: 'Medium', age: '8d', status: 'Overdue' },
  { id: 'RL-88401', name: 'Black Friday offer email (Retired)', platform: 'MDP', channel: 'Email', market: 'UK', confidence: 95, priority: 'High', age: '10d', status: 'Overdue' },
  { id: 'UC-76712', name: 'Loyalty points expiry SMS', platform: 'SFMC', channel: 'SMS', market: 'Singapore', confidence: 68, priority: 'Medium', age: '5d', status: 'Needs review' },
  { id: 'VER-33012', name: 'Re-engagement email v2', platform: 'ICCM', channel: 'Email', market: 'Singapore', confidence: 79, priority: 'Medium', age: '2d', status: 'Pending approval' },
];

const extractionSteps = [
  { title: 'Ingestion', facts: [['Sources', '12'], ['Earliest', 'May 28, 2025'], ['Latest', 'Jun 12, 2025']], state: 'Completed' },
  { title: 'Normalization', facts: [['Messages', '12'], ['Normalized', '12 (100%)'], ['Languages', 'EN, ZH']], state: 'Completed' },
  { title: 'Template Detection', facts: [['Templates found', '3'], ['Primary template', 'Repayment reminder - HK'], ['Best match', '92%']], state: 'Completed' },
  { title: 'Variable Extraction', facts: [['Variables', '6'], ['Consistency', 'High'], ['PII detected', 'No']], state: 'Completed' },
  { title: 'Use Case Matching', facts: [['Top match', 'Card repayment reminder'], ['Confidence', '87%'], ['Alternatives', '2']], state: 'Completed' },
  { title: 'Classification', facts: [['Type', 'Servicing'], ['Sub-class', 'Repayment Management'], ['Market', 'Hong Kong']], state: 'In progress' },
] as const;

export function ReviewQueuePage() {
  const { locale } = useI18n();
  const zh = locale === 'zh-CN';
  const [activeTab, setActiveTab] = useState('Discovery Review');
  const [selectedId, setSelectedId] = useState(queueItems[0].id);
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState('Confirmed as a standard servicing reminder for card repayment. Templates and variables align with the existing Repayment Management taxonomy.');
  const [highQuality, setHighQuality] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [splitting, setSplitting] = useState(false);

  const visibleItems = useMemo(() => queueItems.filter((item) => `${item.name} ${item.id} ${item.market}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const selected = queueItems.find((item) => item.id === selectedId) ?? queueItems[0];

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2200);
  }

  if (activeTab === 'Governance Approval') {
    return <GovernanceApprovalWorkbench activeTab={activeTab} onTabChange={setActiveTab} />;
  }

  return (
    <section className="review-workbench">
      <header className="review-header">
        <div>
          <h1>{zh ? '审核队列' : 'Review Queue'}</h1>
          <p>{zh ? '审核系统发现的对象，并基于证据作出治理决策。' : 'Review discovered items and make evidence-backed governance decisions.'}</p>
        </div>
        <div className="review-metrics" aria-label="Queue metrics">
          <Metric value="128" label="Total" />
          <Metric value="42" label="Needs review" />
          <Metric value="28" label="Overdue" />
          <Metric value="18" label="Assigned to me" />
        </div>
      </header>

      <div className="review-tabs" role="tablist">
        {['Discovery Review', 'Governance Approval', 'My Tasks', 'Completed'].map((tab) => (
          <button className={activeTab === tab ? 'review-tab-active' : ''} key={tab} onClick={() => setActiveTab(tab)} role="tab" type="button">{tab}</button>
        ))}
      </div>

      <div className="workbench-grid">
        <aside className="queue-panel">
          <div className="queue-tools">
            <label><MagnifyingGlassIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search object, ID, or market" /></label>
            <button onClick={() => flash('Filters ready for configuration')} type="button"><FunnelIcon />Filters <span>3</span></button>
          </div>
          <div className="queue-columns"><span>Object</span><span>Plat/Chnl</span><span>Conf.</span><span>Priority</span><span>Age</span></div>
          <div className="review-queue-list">
            {visibleItems.map((item) => (
              <button className={`queue-row ${selected.id === item.id ? 'queue-row-selected' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)} type="button">
                <span className={`queue-object-icon queue-object-${item.priority.toLowerCase()}`}><DocumentMagnifyingGlassIcon /></span>
                <span className="queue-object"><strong>{item.name}</strong><small>{item.id}</small></span>
                <span className="queue-platform"><strong>{item.platform} {item.channel}</strong><small>{item.market}</small></span>
                <strong className={`confidence confidence-${item.confidence < 70 ? 'low' : 'high'}`}>{item.confidence}%</strong>
                <span className={`priority priority-${item.priority.toLowerCase()}`}>{item.priority === 'Medium' ? 'Med' : item.priority}</span>
                <span className="queue-age">{item.age}</span>
              </button>
            ))}
          </div>
          <footer className="queue-footer"><span>1–{visibleItems.length} of 128 items</span><span>‹ &nbsp; <b>1</b> &nbsp; 2 &nbsp; 3 &nbsp; … &nbsp; 11 &nbsp; ›</span></footer>
        </aside>

        <main className="candidate-panel">
          <div className="candidate-titlebar">
            <div className="candidate-avatar">M</div>
            <div><div className="candidate-heading"><h2>{selected.name}</h2><span>{selected.confidence}% confidence</span></div><p>Candidate Use Case · {selected.platform} {selected.channel} · {selected.market} · Detected 15 minutes ago</p></div>
            <button className="status-select" type="button">{selected.status}<ChevronDownIcon /></button>
          </div>

          <WorkbenchSection title="Linked templates (3)">
            <table className="linked-table"><thead><tr><th>Template name</th><th>Platform</th><th>Channel</th><th>Language</th><th>Last seen</th><th>Match</th></tr></thead><tbody>
              <tr><td>Card repayment reminder - HK</td><td>MDP</td><td>SMS</td><td>English</td><td>Jun 12, 2025</td><td>92%</td></tr>
              <tr><td>Card repayment reminder - HK (ZH)</td><td>MDP</td><td>SMS</td><td>Chinese</td><td>Jun 12, 2025</td><td>89%</td></tr>
              <tr><td>Card repayment reminder email - HK</td><td>SFMC</td><td>Email</td><td>English</td><td>Jun 10, 2025</td><td>81%</td></tr>
            </tbody></table>
          </WorkbenchSection>

          <WorkbenchSection title="Key business fields" action={<button className="text-action" onClick={() => flash('Business fields unlocked for editing')} type="button"><PencilSquareIcon />Edit</button>}>
            <div className="business-fields">
              <Field label="Use case name" value={selected.name} /><Field label="Primary channel" value={`${selected.platform} ${selected.channel}`} />
              <Field label="Market" value={selected.market} /><Field label="Other channels" value="SFMC Email" />
              <Field label="Classification" value="Servicing" /><Field label="Frequency" value="Monthly" />
              <Field label="Sub-classification" value="Repayment Management" /><Field label="Audience" value="Credit card customers" />
              <Field label="Trigger" value="Payment due date approaching" /><Field label="Priority" value="Medium" />
              <Field label="Purpose" value="Remind customers of upcoming payment" /><Field label="Status" value="Pending Approval" />
            </div>
          </WorkbenchSection>

          <WorkbenchSection title="Message pattern (MDP SMS) · English" action={<button className="text-action" onClick={() => { navigator.clipboard?.writeText('Hi {{first_name}}, your card payment of HKD {{amount}} is due on {{due_date}}.'); flash('Message pattern copied'); }} type="button">Copy</button>}>
            <pre className="message-pattern"><code>{`1  Hi {{first_name}},\n2  This is a reminder that your credit card payment of HKD {{amount}}\n3  is due on {{due_date}}.\n4  Please make your payment to avoid late fees.\n5  Thank you, {{bank_name}}`}</code></pre>
            <div className="variable-row">{['{{first_name}}', '{{amount}}', '{{due_date}}', '{{bank_name}}', '{{last_4_digits}}', '{{payment_link}}'].map((variable) => <span key={variable}>{variable}</span>)}</div>
          </WorkbenchSection>

          <WorkbenchSection title="Review notes">
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            <label className="quality-check"><input checked={highQuality} onChange={(event) => setHighQuality(event.target.checked)} type="checkbox" />Mark as high quality</label>
          </WorkbenchSection>

          <WorkbenchSection title="Proposed changes (1)">
            <div className="proposed-change"><span>Change use case name</span><small>Current</small><strong>{selected.name}</strong><span>→</span><small>Proposed</small><strong>{selected.name} (HK)</strong><small>Reason</small><span>Clarify market specificity</span></div>
          </WorkbenchSection>

          <div className="governance-preview"><ChevronDownIcon /><strong>Governance preview</strong><span>Before vs After</span><span>3 fields updated</span><span>Evidence · 5 docs · 2 templates</span><span>Approver · Priya Desai</span></div>
        </main>

        <aside className="extraction-panel">
          <div className="extraction-heading"><SparklesIcon /><div><h2>AI Extraction Flow</h2><p><strong>{selected.confidence}%</strong> overall confidence</p></div></div>
          <ol className="extraction-steps">
            {extractionSteps.map((step, index) => <li className={step.state === 'In progress' ? 'step-progress' : ''} key={step.title}><span>{index + 1}</span><div><div><strong>{step.title}</strong><small>{step.state === 'Completed' ? <><CheckCircleIcon />Completed</> : step.state}</small></div><dl>{step.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div></li>)}
          </ol>
          <button className="technical-link" onClick={() => flash('Technical details opened')} type="button">View full technical details</button>
        </aside>
      </div>

      <footer className="action-dock">
        <div><button onClick={() => setSplitting(true)} type="button"><ScissorsIcon />Split Candidate</button><button onClick={() => flash('Merge selection mode enabled')} type="button"><ArrowsRightLeftIcon />Merge</button><button onClick={() => flash('AI re-analysis requested')} type="button"><ArrowPathIcon />Request Re-analysis</button></div>
        <div><button onClick={() => flash('Draft saved')} type="button">Save Draft</button><button className="submit-button" onClick={() => flash('Submitted to Governance Approval')} type="button">Submit for Approval</button></div>
      </footer>
      {notice ? <div className="review-toast" role="status">{notice}</div> : null}
      {splitting ? <CandidateSplitModal useCase={governanceUseCases[0]} templates={governanceTemplates.filter((template) => governanceUseCases[0].templateIds.includes(template.uuid))} onClose={() => setSplitting(false)} onSubmit={() => { setSplitting(false); flash('Split approval package submitted'); }} /> : null}
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) { return <div><strong>{value}</strong><span>{label}</span></div>; }
function WorkbenchSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) { return <section className="workbench-section"><header><h3>{title}</h3>{action}</header>{children}</section>; }
function Field({ label, value }: { label: string; value: string }) { return <div className="business-field"><span>{label}</span><strong>{value}</strong><PencilSquareIcon /></div>; }

function GovernanceApprovalWorkbench({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const { locale } = useI18n(); const zh = locale === 'zh-CN';
  const approvals = governanceReviews.filter((review) => review.kind === 'Approval');
  const [selectedId, setSelectedId] = useState(approvals[0].id);
  const [decision, setDecision] = useState<'Approve' | 'Request changes' | 'Reject' | null>(null);
  const [comment, setComment] = useState('');
  const selected = approvals.find((review) => review.id === selectedId) ?? approvals[0];
  const selfApprovalBlocked = selected.maker === 'Priya Desai';
  return <section className="review-workbench governance-approval-workbench">
    <header className="review-header"><div><h1>{zh ? '审核队列' : 'Review Queue'}</h1><p>{zh ? '集中处理人工调查与治理审批。' : 'Review discovered items and make evidence-backed governance decisions.'}</p></div><div className="review-metrics"><Metric value="12" label={zh ? '待审批' : 'Pending'} /><Metric value="4" label={zh ? '今日到期' : 'Due today'} /><Metric value="3" label={zh ? '要求修改' : 'Changes requested'} /><Metric value="2" label={zh ? '已超时' : 'Overdue'} /></div></header>
    <div className="review-tabs" role="tablist">{['Discovery Review', 'Governance Approval', 'My Tasks', 'Completed'].map((tab) => <button className={activeTab === tab ? 'review-tab-active' : ''} key={tab} onClick={() => onTabChange(tab)} role="tab" type="button">{tab}</button>)}</div>
    <div className="approval-grid">
      <aside className="approval-queue"><div className="queue-tools"><label><MagnifyingGlassIcon /><input placeholder="Search approvals" /></label><button type="button"><FunnelIcon />Filters <span>2</span></button></div><div className="approval-list">{approvals.map((review) => <button className={selected.id === review.id ? 'active' : ''} key={review.id} onClick={() => { setSelectedId(review.id); setDecision(null); }}><span className={`priority priority-${review.priority.toLowerCase()}`}>{review.priority}</span><div><strong>{review.object}</strong><small>{review.type} · {review.id}</small><small>{review.market} · Maker: {review.maker}</small></div><b>{review.ageing}d</b></button>)}</div></aside>
      <main className="approval-case">
        <header><div><span>Approval request · {selected.id}</span><h2>{selected.object}</h2><p>{selected.type} · {selected.market} · Submitted by {selected.maker}</p></div><span className="approval-pending">Pending Approval</span></header>
        <section><h3>Decision summary</h3><div className="approval-summary"><div><span>Request type</span><strong>{selected.type}</strong></div><div><span>Risk</span><strong>{selected.priority}</strong></div><div><span>Evidence</span><strong>5 documents</strong></div><div><span>Estimated impact</span><strong>Low</strong></div></div></section>
        <section><h3>Before & after</h3><div className="approval-diff"><div><span>Field</span><span>Effective</span><span>Proposed</span></div><div><strong>Lifecycle</strong><span>Candidate</span><span>Active</span></div><div><strong>Name</strong><span>Card repayment reminder</span><span>Card repayment reminder (HK)</span></div><div><strong>Message owner</strong><span>Unassigned</span><span>Alex Morgan</span></div><div><strong>Templates</strong><span>0 approved</span><span>3 assigned</span></div></div></section>
        <section><h3>Related objects & evidence</h3><div className="approval-evidence"><button><DocumentMagnifyingGlassIcon /><span><strong>3 linked production templates</strong><small>MDP SMS · SFMC Email</small></span></button><button><SparklesIcon /><span><strong>AI recommendation · Approve</strong><small>87% confidence · 6 steps completed</small></span></button><button><CheckCircleIcon /><span><strong>5 evidence references</strong><small>Owner attestation · production samples</small></span></button></div></section>
        <section><h3>Reason & history</h3><p className="approval-reason">Candidate represents a stable servicing pattern across three production templates. Market specificity and ownership were confirmed by the business maker.</p><div className="approval-history"><span>11:32</span><strong>Alex Morgan</strong><p>Submitted approval package</p><span>10:48</span><strong>System</strong><p>Validation passed · base revision current</p></div></section>
      </main>
      <aside className="decision-rail"><div><ShieldCheckIcon /><h2>Governance decision</h2><p>Review evidence and decide without rewriting the maker's request.</p></div>{selfApprovalBlocked && <div className="self-approval-warning"><ExclamationTriangleIcon /><span><strong>Self-approval blocked</strong>You cannot approve your own change.</span></div>}<label>Decision comment<textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Required for request changes or rejection" /></label><div className="decision-buttons"><button className={decision === 'Approve' ? 'selected approve' : ''} disabled={selfApprovalBlocked} onClick={() => setDecision('Approve')}>Approve</button><button className={decision === 'Request changes' ? 'selected changes' : ''} onClick={() => setDecision('Request changes')}>Request changes</button><button className={decision === 'Reject' ? 'selected reject' : ''} onClick={() => setDecision('Reject')}>Reject</button></div><button className="confirm-decision" disabled={!decision || ((decision === 'Request changes' || decision === 'Reject') && !comment.trim())} onClick={() => setDecision(null)}>Confirm {decision ?? 'decision'}</button><small>Decision creates an immutable audit record. Approved data changes only after confirmation.</small></aside>
    </div>
  </section>;
}
