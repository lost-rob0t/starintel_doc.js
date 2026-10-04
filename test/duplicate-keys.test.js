const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const publicApi = require('../src/index');
const canonical = require('../src/canonical');
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/raw-json-unique-keys.json'), 'utf8')).cases;

test('shared raw-text object-key corpus reaches canonical and public parsers', () => {
  for (const entry of cases) {
    for (const runtime of [publicApi, canonical]) {
      if (!entry.valid) {
        assert.throws(() => runtime.parseJson(entry.wire), /duplicate key/i, entry.name);
      } else {
        const parsed = runtime.parseJson(entry.wire);
        assert.equal(runtime.validateDocument(parsed).valid, true, entry.name);
        assert.deepEqual(runtime.parseJson(runtime.stringifyJson(parsed)), parsed, entry.name);
        assert.deepEqual(runtime.roundtrip(parsed), parsed, entry.name);
      }
    }
  }
});

const legacy = require('../src/v090');
const { spawnSync } = require('node:child_process');
test('historical decoder rejects ambiguous raw keys without changing number/reviver options', () => {
  for (const entry of cases) {
    if (entry.valid) assert.doesNotThrow(() => legacy.parseLosslessJson(entry.wire), entry.name);
    else assert.throws(() => legacy.parseLosslessJson(entry.wire), /duplicate key/i, entry.name);
  }
  const value = legacy.parseLosslessJson('{"n":1.25,"b":false}',
    (key, item) => key === 'b' ? 'visited' : item, { parseNumber: token => 'number:' + token });
  assert.deepEqual(value, { n: 'number:1.25', b: 'visited' });
  assert.throws(() => legacy.Document.fromJSON('{"x":false,"x":false}'), /duplicate key/i);
  assert.throws(() => legacy.parseLosslessJson('{"x":1,"x":1}', undefined,
    { onDuplicateKey: () => 1 }), /duplicate key/i);
});

test('historical CLI and dispatcher reject ambiguous raw routing and nested keys', () => {
  for (const script of ['starintel-conformance.js', 'starintel-legacy-conformance.js']) {
    for (const input of ['{"command":"version","spec_version":"0.9.0","spec_version":"0.9.0"}',
      '{"command":"version","spec_version":"0.9.0","probe":{"x":null,"x":null}}']) {
      const result = spawnSync(process.execPath, [path.join(__dirname, '../bin', script)], { input, encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stdout + result.stderr, /duplicate key/i);
    }
    const result = spawnSync(process.execPath, [path.join(__dirname, '../bin', script)], {
      input: '{"command":"version","spec_version":"0.9.0","probe":{"a":{"id":1},"b":{"id":2}}}', encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).ok, true);
  }
});
