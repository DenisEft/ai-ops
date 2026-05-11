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
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--force-color-profile=srgb',
      '--lang=ru-RU',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Comprehensive stealth setup
  await page.evaluateOnNewDocument(() => {
    // Override webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });

    // Override plugins length
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ru-RU', 'ru', 'en-US', 'en']
    });

    // Mock chrome runtime
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {}
    };

    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => {
      return parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters);
    };

    // Mock WebGL
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return 'Google Inc. (NVIDIA)';
      if (parameter === 37446) return 'NVIDIA Corporation';
      return getParameter.call(this, parameter);
    };

    // Mock connection
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false
      })
    });
  });

  // Set headers to look like a real Russian user
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'sec-ch-ua': '"Chromium";v="125", "Not:A-Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });

  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

  // Visit a "normal" site first to establish trust
  console.log('Step 1: Visiting Google...');
  await page.goto('https://www.google.ru', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  // Then visit a Russian site
  console.log('Step 2: Visiting Yandex...');
  await page.goto('https://ya.ru', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  // Now visit Farpost
  console.log('Step 3: Visiting Farpost...');
  await page.goto('https://www.farpost.ru/nakhodka/service/shipping/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await new Promise(r => setTimeout(r, 5000));

  let hasCaptcha = await page.evaluate(() => document.body.innerText.includes('Вы не робот'));
  console.log('Has CAPTCHA:', hasCaptcha);

  if (hasCaptcha) {
    console.log('Attempting CAPTCHA bypass...');
    const checkbox = await page.$('input[type="checkbox"]');
    if (checkbox) {
      console.log('Found checkbox, clicking...');
      await checkbox.click();
      await new Promise(r => setTimeout(r, 15000));

      hasCaptcha = await page.evaluate(() => document.body.innerText.includes('Вы не робот'));
      console.log('Still captcha after 15s:', hasCaptcha);
    }
  }

  // Extract content
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
  console.log('\n=== BODY TEXT ===');
  console.log(bodyText.substring(0, 3000));

  if (!hasCaptcha) {
    // Extract links
    const links = await page.evaluate(() => {
      const all = document.querySelectorAll('a[href]');
      const result = [];
      for (const a of all) {
        const href = (a.getAttribute('href') || '').trim();
        if (href.includes('.html') && href.includes('shipping') && !href.includes('verify')) {
          const text = a.textContent.trim().substring(0, 100);
          result.push({
            href: href.startsWith('http') ? href : 'https://www.farpost.ru' + href,
            text
          });
        }
      }
      return [...new Set(result.map(r => r.href))];
    });
    console.log('\n=== LINKS:', links.length, '===');
    for (const l of links.slice(0, 20)) {
      console.log('  ' + l);
    }

    // Fetch individual listing details
    if (links.length > 0) {
      console.log('\n=== FETCHING LISTINGS ===');
      const results = [];
      for (let i = 0; i < Math.min(links.length, 5); i++) {
        try {
          await page.goto(links[i], { waitUntil: 'domcontentloaded', timeout: 15000 });
          await new Promise(r => setTimeout(r, 3000));

          const listing = await page.evaluate(() => {
            const text = document.body.innerText;
            const phoneRegex = /(\+7|8)[\s\-]?\(?(\d{3})\)?[\s\-]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})/g;
            const phones = [];
            let match;
            while ((match = phoneRegex.exec(text)) !== null) {
              phones.push(match[0]);
            }
            return {
              title: text.substring(0, 500),
              phones: [...new Set(phones)]
            };
          });
          results.push({ url: links[i], title: listing.title.substring(0, 200), phones: listing.phones });
          console.log('Listing ' + (i+1) + ':', listing.title.substring(0, 150));
          console.log('Phones:', listing.phones);
        } catch(e) {
          console.log('Error:', links[i], e.message);
        }
      }
      console.log('\n=== RESULTS ===');
      console.log(JSON.stringify(results, null, 2));
    }
  }

  await browser.close();
})();
