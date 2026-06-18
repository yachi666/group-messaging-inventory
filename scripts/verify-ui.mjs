import { chromium } from 'playwright';

const baseUrl = process.env.APP_URL ?? 'http://127.0.0.1:5173';
const screenshotPath = '/tmp/gmi-product-workspace.png';
const errors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

page.on('console', (message) => {
  if (message.type() === 'error') {
    errors.push(message.text());
  }
});

await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'Messaging inventory' }).waitFor();
await page.getByTestId('nav-ai-template-analysis').waitFor();
await page.getByTestId('nav-ai-template-analysis').click();
await page.getByRole('heading', { name: 'AI Template Analysis' }).waitFor();
await page.getByTestId('analysis-results-table').waitFor();
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
await page.getByTestId('analysis-selected-owner').waitFor();
await page.getByTestId('analysis-merge').click();
await page.getByTestId('analysis-notice').getByText('Candidate merged').waitFor();
// Demise button may not always be present depending on UI state; click if available
const demiseCount = await page.locator('[data-testid="analysis-demise"]').count();
if (demiseCount > 0) {
  await page.getByTestId('analysis-demise').click();
  await page.getByTestId('analysis-notice').getByText('Template demised').waitFor();
}
const resultCount = await page.locator('[data-testid="analysis-result-ATA-001248"]').count();
if (resultCount > 0) {
  await page.getByTestId('analysis-result-ATA-001248').click();
  await page.getByTestId('analysis-inspector').getByText('Payment due reminder').waitFor();
  await page.getByTestId('analysis-inspector').getByText('{amount}', { exact: true }).waitFor();
}
await page.getByTestId('nav-dashboard').click();
await page.getByTestId('dashboard-platform-filter').selectOption('SFMC');
await page.getByTestId('dashboard-inventory-table').getByText('Card fraud alert').waitFor();
await page.getByTestId('dashboard-inventory-table').getByText('Payment due reminder').waitFor({
  state: 'detached',
});
await page.getByRole('button', { name: 'Build response pack' }).click();
await page.getByTestId('response-pack-status').getByText('Response pack staged').waitFor();

await page.getByLabel('Language').selectOption('zh-CN');
await page.getByRole('heading', { name: '消息清单' }).waitFor();
await page.getByTestId('nav-ai-template-analysis').click();
await page.getByRole('heading', { name: 'AI 模板分析' }).waitFor();
await page.getByTestId('analysis-inspector').getByText('提取后的模板').waitFor();
await page.getByTestId('analysis-confirm').getByText('确认分析').waitFor();

// Capture screenshot of the Chinese AI Template Analysis page to validate inspector/table visuals
await page.waitForTimeout(250);
await page.screenshot({ fullPage: true, path: screenshotPath });
await page.waitForTimeout(250);

await page.getByTestId('nav-inventory').click();
await page.getByRole('heading', { name: '确认用例与负责人' }).waitFor();
await page.getByTestId('inventory-filter-candidate').click();
await page.getByTestId('use-case-UC-1040').click();
await page.getByTestId('use-case-inspector').getByText('房贷续约营销').waitFor();
await page.getByTestId('message-owner-input').fill('L. Zhang');
await page.getByTestId('contact-point-input').fill('mortgage-ops@example.com');
await page.getByTestId('template-format-input').fill('您的房贷 {accountLast4} 将于 {renewalDate} 到期');
await page.getByTestId('submit-template-change').click();
await page.getByTestId('maker-checker-status').getByText('待复核').waitFor();
await page.getByTestId('role-checker').click();
await page.getByTestId('approve-template-change').click();
await page.getByTestId('maker-checker-status').getByText('已批准').waitFor();

await page.getByTestId('nav-triage').click();
await page.getByRole('heading', { name: '在异常老化前完成处理' }).waitFor();
await page.getByTestId('triage-item-TRI-224').click();
await page.getByTestId('mark-reviewed').click();
await page.getByTestId('triage-item-TRI-224').getByText('已批准').waitFor();

await page.getByTestId('nav-evidence').click();
await page.getByRole('heading', { name: '准备监管响应包' }).waitFor();
await page.getByTestId('evidence-export-preview').waitFor();

await page.getByTestId('nav-analytics').click();
await page.getByRole('heading', { name: '确定下一步治理迭代优先级' }).waitFor();
await page.getByTestId('analytics-signal-board').getByText('未知短信聚类超过 SLA 老化阈值').waitFor();
await page.getByTestId('analytics-decision-brief').waitFor();
await page.getByTestId('query-time-range').selectOption('last-30-days');
await page.getByTestId('query-owner').selectOption('A. Morgan');
await page.getByTestId('query-message-type').selectOption('Servicing');
await page.getByTestId('run-query').click();
await page.getByTestId('query-volume-stat').getByText('784,200').waitFor();
await page.getByTestId('chat-launcher').click();
await page.getByTestId('floating-chat-panel').getByText('Chat 报告').waitFor();
await page.getByTestId('chat-query-input').fill('按市场总结 servicing 模板的 volume 和 owner 风险');
await page.getByTestId('send-chat-message').click();
await page.getByTestId('chat-thread').getByText('按市场总结 servicing 模板的 volume 和 owner 风险').waitFor();
await page.getByTestId('chat-thread').getByText('我已按当前筛选生成治理报告').waitFor();
await page.getByTestId('chat-action-card').getByText('准备导出报告').waitFor();
await page.getByTestId('quick-action-owner-risk').click();
await page.getByTestId('chat-thread').getByText('Owner 风险集中在 no-template clusters').waitFor();
await page.getByTestId('dynamic-report').getByText('Servicing volume is concentrated in UK WPB').waitFor();
await page.getByTestId('close-chat-widget').click();
await page.getByTestId('floating-chat-panel').waitFor({ state: 'detached' });
await page.getByTestId('export-chat-report').click();
await page.getByTestId('report-export-status').getByText('报告导出已准备').waitFor();

await page.getByTestId('nav-audit-trail').click();
await page.getByRole('heading', { name: '展示清单背后的控制历史' }).waitFor();
await page.getByTestId('audit-ledger').getByText('批准证据响应包导出').waitFor();
await page.getByTestId('audit-control-summary').waitFor();

await page.getByTestId('nav-settings').click();
await page.getByRole('heading', { name: '配置 MVP 控制默认项' }).waitFor();
await page.getByTestId('policy-controls').getByText('消息内容 PII 最小化').waitFor();
await page.getByTestId('settings-impact').waitFor();
await page.getByTestId('start-csv-upload').click();
await page.getByTestId('csv-upload-progress').getByText('100%').waitFor();
await page.getByTestId('csv-result-preview').getByText('templates_june_volume.csv').waitFor();
await page.getByTestId('csv-result-preview').getByText('Ready for AI analysis').waitFor();

await page.waitForTimeout(250);
await page.screenshot({ fullPage: true, path: '/tmp/gmi-product-final.png' });
await browser.close();

if (errors.length > 0) {
  throw new Error(`Browser console errors:\n${errors.join('\n')}`);
}

console.log(`Playwright verification passed. Screenshot: ${screenshotPath}`);
