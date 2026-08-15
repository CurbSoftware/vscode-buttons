import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isScriptFileType,
  parseJustfileText,
  parseMakefileText,
  parsePackageJsonText,
  SCRIPT_FILE_TYPES,
  scriptCommand,
  scriptFileTypeOf,
  scriptKey,
  shouldIgnoreDir,
} from "../scanner/types";

describe("shouldIgnoreDir", () => {
  it("ignores installed-package, VCS, and build directories", () => {
    for (const name of ["node_modules", ".git", "dist", "build", "coverage", "vendor", ".venv", ".next"]) {
      assert.equal(shouldIgnoreDir(name), true, name);
    }
  });

  it("ignores any hidden directory", () => {
    assert.equal(shouldIgnoreDir(".cache"), true);
    assert.equal(shouldIgnoreDir(".anything"), true);
  });

  it("keeps normal project directories", () => {
    for (const name of ["src", "packages", "lib", "apps"]) {
      assert.equal(shouldIgnoreDir(name), false, name);
    }
  });
});

describe("scriptCommand", () => {
  it("maps each package manager to its runnable command", () => {
    assert.equal(scriptCommand("npm", "dev"), "npm run dev");
    assert.equal(scriptCommand("pnpm", "dev"), "pnpm dev");
    assert.equal(scriptCommand("yarn", "test"), "yarn test");
    assert.equal(scriptCommand("bun", "dev"), "bun dev");
    assert.equal(scriptCommand("make", "build"), "make build");
    assert.equal(scriptCommand("composer", "test"), "composer test");
    assert.equal(scriptCommand("just", "build"), "just build");
  });
});

describe("script file types", () => {
  it("recognizes supported file types", () => {
    assert.deepEqual(SCRIPT_FILE_TYPES, ["package.json", "Makefile", "composer.json", "justfile"]);
    assert.equal(isScriptFileType("package.json"), true);
    assert.equal(isScriptFileType("justfile"), true);
    assert.equal(isScriptFileType("pyproject.toml"), false);
  });

  it("derives the file type from a script's relative path", () => {
    assert.equal(scriptFileTypeOf({ file: "package.json" }), "package.json");
    assert.equal(scriptFileTypeOf({ file: "packages/api/composer.json" }), "composer.json");
    assert.equal(scriptFileTypeOf({ file: "Makefile" }), "Makefile");
  });
});

describe("scriptKey", () => {
  it("composes file and script into a stable key", () => {
    assert.equal(scriptKey({ file: "packages/api/package.json", script: "start" }), "packages/api/package.json:start");
  });
});

describe("parsePackageJsonText", () => {
  it("maps npm to `npm run` and captures description/icon", () => {
    const scripts = parsePackageJsonText(JSON.stringify({ scripts: { dev: "vite" } }), "package.json", "", "npm");
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].command, "npm run dev");
    assert.equal(scripts[0].description, "vite");
    assert.equal(scripts[0].packageDir, "");
    assert.equal(scripts[0].icon, "play");
  });

  it("maps pnpm and bun to a bare command", () => {
    assert.equal(parsePackageJsonText(JSON.stringify({ scripts: { dev: "x" } }), "package.json", "", "pnpm")[0].command, "pnpm dev");
    assert.equal(parsePackageJsonText(JSON.stringify({ scripts: { dev: "x" } }), "package.json", "", "bun")[0].command, "bun dev");
  });

  it("sets packageDir and file for nested packages", () => {
    const scripts = parsePackageJsonText(
      JSON.stringify({ scripts: { start: "node ." } }),
      "packages/api/package.json",
      "packages/api",
      "pnpm",
    );
    assert.equal(scripts[0].packageDir, "packages/api");
    assert.equal(scripts[0].file, "packages/api/package.json");
  });

  it("skips non-string script values", () => {
    const scripts = parsePackageJsonText(JSON.stringify({ scripts: { dev: "vite", bogus: 123 } }), "package.json", "", "npm");
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].script, "dev");
  });

  it("returns [] for missing scripts, null scripts, and invalid JSON", () => {
    assert.deepEqual(parsePackageJsonText(JSON.stringify({}), "package.json", "", "npm"), []);
    assert.deepEqual(parsePackageJsonText(JSON.stringify({ scripts: null }), "package.json", "", "npm"), []);
    assert.deepEqual(parsePackageJsonText("{not json", "package.json", "", "npm"), []);
  });
});

describe("parseMakefileText", () => {
  it("extracts targets and skips dot/phony targets", () => {
    const text = ["# build the app", "build:", "\tnpm run build", "", ".PHONY: build", "test:"].join("\n");
    const scripts = parseMakefileText(text, "Makefile", "");
    assert.deepEqual(scripts.map((s) => s.script), ["build", "test"]);
    assert.equal(scripts[0].description, "build the app");
    assert.equal(scripts[0].command, "make build");
  });

  it("sets packageManager to make and keeps packageDir", () => {
    const scripts = parseMakefileText("deploy:\n\techo deploy\n", "Makefile", "scripts");
    assert.equal(scripts[0].packageManager, "make");
    assert.equal(scripts[0].packageDir, "scripts");
    assert.equal(scripts[0].command, "make deploy");
  });
});

describe("parseJustfileText", () => {
  it("extracts recipes and captures a preceding # comment", () => {
    const text = ["# build the app", "build:", "\tjust --version", "", "test:", "\tjust test"].join("\n");
    const scripts = parseJustfileText(text, "justfile", "");
    assert.deepEqual(scripts.map((s) => s.script), ["build", "test"]);
    assert.equal(scripts[0].description, "build the app");
    assert.equal(scripts[0].command, "just build");
  });

  it("skips private recipes prefixed with underscore", () => {
    const scripts = parseJustfileText("_helpers:\n\techo hi\n\npublic:\n\techo ok\n", "justfile", "");
    assert.deepEqual(scripts.map((s) => s.script), ["public"]);
  });

  it("sets packageManager to just and keeps packageDir", () => {
    const scripts = parseJustfileText("deploy:\n\techo deploy\n", "justfile", "scripts");
    assert.equal(scripts[0].packageManager, "just");
    assert.equal(scripts[0].packageDir, "scripts");
    assert.equal(scripts[0].command, "just deploy");
  });
});
