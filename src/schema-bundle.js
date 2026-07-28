const { createHash } = require("node:crypto");

const baseSchema = require("../schema/starintel-doc-v0.9.0.schema.json");
const expansion = require("../schema/starintel-doc-v0.9.0.expansion.json");
const manifest = require("../schema/starintel-doc-v0.9.0.manifest.json");

const STR = Object.freeze({ type: "string" });
const STRS = Object.freeze({ type: "array", items: STR });
const NUM = Object.freeze({ type: "number" });
const INT = Object.freeze({ type: "integer" });
const BOOL = Object.freeze({ type: "boolean" });
const SCORE = Object.freeze({ type: "number", minimum: 0, maximum: 1 });
const DATE_TIME = Object.freeze({ type: "string", format: "date-time" });
const NULLABLE_DATE_TIME = Object.freeze({ anyOf: [DATE_TIME, { type: "null" }] });
const JSON_MAP = Object.freeze({ type: "object", additionalProperties: true });

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function array(items) {
  return { type: "array", items };
}

function object(properties, required = []) {
  const schema = { type: "object", properties, additionalProperties: false };
  if (required.length) schema.required = required;
  return schema;
}

const IDENTIFIER = object({
  scheme: STR,
  value: STR,
  issuer: STR,
  jurisdiction: STR,
  canonical: BOOL,
  confidence: SCORE,
  valid_from: NULLABLE_DATE_TIME,
  valid_to: NULLABLE_DATE_TIME,
  url: STR,
  notes: STR
}, ["scheme", "value"]);

const REFERENCE = object({
  id: STR,
  dtype: STR,
  role: STR,
  label: STR,
  dataset: STR,
  schema_version: STR,
  external_ids: array(IDENTIFIER),
  unresolved: BOOL,
  confidence: SCORE,
  valid_from: NULLABLE_DATE_TIME,
  valid_to: NULLABLE_DATE_TIME,
  qualifiers: JSON_MAP
}, ["id"]);

const EXTERNAL_REFERENCE = object({
  source_name: STR,
  external_id: STR,
  url: STR,
  description: STR,
  hashes: { type: "object", additionalProperties: STR },
  retrieved_at: NULLABLE_DATE_TIME,
  archived_url: STR,
  license: STR
}, ["source_name"]);

const MONEY = object({
  amount: NUM,
  currency: STR,
  basis: STR,
  as_of: NULLABLE_DATE_TIME,
  low: NUM,
  high: NUM,
  estimated: BOOL,
  method: STR,
  source_ids: STRS
}, ["amount", "currency"]);

const MEASUREMENT = object({
  value: {},
  unit: STR,
  datatype: STR,
  low: NUM,
  high: NUM,
  uncertainty: NUM,
  precision: STR,
  method: STR,
  instrument_id: STR
}, ["value"]);

const STATUS_CHANGE = object({
  status: STR,
  changed_at: NULLABLE_DATE_TIME,
  changed_by: STR,
  reason: STR,
  source_ids: STRS
}, ["status"]);

const ROLE_ASSIGNMENT = object({
  subject_id: STR,
  role: STR,
  organization_id: STR,
  context_id: STR,
  title: STR,
  department: STR,
  start_at: NULLABLE_DATE_TIME,
  end_at: NULLABLE_DATE_TIME,
  current: BOOL,
  source_ids: STRS,
  confidence: SCORE
}, ["role"]);

const FACET = object({
  facet_type: STR,
  schema: STR,
  version: STR,
  properties: JSON_MAP,
  source_ids: STRS,
  evidence_ids: STRS,
  confidence: SCORE
}, ["facet_type", "properties"]);

const ACTION = object({
  action_type: STR,
  actor_ids: STRS,
  object_ids: STRS,
  instrument_ids: STRS,
  started_at: NULLABLE_DATE_TIME,
  completed_at: NULLABLE_DATE_TIME,
  status: STR,
  result_ids: STRS,
  parameters: JSON_MAP,
  source_ids: STRS
}, ["action_type"]);

const NETWORK_INTERFACE = object({
  name: STR,
  mac: STR,
  ipv4: STRS,
  ipv6: STRS,
  network_ids: STRS,
  vlan: INT,
  mtu: INT,
  status: STR
});

const NETWORK_SERVICE = object({
  service_id: STR,
  name: STR,
  transport: STR,
  protocol: STR,
  port: INT,
  product: STR,
  version: STR,
  banner: STR,
  tls: BOOL,
  certificate_ids: STRS,
  first_seen: NULLABLE_DATE_TIME,
  last_seen: NULLABLE_DATE_TIME,
  source_ids: STRS
}, ["port"]);

const CERTIFICATE = object({
  fingerprint: STR,
  serial_number: STR,
  subject: STR,
  issuer: STR,
  subject_alt_names: STRS,
  not_before: NULLABLE_DATE_TIME,
  not_after: NULLABLE_DATE_TIME,
  signature_algorithm: STR,
  public_key_algorithm: STR,
  pem_hash: STR,
  revoked: BOOL,
  source_ids: STRS
}, ["fingerprint"]);

const DNS_RECORD = object({
  name: STR,
  record_type: STR,
  value: STR,
  ttl: INT,
  priority: INT,
  observed_at: NULLABLE_DATE_TIME,
  resolver: STR,
  source_ids: STRS
}, ["record_type", "value"]);

const HTTP_EXCHANGE = object({
  method: STR,
  request_url: STR,
  request_headers: { type: "object", additionalProperties: STR },
  request_body_hash: STR,
  status_code: INT,
  response_headers: { type: "object", additionalProperties: STR },
  response_body_hash: STR,
  content_type: STR,
  started_at: NULLABLE_DATE_TIME,
  completed_at: NULLABLE_DATE_TIME,
  redirect_location: STR,
  source_ids: STRS
});

const MESSAGE_REACTION = object({
  reaction: STR,
  actor_id: STR,
  count: INT,
  reacted_at: NULLABLE_DATE_TIME,
  removed: BOOL
}, ["reaction"]);

const CONTRACT_MODIFICATION = object({
  modification_id: STR,
  number: STR,
  effective_at: NULLABLE_DATE_TIME,
  signed_at: NULLABLE_DATE_TIME,
  description: STR,
  change_type: STR,
  amount_change: MONEY,
  new_end_at: NULLABLE_DATE_TIME,
  source_ids: STRS
}, ["modification_id"]);

const DOCKET_ENTRY = object({
  entry_number: STR,
  filed_at: NULLABLE_DATE_TIME,
  entry_type: STR,
  title: STR,
  description: STR,
  document_ids: STRS,
  party_ids: STRS,
  source_ids: STRS
}, ["entry_number"]);

const RESEARCH_FINDING = object({
  finding_id: STR,
  statement: STR,
  finding_type: STR,
  subject_ids: STRS,
  supporting_ids: STRS,
  contradicting_ids: STRS,
  confidence: SCORE,
  verification_status: STR,
  open_questions: STRS,
  notes: STR
}, ["statement"]);

const MANIFEST_FILE = object({
  path: STR,
  media_type: STR,
  size_bytes: INT,
  record_count: INT,
  content_hash: STR,
  hash_algorithm: STR,
  schema_revision: STR,
  generated_at: NULLABLE_DATE_TIME
}, ["path", "content_hash"]);

const QUERY_SPEC = object({
  query: STR,
  language: STR,
  source: STR,
  parameters: JSON_MAP,
  expected_dtypes: STRS,
  required: BOOL,
  status: STR,
  result_ids: STRS
}, ["query"]);

const DEFINITIONS = Object.freeze({
  reference: REFERENCE,
  externalReference: EXTERNAL_REFERENCE,
  money: MONEY,
  measurement: MEASUREMENT,
  statusChange: STATUS_CHANGE,
  roleAssignment: ROLE_ASSIGNMENT,
  facet: FACET,
  action: ACTION,
  networkService: NETWORK_SERVICE,
  certificate: CERTIFICATE,
  dnsRecord: DNS_RECORD,
  httpExchange: HTTP_EXCHANGE,
  contractModification: CONTRACT_MODIFICATION,
  docketEntry: DOCKET_ENTRY,
  researchFinding: RESEARCH_FINDING,
  manifestFile: MANIFEST_FILE,
  querySpec: QUERY_SPEC
});

const TYPED_SCHEMAS = Object.freeze({
  "integer[]": array(INT),
  "number[]": array(NUM),
  "certificate[]": array(CERTIFICATE),
  "dnsRecord[]": array(DNS_RECORD),
  "docketEntry[]": array(DOCKET_ENTRY),
  "externalReference[]": array(EXTERNAL_REFERENCE),
  "facet[]": array(FACET),
  "manifestFile[]": array(MANIFEST_FILE),
  "researchFinding[]": array(RESEARCH_FINDING),
  stringMap: { type: "object", additionalProperties: STR },
  "httpExchange[]": array(HTTP_EXCHANGE),
  "networkInterface[]": array(NETWORK_INTERFACE),
  measurement: MEASUREMENT,
  "contractModification[]": array(CONTRACT_MODIFICATION),
  "querySpec[]": array(QUERY_SPEC),
  "messageReaction[]": array(MESSAGE_REACTION),
  "networkService[]": array(NETWORK_SERVICE),
  statusChange: STATUS_CHANGE
});

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function expansionHash(value = expansion) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function verifyBundle() {
  if (manifest.schema_version !== expansion.schema_version) throw new Error("StarIntel schema bundle version mismatch");
  if (manifest.schema_revision !== expansion.schema_revision) throw new Error("StarIntel schema bundle revision mismatch");
  if (manifest.profile !== expansion.profile || manifest.profile_version !== expansion.profile_version) {
    throw new Error("StarIntel schema bundle profile mismatch");
  }
  const actual = expansionHash();
  if (actual !== manifest.expansion_content_hash) {
    throw new Error(`StarIntel expansion hash mismatch: expected ${manifest.expansion_content_hash}, got ${actual}`);
  }
  if (Object.keys(expansion.dtype_fields).length !== manifest.dtype_count) {
    throw new Error("StarIntel schema bundle dtype count mismatch");
  }
  return true;
}

function membership(name, key) {
  return expansion.field_kinds[key]?.includes(name) || false;
}

function schemaForField(name) {
  const typed = expansion.field_kinds.typed[name];
  if (typed) return clone(TYPED_SCHEMAS[typed]);
  if (membership(name, "identifier_array")) return array(clone(IDENTIFIER));
  if (membership(name, "reference_array")) return array(clone(REFERENCE));
  if (membership(name, "money")) return clone(MONEY);
  if (membership(name, "money_array")) return array(clone(MONEY));
  if (membership(name, "facet_array")) return array(clone(FACET));
  if (membership(name, "role_array")) return array(clone(ROLE_ASSIGNMENT));
  if (membership(name, "action_array")) return array(clone(ACTION));
  if (membership(name, "boolean")) return clone(BOOL);
  if (membership(name, "score")) return clone(SCORE);
  if (membership(name, "number")) return clone(NUM);
  if (membership(name, "integer") || name.endsWith("_count") || name.endsWith("_depth")) return clone(INT);
  if (membership(name, "json") || name === "attributes") return name === "raw_value" ? {} : clone(JSON_MAP);
  if (name.endsWith("_at") || name.endsWith("_date") || ["valid_from", "valid_to"].includes(name)) {
    return clone(NULLABLE_DATE_TIME);
  }
  if (name.endsWith("_ids") || membership(name, "string_array")) return clone(STRS);
  return clone(STR);
}

function mergeProperties(target, names) {
  target.properties ||= {};
  for (const name of names) {
    if (!(name in target.properties)) target.properties[name] = schemaForField(name);
  }
}

function materializeSchema(schema = baseSchema, registry = expansion) {
  verifyBundle();
  const output = clone(schema);
  output.properties ||= {};

  const topLevelSchemas = {
    schema_revision: { const: registry.schema_revision },
    schema_uri: { const: output.$id },
    profile: STR,
    profile_version: STR,
    content_hash: STR,
    hash_algorithm: STR,
    revoked: BOOL,
    deleted: BOOL,
    tombstone_reason: STR,
    created_by_ref: STR,
    modified_by_ref: STR,
    object_marking_ids: STRS
  };
  for (const name of registry.top_level_fields) {
    if (!(name in output.properties)) output.properties[name] = clone(topLevelSchemas[name]);
  }

  const nestedAdditions = [
    ["provenance", registry.provenance_fields],
    ["lineage", registry.lineage_fields],
    ["verification", registry.verification_fields]
  ];
  for (const [property, names] of nestedAdditions) {
    const nested = output.properties[property];
    if (nested?.properties) mergeProperties(nested, names);
  }

  for (const variant of output.allOf || []) {
    const dtype = variant.if?.properties?.dtype?.const;
    const dataSchema = variant.then?.properties?.data;
    if (!dtype || !dataSchema || !registry.dtype_fields[dtype]) continue;
    mergeProperties(dataSchema, registry.common_data_fields);
    mergeProperties(dataSchema, registry.dtype_fields[dtype]);
  }

  output.$comment = "StarIntel v0.9 additive field expansion. Existing v0.9 documents remain valid; schema_revision identifies the exact contract used for newly emitted records.";
  output["x-starintel-schema-revision"] = registry.schema_revision;
  output["x-starintel-profile"] = registry.profile;
  output["x-starintel-profile-version"] = registry.profile_version;
  output.$defs = clone(DEFINITIONS);
  return output;
}

function fieldNamesForDtype(dtype) {
  const fields = expansion.dtype_fields[dtype];
  if (!fields) throw new RangeError(`unknown StarIntel dtype: ${dtype}`);
  return [...new Set([...expansion.common_data_fields, ...fields])].sort();
}

module.exports = {
  baseSchema,
  expansion,
  manifest,
  canonicalJson,
  expansionHash,
  verifyBundle,
  materializeSchema,
  fieldNamesForDtype,
  schemaForField
};
