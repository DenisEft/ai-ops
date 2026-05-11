const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU','ru','en-US','en'] });
    Object.defineProperty(navigator, 'platform', { get: () => 'Linux x86_64' });
    window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){} };
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    const q = window.navigator.permissions.query;
    window.navigator.permissions.query = (p) => p.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : q(p);
  });
  
  await page.goto('https://www.google.ru', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.goto('https://ya.ru', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Farpost...');
  await page.goto('https://www.farpost.ru/nakhodka/service/shipping/', { timeout: 30000, waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 5000));
  
  const captcha = await page.evaluate(() => document.body.innerText.includes('Вы не робот'));
  console.log('Captcha:', captcha);
  
  if (captcha) {
    // Dump page structure
    const info = await page.evaluate(() => {
      const all = document.querySelectorAll('iframe, script[src], div, input, canvas');
      return Array.from(all).slice(0, 20).map(el => ({
        tag: el.tagName,
        id: el.id,
        class: el.className?.substring(0, 80),
        type: el.type
      }));
    });
    console.log('Page structure:', JSON.stringify(info).substring(0, 3000));
    
    // Try all checkboxes
    const allInputs = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      return Array.from(inputs).map(i => ({ type: i.type, name: i.name, class: i.className, id: i.id }));
    });
    console.log('Inputs:', JSON.stringify(allInputs));
    
    const cb = await page.$('input[type="checkbox"]');
    if (cb) {
      await cb.click();
      await new Promise(r => setTimeout(r, 15000));
      const still = await page.evaluate(() => document.body.innerText.includes('Вы не робот'));
      console.log('After click:', still);
      
      const body = await page.evaluate(() => document.body.innerText.substring(0, 3000));
      console.log('BODY:', body);
    }
  } else {
    const body = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    console.log('BODY:', body);
  }
  
  await browser.close();
})();
