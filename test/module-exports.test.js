const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

test('ESM exposes canonical named imports through package exports', async () => {
  const api = await import('starintel_doc');
  assert.equal(api.dtypes.length, api.manifest.types.filter(t => t.kind === "document" && t.persistence === "persistent").length);
  api.assertDocument({ id: 'test:esm', dataset: 'test', dtype: 'person', schemaVersion: '0.10.1' });
  assert.equal(typeof require('starintel_doc').assertDocument, 'function');
});

test('declaration facade is exactly derived from locked generated interfaces', () => {
  const generated = fs.readFileSync(path.join(root, 'schemas/starintel-0.10.1/generated/starintel_types.ts'), 'utf8');
  const expected = '// Declaration-only facade of the locked generated types; runtime constants are excluded.\n' + generated.split('export const actorContracts =')[0];
  assert.equal(fs.readFileSync(path.join(root, 'src/canonical-types.d.ts'), 'utf8'), expected);
});

test('strict NodeNext ESM and CJS consumers compile without checking generated runtime TS', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'starintel-types-'));
  try {
    fs.mkdirSync(path.join(dir, 'node_modules'));
    fs.symlinkSync(root, path.join(dir, 'node_modules/starintel_doc'), 'dir');
    fs.writeFileSync(path.join(dir, 'consumer.mts'), 'import runtime, { assertDocument } from "starintel_doc";\nruntime.assertDocument({});\nimport type { Person } from "starintel_doc";\nconst p: Person = {id:"test",dataset:"test",dtype:"person",schemaVersion:"0.10.1"};\nassertDocument(p);\n');
    fs.writeFileSync(path.join(dir, 'consumer.cts'), 'import api = require("starintel_doc");\napi.assertDocument({id:"test",dataset:"test",dtype:"person",schemaVersion:"0.10.1"});\n');
    const result = spawnSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--module', 'NodeNext', '--verbatimModuleSyntax', '--target', 'ES2022', path.join(dir, 'consumer.mts'), path.join(dir, 'consumer.cts')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
