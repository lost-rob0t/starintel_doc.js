const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SCHEMA_VERSION,
  SCHEMA_ORG_CONTEXT,
  CANONICAL_DTYPES,
  DTYPE_SCHEMA_ORG_TYPES,
  canonicalDtype,
  createDocument,
  createRelation,
  normalizeDocument,
  toSchemaOrg,
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
  assert.equal(document.schema_org["@context"], SCHEMA_ORG_CONTEXT);
  assert.equal(document.schema_org["@type"], "Organization");
  assert.equal(document.schema_org["@id"], document._id);
});

test("supports every canonical dtype and normalized delimiter alias", () => {
  assert.deepEqual(CANONICAL_DTYPES, dtypes);
  assert.deepEqual(Object.keys(DTYPE_SCHEMA_ORG_TYPES).sort(), CANONICAL_DTYPES.slice().sort());

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
  assert.equal(relation.schema_org["@type"], "Role");
});

test("accepts strict Schema.org JSON-LD metadata and exports it", () => {
  const person = createDocument("person", {
    _id: "starintel:person:example",
    dataset: "test",
    title: "Example Person",
    aliases: ["E. Person"],
    identifiers: [{
      scheme: "wikidata",
      value: "Q42",
      url: "https://www.wikidata.org/wiki/Q42"
    }],
    schema_org: {
      "@type": ["Person", "Thing"],
      sameAs: ["https://example.test/person"],
      additionalProperty: [{
        "@type": "PropertyValue",
        name: "source rank",
        value: 1
      }],
      properties: { award: "Example Award" }
    },
    data: { full_name: "Example Person" }
  });

  assert.equal(assertDocument(person)._id, person._id);
  const jsonld = toSchemaOrg(person);
  assert.equal(jsonld.name, "Example Person");
  assert.deepEqual(jsonld.sameAs, ["https://example.test/person"]);
  assert.equal(jsonld.identifier[0].propertyID, "wikidata");
});

test("rejects undeclared direct Schema.org fields", () => {
  const person = createDocument("person", {
    _id: "starintel:person:bad-schema-org",
    dataset: "test",
    schema_org: { invented: true },
    data: { full_name: "Bad Schema Org" }
  });
  const result = validateDocument(person, { normalize: false });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.path.includes("schema_org")));
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
