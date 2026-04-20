/**
 * cdp_fetch.js — Fetch a URL using an existing Chrome CDP session.
 * Called from propiedades_com.py via subprocess.
 *
 * Usage:
 *   node cdp_fetch.js <url> [cdp_port]
 *
 * Connects to Chrome at localhost:<cdp_port> (default 9222),
 * opens a new tab, navigates to <url>, waits for content, prints HTML to stdout.
 *
 * Why: propiedades.com uses Akamai Bot Manager which blocks headless Playwright
 * but allows a real Chrome session that already has valid cookies.
 */

const WebSocket = require('ws');
const http = require('http');

const TARGET_URL = process.argv[2];
const CDP_PORT = parseInt(process.argv[3] || '9222', 10);

if (!TARGET_URL) {
  process.stderr.write('Usage: node cdp_fetch.js <url> [cdp_port]\n');
  process.exit(1);
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

class CDPSession {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this._callbacks = {};
    this._msgId = 1;
    this._ready = new Promise((res, rej) => {
      this.ws.on('open', res);
      this.ws.on('error', rej);
    });
    this.ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id && this._callbacks[msg.id]) {
        const cb = this._callbacks[msg.id];
        delete this._callbacks[msg.id];
        if (msg.error) cb.reject(new Error(msg.error.message));
        else cb.resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    const id = this._msgId++;
    return new Promise((resolve, reject) => {
      this._callbacks[id] = { resolve, reject };
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function fetchUrl(targetUrl, cdpPort) {
  // Get list of existing pages/targets
  const jsonRaw = await httpGet(`http://127.0.0.1:${cdpPort}/json`);
  const pages = JSON.parse(jsonRaw).filter(p => p.type === 'page');

  // Use browser-level websocket to create a new target
  const versionRaw = await httpGet(`http://127.0.0.1:${cdpPort}/json/version`);
  const versionInfo = JSON.parse(versionRaw);
  const browserWsUrl = versionInfo.webSocketDebuggerUrl;

  const browser = new CDPSession(browserWsUrl);
  await browser._ready;

  // Create new tab
  const target = await browser.send('Target.createTarget', { url: 'about:blank' });
  const targetId = target.targetId;

  // Connect to the new tab
  const attachResult = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = attachResult.sessionId;

  // Send CDP commands to the tab via the browser session using sessionId
  async function tabSend(method, params = {}) {
    const id = browser._msgId++;
    return new Promise((resolve, reject) => {
      browser._callbacks[id] = { resolve, reject };
      browser.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  try {
    // Enable necessary domains
    await tabSend('Page.enable');
    await tabSend('Network.enable');

    // Navigate to target URL
    await tabSend('Page.navigate', { url: targetUrl });

    // Wait for page load (poll document.readyState)
    let html = '';
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const evResult = await tabSend('Runtime.evaluate', {
          expression: `JSON.stringify({state: document.readyState, len: document.documentElement.outerHTML.length, hasCards: document.querySelectorAll('section.pcom-property-card').length})`
        });
        const info = JSON.parse(evResult.result.value || '{}');
        if (info.hasCards > 0 || (info.state === 'complete' && info.len > 50000)) {
          // Get full HTML
          const htmlResult = await tabSend('Runtime.evaluate', {
            expression: 'document.documentElement.outerHTML'
          });
          html = htmlResult.result.value || '';
          break;
        }
      } catch (e) {
        // still loading, continue
      }
    }

    if (!html) {
      // Last attempt — get whatever we have
      const htmlResult = await tabSend('Runtime.evaluate', {
        expression: 'document.documentElement.outerHTML'
      });
      html = htmlResult.result.value || '';
    }

    return html;
  } finally {
    // Close the tab
    try {
      await browser.send('Target.closeTarget', { targetId });
    } catch (e) {}
    browser.close();
  }
}

fetchUrl(TARGET_URL, CDP_PORT)
  .then(html => {
    process.stdout.write(html);
    process.exit(0);
  })
  .catch(err => {
    process.stderr.write('CDP fetch error: ' + err.message + '\n');
    process.exit(1);
  });
