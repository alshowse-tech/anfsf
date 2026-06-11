const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Step 1: Go to home page
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  console.log('=== HOME PAGE ===');
  console.log('Title:', await page.title());

  // Step 2: Fill PRD form
  const prdText = '做一个用户管理系统。支持用户注册、登录、角色管理。管理员可以创建用户、编辑用户、删除用户、分配角色。用户列表支持搜索和分页。需要响应式设计，支持手机和桌面端。';

  // Type project name
  await page.fill('input[type="text"]', 'user-management-test');

  // Type PRD text
  const textarea = page.locator('textarea').first();
  await textarea.fill(prdText);

  // Wait for quality check to update
  await page.waitForTimeout(500);

  const qualityScore = await page.locator('text=Quality').textContent();
  console.log('Quality score visible:', qualityScore);

  // Step 3: Click Run Pipeline
  await page.click('button:has-text("Run Pipeline")');

  // Step 4: Wait for navigation to progress page
  await page.waitForURL('**/progress', { timeout: 30000 });
  console.log('\n=== PROGRESS PAGE ===');
  await page.waitForTimeout(2000);

  // Poll until completion (max 120s)
  let completed = false;
  for (let i = 0; i < 120; i++) {
    const statusText = await page.locator('body').innerText();
    if (statusText.includes('Done') || statusText.includes('完成') || statusText.includes('Failed') || statusText.includes('生成完成')) {
      completed = true;
      break;
    }
    await page.waitForTimeout(1000);
  }

  if (completed) {
    console.log('Pipeline completed!');
  } else {
    console.log('Pipeline still running after 120s...');
  }

  const progressText = await page.locator('body').innerText();
  console.log(progressText.slice(0, 3000));

  // Check for metrics
  const rounds = await page.locator('text=/\\d+ \\/ \\d+/').textContent();
  const files = await page.locator('text=/\\d+/').first().textContent();
  console.log('\n=== METRICS ===');
  console.log('Rounds:', rounds);

  // Check error state
  const errors = await page.locator('[class*="error"], [class*="red"]').allTextContents();
  console.log('\n=== ERRORS ===');
  if (errors.length > 0) {
    errors.slice(0, 5).forEach(e => console.log('-', e.slice(0, 200)));
  } else {
    console.log('(none)');
  }

  await page.screenshot({ path: 'C:/Users/18079/Desktop/ANFSF-OS/anfsf/output/screenshot-progress.png', fullPage: true });
  console.log('\nScreenshot: output/screenshot-progress.png');

  await browser.close();
})();
