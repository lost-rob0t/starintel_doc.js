const test = require("node:test");
const assert = require("node:assert/strict");

const { SPEC_VERSION, roundtrip, validateDocument } = require("../src/v090");

function document() {
  return {
    _id: "starintel:person:js-test",
    dataset: "test",
    dtype: "person",
    schema_version: SPEC_VERSION,
    version: 1,
    date_added: "2026-01-02T03:04:05Z",
    date_updated: "2026-01-02T03:04:05+00:00",
    sources: [],
    evidence: [],
    data: {
      fname: "Ada",
      lname: "Lovelace",
      bio: "Unicode λ 漢字 🧠",
    },
    extensions: {
      "example.test": {
        integer: 9007199254740991,
        number: 1.25,
        null: null,
        empty_array: [],
        empty_object: {},
      },
    },
  };
}

test("valid v0.9 documents roundtrip", () => {
  const value = document();
  const result = roundtrip(value);
  assert.equal(result.ok, true);
  assert.deepEqual(result.document, value);
});

test("missing required fields are rejected", () => {
  const value = document();
  delete value._id;
  const result = validateDocument(value);
  assert.equal(result.ok, false);
  assert.equal(result.error, "missing_required_field");
});

test("unsupported versions are explicit", () => {
  const value = document();
  value.schema_version = "0.8.0";
  const result = validateDocument(value);
  assert.equal(result.ok, false);
  assert.equal(result.error, "unsupported_spec_version");
  assert.equal(result.unsupported, true);
});
