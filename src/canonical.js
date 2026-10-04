const { validateWorkflowSemantics } = require("./workflow-semantics");
const workflowMappings = require("../schemas/starintel-0.10.1/supported-workflow-mappings.json");
const { validateOperationSemantics } = require("./operation-semantics");
// Runtime consumer of StarLang's generated schema and portable manifest.
const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const { parse, LosslessNumber, isSafeNumber, isNumber } = require("lossless-json");
const isLosslessNumber = value => value instanceof LosslessNumber;
const schema = require("../schemas/starintel-0.10.1/generated/schema.json");
const manifest = require("../schemas/starintel-0.10.1/generated/portable-manifest.json");
const SPEC_VERSION = "0.10.1";
const ADAPTER_VERSION = 1;
const definitionName = (name) => name.split("/").at(-1).split("-")
  .map((word) => word[0].toUpperCase() + word.slice(1)).join("");
const documentTypes = Object.fromEntries(manifest.types.filter((t) => t.kind === "document" && t.persistence === "persistent")
  .map((t) => [t.name.split("/").at(-1), definitionName(t.name)]));
const decimals = Object.fromEntries(manifest.types.filter((t) => t.kind === "scalar" && t.base === "decimal")
  .map((t) => [definitionName(t.name), t]));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
// AJV sees JSON types and structure only for numbers. Its IEEE-754 arithmetic
// cannot validate the unbounded JSON numeric domain. Check numeric constraints
// against original tokens below, without modifying the exported authority.
function structuralSchema(node) {
  if (Array.isArray(node)) return node.map(structuralSchema);
  if (!node || typeof node !== "object") return node;
  const result = Object.fromEntries(Object.entries(node)
    .map(([key, value]) => [key, structuralSchema(value)]));
  if (node.type === "integer" || node.type === "number") {
    result.type = "number";
    delete result.minimum;
    delete result.maximum;
  }
  return result;
}
const projectedSchema = structuralSchema(schema);
ajv.addSchema(projectedSchema);
const unionValidators = new WeakMap();
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

// A normalized decimal coefficient plus a BigInt power of ten avoids expanding
// huge exponents or rounding them through Number (including during integer tests).
function exactNumber(value) {
  const [, negative, whole, fraction = "", exponent = "0"] =
    /^(-?)([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/.exec(String(value));
  const coefficient = (whole + fraction).replace(/^0+/, "");
  const digits = coefficient.replace(/0+$/, "");
  if (!digits) return { sign: 0, digits: "0", exponent: 0n };
  return { sign: negative ? -1 : 1, digits,
    exponent: BigInt(exponent) - BigInt(fraction.length) + BigInt(coefficient.length - digits.length) };
}

function compareNumber(left, right) {
  const a = exactNumber(left), b = exactNumber(right);
  if (a.sign !== b.sign) return a.sign < b.sign ? -1 : 1;
  if (!a.sign) return 0;
  const magnitudeA = BigInt(a.digits.length) + a.exponent;
  const magnitudeB = BigInt(b.digits.length) + b.exponent;
  if (magnitudeA !== magnitudeB) return (magnitudeA < magnitudeB ? -1 : 1) * a.sign;
  // At equal magnitude, normalized digits compare lexically: omitted trailing
  // digits are zeros, and a longer coefficient must end in a nonzero digit.
  return (a.digits < b.digits ? -1 : a.digits > b.digits ? 1 : 0) * a.sign;
}

function numericErrors(value, node, path = "$") {
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
    return numericErrors(value, schema.$defs[name], path);
  }
  if (typeof value === "number" || isLosslessNumber(value)) {
    if (node.type === "integer" && exactNumber(value).exponent < 0n)
      return [{ path, keyword: "type", message: "expected exact integer" }];
    if (node.minimum !== undefined && compareNumber(value, node.minimum) < 0)
      return [{ path, keyword: "minimum", message: "below numeric minimum" }];
    if (node.maximum !== undefined && compareNumber(value, node.maximum) > 0)
      return [{ path, keyword: "maximum", message: "above numeric maximum" }];
  }
  if (node.allOf) return node.allOf.flatMap(branch => numericErrors(value, branch, path));
  if (node.anyOf) {
    // The generated nullable branches are already structurally validated above.
    // Avoid recompiling the complete release for every nullable field/record.
    const nullable = node.anyOf.find(candidate => candidate.type === "null");
    const branch = nullable && node.anyOf.length === 2
      ? (value === null ? nullable : node.anyOf.find(candidate => candidate !== nullable))
      : node.anyOf.find(candidate => {
          let validate = unionValidators.get(candidate);
          if (!validate) {
            validate = ajv.compile({ ...structuralSchema(candidate), $defs: projectedSchema.$defs });
            unionValidators.set(candidate, validate);
          }
          return validate(validationValue(value));
        });
    return branch ? numericErrors(value, branch, path) : [];
  }
  if (Array.isArray(value) && node.items)
    return value.flatMap((item, index) => numericErrors(item, node.items, `${path}[${index}]`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) => {
      const child = node.properties?.[key] ?? node.additionalProperties;
      return child && typeof child === "object" ? numericErrors(item, child, `${path}.${key}`) : [];
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
    else errors = numericErrors(document, { $ref: `#/$defs/${documentTypes[document.dtype]}` });
  }
  if (!errors.length) {
    try { validateOperationSemantics(document); validateWorkflowSemantics(document); }
    catch (error) { errors.push({ path: "$", keyword: "operationSemantics", message: error.message }); }
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
  const value = parseJson(stringifyJson(document));
  assertDocument(value);
  return value;
}

function parseJson(text) {
  // The dependency creates objects with assignment, which treats __proto__ as a
  // setter. Protect that decoded key before parsing, including escaped spellings.
  // Pick a key absent from the input so ordinary extension keys cannot collide.
  const keyTokens = [...text.matchAll(/"(?:\\.|[^"\\])*"/g)]
    .filter(match => /^[ \t\r\n]*:/.test(text.slice(match.index + match[0].length)));
  const keys = new Set(keyTokens.map(match => JSON.parse(match[0])));
  let protectedKey = "__starintel_proto__";
  const protect = keys.has("__proto__");
  if (protect) {
    while (keys.has(protectedKey)) protectedKey += "_";
    // Replace from the end so each original token offset remains valid.
    for (const match of keyTokens.reverse()) {
      if (JSON.parse(match[0]) === "__proto__")
        text = text.slice(0, match.index) + JSON.stringify(protectedKey) + text.slice(match.index + match[0].length);
    }
  }
  const value = parse(text, undefined, token => {
    if (!isNumber(token)) throw new SyntaxError(`Invalid JSON number: ${token}`);
    const number = Number(token);
    return isSafeNumber(token) && Number.isFinite(number) &&
      (!Number.isInteger(number) || Number.isSafeInteger(number)) ? number : new LosslessNumber(token);
  });
  function restore(item) {
    if (isLosslessNumber(item)) return item;
    if (Array.isArray(item)) return item.map(restore);
    if (item && typeof item === "object")
      return Object.fromEntries(Object.entries(item).map(([key, child]) =>
        [key === protectedKey ? "__proto__" : key, restore(child)]));
    return item;
  }
  return protect ? restore(value) : value;
}

// Do not use lossless-json's duck-typed serializer: an ordinary extension may
// legally contain isLosslessNumber, value, or toString keys. Only actual numeric
// instances may emit raw tokens; every ordinary key/string is JSON-escaped.
function stringifyJson(value) {
  const ancestors = new Set();
  function encode(item) {
    if (isLosslessNumber(item)) {
      const token = item.toString();
      if (!isNumber(token)) throw new TypeError("invalid lossless JSON number");
      return token;
    }
    if (typeof item === "number") {
      if (!Number.isFinite(item) || (Number.isInteger(item) && !Number.isSafeInteger(item)))
        throw new TypeError("unsafe native number; use parseJson to preserve exact JSON numbers");
      return JSON.stringify(item);
    }
    if (item === null || typeof item === "string" || typeof item === "boolean") return JSON.stringify(item);
    if (typeof item === "bigint") return item.toString();
    if (!item || typeof item !== "object") return undefined;
    if (ancestors.has(item)) throw new TypeError("cannot stringify circular JSON value");
    ancestors.add(item);
    try {
      if (typeof item.toJSON === "function") return encode(item.toJSON());
      if (Array.isArray(item)) return "[" + Array.from(item, entry => encode(entry) ?? "null").join(",") + "]";
      return "{" + Object.entries(item).flatMap(([key, entry]) => {
        const encoded = encode(entry);
        return encoded === undefined ? [] : [JSON.stringify(key) + ":" + encoded];
      }).join(",") + "}";
    } finally { ancestors.delete(item); }
  }
  return encode(value);
}

function validationValue(value) {
  // A finite numeric placeholder preserves JSON type, never the numeric value.
  // Only numericErrors inspects bounds/integrality, using the original token.
  if (isLosslessNumber(value)) {
    if (!isNumber(value.toString())) throw new TypeError("invalid lossless JSON number");
    return 0;
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

module.exports = { workflowMappings, SPEC_VERSION, ADAPTER_VERSION, schema, manifest, documentTypes,
  parseJson, stringifyJson,
  dtypes: Object.keys(documentTypes).sort(), validateDocument, validateRawDocument: validateDocument,
  assertDocument, assertRawDocument: assertDocument, roundtrip, createDocument, capabilities };
