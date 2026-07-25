const { createHash, randomUUID } = require("node:crypto");
const { schemaOrgMetadata } = require("./schema-org");
const { manifest } = require("./schema-bundle");

const SCHEMA_VERSION = manifest.schema_version;
const SCHEMA_REVISION = manifest.schema_revision;
const SCHEMA_PROFILE = manifest.profile;
const SCHEMA_PROFILE_VERSION = manifest.profile_version;
const SCHEMA_URI = "https://starintel.dev/schema/starintel-doc-v0.9.0.json";

const CANONICAL_DTYPES = Object.freeze([
  "actor-manifest",
  "address",
  "alert",
  "analysis",
  "asset",
  "breach",
  "campaign-finance",
  "claim",
  "concept",
  "contract",
  "dataset-manifest",
  "document",
  "domain",
  "education",
  "email",
  "email-message",
  "employment",
  "entity",
  "event",
  "evidence-record",
  "file",
  "financial-observation",
  "geo",
  "grant",
  "host",
  "investigation-target",
  "legal-case",
  "lobbying-filing",
  "location",
  "media",
  "meeting",
  "message",
  "network",
  "observation",
  "org",
  "ownership",
  "person",
  "phone",
  "policy",
  "procurement",
  "product",
  "relation",
  "research-pass",
  "social-media-post",
  "source",
  "target",
  "task",
  "url",
  "user"
]);

const EXPANDED_DTYPE_ALIASES = Object.freeze({
  organization: "org",
  organisation: "org",
  geolocation: "geo",
  geographic_location: "geo",
  email_address: "email",
  electronic_mail: "email",
  hostname: "host",
  phone_number: "phone",
  telephone: "phone",
  telephone_number: "phone",
  uniform_resource_locator: "url",
  web_url: "url"
});

const DTYPE_ALIASES = Object.freeze(CANONICAL_DTYPES.reduce((aliases, dtype) => {
  aliases[dtype] = dtype;
  aliases[dtype.replaceAll("-", "_")] = dtype;
  return aliases;
}, { ...EXPANDED_DTYPE_ALIASES }));

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function dtypeKey(dtype) {
  return String(dtype || "document")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function canonicalDtype(dtype) {
  const value = dtypeKey(dtype);
  return DTYPE_ALIASES[value] || value;
}

function slug(value) {
  return String(value || "document")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "document";
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function stableDocumentId(dtype, ...identity) {
  const canonical = canonicalDtype(dtype);
  if (!CANONICAL_DTYPES.includes(canonical)) throw new RangeError(`unknown StarIntel dtype: ${dtype}`);
  const raw = identity.map((item) => JSON.stringify(canonicalize(item))).join("\x1f");
  const digest = createHash("sha256").update(raw).digest("hex").slice(0, 20);
  const label = slug(identity.length ? identity[0] : digest).slice(0, 64);
  return `starintel:${canonical}:${label}-${digest}`;
}

function makeDocumentId(dtype, hint) {
  if (hint != null && String(hint).trim()) return stableDocumentId(dtype, hint);
  const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : randomUUID();
  return `starintel:${canonicalDtype(dtype)}:${id}`;
}

function normalizeDocument(input, options = {}) {
  const source = clone(input || {});
  const stamp = options.now || nowIso();
  const dtype = canonicalDtype(source.dtype || options.dtype || "document");
  const titleHint = source.title || source.data?.name || source.data?.full_name || source.data?.target;
  const id = source._id || options.id || makeDocumentId(dtype, titleHint);
  const explicitSchemaOrg = source.schema_org && typeof source.schema_org === "object" && !Array.isArray(source.schema_org)
    ? source.schema_org
    : {};
  const lineage = source.lineage && typeof source.lineage === "object" && !Array.isArray(source.lineage)
    ? source.lineage
    : {};

  return {
    ...source,
    _id: id,
    dataset: source.dataset || options.dataset || "default",
    dtype,
    schema_version: SCHEMA_VERSION,
    schema_revision: SCHEMA_REVISION,
    schema_uri: SCHEMA_URI,
    profile: source.profile || SCHEMA_PROFILE,
    profile_version: source.profile_version || SCHEMA_PROFILE_VERSION,
    version: Number.isInteger(source.version) && source.version > 0 ? source.version : 1,
    date_added: source.date_added || stamp,
    date_updated: source.date_updated || stamp,
    sources: Array.isArray(source.sources) ? source.sources : [],
    evidence: Array.isArray(source.evidence) ? source.evidence : [],
    object_marking_ids: Array.isArray(source.object_marking_ids) ? source.object_marking_ids : [],
    revoked: source.revoked === true,
    deleted: source.deleted === true,
    lineage: { ...lineage, schema_revision: SCHEMA_REVISION },
    schema_org: {
      ...schemaOrgMetadata(dtype, id),
      ...explicitSchemaOrg
    },
    data: source.data && typeof source.data === "object" && !Array.isArray(source.data) ? source.data : {},
    extensions: source.extensions && typeof source.extensions === "object" && !Array.isArray(source.extensions)
      ? source.extensions
      : {}
  };
}

function createDocument(dtype, input = {}) {
  return normalizeDocument({ ...input, dtype }, { dtype });
}

function createRelation(input = {}) {
  const {
    subject: explicitSubject,
    source,
    object: explicitObject,
    target,
    predicate: explicitPredicate,
    relation_type: relationType,
    directed,
    data = {},
    ...envelope
  } = input;
  const subject = explicitSubject || source;
  const object = explicitObject || target;
  const predicate = explicitPredicate || relationType || "related-to";
  return createDocument("relation", {
    ...envelope,
    title: envelope.title || `${subject || "unknown"} ${predicate} ${object || "unknown"}`,
    data: {
      ...data,
      subject,
      predicate,
      object,
      directed: directed ?? true
    }
  });
}

function touchDocument(document, changes = {}, now = nowIso()) {
  return normalizeDocument({
    ...clone(document),
    ...clone(changes),
    version: Math.max(1, Number(document?.version || 1) + 1),
    date_updated: now
  });
}

function isStarIntelDocument(value) {
  return Boolean(value && typeof value === "object" && value._id && value.dtype && value.data);
}

function documentLabel(document) {
  return document?.title
    || document?.data?.display_name
    || document?.data?.full_name
    || document?.data?.name
    || document?.data?.domain
    || document?.data?.url
    || document?.data?.target
    || document?._id
    || "Untitled document";
}

module.exports = {
  SCHEMA_VERSION,
  SCHEMA_REVISION,
  SCHEMA_PROFILE,
  SCHEMA_PROFILE_VERSION,
  SCHEMA_URI,
  CANONICAL_DTYPES,
  DTYPE_ALIASES,
  canonicalDtype,
  stableDocumentId,
  makeDocumentId,
  normalizeDocument,
  createDocument,
  createRelation,
  touchDocument,
  isStarIntelDocument,
  documentLabel
};
