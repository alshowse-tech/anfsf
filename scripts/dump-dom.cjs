const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Navigate to ANFSF
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });

  // Get full page text content
  const bodyText = await page.locator('body').innerText();
  console.log('=== PAGE TEXT ===');
  console.log(bodyText.slice(0, 2000));

  // Check what buttons/links exist
  const links = await page.locator('a, button').all();
  console.log('\n=== INTERACTIVE ELEMENTS ===');
  for (const link of links.slice(0, 30)) {
    const text = await link.textContent();
    const href = await link.getAttribute('href');
    const cls = await link.getAttribute('class');
    if (text?.trim()) console.log(`- [${text.trim().slice(0,40)}] href=${href || 'none'} cls=${cls?.slice(0,60) || 'none'}`);
  }

  // Check for error elements
  const errors = await page.locator('.text-red-600, .text-red-500, [class*="error"]').all();
  console.log('\n=== ERROR ELEMENTS ===');
  for (const el of errors) {
    console.log('-', (await el.textContent())?.trim()?.slice(0, 200));
  }
  if (errors.length === 0) console.log('(none found)');

  // Check for success/done elements
  const done = await page.locator('text=Done, text=Complete, text=完成').all();
  console.log('\n=== COMPLETION INDICATORS ===');
  for (const el of done) {
    console.log('-', (await el.textContent())?.trim()?.slice(0, 200));
  }
  if (done.length === 0) console.log('(none found)');

  await browser.close();
})();
