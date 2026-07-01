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
await page.getByTestId('review-task-refresh').waitFor();
await page.getByRole('status').getByText(/Live .*projection|Loaded .*from API|API .*tasks|No API review tasks|Review task API unavailable/).waitFor();
await page.locator('.queue-row').first().waitFor();
await page.getByRole('tab', { name: 'My Tasks' }).click();
await page.getByRole('status').getByText(/Live .*projection|Loaded .*from API|API .*tasks|No API review tasks|Review task API unavailable/).waitFor();
await page.getByRole('tab', { name: 'Completed' }).click();
await page.getByRole('status').getByText(/Live .*projection|Loaded .*from API|API .*tasks|No API review tasks|Review task API unavailable/).waitFor();
await page.getByRole('tab', { name: 'Discovery Review' }).click();

// Use Case inventory comes from the live product-inventory API.
await page.getByTestId('nav-use-cases').click();
await page.getByRole('heading', { name: 'Use Cases' }).waitFor();
const useCaseRows = page.locator('.g-data-table tbody tr');
await useCaseRows.nth(0).click();
await page.locator('.g-detail-page, .g-object-header').first().waitFor();

// Template inventory uses API-projected composite identity and mapping actions.
await page.getByTestId('nav-templates').click();
await page.getByRole('heading', { name: 'Templates' }).waitFor();
const templateRows = page.locator('.g-data-table tbody tr');
await templateRows.first().click();
await page.getByRole('button', { name: 'Review mapping' }).click();
const mappingDrawer = page.locator('.g-mapping-drawer');
await mappingDrawer.getByText('Assign to existing Use Case', { exact: true }).waitFor();
await mappingDrawer.getByText('Keep unassigned', { exact: true }).waitFor();
await mappingDrawer.getByText('Request re-analysis', { exact: true }).waitFor();
await page.locator('.g-mapping-drawer > header button').click();

// Governance approval is separated from discovery and is backed by API/projection data.
await page.getByTestId('nav-review-queue').click();
await page.getByRole('tab', { name: 'Governance Approval' }).click();
await page.getByTestId('approval-refresh').waitFor();
await page.getByRole('status').getByText(/Live approval projection|Loaded .*from API|API approval queue|pending API approvals|Approval API unavailable/).waitFor();

// Dashboard and Administration remain navigable from the same shell.
await page.getByTestId('nav-dashboard').click();
await page.getByRole('heading', { name: 'Messaging traffic analytics' }).waitFor();
await page.waitForFunction(() => [...document.querySelectorAll('.traffic-kpis article strong')].some((node) => node.textContent?.trim() !== '0'));
const dashboardKpis = await page.locator('.traffic-kpis article strong').allTextContents();
if (dashboardKpis.every((value) => value.trim() === '0')) {
  throw new Error('Dashboard did not render non-zero live API metrics.');
}
await page.getByTestId('nav-administration').click();
await page.getByRole('heading', { name: 'Administration' }).waitFor();
await page.getByRole('button', { name: 'Model Configuration' }).click();
await page.getByTestId('model-config-panel').waitFor();
await page.getByTestId('model-provider-select').selectOption('deepseek');
const modelBaseUrl = await page.getByTestId('model-base-url-input').inputValue();
if (modelBaseUrl !== 'https://api.deepseek.com') {
  throw new Error(`DeepSeek preset base URL mismatch: ${modelBaseUrl}`);
}
await page.getByTestId('model-api-key-input').fill('ui-test-provider-key');
await page.getByTestId('model-save-button').click();
await page.getByRole('status').getByText(/Saved locally/).waitFor();
await page.getByRole('button', { name: 'Audit Trail' }).click();
await page.locator('.g-audit-list > div').first().waitFor();

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
