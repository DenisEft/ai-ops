const puppeteer = require('puppeteer');

(async () => {
  // Use stealth plugin
  const stealth = require('puppeteer-extra-plugin-stealth').stealth;
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // More realistic headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1'
  });

  // Inject comprehensive stealth
  await page.evaluateOnNewDocument(() => {
    // Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    
    // Mock plugins
    Object.defineProperty(navigator, 'plugins', { get: () => [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeoaifohlslonfmbaf' },
      { name: 'Native Client', filename: 'internal-nacl-plugin' }
    ]});
    
    Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'platform', { get: () => 'Linux x86_64' });
    
    // Chrome runtime
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {}
    };
    
    // Screen dimensions
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    
    // Permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission });
      }
      return originalQuery(parameters);
    };
    
    // Webgl vendor/renderer
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445 || parameter === 37446) {
        return 'Google Inc. (NVIDIA)';
      }
      if (parameter === 35010 || parameter === 35011) {
        return 'Google Inc. (NVIDIA)';
      }
      return getParameter.call(this, parameter);
    };
  });

  // First visit Google
  console.log('Visiting Google...');
  await page.goto('https://www.google.ru/?gws_rd=ssl', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  // Visit a Russian news site
  console.log('Visiting RIA...');
  await page.goto('https://ria.ru', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  // Now Farpost
  console.log('Visiting Farpost...');
  await page.goto('https://www.farpost.ru/nakhodka/service/shipping/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await new Promise(r => setTimeout(r, 5000));

  // Check if captcha
  let captcha = await page.evaluate(() => document.body.innerText.includes('Вы не робот'));
  console.log('Captcha:', captcha);
  
  if (captcha) {
    // Try clicking
    const cb = await page.$('input[type="checkbox"]');
    if (cb) {
      await cb.click();
      await new Promise(r => setTimeout(r, 15000));
      captcha = await page.evaluate(() => document.body.innerText.includes('Вы не робот'));
      console.log('After click captcha:', captcha);
    }
  }
  
  if (!captcha) {
    const text = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    console.log('CONTENT:', text);
    
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
    console.log('LINKS:', links);
  }
  
  await browser.close();
})();
