export type * from "./canonical-types.js";
export const SPEC_VERSION: "0.10.1";
export const dtypes: string[];
export function parseJson(text: string): unknown;
export function stringifyJson(value: unknown): string;
export function validateDocument(document: unknown): { valid: boolean; document: unknown; errors: unknown[] };
export function assertDocument<T>(document: T): T;
export function roundtrip<T>(document: T): T;
export function createDocument(dtype: string, fields: Record<string, unknown>): Record<string, unknown>;

export const ADAPTER_VERSION: number;
export const schema: { $id: string; $defs: Record<string, unknown> };
export const manifest: Record<string, unknown>;
export const documentTypes: Record<string, string>;
export const validateRawDocument: typeof validateDocument;
export const assertRawDocument: typeof assertDocument;
export function capabilities(): Record<string, unknown>;

declare const runtime: {
  SPEC_VERSION: typeof SPEC_VERSION;
  ADAPTER_VERSION: typeof ADAPTER_VERSION;
  dtypes: typeof dtypes;
  schema: typeof schema;
  manifest: typeof manifest;
  documentTypes: typeof documentTypes;
  parseJson: typeof parseJson;
  stringifyJson: typeof stringifyJson;
  validateDocument: typeof validateDocument;
  validateRawDocument: typeof validateRawDocument;
  assertDocument: typeof assertDocument;
  assertRawDocument: typeof assertRawDocument;
  roundtrip: typeof roundtrip;
  createDocument: typeof createDocument;
  capabilities: typeof capabilities;
  workflowMappings: typeof workflowMappings;
};
export default runtime;

export const workflowMappings: { contracts: Record<string, { fields: Record<string, string>; required: string[] }> };
