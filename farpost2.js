const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  // Step 1: Visit a neutral page first to get a fresh session
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

  // Visit Google first
  console.log('Visiting Google...');
  await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Then go to Farpost
  console.log('Going to Farpost...');
  await page.goto('https://www.farpost.ru/nakhodka/service/shipping/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  await new Promise(r => setTimeout(r, 5000));

  let hasCaptcha = await page.evaluate(() => document.body.innerText.includes('Вы не робот'));
  console.log('Has captcha:', hasCaptcha);

  if (hasCaptcha) {
    // Try clicking
    const checkbox = await page.$('input[type="checkbox"]');
    if (checkbox) {
      console.log('Clicking checkbox...');
      await checkbox.click();
      await new Promise(r => setTimeout(r, 15000));
      hasCaptcha = await page.evaluate(() => document.body.innerText.includes('Вы не робот'));
      console.log('Still captcha after 15s:', hasCaptcha);
    }
  }

  // Extract content
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 5000));
  console.log('--- BODY (', bodyText.length, 'chars) ---');
  console.log(bodyText.substring(0, 3000));

  // Extract links
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
  console.log('--- Links:', links.length, '---');
  for (const l of links.slice(0, 25)) {
    console.log('  ' + l);
  }

  // If we have links, extract phone numbers and details from each
  if (links.length > 0) {
    const details = [];
    for (let i = 0; i < Math.min(links.length, 10); i++) {
      try {
        await page.goto(links[i], { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 3000));
        
        const listing = await page.evaluate(() => {
          const text = document.body.innerText;
          // Try to find phone numbers
          const phoneRegex = /\+7[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}|\+7[\s\-]?\d{10}|8[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}|\(423[67]\)[\s\-]?\d{6,7}/g;
          const phones = text.match(phoneRegex) || [];
          
          // Find price
          const priceRegex = /\d+[\s]?(руб|₽|руб\/|₽\/|руб\.)|от \d+/g;
          const prices = text.match(priceRegex) || [];
          
          // Find capacity
          const capRegex = /\d+[\s]?т|до \d+ т|\d+ куб|до \d+ кубов|\d+ куб\.м|м\./g;
          const caps = text.match(capRegex) || [];
          
          return {
            title: text.substring(0, 500),
            phones: [...new Set(phones)],
            prices: prices.slice(0, 3),
            capacity: caps.slice(0, 3)
          };
        });
        
        details.push({
          url: links[i],
          ...listing
        });
        console.log(`\n--- Listing ${i+1} ---`);
        console.log('Title:', details[i].title.substring(0, 200));
        console.log('Phones:', details[i].phones);
        console.log('Prices:', details[i].prices);
      } catch(e) {
        console.log(`Error fetching ${links[i]}:`, e.message);
      }
    }
  }

  await browser.close();
})();
