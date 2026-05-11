#!/usr/bin/env node
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");
const script = resolve(__dirname, "../scripts/run-extractor.ts");

const result = spawnSync(process.execPath, [tsxCli, script, ...process.argv.slice(2)], {
  stdio: "inherit",
});

process.exitCode = result.status ?? 1;
