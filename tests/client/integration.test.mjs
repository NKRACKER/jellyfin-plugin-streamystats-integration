import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, '../../src/Jellyfin.Plugin.StreamystatsIntegration/Web/integration.js'), 'utf8');

test('contains the required UX states', () => {
  assert.match(source, /Statistiken werden geladen/);
  assert.match(source, /Statistiken sind momentan nicht verfügbar/);
  assert.match(source, /Erneut versuchen/);
  assert.match(source, /Im Browser öffnen/);
});

test('does not contain credential or URL-token transport', () => {
  assert.doesNotMatch(source, /api[_-]?key\s*=/i);
  assert.doesNotMatch(source, /password\s*=/i);
  assert.doesNotMatch(source, /[?&](?:token|api_key)=/i);
  assert.doesNotMatch(source, /localStorage\.setItem\([^)]*(?:token|password)/i);
});

test('sits in the right header icon tray and never falls back onto the app bar', () => {
  assert.match(source, /\[aria-controls="app-user-menu"\]/);
  assert.match(source, /previousElementSibling/);
  assert.match(source, /tray\.prepend\(link\)/);
  assert.doesNotMatch(source, /insertBefore/);
  assert.doesNotMatch(source, /MuiAppBar-root'\)\s*;?\s*$/m);
  assert.doesNotMatch(source, /__jellyfin_integration_reset/);
});

test('closes the embedded view whenever Jellyfin navigates away', () => {
  assert.match(source, /if \(document\.getElementById\(ID\) && !routeActive\(\)\) unmount\(\)/);
});

test('has navigation, responsive viewport, and safe external fallback contracts', () => {
  assert.match(source, /popstate/);
  assert.match(source, /visualViewport/);
  assert.match(source, /safe-area-inset-bottom/);
  assert.match(source, /noopener noreferrer/);
  assert.match(source, /strict-origin-when-cross-origin/);
});

test('is explicitly gated to Jellyfin 12', () => {
  assert.match(source, /target !== '12\.0'/);
});

test('keeps watching across initial login, logout, and user changes', () => {
  const listenerSetup = source.indexOf("if (!state.listenersInstalled)");
  const anonymousReturn = source.indexOf("if (!state.jellyfinUserId) return");
  assert.ok(listenerSetup >= 0 && listenerSetup < anonymousReturn);
  assert.match(source, /if \(userId\) start\(\)\.catch/);
  assert.match(source, /state\.observer\?\.disconnect\(\)/);
});

test('embeds only same-site and permitted origins, else opens a new tab', () => {
  const pick = name => {
    const start = source.indexOf(`function ${name}(`);
    let depth = 0, i = source.indexOf('{', start);
    for (; i < source.length; i++) { if (source[i] === '{') depth++; if (source[i] === '}' && --depth === 0) break; }
    return source.slice(start, i + 1);
  };
  const { sameSite, ancestorsAllow } = new Function(`${pick('isIpHost')}\n${pick('sameSite')}\n${pick('ancestorsAllow')}\nreturn { sameSite, ancestorsAllow };`)();
  const u = s => new URL(s);
  assert.equal(sameSite(u('https://jellyfin.natt0nael.online'), u('https://stats.natt0nael.online')), true);
  assert.equal(sameSite(u('http://192.168.187.164:8096'), u('https://stats.natt0nael.online')), false);
  assert.equal(sameSite(u('http://jellyfin.example.com'), u('https://stats.example.com')), false);
  const jf = 'https://jellyfin.natt0nael.online', st = 'https://stats.natt0nael.online';
  assert.equal(ancestorsAllow(null, jf, st), true);
  assert.equal(ancestorsAllow(`'self' ${jf}`, jf, st), true);
  assert.equal(ancestorsAllow("'self' https://*.natt0nael.online", jf, st), true);
  assert.equal(ancestorsAllow("'self' https://other.example", jf, st), false);
  assert.equal(ancestorsAllow("'self'", jf, st), false);
  assert.match(source, /target = '_blank'/);
  assert.match(source, /rel = 'noopener noreferrer'/);
});
