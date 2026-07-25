const document = require("./document");
const validation = require("./validation");

module.exports = {
  ...document,
  ...validation,
  get schema() {
    return validation.loadSchema();
  },
  get dtypes() {
    return validation.loadSchema().properties.dtype.enum.slice();
  }
};
