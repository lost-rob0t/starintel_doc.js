# Schema.org metadata

The JavaScript v0.9 runtime emits a strict `schema_org` JSON-LD block for every normalized document.

```js
const { createDocument, toSchemaOrg } = require("starintel_doc");

const organization = createDocument("org", {
  dataset: "example",
  title: "Example Org",
  schema_org: {
    sameAs: ["https://example.test/org"],
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "registry status",
        value: "active"
      }
    ]
  },
  data: {
    name: "Example Org",
    org_type: "company"
  }
});

console.log(toSchemaOrg(organization));
```

The runtime supplies `@context`, `@type`, `@id`, and `additionalType`; explicit JSON-LD values override defaults. The dtype mapping covers all 49 canonical v0.9 document types and is tested against the schema enum.
