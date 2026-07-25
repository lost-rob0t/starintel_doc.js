import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const source = process.env.STARINTEL_SCHEMA_URL
  || "https://raw.githubusercontent.com/lost-rob0t/starintel-gpt-auto-dig/main/schemas/starintel-doc-v0.9.0.schema.json";
const output = resolve("schema/starintel-doc-v0.9.0.schema.json");
const check = process.argv.includes("--check");

const response = await fetch(source, { headers: { accept: "application/json" } });
if (!response.ok) throw new Error(`schema download failed: ${response.status} ${response.statusText}`);
const text = `${JSON.stringify(await response.json(), null, 2)}\n`;

if (check) {
  let current = "";
  try { current = await readFile(output, "utf8"); } catch {}
  if (current !== text) {
    console.error(`schema drift detected: ${output}`);
    process.exitCode = 1;
  } else {
    console.log("canonical StarIntel v0.9 schema is current");
  }
} else {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, text);
  console.log(`wrote ${output}`);
}
