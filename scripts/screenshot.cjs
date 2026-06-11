const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to ANFSF
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({ path: 'C:/Users/18079/Desktop/ANFSF-OS/anfsf/output/screenshot-home.png', fullPage: true });

  const title = await page.title();
  const navTexts = await page.locator('nav a, nav button').allTextContents();
  console.log('Title:', title);
  console.log('Nav items:', navTexts.filter(t => t.trim()));

  // Check page content
  const hasPRDForm = await page.locator('textarea').count();
  const hasProgress = await page.locator('text=Quality').count();
  console.log('Textareas:', hasPRDForm);
  console.log('Progress visible:', hasProgress > 0);
  console.log('Screenshot: output/screenshot-home.png');

  await browser.close();
})();
