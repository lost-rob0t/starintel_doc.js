const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SCHEMA_VERSION,
  CANONICAL_DTYPES,
  canonicalDtype,
  createDocument,
  createRelation,
  normalizeDocument,
  validateDocument,
  assertDocument,
  dtypes
} = require("../src");

test("normalizes the canonical v0.9 envelope", () => {
  const document = normalizeDocument({
    _id: "starintel:org:test",
    dataset: "test",
    dtype: "organization",
    title: "Test Org",
    data: { name: "Test Org", org_type: "company" }
  }, { now: "2026-07-25T20:00:00.000Z" });

  assert.equal(document.dtype, "org");
  assert.equal(document.schema_version, SCHEMA_VERSION);
  assert.equal(document.version, 1);
  assert.deepEqual(document.sources, []);
  assert.deepEqual(document.evidence, []);
});

test("supports every canonical dtype and normalized delimiter alias", () => {
  assert.deepEqual(CANONICAL_DTYPES, dtypes);

  for (const dtype of CANONICAL_DTYPES) {
    assert.equal(canonicalDtype(dtype), dtype);
    assert.equal(canonicalDtype(dtype.replaceAll("-", "_")), dtype);
    assert.equal(canonicalDtype(dtype.replaceAll("-", " ")), dtype);
  }
});

test("supports expanded names for abbreviated dtypes", () => {
  const aliases = {
    organization: "org",
    organisation: "org",
    geolocation: "geo",
    geographic_location: "geo",
    email_address: "email",
    electronic_mail: "email",
    hostname: "host",
    phone_number: "phone",
    telephone: "phone",
    telephone_number: "phone",
    uniform_resource_locator: "url",
    web_url: "url"
  };

  for (const [alias, dtype] of Object.entries(aliases)) {
    assert.equal(canonicalDtype(alias), dtype);
    assert.equal(canonicalDtype(alias.replaceAll("_", " ").toUpperCase()), dtype);
  }
});

test("creates schema-valid entity and relation documents", () => {
  const organization = createDocument("org", {
    _id: "starintel:org:test",
    dataset: "test",
    title: "Test Org",
    data: { name: "Test Org", org_type: "company" }
  });
  const relation = createRelation({
    _id: "starintel:relation:test-founded",
    dataset: "test",
    subject: "starintel:person:test",
    predicate: "founded",
    object: organization._id
  });

  assert.equal(assertDocument(organization)._id, organization._id);
  assert.equal(assertDocument(relation).data.predicate, "founded");
});

test("rejects unknown top-level and dtype-specific fields", () => {
  const result = validateDocument({
    _id: "starintel:org:bad",
    dataset: "test",
    dtype: "org",
    schema_version: "0.9.0",
    version: 1,
    date_added: "2026-07-25T20:00:00.000Z",
    date_updated: "2026-07-25T20:00:00.000Z",
    sources: [],
    evidence: [],
    data: { name: "Bad", invented_field: true },
    invented_top_level: true
  }, { normalize: false });

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.keyword === "additionalProperties"));
});
