import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const lock = JSON.parse(await readFile(resolve("schema", "starintel-schema.lock.json"), "utf8"));
const repository = process.env.STARINTEL_SCHEMA_REPOSITORY || lock.canonical_repository;
const canonicalRef = process.env.STARINTEL_SCHEMA_REF || lock.canonical_commit;
const baseSchemaRef = process.env.STARINTEL_BASE_SCHEMA_REF || canonicalRef;
const expansionRef = process.env.STARINTEL_EXPANSION_REF || canonicalRef;
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
  const schema = JSON.parse(payloads.get("starintel-doc-v0.9.0.schema.json"));
  const expansion = JSON.parse(payloads.get("starintel-doc-v0.9.0.expansion.json"));
  const manifest = JSON.parse(payloads.get("starintel-doc-v0.9.0.manifest.json"));
  const actualHash = canonicalHash(expansion);
  const researchBranch = (schema.allOf || []).find(
    (branch) => branch?.if?.properties?.dtype?.const === "research-node"
  );
  const operationBranch = (schema.allOf || []).find(
    (branch) => branch?.if?.properties?.dtype?.const === "operation"
  );

  if (!researchBranch) throw new Error("canonical schema does not contain research-node");
  if (!operationBranch) throw new Error("canonical schema does not contain operation");
  if (!expansion.dtype_fields?.["research-node"]) throw new Error("schema expansion does not contain research-node");
  if (!expansion.dtype_fields?.operation) throw new Error("schema expansion does not contain operation");
  if (manifest.schema_version !== expansion.schema_version) throw new Error("schema bundle version mismatch");
  if (manifest.schema_revision !== expansion.schema_revision) throw new Error("schema bundle revision mismatch");
  if (manifest.profile !== expansion.profile || manifest.profile_version !== expansion.profile_version) {
    throw new Error("schema bundle profile mismatch");
  }
  if (manifest.release_version !== lock.release_version) {
    throw new Error(`schema bundle release mismatch: expected ${lock.release_version}, got ${manifest.release_version}`);
  }
  if (manifest.expansion_content_hash !== actualHash) {
    throw new Error(`schema bundle hash mismatch: expected ${manifest.expansion_content_hash}, got ${actualHash}`);
  }
  if (manifest.dtype_count !== Object.keys(expansion.dtype_fields || {}).length) {
    throw new Error("schema bundle dtype count mismatch");
  }
}

async function fetchFile(name, ref) {
  const url = `https://raw.githubusercontent.com/${repository}/${ref}/schemas/${name}`;
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`failed to fetch ${name} from ${ref}: ${response.status} ${response.statusText}`);
  return `${JSON.stringify(await response.json(), null, 2)}\n`;
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

const fetched = new Map();
for (const name of files) {
  const ref = name.endsWith("schema.json") ? baseSchemaRef : expansionRef;
  fetched.set(name, await fetchFile(name, ref));
  console.log(`fetched ${name} from ${ref}`);
}
await verifyPayloads(fetched);

if (check) {
  let drift = false;
  for (const name of files) {
    let current = "";
    try {
      current = await readLocal(name);
    } catch {
      // Missing local files are drift.
    }
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
