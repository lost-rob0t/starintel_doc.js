const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SPEC_VERSION,
  fixtures,
  migrateBatch,
  validateCanonicalDocument
} = require("../src");

test("shared compatibility fixtures", () => {
  for (const fixture of fixtures.cases) {
    assert.deepEqual(migrateBatch([fixture.input]), fixture.expected, fixture.name);
  }
});

test("migration is idempotent", () => {
  const first = migrateBatch([fixtures.cases[0].input]);
  assert.deepEqual(migrateBatch(first.documents), first);
});

test("canonical validation rejects snake case", () => {
  const result = validateCanonicalDocument({
    id: "person-invalid",
    dataset: "fixture",
    dtype: "person",
    schemaVersion: SPEC_VERSION,
    first_name: "Ada"
  });
  assert.equal(result.valid, false);
});

test("bad legacy documents are quarantined while the batch continues", () => {
  const result = migrateBatch([fixtures.cases.at(-1).input, fixtures.cases[0].input]);
  assert.deepEqual(result.quarantine, [{ reasonCode: "ambiguousFieldCollision" }]);
  assert.equal(result.documents[0].id, "person-current");
});
