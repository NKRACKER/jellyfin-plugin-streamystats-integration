import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const buildYaml = await readFile(new URL('../../build.yaml', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../../manifest.json', import.meta.url), 'utf8'));
const workflow = await readFile(new URL('../../.github/workflows/release.yml', import.meta.url), 'utf8');
const props = await readFile(new URL('../../Directory.Build.props', import.meta.url), 'utf8');

test('build metadata is explicitly Jellyfin 12', () => {
  assert.match(buildYaml, /^guid: "5f71ee42-35b3-4a77-a3d5-2cb529ba1220"$/m);
  assert.match(buildYaml, /^version: "\d+\.\d+\.\d+\.\d+"$/m);
  assert.match(buildYaml, /^targetAbi: "12\.0\.0\.0"$/m);
  assert.match(buildYaml, /^framework: "net10\.0"$/m);
});

test('catalog manifest has Jellyfin repository shape', () => {
  assert.ok(Array.isArray(manifest));
  for (const plugin of manifest) {
    assert.equal(plugin.guid, '5f71ee42-35b3-4a77-a3d5-2cb529ba1220');
    assert.ok(Array.isArray(plugin.versions));
    for (const version of plugin.versions) {
      assert.equal(version.targetAbi, '12.0.0.0');
      assert.match(version.sourceUrl, /^https:\/\//);
      assert.match(version.checksum, /^[A-Fa-f0-9]{32}$/);
    }
  }
});

test('release workflow packages and publishes with JPRM', () => {
  assert.match(workflow, /jprm plugin build \. --output=\.\/artifacts/);
  assert.match(workflow, /gh release upload/);
  assert.match(workflow, /jprm repo add --plugin-url/);
  assert.match(workflow, /git push origin HEAD:main/);
  assert.match(workflow, /targetAbi: "12\.0\.0\.0"/);
});

test('assembly version is sourced from build.yaml', () => {
  assert.match(props, /ReadAllText\('\$\(MSBuildThisFileDirectory\)build\.yaml'\)/);
  assert.match(props, /version:\\s\*/);
});
