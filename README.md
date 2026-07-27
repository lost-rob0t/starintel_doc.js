# starintel_doc.js

Canonical JavaScript runtime for **StarIntel document schema v0.9.0**.

This repository is the specification and validation package. It contains no Quasar UI, graph renderer, PouchDB storage, CouchDB synchronization, routing, or browser actor code.

## v0.9 compatibility and revision

`schema_version` remains `0.9.0`. The exact additive contract is identified by:

```text
schema_revision = 0.9.0+fields.20260725.1
profile         = starintel-core
```

Existing v0.9 documents without `schema_revision` remain valid. Newly normalized documents receive the revision, profile, schema URI, lifecycle flags, and lineage revision automatically.

The package materializes validation from three offline files:

```text
schema/starintel-doc-v0.9.0.schema.json
schema/starintel-doc-v0.9.0.expansion.json
schema/starintel-doc-v0.9.0.manifest.json
```

The base schema is the v0.9 compatibility contract. The expansion registry adds shared fields and explicit fields for every canonical dtype. The manifest pins the registry with a canonical-JSON SHA-256 hash.

## Install

```bash
npm install github:lost-rob0t/starintel_doc.js
```

Package installation and packing do not require a network schema fetch. `npm run sync-schema` is an explicit maintenance command.

## Usage

```js
const {
  createDocument,
  createRelation,
  validateDocument,
  assertDocument,
  fieldsForDtype,
  schemaRevision,
  schemaHash,
  schema,
  dtypes
} = require("starintel_doc");

const organization = createDocument("org", {
  _id: "starintel:org:example",
  dataset: "example",
  title: "Example Org",
  data: {
    name: "Example Org",
    org_type: "company",
    legal_form: "corporation",
    contract_ids: ["starintel:contract:example"],
    facets: [{
      facet_type: "governance",
      properties: { board_model: "unitary" }
    }]
  }
});

assertDocument(organization);

const relation = createRelation({
  dataset: "example",
  subject: "starintel:person:example",
  predicate: "founded",
  object: organization._id,
  data: {
    predicate_namespace: "starintel",
    subject_dtype: "person",
    object_dtype: "org"
  }
});

console.log(validateDocument(relation));
console.log(schemaRevision, schemaHash);
console.log(fieldsForDtype("org"));
```

## Schema.org JSON-LD

The v0.9 expansion is composed with the existing strict Schema.org layer. `schema_org` remains optional, dtype-aware, and rejects undeclared direct fields. `toSchemaOrg(document)` exports the interoperable JSON-LD view.

## Synchronization

`scripts/sync-schema.mjs` synchronizes the base schema, expansion registry, and manifest from `lost-rob0t/starintel-gpt-auto-dig`.

During the canonical expansion PR, the script checks `main` first and falls back to `agent/starintel-v0.9-field-expansion`. Override this explicitly with:

```bash
STARINTEL_SCHEMA_REF=main npm run sync-schema
```

Commands:

```bash
npm run sync-schema   # fetch and atomically replace the bundle
npm run check-schema  # verify local revision, profile, dtype count and hash offline
```

## API

- `normalizeDocument(input, options)` fills the canonical revisioned envelope without deleting supplied canonical fields.
- `createDocument(dtype, input)` creates a normalized document.
- `createRelation(input)` creates a normalized relation document.
- `stableDocumentId(dtype, ...identity)` creates deterministic SHA-256-backed IDs.
- `touchDocument(document, changes)` advances `version`, `date_updated`, and schema revision metadata.
- `validateDocument(document)` normalizes then validates.
- `validateRawDocument(document)` validates without normalization.
- `validateDocuments(documents)` validates a batch.
- `assertDocument(document)` returns a normalized valid document or throws `StarIntelValidationError`.
- `assertRawDocument(document)` validates a raw document or throws.
- `schema` exposes the fully materialized v0.9 schema with Schema.org support.
- `baseSchema`, `expansion`, and `manifest` expose the bundle components.
- `verifySchemaBundle()` verifies version, revision, profile, dtype count, and hash.
- `fieldsForDtype(dtype)` lists common and dtype-specific expansion fields.
- `schemaRevision`, `schemaHash`, `profile`, and `dtypes` expose synchronization metadata.

## Development

```bash
npm install
npm run sync-schema
npm run check-schema
npm run check
npm test
npm pack --dry-run
```
