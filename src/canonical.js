// Runtime consumer of StarLang's generated schema and portable manifest.
const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const { parse, stringify, LosslessNumber, isLosslessNumber, isSafeNumber } = require("lossless-json");
const schema = require("../schemas/starintel-0.10.1/generated/schema.json");
const manifest = require("../schemas/starintel-0.10.1/generated/portable-manifest.json");
const SPEC_VERSION = "0.10.1";
const ADAPTER_VERSION = 1;
const definitionName = (name) => name.split("/").at(-1).split("-")
  .map((word) => word[0].toUpperCase() + word.slice(1)).join("");
const documentTypes = Object.fromEntries(manifest.types.filter((t) => t.kind === "document")
  .map((t) => [t.name.split("/").at(-1), definitionName(t.name)]));
const decimals = Object.fromEntries(manifest.types.filter((t) => t.kind === "scalar" && t.base === "decimal")
  .map((t) => [definitionName(t.name), t]));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(schema);
const validators = Object.fromEntries(Object.entries(documentTypes)
  .map(([dtype, name]) => [dtype, ajv.compile({ $ref: `${schema.$id}#/$defs/${name}` })]));

function decimal(value) {
  const [whole, fraction = ""] = String(value).split(".");
  const sign = whole.startsWith("-") ? -1n : 1n;
  return { coefficient: sign * BigInt(whole.replace(/^[+-]/, "") + fraction), scale: fraction.length };
}

function compareDecimal(left, right) {
  const a = decimal(left), b = decimal(right);
  const scale = Math.max(a.scale, b.scale);
  const x = a.coefficient * 10n ** BigInt(scale - a.scale);
  const y = b.coefficient * 10n ** BigInt(scale - b.scale);
  return x < y ? -1 : x > y ? 1 : 0;
}

function decimalErrors(value, node, path = "$") {
  if (node.$ref) {
    const name = node.$ref.split("/").at(-1), constraint = decimals[name];
    if (constraint && typeof value === "string") {
      if (constraint.minimum !== undefined && compareDecimal(value, constraint.minimum) < 0)
        return [{ path, keyword: "minimum", message: "below decimal minimum" }];
      if (constraint.maximum !== undefined && compareDecimal(value, constraint.maximum) > 0)
        return [{ path, keyword: "maximum", message: "above decimal maximum" }];
      if (constraint.scale !== undefined && decimal(value).scale > constraint.scale)
        return [{ path, keyword: "scale", message: "exceeds decimal scale" }];
    }
    return decimalErrors(value, schema.$defs[name], path);
  }
  if (node.type === "integer" && isLosslessNumber(value)) {
    const [mantissa, exponent = "0"] = value.toString().toLowerCase().split("e");
    const [whole, fraction = ""] = mantissa.split(".");
    const digits = whole.replace("-", "") + fraction;
    const places = fraction.length - Number(exponent);
    if (places > 0 && !/^0*$/.test(digits.slice(Math.max(0, digits.length - places))))
      return [{ path, keyword: "type", message: "expected exact integer" }];
  }
  if (node.anyOf) {
    const branch = node.anyOf.find((candidate) => ajv.validate({ ...candidate, $defs: schema.$defs }, value));
    return branch ? decimalErrors(value, branch, path) : [];
  }
  if (Array.isArray(value) && node.items)
    return value.flatMap((item, index) => decimalErrors(item, node.items, `${path}[${index}]`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) => {
      const child = node.properties?.[key] ?? node.additionalProperties;
      return child && typeof child === "object" ? decimalErrors(item, child, `${path}.${key}`) : [];
    });
  return [];
}

function validateDocument(document) {
  let errors = [];
  if (!document || typeof document !== "object" || Array.isArray(document))
    errors = [{ path: "$", keyword: "type", message: "expected object" }];
  else if (document.schemaVersion !== SPEC_VERSION)
    errors = [{ path: "$.schemaVersion", keyword: "version", message: "unsupported_spec_version" }];
  else if (!Object.hasOwn(documentTypes, document.dtype))
    errors = [{ path: "$.dtype", keyword: "dtype", message: "unknown_object_type" }];
  else {
    const validate = validators[document.dtype];
    let plain;
    try { plain = validationValue(document); }
    catch (error) { return { valid: false, document, errors: [{ path: "$", keyword: "type", message: error.message }] }; }
    if (!validate(plain)) errors = validate.errors.map((error) => ({
      path: error.instancePath || "$", keyword: error.keyword, message: error.message, params: error.params
    }));
    else errors = decimalErrors(document, { $ref: `#/$defs/${documentTypes[document.dtype]}` });
  }
  return { valid: errors.length === 0, document, errors };
}

function assertDocument(document) {
  const result = validateDocument(document);
  if (!result.valid) {
    const error = new TypeError(result.errors.map((e) => `${e.path}: ${e.message}`).join("; "));
    error.name = "StarIntelValidationError";
    error.errors = result.errors;
    throw error;
  }
  return document;
}

function roundtrip(document) {
  assertDocument(document);
  const value = parseJson(stringify(document));
  assertDocument(value);
  return value;
}

function parseJson(text) {
  return parse(text, undefined, token => isSafeNumber(token) ? Number(token) : new LosslessNumber(token));
}

function validationValue(value) {
  if (isLosslessNumber(value)) {
    const number = Number(value.toString());
    if (!Number.isFinite(number)) throw new TypeError("number is outside validator range");
    return number;
  }
  if (typeof value === "number" && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))))
    throw new TypeError("unsafe native number; use parseJson to preserve exact JSON numbers");
  if (Array.isArray(value)) return value.map(validationValue);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, validationValue(item)]));
  return value;
}

function createDocument(dtype, fields) {
  return roundtrip({ ...fields, dtype, schemaVersion: SPEC_VERSION });
}

function capabilities() {
  return { language: "js", adapter_version: ADAPTER_VERSION, spec_versions: [SPEC_VERSION],
    authority: manifest.library, object_types: Object.keys(documentTypes).sort(),
    commands: ["validate", "roundtrip", "version", "capabilities", "schema-inventory"],
    preserves_unknown_extensions: true, preserves_missing_optional_fields: true };
}

module.exports = { SPEC_VERSION, ADAPTER_VERSION, schema, manifest, documentTypes,
  parseJson, stringifyJson: stringify,
  dtypes: Object.keys(documentTypes).sort(), validateDocument, validateRawDocument: validateDocument,
  assertDocument, assertRawDocument: assertDocument, roundtrip, createDocument, capabilities };
