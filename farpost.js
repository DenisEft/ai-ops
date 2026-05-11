const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Hide webdriver flag
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en-US', 'en'] });
    window.chrome = { runtime: {} };
  });

  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

  // Navigate
  await page.goto('https://www.farpost.ru/nakhodka/service/shipping/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // Wait for potential CF challenge
  await new Promise(r => setTimeout(r, 5000));

  let hasCaptcha = await page.evaluate(() => document.body.innerText.includes('Вы не робот'));
  console.log('Has captcha:', hasCaptcha);

  if (hasCaptcha) {
    // Try to find and click checkbox
    const checkbox = await page.$('input[type="checkbox"]');
    if (checkbox) {
      console.log('Found checkbox, clicking...');
      await checkbox.click();
      await new Promise(r => setTimeout(r, 10000));

      hasCaptcha = await page.evaluate(() => document.body.innerText.includes('Вы не робот'));
      console.log('Still captcha after click:', hasCaptcha);

      // Wait more if still blocked
      if (hasCaptcha) {
        await new Promise(r => setTimeout(r, 15000));
        hasCaptcha = await page.evaluate(() => document.body.innerText.includes('Вы не робот'));
        console.log('Still captcha after more waiting:', hasCaptcha);
      }
    } else {
      console.log('No checkbox found on page');
      // Dump page structure
      const selectors = await page.evaluate(() => {
        const all = document.querySelectorAll('input');
        return Array.from(all).map(i => ({ type: i.type, name: i.name, class: i.className }));
      });
      console.log('Input fields:', JSON.stringify(selectors));
    }
  }

  // Check result
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log('--- Body text ---');
  console.log(bodyText);

  // Try to extract links from the page
  const links = await page.evaluate(() => {
    const all = document.querySelectorAll('a[href]');
    const result = [];
    for (const a of all) {
      const href = (a.getAttribute('href') || '').trim();
      if (href.includes('.html') && href.includes('shipping') && !href.includes('verify')) {
        const text = a.textContent.trim().substring(0, 80);
        result.push({
          href: href.startsWith('http') ? href : 'https://www.farpost.ru' + href,
          text
        });
      }
    }
    return [...new Set(result.map(r => r.href))];
  });
  console.log('--- Links found:', links.length, '---');
  for (const l of links.slice(0, 20)) {
    console.log('  ' + l);
  }

  await browser.close();
})();
