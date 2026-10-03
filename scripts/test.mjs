import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const files = readdirSync("test").filter(file => file.endsWith(".test.js")).sort();
const result = spawnSync(process.execPath, ["--test", ...files.map(file => `test/${file}`)],
                         { stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
