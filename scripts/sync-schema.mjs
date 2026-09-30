import { createHash } from "node:crypto";
import { copyFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const lock = JSON.parse(await readFile(resolve("schema", "starintel-schema.lock.json"), "utf8"));
const releaseLock = JSON.parse(await readFile(resolve("schema", "starintel-0.10.1.release-lock.json"), "utf8"));
const canonicalRoot = process.env.STARLANG_ROOT;
const offline = process.argv.includes("--offline");
const check = process.argv.includes("--check");

const artifacts = [
  ["specs/starintel/0.10.1/generated/schema.json", "schema/starintel-0.10.1.schema.json", "schema.json"],
  ["specs/starintel/0.10.1/generated/portable-manifest.json", "schema/starintel-0.10.1.manifest.json", "portable-manifest.json"],
  ["specs/starintel/0.10.1/compatibility.json", "schema/starintel-0.10.1.compatibility.json", null],
  ["specs/starintel/0.10.1/compatibility-fixtures.json", "schema/starintel-0.10.1.compatibility-fixtures.json", null],
  ["specs/starintel/0.10.1/generated/starintel_types.ts", "types/generated.d.ts", "starintel_types.ts"]
];

function digest(data) {
  return createHash("sha256").update(data).digest("hex");
}

function expectedHash(source, artifactName) {
  if (artifactName) return releaseLock.artifacts[artifactName];
  const name = source.split("/").at(-1);
  return releaseLock.sources[name];
}

async function verifyLocal() {
  for (const [source, destination, artifactName] of artifacts) {
    const data = await readFile(resolve(destination));
    const expected = expectedHash(source, artifactName);
    if (!expected || digest(data) !== expected) throw new Error(`Star-Lang artifact drift: ${destination}`);
  }
  if (lock.release_version !== releaseLock.releaseVersion || lock.schema_version !== releaseLock.schemaVersion) {
    throw new Error("consumer lock disagrees with the Star-Lang release lock");
  }
  console.log(`Star-Lang ${lock.release_version} artifacts verified at ${lock.canonical_commit}`);
}

if (!offline && !canonicalRoot) {
  throw new Error("set STARLANG_ROOT to the pinned Star-Lang checkout, or use --offline --check");
}

if (canonicalRoot && !check) {
  for (const [source, destination] of artifacts) {
    await copyFile(resolve(canonicalRoot, source), resolve(destination));
  }
}

await verifyLocal();
