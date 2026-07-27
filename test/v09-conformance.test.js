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

const stamp = "2026-07-26T23:40:00.000Z";

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

test("validates and inventories canonical research nodes", () => {
  const document = createDocument("research-node", {
    _id: "starintel:research-node:browser-runtime",
    dataset: "conformance",
    title: "Browser actor research",
    summary: "Run a bounded browser investigation.",
    date_added: stamp,
    date_updated: stamp,
    data: {
      objective: "Run a bounded browser investigation.",
      instructions: "Preserve provenance.",
      status: "running",
      input_ids: ["starintel:target:example"],
      target_ids: ["starintel:target:example"],
      actor_ids: ["quasar.actor.web-search"],
      actor_selection_rules: [],
      output_ids: [],
      artifact_ids: [],
      child_ids: [],
      dependency_ids: [],
      run_ids: ["run:research:001"],
      current_actor_id: "quasar.actor.web-search",
      current_run_id: "run:research:001",
      limits: {
        max_depth: 4,
        max_actor_runs: 64,
        max_requests: 1024,
        max_elapsed_ms: 1800000,
        max_repeated_state: 3,
        max_cost: 10,
        currency: "USD"
      },
      stop: {
        when_actor_queue_empty: true,
        when_no_new_documents: true,
        when_objective_satisfied: false,
        halt_on_actor_failure: true
      },
      counters: {
        depth: 0,
        actor_runs: 1,
        requests: 2,
        repeated_state: 0,
        elapsed_ms: 100,
        cost: 0
      },
      history: [{
        from: null,
        to: "running",
        at: stamp,
        message: "Started",
        error: "",
        actor_id: "quasar.actor.web-search",
        run_id: "run:research:001",
        output_ids: [],
        artifact_ids: []
      }],
      created_at: stamp,
      started_at: stamp,
      completed_at: null,
      last_error: "",
      paused_reason: ""
    }
  });

  assert.equal(validateRawDocument(document).valid, true);
  assert.ok(dtypes.includes("research-node"));
  assert.ok(fieldsForDtype("research-node").includes("objective"));
  assert.ok(fieldsForDtype("research-node").includes("history"));
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
