const document = require("./document");
const schemaOrg = require("./schema-org");
const schemaBundle = require("./schema-bundle");
const validation = require("./validation");

module.exports = {
  ...document,
  ...schemaOrg,
  ...validation,
  baseSchema: schemaBundle.baseSchema,
  expansion: schemaBundle.expansion,
  manifest: schemaBundle.manifest,
  verifySchemaBundle: schemaBundle.verifyBundle,
  fieldsForDtype: schemaBundle.fieldNamesForDtype,
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
  }
};
