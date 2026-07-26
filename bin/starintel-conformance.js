#!/usr/bin/env node

const fs = require("node:fs");
const {
  SPEC_VERSION,
  ADAPTER_VERSION,
  capabilities,
  parseLosslessJson,
  roundtrip,
  schemaInventory,
  stringifyLosslessJson,
  validateDocument,
} = require("../src/v090");

function emit(value) {
  process.stdout.write(`${stringifyLosslessJson(value)}\n`);
}

function main() {
  let request;
  try {
    request = parseLosslessJson(fs.readFileSync(0, "utf8"));
  } catch (error) {
    console.error(`javascript adapter failure: ${error.message}`);
    emit({ ok: false, error: "adapter_failure", message: error.message });
    return 2;
  }

  try {
    const command = request.command;
    if (command === "version") {
      emit({ ok: true, language: "js", spec_version: SPEC_VERSION, adapter_version: ADAPTER_VERSION });
      return 0;
    }
    if (command === "capabilities") {
      emit({ ok: true, ...capabilities() });
      return 0;
    }
    if (request.spec_version !== undefined && request.spec_version !== SPEC_VERSION) {
      emit({ ok: false, error: "unsupported_spec_version", message: String(request.spec_version) });
      return 3;
    }
    if (command === "schema-inventory") {
      emit({ ok: true, spec_version: SPEC_VERSION, inventory: schemaInventory() });
      return 0;
    }
    if (command === "validate") {
      const result = validateDocument(request.document);
      emit(result.ok ? { ok: true, spec_version: SPEC_VERSION, warnings: [] } : result);
      return result.ok ? 0 : result.unsupported ? 3 : 1;
    }
    if (command === "normalize" || command === "roundtrip") {
      const result = roundtrip(request.document);
      emit(result.ok ? { ok: true, spec_version: SPEC_VERSION, document: result.document, warnings: [] } : result);
      return result.ok ? 0 : result.unsupported ? 3 : 1;
    }
    throw new Error(`unsupported command: ${String(command)}`);
  } catch (error) {
    console.error(`javascript adapter failure: ${error.stack || error.message}`);
    emit({ ok: false, error: "adapter_failure", message: error.message });
    return 2;
  }
}

process.exitCode = main();
