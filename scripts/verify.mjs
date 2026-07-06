import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const rootPath = root.pathname;

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(new URL(relativePath, root), 'utf8'));
}

function assertFile(relativePath) {
  const filePath = new URL(relativePath, root);
  assert.ok(fs.existsSync(filePath), `missing file: ${relativePath}`);
}

function collectHtmlScripts(relativePath) {
  const html = fs.readFileSync(new URL(relativePath, root), 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(
    /<script\b(?![^>]*\bsrc=)[^>]*>/.test(html),
    false,
    `${relativePath} should not use inline scripts`
  );
  return scripts;
}

function canonicalStyle(source) {
  return source.trim().replace(/["']/g, '').replace(/\s+/g, '');
}

const manifest = readJson('manifest.json');
const packageJson = readJson('package.json');
const packageLock = readJson('package-lock.json');
const requiredNodeRange = '^20.19.0 || ^22.13.0 || >=24';

assert.equal(manifest.manifest_version, 3);
assert.equal(packageJson.version, manifest.version);
assert.equal(packageJson.engines?.node, requiredNodeRange);
assert.equal(packageLock.packages?.['']?.engines?.node, requiredNodeRange);
assert.equal(manifest.name, '__MSG_extensionName__');
assert.equal(manifest.description, '__MSG_extensionDescription__');
assert.equal(manifest.default_locale, 'en');
assert.equal(manifest.background.service_worker, 'src/background/service-worker.js');
assert.equal(manifest.background.type, 'classic');
assert.deepEqual(manifest.permissions, ['storage']);
assert.ok(manifest.content_scripts.length > 0, 'manifest should register a content script');

for (const iconPath of Object.values(manifest.icons)) {
  assertFile(iconPath);
}

for (const script of manifest.background.service_worker
  ? [manifest.background.service_worker]
  : []) {
  assertFile(script);
}

for (const contentScript of manifest.content_scripts) {
  assert.ok(
    contentScript.js.includes('src/shared/core.js'),
    'content script should load shared core first'
  );
  assert.ok(
    contentScript.js.includes('src/content/previewer.js'),
    'content script should load preview controller'
  );
  assert.equal(
    contentScript.css,
    undefined,
    'preview styles should be loaded inside the shadow root'
  );
  for (const script of contentScript.js) {
    assertFile(script);
  }
}

assert.equal(
  manifest.web_accessible_resources,
  undefined,
  'shadow-root styles should be internal and not exposed as web accessible resources'
);

for (const htmlPath of ['popup.html', 'options.html']) {
  for (const script of collectHtmlScripts(htmlPath)) {
    assertFile(script);
  }
}

for (const locale of ['en', 'zh_CN']) {
  const messages = readJson(`_locales/${locale}/messages.json`);
  for (const key of [
    'extensionName',
    'extensionDescription',
    'toggleLastPreviewCommand',
    'imageLoadError',
    'settingsSaved',
    'settingsRestored',
    'settingsSaveFailed',
    'settingsRestoreFailed',
    'settingsLoadFailed'
  ]) {
    assert.ok(messages[key]?.message, `missing i18n message: ${locale}.${key}`);
  }
}

assertFile('.github/workflows/check.yml');
assertFile('eslint.config.js');
assertFile('.prettierrc.json');

const workflow = fs.readFileSync(new URL('.github/workflows/check.yml', root), 'utf8');
assert.match(workflow, /browser-actions\/setup-chrome@v2/);
assert.match(workflow, /steps\.setup-chrome\.outputs\.chrome-path/);
assert.match(workflow, /npm run smoke/);

const sharedSource = fs.readFileSync(new URL('src/shared/core.js', root), 'utf8');
const previewCss = fs.readFileSync(new URL('src/content/previewer.css', root), 'utf8');
const smokeSource = fs.readFileSync(new URL('scripts/smoke-extension.mjs', root), 'utf8');
const styleMatch = sharedSource.match(/const PREVIEW_STYLES = `\n([\s\S]*?)\n`\.trim\(\);/);
assert.ok(styleMatch, 'shared core should expose PREVIEW_STYLES as a template literal');
assert.equal(
  canonicalStyle(previewCss),
  canonicalStyle(styleMatch[1]),
  'previewer.css should mirror PREVIEW_STYLES'
);
assert.match(smokeSource, /--no-sandbox/);
assert.match(smokeSource, /--disable-dev-shm-usage/);
assert.match(smokeSource, /chromeStderr/);
assert.match(smokeSource, /Timed out waiting for Chrome DevTools port[\s\S]*Chrome stderr/);

const jsFiles = [
  'eslint.config.js',
  'src/shared/core.js',
  'src/content/previewer.js',
  'src/background/service-worker.js',
  'src/popup/popup.js',
  'src/options/options.js',
  'scripts/test.mjs',
  'scripts/verify.mjs',
  'scripts/smoke-extension.mjs'
];

for (const file of jsFiles) {
  execFileSync(process.execPath, ['--check', path.join(rootPath, file)], { stdio: 'pipe' });
}

console.log('static verification passed');
