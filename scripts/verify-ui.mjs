import { chromium } from 'playwright';

const baseUrl = process.env.APP_URL ?? 'http://127.0.0.1:5173';
const screenshotPath = '/tmp/gmi-governance-workspace.png';
const consoleIssues = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

await page.route('**/audit-events?*', async (route) => {
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      auditEvents: [
        {
          auditEventId: 'AUD-UI-SMOKE-1',
          actorId: 'ui-smoke-checker',
          action: 'change_request_decided',
          objectType: 'template',
          objectId: 'tpl-ui-smoke',
          sourceRunId: 'AR-UI-SMOKE',
          changeRequestId: 'CR-UI-SMOKE',
          beforeRef: 'PendingApproval',
          afterRef: 'Approved',
          createdAt: '2026-06-28T12:00:00.000Z',
        },
      ],
    }),
  });
});

page.on('console', (message) => {
  if (
    (message.type() === 'error' || message.type() === 'warning') &&
    !message.text().startsWith('Failed to load resource:')
  ) {
    consoleIssues.push(`[${message.type()}] ${message.text()}`);
  }
});

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

// Discovery Review is the default action center.
await page.getByRole('heading', { name: 'Review Queue' }).waitFor();
await page.getByRole('heading', { name: 'AI Extraction Flow' }).waitFor();
await page.getByTestId('review-task-refresh').waitFor();
await page.getByRole('status').getByText(/Review task API unavailable|API review tasks|open review tasks/).waitFor();
await page.getByTestId('review-task-claim').click();
await page.getByRole('status').getByText('Connect to the Review Task API to update this local queue item').waitFor();
await page.getByRole('button', { name: 'Submit for Approval' }).click();
await page.getByRole('status').getByText('Submitted to Governance Approval').waitFor();

// Candidate split is real, Candidate-only, and prevents empty groups.
await page.getByTestId('nav-use-cases').click();
await page.getByRole('heading', { name: 'Use Cases' }).waitFor();
const useCaseRows = page.locator('.g-data-table tbody tr');
await useCaseRows.nth(0).click();
await page.getByRole('heading', { name: 'Card repayment reminder' }).waitFor();
await page.getByRole('button', { name: 'Split Candidate' }).click();
await page.getByRole('heading', { name: 'Split UC-76821' }).waitFor();
const groupARadios = page.locator('.g-split-groups > section:first-child input[type="radio"]');
for (let index = 0; index < (await groupARadios.count()); index += 1) {
  await groupARadios.nth(index).check();
}
if (await page.getByRole('button', { name: 'Submit split for approval' }).isEnabled()) {
  throw new Error('Candidate split allowed an empty group.');
}
await page.locator('.g-split-modal > header button').click();
await page.getByTestId('nav-use-cases').click();
await useCaseRows.nth(1).click();
if ((await page.getByRole('button', { name: 'Split Candidate' }).count()) !== 0) {
  throw new Error('Active Use Case exposed Candidate-only split.');
}

// Template inventory uses composite identity and never offers manual creation.
await page.getByTestId('nav-templates').click();
await page.getByRole('heading', { name: 'Templates' }).waitFor();
const templateRows = page.locator('.g-data-table tbody tr');
await templateRows.nth((await templateRows.count()) - 1).click();
await page.getByRole('heading', { name: 'NEW-SENDER-4481' }).waitFor();
await page.getByRole('button', { name: 'Review mapping' }).click();
const mappingDrawer = page.locator('.g-mapping-drawer');
await mappingDrawer.getByText('Assign to existing Use Case', { exact: true }).waitFor();
await mappingDrawer.getByText('Keep unassigned', { exact: true }).waitFor();
await mappingDrawer.getByText('Request re-analysis', { exact: true }).waitFor();
await page.locator('.g-mapping-drawer > header button').click();

// Governance approval is separated from discovery and blocks self-approval.
await page.getByTestId('nav-review-queue').click();
await page.getByRole('tab', { name: 'Governance Approval' }).click();
await page.getByRole('heading', { name: 'Governance decision' }).waitFor();
await page.getByTestId('approval-refresh').waitFor();
await page.getByRole('status').getByText(/Approval API unavailable|API approval queue|pending API approvals/).waitFor();
await page.getByTestId('approval-refresh').click();
await page.getByTestId('approval-evidence-package').click();
await page.getByRole('heading', { name: 'Evidence package' }).waitFor();
await page.getByText('Proposed patch', { exact: true }).waitFor();
await page.getByText('Audit events', { exact: true }).waitFor();
const approvalRows = page.locator('.approval-list > button');
await approvalRows.nth((await approvalRows.count()) - 1).click();
await page.getByText('Self-approval blocked', { exact: true }).waitFor();
if (await page.getByRole('button', { name: 'Approve', exact: true }).isEnabled()) {
  throw new Error('Governance user could approve their own change.');
}

// Dashboard and Administration remain navigable from the same shell.
await page.getByTestId('nav-dashboard').click();
await page.getByRole('heading', { name: 'Messaging traffic analytics' }).waitFor();
await page.getByTestId('nav-administration').click();
await page.getByRole('heading', { name: 'Administration' }).waitFor();
await page.getByRole('button', { name: 'Analysis Runs' }).click();
await page.getByText('RUN-88104', { exact: true }).waitFor();
await page.getByRole('button', { name: 'Audit Trail' }).click();
await page.getByText('ui-smoke-checker', { exact: true }).waitFor();
await page.getByText(/Change Request Decided/).waitFor();

// AI Template Analysis exposes the latest backend evaluation and release gate.
await page.getByTestId('nav-ai-template-analysis').click();
await page.getByTestId('ai-template-analysis-page').waitFor();
await page.getByTestId('analysis-release-gate').waitFor();
await page.getByText('Release gate', { exact: true }).waitFor();
await page.getByText('ReadyForPromotion', { exact: true }).waitFor();
await page.getByTestId('analysis-run-reanalysis').waitFor();
await page.getByTestId('analysis-policy-decision').waitFor();

// The shell and primary page title respond to the locale control.
await page.getByLabel('Language').selectOption('zh-CN');
await page.getByRole('heading', { name: /原始消息与提取模板/ }).waitFor();
await page.getByTestId('nav-use-cases').getByText('Use Case 管理').waitFor();

await page.screenshot({ fullPage: true, path: screenshotPath });
await browser.close();

if (consoleIssues.length > 0) {
  throw new Error(`Browser console issues:\n${consoleIssues.join('\n')}`);
}

console.log(`Playwright verification passed. Screenshot: ${screenshotPath}`);
