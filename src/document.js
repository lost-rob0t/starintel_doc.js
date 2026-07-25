const SCHEMA_VERSION = "0.9.0";

const DTYPE_ALIASES = Object.freeze({
  organization: "org",
  organisation: "org",
  investigation_target: "investigation-target",
  social_media_post: "social-media-post",
  email_message: "email-message",
  financial_observation: "financial-observation",
  research_pass: "research-pass",
  dataset_manifest: "dataset-manifest",
  actor_manifest: "actor-manifest",
  legal_case: "legal-case",
  lobbying_filing: "lobbying-filing",
  campaign_finance: "campaign-finance"
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function canonicalDtype(dtype) {
  const value = String(dtype || "document").trim();
  return DTYPE_ALIASES[value] || value;
}

function slug(value) {
  return String(value || "document")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "document";
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function makeDocumentId(dtype, hint) {
  return `starintel:${canonicalDtype(dtype)}:${slug(hint || randomId())}`;
}

function normalizeDocument(input, options = {}) {
  const source = clone(input || {});
  const stamp = options.now || nowIso();
  const dtype = canonicalDtype(source.dtype || options.dtype || "document");
  const titleHint = source.title || source.data?.name || source.data?.full_name || source.data?.target;

  return {
    ...source,
    _id: source._id || options.id || makeDocumentId(dtype, titleHint),
    dataset: source.dataset || options.dataset || "default",
    dtype,
    schema_version: SCHEMA_VERSION,
    version: Number.isInteger(source.version) && source.version > 0 ? source.version : 1,
    date_added: source.date_added || stamp,
    date_updated: source.date_updated || stamp,
    sources: Array.isArray(source.sources) ? source.sources : [],
    evidence: Array.isArray(source.evidence) ? source.evidence : [],
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
  DTYPE_ALIASES,
  canonicalDtype,
  makeDocumentId,
  normalizeDocument,
  createDocument,
  createRelation,
  touchDocument,
  isStarIntelDocument,
  documentLabel
};
