const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const { normalizeDocument } = require("./document");
const { augmentSchema } = require("./schema-org");
const { materializeSchema, verifyBundle } = require("./schema-bundle");

let compiled = null;
let schemaCache = null;

function expandedSchema() {
  const schema = materializeSchema();
  const statusChange = schema.$defs?.statusChange;
  if (statusChange) {
    for (const variant of schema.allOf || []) {
      const properties = variant.then?.properties?.data?.properties;
      if (properties?.status_history) {
        properties.status_history = { type: "array", items: statusChange };
      }
    }
  }
  return schema;
}

function loadSchema() {
  if (!schemaCache) {
    verifyBundle();
    schemaCache = augmentSchema(expandedSchema());
  }
  return schemaCache;
}

function validator() {
  if (!compiled) {
    const ajv = new Ajv2020({
      allErrors: true,
      strict: true,
      strictSchema: false,
      allowUnionTypes: true
    });
    addFormats(ajv);
    compiled = ajv.compile(loadSchema());
  }
  return compiled;
}

function formatErrors(errors = []) {
  return errors.map((error) => ({
    path: error.instancePath || "/",
    keyword: error.keyword,
    message: error.message || "validation failed",
    params: error.params
  }));
}

function validateDocument(document, options = {}) {
  const candidate = options.normalize === false ? document : normalizeDocument(document, options);
  const validate = validator();
  const valid = Boolean(validate(candidate));
  return {
    valid,
    document: candidate,
    errors: valid ? [] : formatErrors(validate.errors)
  };
}

function validateRawDocument(document) {
  return validateDocument(document, { normalize: false });
}

function assertDocument(document, options = {}) {
  const result = validateDocument(document, options);
  if (!result.valid) {
    const error = new TypeError(`Invalid StarIntel v0.9 document: ${result.errors.map((item) => `${item.path} ${item.message}`).join("; ")}`);
    error.name = "StarIntelValidationError";
    error.errors = result.errors;
    error.document = result.document;
    throw error;
  }
  return result.document;
}

function assertRawDocument(document) {
  return assertDocument(document, { normalize: false });
}

function validateDocuments(documents, options = {}) {
  const results = Array.from(documents || [], (document) => validateDocument(document, options));
  return {
    valid: results.every((result) => result.valid),
    documents: results.map((result) => result.document),
    errors: results.flatMap((result, index) => result.errors.map((error) => ({ index, ...error })))
  };
}

module.exports = {
  loadSchema,
  validateDocument,
  validateRawDocument,
  validateDocuments,
  assertDocument,
  assertRawDocument,
  formatErrors
};
