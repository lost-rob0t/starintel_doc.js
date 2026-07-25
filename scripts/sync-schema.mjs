import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const repository = process.env.STARINTEL_SCHEMA_REPOSITORY || "lost-rob0t/starintel-gpt-auto-dig";
const requestedRef = process.env.STARINTEL_SCHEMA_REF || "main";
const fallbackRef = process.env.STARINTEL_SCHEMA_FALLBACK_REF || "agent/starintel-v0.9-field-expansion";
const offline = process.argv.includes("--offline");
const check = process.argv.includes("--check");

const files = [
  "starintel-doc-v0.9.0.schema.json",
  "starintel-doc-v0.9.0.expansion.json",
  "starintel-doc-v0.9.0.manifest.json"
];

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function canonicalHash(value) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

async function readLocal(name) {
  return readFile(resolve("schema", name), "utf8");
}

async function verifyPayloads(payloads) {
  const expansion = JSON.parse(payloads.get("starintel-doc-v0.9.0.expansion.json"));
  const manifest = JSON.parse(payloads.get("starintel-doc-v0.9.0.manifest.json"));
  const actualHash = canonicalHash(expansion);

  if (manifest.schema_version !== expansion.schema_version) throw new Error("schema bundle version mismatch");
  if (manifest.schema_revision !== expansion.schema_revision) throw new Error("schema bundle revision mismatch");
  if (manifest.profile !== expansion.profile || manifest.profile_version !== expansion.profile_version) {
    throw new Error("schema bundle profile mismatch");
  }
  if (manifest.expansion_content_hash !== actualHash) {
    throw new Error(`schema bundle hash mismatch: expected ${manifest.expansion_content_hash}, got ${actualHash}`);
  }
  if (manifest.dtype_count !== Object.keys(expansion.dtype_fields || {}).length) {
    throw new Error("schema bundle dtype count mismatch");
  }
}

async function fetchFile(name, refs) {
  let lastError = null;
  for (const ref of refs) {
    const url = `https://raw.githubusercontent.com/${repository}/${ref}/schemas/${name}`;
    try {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const payload = `${JSON.stringify(await response.json(), null, 2)}\n`;
      return { payload, ref };
    } catch (error) {
      lastError = new Error(`failed to fetch ${name} from ${ref}: ${error.message}`);
    }
  }
  throw lastError;
}

async function localPayloads() {
  return new Map(await Promise.all(files.map(async (name) => [name, await readLocal(name)])));
}

if (offline) {
  const payloads = await localPayloads();
  await verifyPayloads(payloads);
  console.log("local StarIntel v0.9 schema bundle verified");
  process.exit(0);
}

const refs = requestedRef === fallbackRef ? [requestedRef] : [requestedRef, fallbackRef];
const fetched = new Map();
for (const name of files) {
  const result = await fetchFile(name, refs);
  fetched.set(name, result.payload);
  console.log(`fetched ${name} from ${result.ref}`);
}
await verifyPayloads(fetched);

if (check) {
  let drift = false;
  for (const name of files) {
    let current = "";
    try { current = await readLocal(name); } catch {}
    if (current !== fetched.get(name)) {
      console.error(`schema drift detected: schema/${name}`);
      drift = true;
    }
  }
  if (drift) process.exitCode = 1;
  else console.log("canonical StarIntel v0.9 schema bundle is current");
} else {
  await mkdir(resolve("schema"), { recursive: true });
  for (const name of files) {
    const output = resolve("schema", name);
    const temporary = `${output}.tmp-${process.pid}`;
    await writeFile(temporary, fetched.get(name), "utf8");
    await rename(temporary, output);
    console.log(`wrote ${output}`);
  }
}
