#!/usr/bin/env node
// Validate every .buttons file in examples/ and test-configs/.
// Usage: node scripts/validate-examples.js

const TOML = require("@iarna/toml");
const fs = require("fs");
const path = require("path");
const { validateDocument } = require("../dist/config/configHelpers");

let pass = 0;
let fail = 0;

function check(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      check(fp);
      continue;
    }
    if (entry.name !== ".buttons") continue;
    try {
      const doc = TOML.parse(fs.readFileSync(fp, "utf8"));
      const errors = validateDocument(doc).filter((d) => d.severity === "error");
      if (errors.length) {
        console.log("FAIL", fp);
        errors.forEach((e) => console.log("    ", e.message));
        fail++;
      } else {
        console.log("  OK", fp);
        pass++;
      }
    } catch (e) {
      console.log("PARSE ERROR", fp);
      console.log("    ", e.message);
      fail++;
    }
  }
}

check("./examples");
check("./test-configs");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
