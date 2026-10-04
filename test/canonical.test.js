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
  if (dtype === "operation") return structuredClone(require("../schemas/starintel-0.10.1/research-fixtures.json").find(f => f.valid && f.document.dtype === "operation").document);
  const mapped = require("../schemas/starintel-0.10.1/supported-workflow-fixtures.json").find(f => f.valid && f.document.dtype === dtype);
  if (mapped) return structuredClone(mapped.document);
  return { ...sample(runtime.schema.$defs[runtime.documentTypes[dtype]]),
    id: `fixture:${dtype}`, dataset: "conformance", dtype, schemaVersion: "0.10.1" };
}

test("all persistent generated document contracts validate and roundtrip", () => {
  assert.equal(runtime.SPEC_VERSION, "0.10.1");
  assert.equal(runtime.dtypes.length, runtime.manifest.types.filter(t => t.kind === "document" && t.persistence === "persistent").length);
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

test("shared locked research fixtures and transient dtype rejection", () => {
  const fixtures = require("../schemas/starintel-0.10.1/research-fixtures.json");
  for (const fixture of fixtures) assert.equal(runtime.validateDocument(fixture.document).valid, fixture.valid, fixture.name);
  for (const type of runtime.manifest.types.filter(type => type.kind === "document" && type.persistence !== "persistent")) {
    const dtype = type.name.split("/").at(-1);
    assert.equal(runtime.dtypes.includes(dtype), false);
    assert.equal(runtime.validateDocument({id:"test",dataset:"test",dtype,schemaVersion:"0.10.1"}).valid, false);
  }
});

test("locked supported workflow fixtures obey structure and semantics", () => {
  for (const fixture of require("../schemas/starintel-0.10.1/supported-workflow-fixtures.json")) assert.equal(runtime.validateDocument(fixture.document).valid, fixture.valid, fixture.name);
});

test("repeated nullable workflow validation does not recompile the generated release", () => {
  const Ajv = require("ajv/dist/2020");
  const original = Ajv.prototype.compile;
  let calls = 0;
  Ajv.prototype.compile = function (...args) { calls++; return original.apply(this, args); };
  try {
    const value = require("../schemas/starintel-0.10.1/supported-workflow-fixtures.json").find(fixture => fixture.valid && fixture.document.dtype === "research-node").document;
    for (let i = 0; i < 10; i++) assert.equal(runtime.validateDocument(value).valid, true);
    assert.equal(calls, 0);
  } finally { Ajv.prototype.compile = original; }
});

test("JSON numbers retain exact values throughout the unbounded schema domain", () => {
  const tokens = ["1e400", "-1e400", "1e308", "1e-400", "-1e-400",
    "1e999999999999999999999999999999999999999", "1e-999999999999999999999999999999999999999",
    "9223372036854775808", "-9223372036854775809", "0.123456789012345678901234567890123456789",
    "9007199254740992.0000000000000000000001"];
  const input = '{"command":"roundtrip","document":{"id":"fixture:person","dataset":"test",' +
    '"dtype":"person","schemaVersion":"0.10.1","createdAt":9223372036854775808,' +
    '"sizeBytes":1e400,"age":1e308,"extensions":{"numbers":[' + tokens.join(",") + ']}}}';
  const result = spawnSync(process.execPath, ["bin/starintel-canonical.js"], { input, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const output = runtime.parseJson(result.stdout).document;
  assert.equal(output.createdAt.toString(), "9223372036854775808");
  assert.equal(output.sizeBytes.toString(), "1e400");
  assert.equal(output.age.toString(), "1e308");
  assert.deepEqual(output.extensions.numbers.map(String), tokens);
});

test("integer validation uses the exact decimal value, including enormous signed exponents", () => {
  const base = JSON.stringify(document("person"));
  function withAge(token) { return runtime.parseJson(base.slice(0, -1) + ',"age":' + token + '}'); }
  for (const token of ["1.0", "1e0", "10e-1", "100.00e-2", "0e-999999999999999999999999999",
    "1e400", "1e999999999999999999999999999", "-1e400", "9223372036854775808"])
    assert.equal(runtime.validateDocument(withAge(token)).valid, true, token);
  for (const token of ["1e-1", "1.00000000000000000000000000001", "1e-400",
    "1e-999999999999999999999999999", "-1e-999999999999999999999999999",
    "9007199254740992.0000000000000000000001"])
    assert.equal(runtime.validateDocument(withAge(token)).valid, false, token);
});

test("numeric bounds and JSON string/number distinctions survive structural projection", () => {
  function withField(dtype, field, token) {
    const value = document(dtype);
    delete value[field];
    return runtime.parseJson(JSON.stringify(value).slice(0, -1) + ',"' + field + '":' + token + '}');
  }
  for (const token of ["0", "1.0", "1e0", "9223372036854775808", "1e400"])
    assert.equal(runtime.validateDocument(withField("person", "createdAt", token)).valid, true, token);
  for (const token of ["-1", "-1e400", "-1e-400", '"1e400"', "true", '{"isLosslessNumber":true,"value":"1e400"}'])
    assert.equal(runtime.validateDocument(withField("person", "createdAt", token)).valid, false, token);
  for (const [token, valid] of [["65535", true], ["655350e-1", true], ["65536", false], ["1e400", false],
    ["65535.0000000000000000000000001", false], ["-1", false], ["-1e400", false]])
    assert.equal(runtime.validateDocument(withField("port", "number", token)).valid, valid, token);
  for (const [token, valid] of [["4294967295", true], ["4294967296", false], ["4.294967295e9", true],
    ["4.294967295000000000000000001e9", false], ["1e400", false]])
    assert.equal(runtime.validateDocument(withField("asn", "number", token)).valid, valid, token);
  for (const [token, valid] of [["1.0", true], ["1e400", true], ["0", false], ["-1e400", false]]) {
    const value = withField("research-node", "limits", '{"maxDepth":' + token + '}');
    assert.equal(runtime.validateDocument(value).valid, valid, token);
  }
  for (const token of ["0.5", "1e400"])
    assert.equal(runtime.validateDocument(withField("person", "confidence", token)).valid, false, token);
  assert.equal(runtime.validateDocument(withField("person", "confidence", '"0.5"')).valid, true);
  assert.equal(runtime.schema.$defs.UnixTime.type, "integer");
  assert.equal(runtime.schema.$defs.PortNumber.maximum, 65535);
  const invalidLossless = new (require("lossless-json").LosslessNumber)("1");
  invalidLossless.value = "NaN";
  assert.equal(runtime.validateDocument({ ...document("person"), extensions: { invalidLossless } }).valid, false);
  for (const value of [Infinity, -Infinity, NaN, 9007199254740992])
    assert.equal(runtime.validateDocument({ ...document("person"), extensions: { value } }).valid, false);
});

test("malformed JSON numbers are rejected before structural projection", () => {
  for (const token of ["NaN", "Infinity", "-Infinity", "+1", "01", "1.", ".1", "1e", "1e+", "--1"])
    assert.throws(() => runtime.parseJson('{"extensions":{"value":' + token + '}}'), token);
});

test("opaque extensions cannot impersonate lossless numeric instances", () => {
  const value = runtime.parseJson('{"id":"fixture:person","dataset":"test","dtype":"person","schemaVersion":"0.10.1",' +
    '"extensions":{"isLosslessNumber":true,"value":"1e400","toString":"ordinary data",' +
    '"__proto__":{"polluted":true},"constructor":"ordinary constructor",' +
    '"__starintel_proto__":"collision","__starintel_proto___":"second collision",' +
    '"__starintel_pro\\u0074o____":"escaped collision","strings":["__proto__","__starintel_proto_____"],' +
    '"escaped":{"__pro\\u0074o__":{"n":1e400},"constructor":{"prototype":"ordinary"}},' +
    '"nested":[{"isLosslessNumber":true,"value":"NaN"},1e400,0.1234567890123456789]}}');
  assert.equal(runtime.validateDocument(value).valid, true);
  assert.deepEqual(runtime.roundtrip(value), value);
  for (const extensions of [value.extensions, runtime.roundtrip(value).extensions]) {
    assert.equal(Object.hasOwn(extensions, "__proto__"), true);
    assert.equal(Object.hasOwn(extensions, "constructor"), true);
    assert.equal(Object.getPrototypeOf(extensions), Object.prototype);
    assert.equal(extensions.polluted, undefined);
    assert.equal(extensions.__proto__.polluted, true);
    assert.equal(Object.hasOwn(extensions.escaped, "__proto__"), true);
    assert.equal(Object.getPrototypeOf(extensions.escaped), Object.prototype);
    assert.equal(extensions.escaped.__proto__.n.toString(), "1e400");
    assert.equal(extensions.__starintel_proto__, "collision");
    assert.equal(extensions.__starintel_proto___, "second collision");
    assert.equal(extensions.__starintel_proto____, "escaped collision");
    assert.deepEqual(extensions.strings, ["__proto__", "__starintel_proto_____"]);
  }
  const input = runtime.stringifyJson({ command: "roundtrip", document: value });
  const result = spawnSync(process.execPath, ["bin/starintel-canonical.js"], { input, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(runtime.parseJson(result.stdout).document, value);
  assert.throws(() => runtime.parseJson('{"__proto__":1,"__pro\\u0074o__":2}'), /duplicate key/i);
  assert.throws(() => runtime.parseJson('{"__proto__":1,"__pro\\u0074o__":1}'), /duplicate key/i);
});

test("exact JSON serialization rejects nonfinite numbers and cycles", () => {
  for (const value of [NaN, Infinity, -Infinity, 9007199254740992])
    assert.throws(() => runtime.stringifyJson({ value }), /unsafe native number/);
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => runtime.stringifyJson(cycle), /circular/);
  const arrayCycle = [];
  arrayCycle.push(arrayCycle);
  assert.throws(() => runtime.stringifyJson(arrayCycle), /circular/);
  const shared = { value: runtime.parseJson("1e400") };
  assert.equal(runtime.stringifyJson([shared, shared]), '[{"value":1e400},{"value":1e400}]');
  assert.equal(runtime.stringifyJson([null, undefined, , false, "1e400"]), '[null,null,null,false,"1e400"]');
  assert.equal(runtime.stringifyJson({ omitted: undefined, value: 9223372036854775808n }), '{"value":9223372036854775808}');
});
