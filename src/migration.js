const { createHash } = require("node:crypto");
const compatibility = require("../schema/starintel-0.10.1.compatibility.json");
const fixtures = require("../schema/starintel-0.10.1.compatibility-fixtures.json");
const { SPEC_VERSION, documentDefinitions, schema, assertDocument } = require("./v0101");

class MigrationError extends Error {
  constructor(reasonCode, message) {
    super(message);
    this.name = "StarIntelMigrationError";
    this.reasonCode = reasonCode;
  }
}

function camel(name) {
  return name.replace(/_([a-z0-9])/g, (_, character) => character.toUpperCase());
}

function normalizedObject(value, aliases, opaqueFields) {
  const result = {};
  for (const [source, item] of Object.entries(value)) {
    const target = aliases[source] || camel(source);
    if (Object.hasOwn(result, target)) {
      throw new MigrationError("ambiguousFieldCollision", `multiple fields normalize to ${target}`);
    }
    if (opaqueFields.has(target)) result[target] = structuredClone(item);
    else if (Array.isArray(item)) {
      result[target] = item.map((entry) => entry && typeof entry === "object" && !Array.isArray(entry)
        ? normalizedObject(entry, aliases, opaqueFields)
        : structuredClone(entry));
    } else if (item && typeof item === "object") {
      result[target] = normalizedObject(item, aliases, opaqueFields);
    } else result[target] = item;
  }
  return result;
}

function mergeLegacyData(document) {
  if (!Object.hasOwn(document, "data")) return;
  const data = document.data;
  delete document.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new MigrationError("migrationFailed", "legacy data must be an object");
  }
  for (const [key, value] of Object.entries(data)) {
    if (Object.hasOwn(document, key)) throw new MigrationError("ambiguousFieldCollision", `legacy data collides at ${key}`);
    document[key] = value;
  }
}

function classifyMedia(document) {
  const policy = compatibility.mediaClassification;
  if (document.dtype !== policy.legacyDtype) return;
  let mediaType = null;
  for (const field of policy.contentTypePrecedence) {
    if (typeof document[field] === "string" && document[field]) {
      mediaType = document[field].toLowerCase();
      break;
    }
  }
  document.dtype = policy.fallbackDtype;
  if (mediaType) {
    const match = policy.rules.find((rule) => mediaType.startsWith(rule.prefix));
    if (match) document.dtype = match.dtype;
  }
}

function convertGeo(document) {
  const policy = compatibility.geo;
  if (document.dtype !== policy.legacyDtype) return;
  for (const [source, target] of Object.entries(policy.fieldAliases)) {
    const normalizedSource = camel(source);
    if (!Object.hasOwn(document, normalizedSource)) continue;
    if (Object.hasOwn(document, target)) throw new MigrationError("ambiguousFieldCollision", `geo field collides at ${target}`);
    document[target] = document[normalizedSource];
    delete document[normalizedSource];
  }
  document.dtype = policy.canonicalDtype;
  for (const [key, value] of Object.entries(policy.defaults)) {
    if (!Object.hasOwn(document, key)) document[key] = value;
  }
  const longitude = Number(document.longitude);
  const latitude = Number(document.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new MigrationError("migrationFailed", "legacy geo requires decimal lat and long");
  }
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw new MigrationError("canonicalValidationFailed", "geo coordinate is outside its valid range");
  }
}

function reference(dtype, id) {
  return { schema: `org.starintel/core@1/${dtype}`, id };
}

function digestId(prefix, parts) {
  return createHash("sha256").update([prefix, ...parts].join("\0"), "utf8").digest("hex");
}

function extractPersonIdentifiers(document) {
  if (document.dtype !== "person" || !document.externalIds || typeof document.externalIds !== "object" || Array.isArray(document.externalIds)) return [];
  const generated = [];
  const references = [];
  for (const [scheme, rawValue] of Object.entries(document.externalIds).sort(([left], [right]) => left.localeCompare(right))) {
    if (typeof rawValue !== "string" && typeof rawValue !== "number") continue;
    const value = String(rawValue);
    const normalizedValue = value.trim().toLowerCase();
    const id = `starintel:person-identifier:${digestId("personIdentifier", [document.id, scheme, normalizedValue])}`;
    references.push(reference("person-identifier", id));
    generated.push({
      id,
      dataset: document.dataset,
      dtype: "person-identifier",
      schemaVersion: SPEC_VERSION,
      person: reference("person", document.id),
      scheme,
      value,
      normalizedValue
    });
  }
  if (references.length) document.identifiers = references;
  return generated;
}

function extractTranscript(document) {
  let text = null;
  for (const field of ["transcript", "transcriptText"]) {
    if (typeof document[field] === "string" && document[field]) {
      text = document[field];
      delete document[field];
      break;
    }
  }
  if (text === null) return [];
  const language = String(document.language || "");
  const id = `starintel:transcript:${digestId("transcript", [document.id, language])}`;
  const transcriptReference = reference("transcript", id);
  if (document.dtype === "audio") document.transcripts = [transcriptReference];
  else document.transcript = transcriptReference;
  const transcript = {
    id,
    dataset: document.dataset,
    dtype: "transcript",
    schemaVersion: SPEC_VERSION,
    sourceMedia: reference(document.dtype, document.id),
    text
  };
  if (language) transcript.language = language;
  return [transcript];
}

const definitions = documentDefinitions();

function preserveUnknown(document) {
  const definition = definitions[document.dtype];
  if (!definition || !schema.$defs[definition]) throw new MigrationError("canonicalValidationFailed", `unknown dtype ${String(document.dtype)}`);
  const known = new Set(Object.keys(schema.$defs[definition].properties || {}));
  const unknown = {};
  for (const key of Object.keys(document)) {
    if (!known.has(key)) {
      unknown[key] = document[key];
      delete document[key];
    }
  }
  if (!Object.keys(unknown).length) return;
  if (!Object.hasOwn(document, "extensions")) document.extensions = {};
  if (!document.extensions || typeof document.extensions !== "object" || Array.isArray(document.extensions) || Object.hasOwn(document.extensions, "legacy")) {
    throw new MigrationError("ambiguousFieldCollision", "extensions.legacy collides");
  }
  document.extensions.legacy = unknown;
}

function migrateDocument(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new MigrationError("decodeFailed", "document must be an object");
  const legacy = compatibility.legacyInput;
  const document = normalizedObject(value, legacy.envelopeAliases, new Set(legacy.opaqueMapFields));
  if (!compatibility.acceptedSchemaVersions.includes(document.schemaVersion)) {
    throw new MigrationError("unsupportedSchemaVersion", `unsupported schema version ${String(document.schemaVersion)}`);
  }
  mergeLegacyData(document);
  if (Object.hasOwn(compatibility.dtypeAliases, document.dtype)) document.dtype = compatibility.dtypeAliases[document.dtype];
  classifyMedia(document);
  convertGeo(document);
  document.schemaVersion = SPEC_VERSION;
  const documents = [document, ...extractPersonIdentifiers(document), ...extractTranscript(document)];
  for (const migrated of documents) {
    preserveUnknown(migrated);
    try {
      assertDocument(migrated);
    } catch (error) {
      throw new MigrationError("canonicalValidationFailed", error.message);
    }
  }
  return documents;
}

function migrateBatch(values) {
  const documents = [];
  const quarantine = [];
  for (const value of values || []) {
    try {
      documents.push(...migrateDocument(value));
    } catch (error) {
      quarantine.push({ reasonCode: error instanceof MigrationError ? error.reasonCode : "migrationFailed" });
    }
  }
  return { documents, quarantine };
}

module.exports = { MigrationError, compatibility, fixtures, migrateBatch, migrateDocument };
