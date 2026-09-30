const v090 = require("./v090");
const document = require("./document");
const schemaOrg = require("./schema-org");
const schemaBundle = require("./schema-bundle");
const validation = require("./validation");
const v0101 = require("./v0101");
const migration = require("./migration");

const legacy = {
  Document: require("./documents").Document,
  ...require("./entities"),
  ...require("./hosts"),
  ...require("./locations"),
  ...require("./relations"),
  ...require("./targets"),
  ...require("./web"),
  ...require("./phones"),
  ...require("./social_media"),
};

module.exports = {
  ...v090,
  ...document,
  ...schemaOrg,
  ...validation,
  ...migration,
  SPEC_VERSION: v0101.SPEC_VERSION,
  ADAPTER_VERSION: v0101.ADAPTER_VERSION,
  validateCanonicalDocument: v0101.validateDocument,
  assertCanonicalDocument: v0101.assertDocument,
  roundtripCanonicalDocument: v0101.roundtrip,
  canonicalDocumentDefinitions: v0101.documentDefinitions,
  canonicalCapabilities: v0101.capabilities,
  baseSchema: schemaBundle.baseSchema,
  expansion: schemaBundle.expansion,
  manifest: schemaBundle.manifest,
  verifySchemaBundle: schemaBundle.verifyBundle,
  fieldsForDtype: schemaBundle.fieldNamesForDtype,
  conformance: v0101,
  legacyConformance: v090,
  legacy,
  get schema() {
    return validation.loadSchema();
  },
  get canonicalSchema() {
    return v0101.schema;
  },
  get schemaRevision() {
    return schemaBundle.manifest.schema_revision;
  },
  get schemaHash() {
    return schemaBundle.manifest.expansion_content_hash;
  },
  get profile() {
    return schemaBundle.manifest.profile;
  },
  get dtypes() {
    return validation.loadSchema().properties.dtype.enum.slice();
  },
};
