const v090 = require("./v090");
const document = require("./document");
const schemaOrg = require("./schema-org");
const schemaBundle = require("./schema-bundle");
const validation = require("./validation");

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
  baseSchema: schemaBundle.baseSchema,
  expansion: schemaBundle.expansion,
  manifest: schemaBundle.manifest,
  verifySchemaBundle: schemaBundle.verifyBundle,
  fieldsForDtype: schemaBundle.fieldNamesForDtype,
  conformance: v090,
  legacy,
  get schema() {
    return validation.loadSchema();
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
