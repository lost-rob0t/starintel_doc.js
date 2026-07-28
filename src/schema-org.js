const SCHEMA_ORG_CONTEXT = "https://schema.org/";

const DTYPE_SCHEMA_ORG_TYPES = Object.freeze({
  "actor-manifest": ["CreativeWork"],
  address: ["PostalAddress"],
  alert: ["SpecialAnnouncement"],
  analysis: ["CreativeWork"],
  asset: ["Thing"],
  breach: ["Event"],
  "campaign-finance": ["CreativeWork"],
  claim: ["Claim"],
  concept: ["DefinedTerm"],
  contract: ["DigitalDocument"],
  "dataset-manifest": ["Dataset"],
  document: ["CreativeWork"],
  domain: ["WebSite"],
  education: ["EducationalOccupationalCredential"],
  email: ["ContactPoint"],
  "email-message": ["Message"],
  employment: ["OrganizationRole"],
  entity: ["Thing"],
  event: ["Event"],
  "evidence-record": ["CreativeWork"],
  file: ["DigitalDocument"],
  "financial-observation": ["CreativeWork"],
  geo: ["GeoCoordinates"],
  grant: ["Grant"],
  host: ["Thing"],
  "investigation-target": ["Thing"],
  "legal-case": ["CreativeWork"],
  "lobbying-filing": ["DigitalDocument"],
  location: ["Place"],
  media: ["MediaObject"],
  meeting: ["Event"],
  message: ["Message"],
  network: ["Thing"],
  observation: ["CreativeWork"],
  org: ["Organization"],
  ownership: ["Role"],
  person: ["Person"],
  phone: ["ContactPoint"],
  policy: ["CreativeWork"],
  procurement: ["DigitalDocument"],
  product: ["Product"],
  relation: ["Role"],
  "research-node": ["Action"],
  "research-pass": ["CreativeWork"],
  "social-media-post": ["SocialMediaPosting"],
  source: ["CreativeWork"],
  target: ["Thing"],
  task: ["Action"],
  url: ["WebPage"],
  user: ["Person"]
});

const stringSchema = Object.freeze({ type: "string" });
const stringsSchema = Object.freeze({ type: "array", items: stringSchema });
const stringOrStringsSchema = Object.freeze({ anyOf: [stringSchema, stringsSchema] });
const jsonMapSchema = Object.freeze({ type: "object", additionalProperties: true });

const identifierSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["value"],
  properties: {
    "@type": stringSchema,
    propertyID: stringSchema,
    value: {},
    url: stringSchema,
    name: stringSchema,
    description: stringSchema
  }
});

const referenceSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  properties: {
    "@id": stringSchema,
    "@type": stringOrStringsSchema,
    name: stringSchema,
    description: stringSchema,
    url: stringSchema,
    sameAs: stringOrStringsSchema,
    identifier: {
      anyOf: [
        stringSchema,
        identifierSchema,
        { type: "array", items: { anyOf: [stringSchema, identifierSchema] } }
      ]
    }
  }
});

const referenceOrReferencesSchema = Object.freeze({
  anyOf: [
    stringSchema,
    referenceSchema,
    { type: "array", items: { anyOf: [stringSchema, referenceSchema] } }
  ]
});

const propertyValueSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["name", "value"],
  properties: {
    "@type": stringSchema,
    propertyID: stringSchema,
    name: stringSchema,
    value: {},
    unitCode: stringSchema,
    unitText: stringSchema,
    valueReference: { anyOf: [stringSchema, referenceSchema] },
    url: stringSchema,
    description: stringSchema
  }
});

const postalAddressSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  properties: {
    "@type": stringSchema,
    streetAddress: stringSchema,
    postOfficeBoxNumber: stringSchema,
    addressLocality: stringSchema,
    addressRegion: stringSchema,
    postalCode: stringSchema,
    addressCountry: { anyOf: [stringSchema, referenceSchema] }
  }
});

const geoSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  properties: {
    "@type": stringSchema,
    latitude: { type: "number" },
    longitude: { type: "number" },
    elevation: { type: "number" },
    postalCode: stringSchema,
    addressCountry: stringSchema
  }
});

const schemaOrgSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  properties: {
    "@context": stringOrStringsSchema,
    "@type": stringOrStringsSchema,
    "@id": stringSchema,
    additionalType: stringOrStringsSchema,
    name: stringSchema,
    alternateName: stringOrStringsSchema,
    description: stringSchema,
    disambiguatingDescription: stringSchema,
    url: stringSchema,
    sameAs: stringOrStringsSchema,
    identifier: {
      anyOf: [
        stringSchema,
        identifierSchema,
        { type: "array", items: { anyOf: [stringSchema, identifierSchema] } }
      ]
    },
    image: referenceOrReferencesSchema,
    logo: referenceOrReferencesSchema,
    mainEntity: referenceOrReferencesSchema,
    mainEntityOfPage: referenceOrReferencesSchema,
    subjectOf: referenceOrReferencesSchema,
    about: referenceOrReferencesSchema,
    mentions: referenceOrReferencesSchema,
    isPartOf: referenceOrReferencesSchema,
    hasPart: referenceOrReferencesSchema,
    isBasedOn: referenceOrReferencesSchema,
    citation: referenceOrReferencesSchema,
    supportingData: referenceOrReferencesSchema,
    associatedMedia: referenceOrReferencesSchema,
    encoding: referenceOrReferencesSchema,
    creator: referenceOrReferencesSchema,
    author: referenceOrReferencesSchema,
    publisher: referenceOrReferencesSchema,
    provider: referenceOrReferencesSchema,
    contributor: referenceOrReferencesSchema,
    copyrightHolder: referenceOrReferencesSchema,
    funder: referenceOrReferencesSchema,
    sponsor: referenceOrReferencesSchema,
    organizer: referenceOrReferencesSchema,
    participant: referenceOrReferencesSchema,
    memberOf: referenceOrReferencesSchema,
    affiliation: referenceOrReferencesSchema,
    parentOrganization: referenceOrReferencesSchema,
    subOrganization: referenceOrReferencesSchema,
    contactPoint: referenceOrReferencesSchema,
    location: referenceOrReferencesSchema,
    contentLocation: referenceOrReferencesSchema,
    spatialCoverage: referenceOrReferencesSchema,
    address: { anyOf: [stringSchema, postalAddressSchema] },
    geo: geoSchema,
    dateCreated: stringSchema,
    dateModified: stringSchema,
    datePublished: stringSchema,
    startDate: stringSchema,
    endDate: stringSchema,
    temporalCoverage: stringSchema,
    inLanguage: stringOrStringsSchema,
    license: referenceOrReferencesSchema,
    copyrightNotice: stringSchema,
    copyrightYear: { type: "integer" },
    keywords: stringOrStringsSchema,
    jobTitle: stringOrStringsSchema,
    knowsAbout: referenceOrReferencesSchema,
    knowsLanguage: stringOrStringsSchema,
    potentialAction: { anyOf: [jsonMapSchema, { type: "array", items: jsonMapSchema }] },
    additionalProperty: { type: "array", items: propertyValueSchema },
    schemaVersion: stringSchema,
    sdDatePublished: stringSchema,
    sdLicense: referenceOrReferencesSchema,
    sdPublisher: referenceOrReferencesSchema,
    properties: jsonMapSchema
  }
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function schemaOrgTypes(dtype) {
  const canonical = String(dtype || "document").trim().toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
  return DTYPE_SCHEMA_ORG_TYPES[canonical] || ["Thing"];
}

function schemaOrgMetadata(dtype, documentId = "") {
  const types = schemaOrgTypes(dtype);
  const value = {
    "@context": SCHEMA_ORG_CONTEXT,
    "@type": types.length === 1 ? types[0] : types.slice(),
    additionalType: `https://starintel.dev/dtype/${String(dtype || "document").trim().toLowerCase().replaceAll("_", "-")}`
  };
  if (documentId) value["@id"] = documentId;
  return value;
}

function augmentSchema(schema) {
  const expanded = clone(schema);
  expanded.properties = expanded.properties || {};
  expanded.properties.schema_org = clone(schemaOrgSchema);
  return expanded;
}

function label(document) {
  return document?.title
    || document?.data?.display_name
    || document?.data?.full_name
    || document?.data?.legal_name
    || document?.data?.name
    || document?.data?.claim
    || document?.data?.term
    || document?.data?.target
    || document?._id
    || "StarIntel record";
}

function identifierValues(document) {
  return Array.from(document?.identifiers || [], (identifier) => {
    if (!identifier || typeof identifier !== "object" || identifier.value == null) return null;
    const value = {
      "@type": "PropertyValue",
      propertyID: String(identifier.scheme || identifier.issuer || "identifier"),
      value: identifier.value
    };
    if (identifier.url) value.url = String(identifier.url);
    if (identifier.notes) value.description = String(identifier.notes);
    return value;
  }).filter(Boolean);
}

function toSchemaOrg(document) {
  const dtype = document?.dtype || "document";
  const data = document?.data && typeof document.data === "object" ? document.data : {};
  const explicit = document?.schema_org && typeof document.schema_org === "object" ? document.schema_org : {};
  const value = schemaOrgMetadata(dtype, document?._id || "");
  value.name = label(document);

  const description = document?.description || document?.summary || data.description;
  if (description) value.description = String(description);

  if (Array.isArray(document?.aliases) && document.aliases.length) value.alternateName = document.aliases.map(String);
  const keywords = [...(document?.keywords || []), ...(document?.tags || [])].map(String).filter(Boolean);
  if (keywords.length) value.keywords = [...new Set(keywords)];
  if (document?.language) value.inLanguage = String(document.language);
  if (document?.date_added) value.dateCreated = String(document.date_added);
  if (document?.date_updated) value.dateModified = String(document.date_updated);

  const identifiers = identifierValues(document);
  if (identifiers.length) value.identifier = identifiers;

  const url = data.url || data.website || data.uri;
  if (url) value.url = String(url);
  const image = data.image_url || data.logo_url;
  if (image) value.image = String(image);

  if (Array.isArray(document?.related_ids) && document.related_ids.length) {
    value.about = document.related_ids.map((id) => ({ "@id": String(id) }));
  }

  const geo = document?.geospatial;
  if (geo && geo.lat != null && (geo.lon != null || geo.long != null)) {
    value.geo = {
      "@type": "GeoCoordinates",
      latitude: geo.lat,
      longitude: geo.lon ?? geo.long
    };
  }

  return { ...value, ...clone(explicit) };
}

module.exports = {
  SCHEMA_ORG_CONTEXT,
  DTYPE_SCHEMA_ORG_TYPES,
  schemaOrgSchema,
  schemaOrgTypes,
  schemaOrgMetadata,
  augmentSchema,
  toSchemaOrg
};
