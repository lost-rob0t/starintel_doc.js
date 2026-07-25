const document = require("./document");
const schemaOrg = require("./schema-org");
const validation = require("./validation");

module.exports = {
  ...document,
  ...schemaOrg,
  ...validation,
  get schema() {
    return validation.loadSchema();
  },
  get dtypes() {
    return validation.loadSchema().properties.dtype.enum.slice();
  }
};
