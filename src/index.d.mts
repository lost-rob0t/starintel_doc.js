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
