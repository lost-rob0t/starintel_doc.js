# starintel_doc.js

Canonical JavaScript runtime for **StarIntel document schema v0.9.0**.

This repository is the specification and validation package. It contains no Quasar UI, graph renderer, PouchDB storage, CouchDB synchronization, routing, or browser actor code.

## Install

```bash
npm install github:lost-rob0t/starintel_doc.js
```

## Usage

```js
const {
  createDocument,
  createRelation,
  validateDocument,
  assertDocument,
  schema,
  dtypes
} = require("starintel_doc");

const organization = createDocument("org", {
  _id: "starintel:org:example",
  dataset: "example",
  title: "Example Org",
  data: {
    name: "Example Org",
    org_type: "company"
  }
});

assertDocument(organization);

const relation = createRelation({
  dataset: "example",
  subject: "starintel:person:example",
  predicate: "founded",
  object: organization._id
});

console.log(validateDocument(relation));
```

## Canonical schema source

`scripts/sync-schema.mjs` downloads the generated schema from `lost-rob0t/starintel-gpt-auto-dig` and writes:

```text
schema/starintel-doc-v0.9.0.schema.json
```

CI fails on schema drift. The synchronization workflow may commit an updated canonical schema to the active branch.

## API

- `normalizeDocument(input, options)` fills the canonical envelope without deleting supplied canonical fields.
- `createDocument(dtype, input)` creates a normalized document.
- `createRelation(input)` creates a normalized relation document.
- `touchDocument(document, changes)` advances `version` and `date_updated`.
- `validateDocument(document)` returns `{ valid, document, errors }`.
- `validateDocuments(documents)` validates a batch.
- `assertDocument(document)` returns a normalized valid document or throws `StarIntelValidationError`.
- `schema` exposes the exact generated JSON Schema.
- `dtypes` exposes the schema dtype enumeration.

## Development

```bash
npm install
npm run sync-schema
npm run check
npm test
npm pack --dry-run
```
