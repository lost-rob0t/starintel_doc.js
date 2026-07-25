import { spawnSync } from "node:child_process";

const tests = [
  ["test/document.test.js", "normalizes the canonical"],
  ["test/document.test.js", "supports every canonical"],
  ["test/document.test.js", "supports expanded names"],
  ["test/document.test.js", "creates schema-valid"],
  ["test/document.test.js", "accepts strict Schema.org"],
  ["test/document.test.js", "rejects undeclared direct Schema.org"],
  ["test/document.test.js", "rejects unknown top-level"],
  ["test/v09-conformance.test.js", "schema expansion manifest verifies"],
  ["test/v09-conformance.test.js", "all dtypes expose additive fields"],
  ["test/v09-conformance.test.js", "normalized documents carry revisioned required fields"],
  ["test/v09-conformance.test.js", "expanded dtype metadata validates"],
  ["test/v09-conformance.test.js", "stable ids are deterministic"]
];

for (const [file, pattern] of tests) {
  const result = spawnSync(
    process.execPath,
    ["--test", `--test-name-pattern=${pattern}`, file],
    { stdio: "inherit" }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
