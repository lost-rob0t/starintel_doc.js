const test = require("node:test");
const assert = require("node:assert/strict");

const { createDocument, validateRawDocument, dtypes, fieldsForDtype } = require("../src");

const stamp = "2026-09-09T01:00:00.000Z";

test("supports operation in the 0.9.1 release", () => {
  const document = createDocument("operation", {
    _id: "starintel:operation:javascript-091",
    dataset: "conformance-v0.9.1",
    date_added: stamp,
    date_updated: stamp,
    data: {
      mission: "Exercise operation support in the JavaScript binding.",
      status: "planned",
      phases: [{
        phase_id: "plan",
        objective: "Prove native operation validation.",
        state: "planned",
        depends_on: [],
        dataset_binding_ids: [],
        required_capability_ids: []
      }]
    }
  });

  assert.ok(dtypes.includes("operation"));
  assert.ok(fieldsForDtype("operation").includes("phases"));
  assert.equal(validateRawDocument(document).valid, true);
});
