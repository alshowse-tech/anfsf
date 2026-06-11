const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Step 1: Home page
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  console.log('=== HOME PAGE ===');
  console.log('Title:', await page.title());

  // Step 2: Fill PRD
  await page.fill('input[type="text"]', 'user-mgmt-test');
  await page.fill('textarea', '做一个用户管理系统。支持用户注册登录、角色管理、权限分配。管理员可创建编辑删除用户。用户列表支持搜索和分页。验收标准：加载时间小于500ms，支持100人在线。');

  // Check quality score
  try {
    await page.waitForSelector('text=/Quality: \\d+/', { timeout: 3000 });
    const qs = await page.locator('text=/Quality: \\d+/').textContent();
    console.log('Quality:', qs);
  } catch { console.log('Quality: not visible (may need more text)'); }

  // Step 3: Submit
  await page.click('button:has-text("Run Pipeline")');
  console.log('Clicked Run Pipeline');

  // Step 4: Wait for progress page
  try {
    await page.waitForURL('**/progress', { timeout: 10000 });
    console.log('Navigated to progress page');
  } catch {
    console.log('Did not navigate to /progress — staying on page, checking for errors');
    const body = await page.locator('body').innerText();
    console.log(body.slice(0, 1000));
    await browser.close();
    return;
  }

  // Step 5: Poll progress
  console.log('\n=== MONITORING PROGRESS ===');
  let lastText = '';
  for (let i = 0; i < 180; i++) {
    await page.waitForTimeout(1000);
    const text = await page.locator('body').innerText();

    // Only print when content changes
    if (text !== lastText) {
      lastText = text;
      const lines = text.split('\n').filter(l => l.trim());
      // Find the steps/metrics section
      const startIdx = lines.findIndex(l => l.includes('质量检查') || l.includes('Quality') || l.includes('Agent Loop'));
      if (startIdx >= 0) {
        console.log(`[${i}s]`, lines.slice(startIdx, startIdx + 12).join(' | '));
      }
    }

    // Check for completion
    if (text.includes('生成完成') || text.includes('生成完毕')) break;
  }

  // Final state
  const finalText = await page.locator('body').innerText();
  console.log('\n=== FINAL STATE ===');
  console.log(finalText.slice(0, 3000));

  await page.screenshot({ path: 'C:/Users/18079/Desktop/ANFSF-OS/anfsf/output/screenshot-e2e.png', fullPage: true });
  console.log('\nScreenshot saved: output/screenshot-e2e.png');
  await browser.close();
})();
