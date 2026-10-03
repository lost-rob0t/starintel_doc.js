export * from "../schemas/starintel-0.10.1/generated/starintel_types";
export const SPEC_VERSION: "0.10.1";
export const dtypes: string[];
export function parseJson(text: string): unknown;
export function stringifyJson(value: unknown): string;
export function validateDocument(document: unknown): { valid: boolean; document: unknown; errors: unknown[] };
export function assertDocument<T>(document: T): T;
export function roundtrip<T>(document: T): T;
export function createDocument(dtype: string, fields: Record<string, unknown>): Record<string, unknown>;
