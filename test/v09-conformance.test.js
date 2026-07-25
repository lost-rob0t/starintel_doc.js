const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SCHEMA_REVISION,
  stableDocumentId,
  createDocument,
  validateRawDocument,
  verifySchemaBundle,
  fieldsForDtype,
  schema,
  dtypes
} = require("../src");

test("matches the shared deterministic ID vector", () => {
  assert.equal(
    stableDocumentId("org", "Example Org", { jurisdiction: "US-OH" }),
    "starintel:org:example-org-13147a8a0592d28131cf"
  );
  assert.equal(
    stableDocumentId("organization", "Example Org", { jurisdiction: "US-OH" }),
    "starintel:org:example-org-13147a8a0592d28131cf"
  );
});

test("materializes explicit expansion fields for all dtypes", () => {
  assert.equal(verifySchemaBundle(), true);
  assert.equal(schema["x-starintel-schema-revision"], SCHEMA_REVISION);
  for (const dtype of dtypes) {
    const fields = fieldsForDtype(dtype);
    assert.ok(fields.includes("canonical_key"));
    assert.ok(fields.includes("facets"));
  }
});

test("validates typed common and organization expansion records", () => {
  const document = createDocument("org", {
    _id: "starintel:org:conformance",
    dataset: "conformance",
    data: {
      name: "Conformance Org",
      legal_form: "corporation",
      status_history: [{
        status: "active",
        changed_at: "2026-07-25T20:00:00.000Z"
      }],
      external_references: [{
        source_name: "registry",
        external_id: "example-1"
      }],
      facets: [{
        facet_type: "governance",
        properties: { board_model: "unitary" }
      }]
    }
  });
  assert.equal(validateRawDocument(document).valid, true);
});

test("accepts a pre-expansion v0.9 envelope", () => {
  assert.equal(validateRawDocument({
    _id: "starintel:org:legacy-v09",
    dataset: "conformance",
    dtype: "org",
    schema_version: "0.9.0",
    version: 1,
    date_added: "2026-07-25T20:00:00.000Z",
    date_updated: "2026-07-25T20:00:00.000Z",
    sources: [],
    evidence: [],
    data: { name: "Legacy v0.9 Org" }
  }).valid, true);
});
