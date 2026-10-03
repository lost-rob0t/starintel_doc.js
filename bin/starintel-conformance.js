#!/usr/bin/env node
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const input = fs.readFileSync(0, "utf8");
const request = JSON.parse(input);
const entry = request.spec_version === "0.9.0" ? "starintel-legacy-conformance.js" : "starintel-canonical.js";
const response = spawnSync(process.execPath, [require("node:path").join(__dirname, entry)], { input, encoding: "utf8" });
process.stdout.write(response.stdout || "");
process.stderr.write(response.stderr || "");
process.exitCode = response.status ?? 2;
