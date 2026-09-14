import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '../../src/Jellyfin.Plugin.StreamystatsIntegration/Web/configPage.html'), 'utf8');
const script = html.match(/<script type="text\/javascript">([\s\S]*?)<\/script>/)?.[1];

test('embedded dashboard setup script parses', () => {
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
});

test('provides guided setup and all supported proxy choices', () => {
  assert.match(html, /Vorbereitung und Installation/);
  assert.match(html, /Installation und Updates über den Jellyfin-Katalog/);
  assert.match(html, /Dashboard → Plugins → Repositories/);
  assert.match(html, /kompilierten Webdateien/);
  assert.match(html, /Streamystats festlegen/);
  assert.match(html, /Reverse Proxy absichern/);
  assert.match(html, /Zugriff festlegen/);
  assert.match(html, /Speichern und prüfen/);
  for (const proxy of ['Nginx', 'Nginx Proxy Manager', 'Caddy', 'Traefik']) assert.match(html, new RegExp(proxy));
});

test('keeps security and troubleshooting guidance in the plugin UI', () => {
  assert.match(html, /__jellyfin_integration_reset/);
  assert.match(html, /X-SSI-Session-Reset/);
  assert.match(html, /X-Frame-Options: DENY/);
  assert.match(html, /401\/403/);
  assert.match(html, /keine Jellyfin- oder Streamystats-Zugangsdaten/);
  assert.doesNotMatch(html, /Access-Control-Allow-Origin[ '\"]+\*/);
});

test('checks Jellyfin 12 and offers a saved health test', () => {
  assert.match(html, /System\/Info/);
  assert.match(html, /version\.startsWith\('12\.'/);
  assert.match(html, /Gespeicherte Verbindung prüfen/);
  assert.match(html, /StreamystatsIntegration\/health/);
});
