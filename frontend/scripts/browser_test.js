const puppeteer = require('puppeteer');

(async () => {
  const results = { requestUrl: null, status: null, body: null, console: [] };
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => {
    try { results.console.push({type: msg.type(), text: msg.text()}); } catch(e){}
  });

  try {
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2', timeout: 15000 });

    const resp = await page.evaluate(async () => {
      const url = '/api/health';
      try {
        const r = await fetch(url, { credentials: 'same-origin' });
        let body = null;
        try { body = await r.json(); } catch(e) { body = await r.text(); }
        return { url: window.location.origin + url, status: r.status, body };
      } catch (err) {
        return { url: window.location.origin + url, error: String(err) };
      }
    });

    results.requestUrl = resp.url;
    results.status = resp.status || null;
    results.body = resp.body || resp.error || null;
  } catch (err) {
    results.console.push({ type: 'error', text: String(err) });
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
