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

test('fails closed through the cross-user session reset contract', () => {
  assert.match(source, /__jellyfin_integration_reset/);
  assert.match(source, /X-SSI-Session-Reset/);
  assert.match(source, /credentials: 'include'/);
  assert.match(source, /getCurrentUserId/);
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
