const fs = require("node:fs");
const path = require("node:path");
const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const SPEC_VERSION = "0.9.0";
const ADAPTER_VERSION = 1;
const DTYPE_ALIASES = new Set([
  "organization",
  "organisation",
  "investigation_target",
  "social_media_post",
  "email_message",
  "financial_observation",
  "research_pass",
  "dataset_manifest",
  "actor_manifest",
  "legal_case",
  "lobbying_filing",
  "campaign_finance",
]);

function schemaPath() {
  if (process.env.STARINTEL_SCHEMA) return process.env.STARINTEL_SCHEMA;
  if (process.env.STARINTEL_CONFORMANCE_ROOT) {
    return path.join(process.env.STARINTEL_CONFORMANCE_ROOT, "schemas", "starintel-doc-v0.9.0.schema.json");
  }
  return path.resolve(process.cwd(), "schemas", "starintel-doc-v0.9.0.schema.json");
}

function loadSchema() {
  const target = schemaPath();
  if (!fs.existsSync(target)) {
    throw new Error(`StarIntel schema not found: ${target}`);
  }
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

let cached;
function runtime() {
  if (cached) return cached;
  const schema = loadSchema();
  const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const variants = new Map();
  for (const branch of schema.allOf || []) {
    const dtype = branch?.if?.properties?.dtype?.const;
    const data = branch?.then?.properties?.data;
    if (dtype && data) variants.set(dtype, data);
  }
  cached = { schema, validate, variants };
  return cached;
}

function errorCategory(errors, document) {
  if (typeof document?.dtype === "string") {
    const known = runtime().variants.has(document.dtype);
    if (!known && !DTYPE_ALIASES.has(document.dtype)) return "unknown_object_type";
  }
  const first = errors?.[0];
  if (!first) return "validation_error";
  switch (first.keyword) {
    case "required": return "missing_required_field";
    case "additionalProperties": return "undeclared_field";
    case "format": return "invalid_datetime";
    case "minimum": return "below_minimum";
    case "maximum": return "above_maximum";
    case "pattern": return "pattern_mismatch";
    case "enum": return "invalid_enum";
    case "const": return first.instancePath === "/schema_version" ? "unsupported_spec_version" : "invalid_constant";
    case "type": return "wrong_type";
    default: return "validation_error";
  }
}

function validateDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return { ok: false, error: "wrong_type", message: "$: expected object" };
  }
  if (document.schema_version !== SPEC_VERSION) {
    return {
      ok: false,
      error: "unsupported_spec_version",
      message: `$.schema_version: expected ${SPEC_VERSION}, got ${String(document.schema_version)}`,
      unsupported: true,
    };
  }
  const { validate } = runtime();
  if (validate(document)) return { ok: true };
  return {
    ok: false,
    error: errorCategory(validate.errors, document),
    message: (validate.errors || []).map((item) => `${item.instancePath || "$"} ${item.message}`).join("; "),
    details: validate.errors || [],
  };
}

function roundtrip(document) {
  const checked = validateDocument(document);
  if (!checked.ok) return checked;
  const encoded = JSON.stringify(document);
  const decoded = JSON.parse(encoded);
  const rechecked = validateDocument(decoded);
  if (!rechecked.ok) return rechecked;
  return { ok: true, document: decoded, warnings: [] };
}

function schemaInventory() {
  const { variants } = runtime();
  return [...variants.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([objectType, data]) => {
    const required = new Set(data.required || []);
    const fields = {};
    for (const [name, definition] of Object.entries(data.properties || {}).sort(([a], [b]) => a.localeCompare(b))) {
      const item = { required: required.has(name) };
      if (definition.type) item.type = definition.type;
      if (definition.anyOf) item.any_of = definition.anyOf.map((candidate) => candidate.type || candidate.const || "any");
      if (definition.enum) item.enum = definition.enum;
      if (definition.format) item.format = definition.format;
      fields[name] = item;
    }
    return { object_type: objectType, fields };
  });
}

function capabilities() {
  return {
    language: "js",
    adapter_version: ADAPTER_VERSION,
    spec_versions: [SPEC_VERSION],
    commands: ["validate", "normalize", "roundtrip", "version", "capabilities", "schema-inventory"],
    object_types: [...runtime().variants.keys()].sort(),
    preserves_unknown_extensions: true,
    preserves_missing_optional_fields: true,
  };
}

module.exports = {
  SPEC_VERSION,
  ADAPTER_VERSION,
  capabilities,
  schemaInventory,
  validateDocument,
  roundtrip,
};
