const path = require("node:path");
const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const { normalizeDocument } = require("./document");

const schemaPath = path.join(__dirname, "..", "schema", "starintel-doc-v0.9.0.schema.json");
let compiled = null;
let schemaCache = null;

function loadSchema() {
  if (!schemaCache) {
    try {
      schemaCache = require(schemaPath);
    } catch (error) {
      error.message = `StarIntel v0.9 schema is missing. Run npm run sync-schema. ${error.message}`;
      throw error;
    }
  }
  return schemaCache;
}

function validator() {
  if (!compiled) {
    const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
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
  validateDocuments,
  assertDocument,
  formatErrors
};
