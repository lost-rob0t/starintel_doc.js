#!/usr/bin/env node
const fs = require("node:fs");
const runtime = require("../src/canonical");
let status = 0, response;
try {
  const request = runtime.parseJson(fs.readFileSync(0, "utf8"));
  if (request.spec_version && request.spec_version !== runtime.SPEC_VERSION)
    throw new TypeError("unsupported_spec_version");
  if (request.command === "version")
    response = { ok: true, language: "js", spec_version: runtime.SPEC_VERSION, adapter_version: runtime.ADAPTER_VERSION };
  else if (request.command === "capabilities") response = { ok: true, ...runtime.capabilities() };
  else if (request.command === "schema-inventory") response = { ok: true, inventory: runtime.documentTypes };
  else if (request.command === "validate") {
    runtime.assertDocument(request.document);
    response = { ok: true, spec_version: runtime.SPEC_VERSION };
  } else if (request.command === "roundtrip")
    response = { ok: true, spec_version: runtime.SPEC_VERSION, document: runtime.roundtrip(request.document) };
  else throw new TypeError("unsupported command");
} catch (error) {
  status = 1;
  response = { ok: false, error: error.message, errors: error.errors };
}
process.stdout.write(runtime.stringifyJson(response) + "\n");
process.exitCode = status;
