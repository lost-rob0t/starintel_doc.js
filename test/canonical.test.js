const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const runtime = require("../src");

function sample(node) {
  if (node.$ref) return sample(runtime.schema.$defs[node.$ref.split("/").at(-1)]);
  if (node.enum) return node.enum[0];
  if (node.anyOf) return sample(node.anyOf[0]);
  if (node.type === "object") return Object.fromEntries((node.required || []).map((key) => [key, sample(node.properties[key])]));
  if (node.type === "array") return [];
  if (["integer", "number"].includes(node.type)) return node.minimum ?? 0;
  if (node.type === "boolean") return false;
  if (node.format === "date-time") return "2026-10-03T12:00:00Z";
  if (node.format === "date") return "2026-10-03";
  if (node.format === "uri") return "https://example.test/";
  if (node.pattern) return node.pattern.includes("@") ? "fixture@example.test" : node.pattern.includes("0-9().") ? "+123456789" : "0";
  return "fixture";
}

function document(dtype) {
  return { ...sample(runtime.schema.$defs[runtime.documentTypes[dtype]]),
    id: `fixture:${dtype}`, dataset: "conformance", dtype, schemaVersion: "0.10.1" };
}

test("all 60 generated document contracts validate and roundtrip", () => {
  assert.equal(runtime.SPEC_VERSION, "0.10.1");
  assert.equal(runtime.dtypes.length, 60);
  for (const dtype of runtime.dtypes) {
    const value = document(dtype);
    assert.deepEqual(runtime.roundtrip(value), value, dtype);
    assert.deepEqual(runtime.createDocument(dtype, value), value, dtype);
  }
});

test("rejects wrong versions, nested envelopes, referenced constraints and decimal scale", () => {
  const cases = [["person", "id", "invalid space"], ["person", "createdAt", -1],
    ["geo-point", "latitude", "90.00000001"], ["person", "confidence", "0.12345"],
    ["person", "confidence", "1.1"], ["person", "confidence", 0.5],
    ["person", "dob", "2026-02-30"], ["url", "url", "invalid URL with spaces"],
    ["person", "dtype", "made-up"], ["person", "schemaVersion", "0.10.2"],
    ["person", "data", {}], ["person", "_id", "legacy"],
    ["person", "sources", [{ id: "source" }]], ["wireless-network", "security", "wpa4"]];
  for (const [dtype, key, invalid] of cases)
    assert.equal(runtime.validateDocument({ ...document(dtype), [key]: invalid }).valid, false, `${dtype}.${key}`);
  const value = document("wireless-station");
  delete value.mac;
  assert.equal(runtime.validateDocument(value).valid, false);
  assert.equal(runtime.validateDocument({ _id: "old", dtype: "person", schema_version: "0.10.1", data: {} }).valid, false);
});

test("preserves false, null, unknown extension keys and omitted optional fields", () => {
  const value = { ...document("person"), deleted: false,
    extensions: { "example.vendor": { opaque_key: null, flag: false, items: [] } } };
  assert.deepEqual(runtime.roundtrip(value), value);
  const response = spawnSync(process.execPath, ["bin/starintel-canonical.js"],
    { input: JSON.stringify({ command: "roundtrip", document: value }), encoding: "utf8" });
  assert.equal(response.status, 0, response.stdout + response.stderr);
  assert.deepEqual(JSON.parse(response.stdout).document, value);
});

test("the actual CLI preserves integer precision and opaque numeric extensions", () => {
  const input = '{"command":"roundtrip","document":{"id":"fixture:person","dataset":"test","dtype":"person","schemaVersion":"0.10.1","createdAt":9007199254740993,"extensions":{"vendor":{"number":0.1234567890123456789}}}}';
  const result = spawnSync(process.execPath, ["bin/starintel-canonical.js"], { input, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /"createdAt":9007199254740993/);
  assert.match(result.stdout, /"number":0.1234567890123456789/);
});
