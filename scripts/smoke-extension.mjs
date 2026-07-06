import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const rootPath = path.resolve(new URL('../', import.meta.url).pathname);

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    path.join(
      os.homedir(),
      'Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
    ),
    '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function createServer() {
  const imageSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#336699"/><circle cx="60" cy="40" r="24" fill="#fff"/></svg>';
  const page = `<!doctype html>
    <html>
      <body>
        <img id="target" alt="sample" src="data:image/svg+xml,${encodeURIComponent(imageSvg)}">
      </body>
    </html>`;

  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(page);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function waitForDevTools(profileDir, browserProcess, getDiagnostics = () => '') {
  const activePortPath = path.join(profileDir, 'DevToolsActivePort');
  const deadline = Date.now() + 30000;

  while (Date.now() < deadline) {
    if (browserProcess.exitCode !== null) {
      throw new Error(
        `Chrome exited early with code ${browserProcess.exitCode}\nChrome stderr:\n${getDiagnostics()}`
      );
    }

    if (fs.existsSync(activePortPath)) {
      const [port, browserPath] = fs.readFileSync(activePortPath, 'utf8').trim().split('\n');
      return { port, browserPath };
    }

    await delay(100);
  }

  throw new Error(
    `Timed out waiting for Chrome DevTools port\nChrome stderr:\n${getDiagnostics()}`
  );
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`);
  }
  return response.json();
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) {
        return;
      }

      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.socket.close();
  }
}

async function connectCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return new CdpClient(socket);
}

const chromePath = findChrome();
assert.ok(chromePath, 'Chrome executable was not found. Set CHROME_BIN to run this smoke test.');

const { server, port: appPort } = await createServer();
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ipe-smoke-'));
const canSkipBlockedHeadlessExtension = !process.env.CI && !process.env.CHROME_BIN;
let smokeSkipped = false;
let chromeStderr = '';
const linuxCiChromeFlags =
  process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [];
const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--enable-logging=stderr',
  '--no-first-run',
  '--no-default-browser-check',
  ...linuxCiChromeFlags,
  `--user-data-dir=${profileDir}`,
  `--load-extension=${rootPath}`,
  '--remote-debugging-port=0',
  `http://127.0.0.1:${appPort}/`
]);
chrome.stderr?.on('data', (chunk) => {
  chromeStderr += chunk.toString();
  if (chromeStderr.length > 12000) {
    chromeStderr = chromeStderr.slice(-12000);
  }
});

try {
  const { port: debugPort, browserPath } = await waitForDevTools(
    profileDir,
    chrome,
    () => chromeStderr
  );
  const debugSnapshot = { targets: [] };
  const browserCdp = await connectCdp(`ws://127.0.0.1:${debugPort}${browserPath}`);
  try {
    const { targetInfos } = await browserCdp.send('Target.getTargets');
    debugSnapshot.targets = targetInfos.map((targetInfo) => ({
      type: targetInfo.type,
      title: targetInfo.title,
      url: targetInfo.url
    }));
  } finally {
    browserCdp.close();
  }

  const deadline = Date.now() + 10000;
  let target;

  while (Date.now() < deadline) {
    const targets = await getJson(`http://127.0.0.1:${debugPort}/json/list`);
    target = targets.find(
      (item) => item.type === 'page' && item.url.startsWith(`http://127.0.0.1:${appPort}/`)
    );
    if (target?.webSocketDebuggerUrl) {
      break;
    }
    await delay(100);
  }

  assert.ok(target?.webSocketDebuggerUrl, 'Test page was not available through DevTools');

  const cdp = await connectCdp(target.webSocketDebuggerUrl);
  try {
    await cdp.send('Runtime.enable');
    await delay(500);
    const box = await cdp.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const rect = document.getElementById('target').getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`
    });

    const { x, y } = box.result.value;
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1
    });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      clickCount: 1
    });
    await delay(250);

    const result = await cdp.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(() => {
        const host = document.querySelector('.ipe-shadow-host');
        return {
        hasNamespace: Boolean(window.ImagePreviewExtension),
        hasHost: Boolean(host),
        hasModal: Boolean(host?.shadowRoot?.querySelector('.ipe-modal')),
        hasPreviewImage: Boolean(host?.shadowRoot?.querySelector('.ipe-preview-image'))
        };
      })()`
    });

    if (
      !result.result.value.hasModal &&
      /--load-extension is not allowed in Google Chrome, ignoring/.test(chromeStderr) &&
      canSkipBlockedHeadlessExtension
    ) {
      smokeSkipped = true;
      console.log(
        'extension smoke test skipped: this Google Chrome build blocks --load-extension in headless mode. Set CHROME_BIN to Chrome for Testing or Chromium to run it.'
      );
    } else {
      assert.deepEqual(
        result.result.value,
        {
          hasNamespace: false,
          hasHost: true,
          hasModal: true,
          hasPreviewImage: true
        },
        `Extension did not open preview. Debug snapshot: ${JSON.stringify(debugSnapshot, null, 2)}\nChrome stderr:\n${chromeStderr}`
      );
    }
  } finally {
    cdp.close();
  }
} finally {
  chrome.kill('SIGTERM');
  server.close();
  fs.rmSync(profileDir, { recursive: true, force: true });
}

if (!smokeSkipped) {
  console.log('extension smoke test passed');
}
