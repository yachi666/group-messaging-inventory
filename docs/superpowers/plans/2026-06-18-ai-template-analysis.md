# AI Template Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully interactive, frontend-only AI Template Analysis split-inspector module while preserving every existing screen.

**Architecture:** The feature lives in an isolated `src/features/ai-analysis/` directory with its own display contract, mock response data, and page state. Existing application composition changes only to add one `AppView`, one sidebar item, one render branch, translations, and namespaced CSS; all analysis actions remain local and replaceable by a future API adapter.

**Tech Stack:** React 19, TypeScript 5.8, Vite 8, existing CSS tokens/components, Playwright UI verification.

---

## File Map

- Create `src/features/ai-analysis/analysisTypes.ts`: result and filter contracts.
- Create `src/features/ai-analysis/analysisData.ts`: realistic immutable mock API results.
- Create `src/features/ai-analysis/AiTemplateAnalysisPage.tsx`: split-inspector screen and local interactions.
- Modify `src/layout/AppShell.tsx`: add the independent navigation item and icon type.
- Modify `src/app/App.tsx`: render the new feature for its view.
- Modify `src/i18n/messages.ts`: add English and Chinese labels used by the module.
- Modify `src/styles/global.css`: append namespaced feature styles and responsive behavior.
- Modify `scripts/verify-ui.mjs`: verify navigation, filtering, selection, confirm, owner edit, merge, demise, and Chinese rendering.

### Task 1: Define the Analysis Result Contract and Mock Responses

**Files:**
- Create: `src/features/ai-analysis/analysisTypes.ts`
- Create: `src/features/ai-analysis/analysisData.ts`

- [ ] **Step 1: Create strict feature-local types**

```ts
export type AiMessageType =
  | 'OTP'
  | 'Transaction'
  | 'Marketing'
  | 'Profile update'
  | 'Alert';

export type GovernanceClassification = 'Regulatory' | 'Servicing' | 'Marketing';
export type AnalysisReviewStatus = 'needs-review' | 'reviewed' | 'merged';
export type AnalysisLifecycleStatus = 'active' | 'demised';

export type SimilarTemplateMatch = {
  templateId: string;
  name: string;
  similarity: number;
};

export type AiTemplateAnalysisResult = {
  id: string;
  templateId: string;
  name: string;
  channel: 'SMS' | 'Email' | 'Push' | 'In-app';
  analyzedAt: string;
  maskedMessage: string;
  extractedPattern: string;
  placeholders: string[];
  aiMessageType: AiMessageType;
  governanceClassification: GovernanceClassification;
  confidence: number;
  qualityScore: number;
  nearestMatch?: SimilarTemplateMatch;
  anomalies: string[];
  owner: string;
  reviewStatus: AnalysisReviewStatus;
  lifecycleStatus: AnalysisLifecycleStatus;
  explanation: string[];
};
```

- [ ] **Step 2: Add at least six realistic immutable result objects**

Use `satisfies ReadonlyArray<AiTemplateAnalysisResult>` and include:

```ts
export const initialAnalysisResults = [
  {
    id: 'ATA-001248',
    templateId: 'TPL-2048',
    name: 'Payment due reminder',
    channel: 'SMS',
    analyzedAt: '2026-06-18 10:32',
    maskedMessage:
      'Your payment of £***.** for account ending **1234 is due on **/**/2026. Please pay by the due date.',
    extractedPattern:
      'Your payment of {amount} for account ending {account_last4} is due on {due_date}. Please pay by the due date.',
    placeholders: ['{amount}', '{account_last4}', '{due_date}'],
    aiMessageType: 'Transaction',
    governanceClassification: 'Servicing',
    confidence: 96,
    qualityScore: 92,
    nearestMatch: {
      templateId: 'TPL-1023',
      name: 'Payment reminder — standard',
      similarity: 95,
    },
    anomalies: [],
    owner: 'A. Morgan',
    reviewStatus: 'needs-review',
    lifecycleStatus: 'active',
    explanation: [
      'Detected payment context with amount and due date.',
      'Mapped the message to the servicing governance class.',
      'Matched TPL-1023 using normalized template similarity.',
    ],
  },
] as const satisfies ReadonlyArray<AiTemplateAnalysisResult>;
```

Add Card fraud alert, OTP verification, Mortgage renewal notice, Statement available, and Loan disbursement records with varied classifications, confidence, anomalies, owners, review states, and optional nearest matches.

- [ ] **Step 3: Run TypeScript verification**

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript diagnostics.

- [ ] **Step 4: Commit the feature contract**

```bash
git add src/features/ai-analysis/analysisTypes.ts src/features/ai-analysis/analysisData.ts
git commit -m "Add AI template analysis result model"
```

### Task 2: Add the Independent Application View and Navigation Entry

**Files:**
- Modify: `src/layout/AppShell.tsx:14-38`
- Modify: `src/app/App.tsx:3-27`
- Modify: `src/i18n/messages.ts:1-20`

- [ ] **Step 1: Add a failing navigation assertion to UI verification**

Insert after the initial dashboard load in `scripts/verify-ui.mjs`:

```js
await page.getByTestId('nav-ai-template-analysis').waitFor();
```

- [ ] **Step 2: Run the UI script and verify the assertion fails**

Run in terminal 1: `npm run dev -- --host 127.0.0.1`

Run in terminal 2: `npm run test:ui`

Expected: FAIL because `nav-ai-template-analysis` does not exist.

- [ ] **Step 3: Extend `AppView` and navigation without reordering existing pages**

Add `'ai-template-analysis'` after `'analytics'`, add the nav item before the administration divider, and extend the icon union:

```ts
export type AppView =
  | 'dashboard'
  | 'inventory'
  | 'triage'
  | 'evidence'
  | 'analytics'
  | 'ai-template-analysis'
  | 'audit-trail'
  | 'settings';

const navItems = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: 'grid' },
  { id: 'inventory', labelKey: 'nav.inventory', icon: 'rows' },
  { id: 'triage', labelKey: 'nav.triage', icon: 'queue' },
  { id: 'evidence', labelKey: 'nav.evidence', icon: 'file' },
  { id: 'analytics', labelKey: 'nav.analytics', icon: 'bars' },
  { id: 'ai-template-analysis', labelKey: 'nav.aiTemplateAnalysis', icon: 'spark' },
  { id: 'audit-trail', labelKey: 'nav.auditTrail', icon: 'ledger' },
  { id: 'settings', labelKey: 'nav.settings', icon: 'dial' },
] as const;

const adminNavItems = navItems.slice(6);
const workspaceNavItems = navItems.slice(0, 6);
```

Retain the existing `satisfies` declaration and add `'spark'` to its icon union.

- [ ] **Step 4: Add the temporary render branch**

```tsx
import { AiTemplateAnalysisPage } from '../features/ai-analysis/AiTemplateAnalysisPage';

function renderActiveView(activeView: AppView) {
  if (activeView === 'dashboard') {
    return <DashboardPage />;
  }

  if (activeView === 'ai-template-analysis') {
    return <AiTemplateAnalysisPage />;
  }

  return <ProductWorkspace activeView={activeView} />;
}
```

Call `renderActiveView(activeView)` inside `AppShell`. Create an initial exported page component that renders an `h1` containing the translated title so the import resolves.

- [ ] **Step 5: Add the nav translation key in both locales**

```ts
// enMessages
'nav.aiTemplateAnalysis': 'AI Template Analysis',

// zhMessages
'nav.aiTemplateAnalysis': 'AI 模板分析',
```

- [ ] **Step 6: Run typecheck and the navigation assertion**

Run: `npm run typecheck && npm run test:ui`

Expected: both commands pass; all existing navigation checks remain green.

- [ ] **Step 7: Commit navigation and routing**

```bash
git add src/layout/AppShell.tsx src/app/App.tsx src/i18n/messages.ts src/features/ai-analysis/AiTemplateAnalysisPage.tsx scripts/verify-ui.mjs
git commit -m "Add AI template analysis workspace entry"
```

### Task 3: Build the Split Inspector Screen and Local Interactions

**Files:**
- Modify: `src/features/ai-analysis/AiTemplateAnalysisPage.tsx`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: Add failing UI assertions for the feature's primary state**

Append a new English-language feature block before switching to Chinese in `scripts/verify-ui.mjs`:

```js
await page.getByTestId('nav-ai-template-analysis').click();
await page.getByRole('heading', { name: 'AI Template Analysis' }).waitFor();
await page.getByTestId('analysis-results-table').waitFor();
await page.getByTestId('analysis-result-ATA-001248').click();
await page.getByTestId('analysis-inspector').getByText('Payment due reminder').waitFor();
await page.getByTestId('analysis-inspector').getByText('{amount}').waitFor();
```

- [ ] **Step 2: Run UI verification and confirm it fails on the missing screen regions**

Run: `npm run test:ui`

Expected: FAIL because `analysis-results-table` is absent.

- [ ] **Step 3: Implement filter and selection state**

Use state with explicit derived results:

```tsx
const [results, setResults] = useState<ReadonlyArray<AiTemplateAnalysisResult>>(
  initialAnalysisResults,
);
const [selectedId, setSelectedId] = useState(initialAnalysisResults[0].id);
const [query, setQuery] = useState('');
const [messageType, setMessageType] = useState<AiMessageType | 'all'>('all');
const [reviewStatus, setReviewStatus] = useState<AnalysisReviewStatus | 'all'>('all');
const [owner, setOwner] = useState<string | 'all'>('all');

const visibleResults = useMemo(() => {
  const normalizedQuery = query.trim().toLowerCase();
  return results.filter((result) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      result.name.toLowerCase().includes(normalizedQuery) ||
      result.extractedPattern.toLowerCase().includes(normalizedQuery);
    return (
      matchesQuery &&
      (messageType === 'all' || result.aiMessageType === messageType) &&
      (reviewStatus === 'all' || result.reviewStatus === reviewStatus) &&
      (owner === 'all' || result.owner === owner)
    );
  });
}, [messageType, owner, query, results, reviewStatus]);

const selectedResult =
  results.find((result) => result.id === selectedId) ?? visibleResults[0] ?? results[0];
```

- [ ] **Step 4: Render header, controls, metrics, result table, and inspector**

Use existing `StatusChip` and semantic elements. Required test IDs:

```tsx
<section className="analysis-page" data-testid="ai-template-analysis-page">
  <header className="analysis-header">
    <div>
      <p className="page-eyebrow">{t('analysis.eyebrow')}</p>
      <h1>{t('analysis.title')}</h1>
      <p>{t('analysis.subtitle')}</p>
    </div>
  </header>
  <section className="analysis-toolbar" aria-label={t('analysis.filters')}>
    <input
      data-testid="analysis-search"
      onChange={(event) => setQuery(event.target.value)}
      placeholder={t('analysis.searchPlaceholder')}
      type="search"
      value={query}
    />
    <select
      data-testid="analysis-type-filter"
      onChange={(event) => setMessageType(event.target.value as AiMessageType | 'all')}
      value={messageType}
    >
      <option value="all">{t('analysis.allTypes')}</option>
      {messageTypes.map((type) => <option key={type} value={type}>{type}</option>)}
    </select>
    <select
      data-testid="analysis-status-filter"
      onChange={(event) => setReviewStatus(event.target.value as AnalysisReviewStatus | 'all')}
      value={reviewStatus}
    >
      <option value="all">{t('analysis.allStatuses')}</option>
      <option value="needs-review">{t('analysis.needsReview')}</option>
      <option value="reviewed">{t('analysis.reviewed')}</option>
      <option value="merged">{t('analysis.merged')}</option>
    </select>
  </section>
  <section className="analysis-metrics">
    <article><span>{t('analysis.analyzedTemplates')}</span><strong>{results.length}</strong></article>
    <article><span>{t('analysis.highConfidence')}</span><strong>{highConfidenceCount}</strong></article>
    <article><span>{t('analysis.needsReview')}</span><strong>{needsReviewCount}</strong></article>
  </section>
  <div className="analysis-workbench">
    <section className="analysis-results" data-testid="analysis-results-table">
      {visibleResults.map((result) => (
        <button
          aria-pressed={result.id === selectedResult.id}
          data-testid={`analysis-result-${result.id}`}
          key={result.id}
          onClick={() => setSelectedId(result.id)}
          type="button"
        >
          <strong>{result.name}</strong>
          <span>{result.extractedPattern}</span>
          <span>{result.aiMessageType}</span>
          <span>{result.governanceClassification}</span>
          <span>{result.confidence}%</span>
          <span>{result.owner}</span>
        </button>
      ))}
    </section>
    <aside className="analysis-inspector" data-testid="analysis-inspector">
      <header><h2>{selectedResult.name}</h2><StatusChip tone="accent">{selectedResult.templateId}</StatusChip></header>
      <section><h3>{t('analysis.maskedMessage')}</h3><p>{selectedResult.maskedMessage}</p></section>
      <section><h3>{t('analysis.extractedTemplate')}</h3><p>{selectedResult.extractedPattern}</p></section>
      <section>{selectedResult.placeholders.map((item) => <code key={item}>{item}</code>)}</section>
      <section><h3>{t('analysis.aiExplanation')}</h3><ol>{selectedResult.explanation.map((item) => <li key={item}>{item}</li>)}</ol></section>
      <footer>
        <button data-testid="analysis-confirm" onClick={confirmAnalysis} type="button">{t('analysis.confirm')}</button>
        <button data-testid="analysis-merge" disabled={!selectedResult.nearestMatch} onClick={mergeCandidate} type="button">{t('analysis.merge')}</button>
        <button data-testid="analysis-edit-owner" onClick={() => setIsEditingOwner(true)} type="button">{t('analysis.editOwner')}</button>
        <button data-testid="analysis-demise" onClick={demiseTemplate} type="button">{t('analysis.demise')}</button>
      </footer>
    </aside>
  </div>
</section>
```

Rows must be buttons or contain a full-width button, expose `aria-pressed`, and use `data-testid={\`analysis-result-${result.id}\`}`.

- [ ] **Step 5: Implement visible local actions**

Use one immutable update helper:

```ts
function updateSelectedResult(changes: Partial<AiTemplateAnalysisResult>) {
  setResults((current) =>
    current.map((result) => (result.id === selectedResult.id ? { ...result, ...changes } : result)),
  );
}
```

Wire actions:

```tsx
function confirmAnalysis() {
  updateSelectedResult({ reviewStatus: 'reviewed' });
  setNotice(t('analysis.noticeConfirmed'));
}

function mergeCandidate() {
  if (!selectedResult.nearestMatch) return;
  updateSelectedResult({ reviewStatus: 'merged' });
  setNotice(t('analysis.noticeMerged'));
}

function demiseTemplate() {
  updateSelectedResult({ lifecycleStatus: 'demised' });
  setNotice(t('analysis.noticeDemised'));
}
```

Owner editing uses a local draft, rejects a trimmed empty string, and saves through `updateSelectedResult`.

- [ ] **Step 6: Add all feature copy to both locale records**

Add explicit keys for title, subtitle, filters, metric labels, table columns, inspector sections, statuses, buttons, notices, empty state, and accessibility labels. Keep AI message type values unchanged across locales; translate governance and UI labels.

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 8: Commit the functional screen**

```bash
git add src/features/ai-analysis/AiTemplateAnalysisPage.tsx src/i18n/messages.ts
git commit -m "Build AI template analysis split inspector"
```

### Task 4: Match the Approved Visual Direction Responsively

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/layout/AppShell.tsx`

- [ ] **Step 1: Add the sidebar spark icon using the existing icon system**

Use borders and pseudo-elements consistent with existing `.nav-glyph-*` rules:

```css
.nav-glyph-spark::before {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-radius: 50%;
}

.nav-glyph-spark::after {
  width: 4px;
  height: 4px;
  background: currentColor;
  border-radius: 50%;
}
```

- [ ] **Step 2: Append namespaced desktop styles**

Implement these layout constraints using existing tokens:

```css
.analysis-page {
  display: grid;
  gap: var(--space-md);
  min-width: 0;
}

.analysis-workbench {
  display: grid;
  grid-template-columns: minmax(620px, 1.55fr) minmax(340px, 0.85fr);
  min-height: 620px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card-soft);
}

.analysis-results {
  min-width: 0;
  overflow-x: auto;
  border-right: 1px solid var(--color-divider);
}

.analysis-inspector {
  min-width: 0;
  background: var(--color-surface);
}
```

Add focused styles for toolbar controls, three metric blocks, selected table row, confidence tracks, pattern blocks, chips, inspector sections, explanation steps, inline owner editor, action bar, empty state, and notice banner. Use only existing color, radius, spacing, and shadow tokens.

- [ ] **Step 3: Add responsive rules without changing existing breakpoints**

```css
@media (max-width: 1180px) {
  .analysis-workbench {
    grid-template-columns: minmax(560px, 1.35fr) minmax(300px, 0.75fr);
  }
}

@media (max-width: 900px) {
  .analysis-workbench {
    grid-template-columns: 1fr;
  }

  .analysis-results {
    border-right: 0;
    border-bottom: 1px solid var(--color-divider);
  }
}

@media (max-width: 760px) {
  .analysis-toolbar,
  .analysis-metrics {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run build verification**

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully and `dist/` is generated.

- [ ] **Step 5: Commit the approved styling**

```bash
git add src/styles/global.css src/layout/AppShell.tsx
git commit -m "Style AI template analysis workbench"
```

### Task 5: Complete End-to-End Interaction Verification

**Files:**
- Modify: `scripts/verify-ui.mjs`

- [ ] **Step 1: Complete the English interaction checks**

Add checks using the stable test IDs:

```js
await page.getByTestId('analysis-search').fill('Card fraud');
await page.getByTestId('analysis-result-ATA-001249').waitFor();
await page.getByTestId('analysis-search').fill('');
await page.getByTestId('analysis-status-filter').selectOption('needs-review');
await page.getByTestId('analysis-result-ATA-001248').click();
await page.getByTestId('analysis-confirm').click();
await page.getByTestId('analysis-notice').getByText('Analysis confirmed').waitFor();
await page.getByTestId('analysis-edit-owner').click();
await page.getByTestId('analysis-owner-input').fill('L. Zhang');
await page.getByTestId('analysis-save-owner').click();
await page.getByTestId('analysis-inspector').getByText('L. Zhang').waitFor();
await page.getByTestId('analysis-merge').click();
await page.getByTestId('analysis-notice').getByText('Candidate merged').waitFor();
await page.getByTestId('analysis-demise').click();
await page.getByTestId('analysis-notice').getByText('Template demised').waitFor();
```

- [ ] **Step 2: Add Chinese rendering checks**

After selecting `zh-CN`:

```js
await page.getByTestId('nav-ai-template-analysis').click();
await page.getByRole('heading', { name: 'AI 模板分析' }).waitFor();
await page.getByTestId('analysis-inspector').getByText('提取后的模板').waitFor();
await page.getByTestId('analysis-confirm').getByText('确认分析').waitFor();
```

- [ ] **Step 3: Run all required verification**

Run with the Vite server active:

```bash
npm run typecheck
npm run build
npm run test:ui
```

Expected:

- Typecheck exits 0.
- Build exits 0.
- Playwright prints `Playwright verification passed` with no browser console errors.

- [ ] **Step 4: Inspect the verification screenshot**

Open `/tmp/gmi-product-workspace.png` and check for clipped inspector content, unreadable table columns, incorrect spacing, broken Chinese wrapping, and unintended changes to existing pages. Fix any visible issue and repeat `npm run test:ui`.

- [ ] **Step 5: Commit verification coverage**

```bash
git add scripts/verify-ui.mjs
git commit -m "Verify AI template analysis interactions"
```

### Task 6: Final Regression Check

**Files:**
- Review only: all files changed by Tasks 1-5

- [ ] **Step 1: Confirm repository scope**

Run: `git status --short && git diff --stat HEAD~4..HEAD`

Expected: only the planned AI analysis, navigation, translation, style, and verification files are changed.

- [ ] **Step 2: Run final verification from a clean server session**

Run:

```bash
npm run typecheck
npm run build
npm run dev -- --host 127.0.0.1
```

In a second terminal run: `npm run test:ui`

Expected: all commands pass and existing screens remain intact.

- [ ] **Step 3: Review acceptance criteria**

Confirm the implementation provides the independent navigation item, approved split inspector, all specified local interactions, bilingual copy, responsive behavior, and zero modifications to existing page composition.
