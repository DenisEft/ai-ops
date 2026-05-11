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
  });

  console.log('Step 1: Google...');
  await page.goto('https://www.google.ru', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Step 2: Yandex...');
  await page.goto('https://ya.ru', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Step 3: Farpost...');
  await page.goto('https://www.farpost.ru/nakhodka/service/shipping/', {
    timeout: 30000,
    waitUntil: 'domcontentloaded'
  });
  await new Promise(r => setTimeout(r, 5000));
  
  // Get full page info
  const pageInfo = await page.evaluate(() => {
    // Get all hidden fields
    const hidden = document.querySelectorAll('input[type="hidden"]');
    const hiddenFields = Array.from(hidden).map(i => ({ name: i.name, value: i.value?.substring(0, 50) }));
    
    // Get all scripts
    const scripts = document.querySelectorAll('script[src]');
    const scriptUrls = Array.from(scripts).map(s => s.src);
    
    // Get all divs with class containing "altcha"
    const altchaEls = document.querySelectorAll('[class*="altcha"]');
    const altchaInfo = Array.from(altchaEls).map(el => ({
      tag: el.tagName,
      class: el.className,
      id: el.id,
      children: Array.from(el.children).map(c => ({ tag: c.tagName, class: c.className }))
    }));
    
    // Get all script content
    const inlineScripts = Array.from(document.querySelectorAll('script:not([src])'));
    const scriptText = inlineScripts.map(s => s.textContent.substring(0, 2000)).join('\n---SCRIPT---\n');
    
    // Get form info
    const forms = document.querySelectorAll('form');
    const formInfo = Array.from(forms).map(f => ({
      action: f.action,
      method: f.method,
      inputs: Array.from(f.querySelectorAll('input')).map(i => ({
        name: i.name,
        type: i.type,
        value: i.value?.substring(0, 100)
      }))
    }));
    
    return { hiddenFields, scriptUrls, altchaInfo, inlineScripts: inlineScripts.length, scriptText, formInfo };
  });
  
  console.log('Hidden fields:', JSON.stringify(pageInfo.hiddenFields));
  console.log('Scripts:', JSON.stringify(pageInfo.scriptUrls));
  console.log('Altcha:', JSON.stringify(pageInfo.altchaInfo));
  console.log('Forms:', JSON.stringify(pageInfo.formInfo));
  
  // Look for token/script in inline scripts
  const scriptContent = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script:not([src])');
    return Array.from(scripts).map(s => s.textContent);
  });
  console.log('\n--- INLINE SCRIPTS ---');
  console.log(JSON.stringify(scriptContent));
  
  // Try to find and fill the altCHA token
  // AltCHA typically stores the token in a hidden field after checkbox click
  const checkbox = await page.$('#altcha_checkbox_57109417');
  if (checkbox) {
    console.log('Found checkbox, clicking...');
    
    // Listen for network changes
    const tokenPromise = new Promise((resolve) => {
      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('altcha') || url.includes('verify') || url.includes('challenge')) {
          try {
            const text = await response.text();
            resolve({ url, text: text.substring(0, 2000) });
          } catch {}
        }
      });
    });
    
    await checkbox.click();
    await new Promise(r => setTimeout(r, 10000));
    
    // Check if checkbox changed
    const checkboxChecked = await page.evaluate(() => {
      const cb = document.getElementById('altcha_checkbox_57109417');
      if (cb) return cb.checked;
      return false;
    });
    console.log('Checkbox checked:', checkboxChecked);
    
    // Wait for network
    const netResult = await tokenPromise;
    console.log('Network response:', netResult ? netResult.text.substring(0, 1000) : 'none');
    
    // Check body again
    const body = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('BODY after click:', body);
    
    // Check hidden fields again
    const newHidden = await page.evaluate(() => {
      const hidden = document.querySelectorAll('input[type="hidden"]');
      return Array.from(hidden).map(i => ({ name: i.name, value: i.value?.substring(0, 200) }));
    });
    console.log('New hidden fields:', JSON.stringify(newHidden));
  }
  
  await browser.close();
})();
