const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const schema = require("../schema/starintel-0.10.1.schema.json");
const manifest = require("../schema/starintel-0.10.1.manifest.json");

const SPEC_VERSION = "0.10.1";
const ADAPTER_VERSION = 2;

function documentDefinitions() {
  return Object.fromEntries(
    manifest.types
      .filter((contract) => contract.kind === "document")
      .map((contract) => {
        const dtype = contract.name.split("/").at(-1);
        const definition = dtype.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("");
        return [dtype, definition];
      })
  );
}

const definitions = documentDefinitions();
const validators = new Map();

function validator(dtype) {
  if (!Object.hasOwn(definitions, dtype) || !Object.hasOwn(schema.$defs, definitions[dtype])) return null;
  if (!validators.has(dtype)) {
    const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
    addFormats(ajv);
    validators.set(dtype, ajv.compile({
      $schema: schema.$schema,
      $ref: `#/$defs/${definitions[dtype]}`,
      $defs: schema.$defs
    }));
  }
  return validators.get(dtype);
}

function formatErrors(errors = []) {
  return errors.map((error) => ({
    path: error.instancePath || "/",
    keyword: error.keyword,
    message: error.message || "validation failed",
    params: error.params
  }));
}

function validateDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return { valid: false, errors: [{ path: "/", keyword: "type", message: "must be an object" }] };
  }
  if (document.schemaVersion !== SPEC_VERSION) {
    return { valid: false, errors: [{ path: "/schemaVersion", keyword: "const", message: `must equal ${SPEC_VERSION}` }] };
  }
  const validate = validator(document.dtype);
  if (!validate) {
    return { valid: false, errors: [{ path: "/dtype", keyword: "enum", message: `unknown dtype ${String(document.dtype)}` }] };
  }
  const valid = Boolean(validate(document));
  return { valid, errors: valid ? [] : formatErrors(validate.errors) };
}

function assertDocument(document) {
  const result = validateDocument(document);
  if (!result.valid) {
    const error = new TypeError(`Invalid StarIntel 0.10.1 document: ${result.errors.map((item) => `${item.path} ${item.message}`).join("; ")}`);
    error.name = "StarIntelValidationError";
    error.errors = result.errors;
    throw error;
  }
  return document;
}

function roundtrip(document) {
  assertDocument(document);
  const value = JSON.parse(JSON.stringify(document));
  assertDocument(value);
  return value;
}

function capabilities() {
  return {
    language: "js",
    adapterVersion: ADAPTER_VERSION,
    specVersions: ["0.9.0", SPEC_VERSION],
    emittedSpecVersion: SPEC_VERSION,
    objectTypes: Object.keys(definitions).sort(),
    canonicalKeyStyle: "lowerCamelCase"
  };
}

module.exports = {
  ADAPTER_VERSION,
  SPEC_VERSION,
  assertDocument,
  capabilities,
  documentDefinitions,
  manifest,
  roundtrip,
  schema,
  validateDocument
};
