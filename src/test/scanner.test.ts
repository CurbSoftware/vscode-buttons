import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dirOf,
  fileEntryScript,
  isScriptFileType,
  parseJustfileText,
  parseMakefileText,
  parsePackageJsonText,
  PYTHON_ENTRY_FILES,
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

  it("runs file entries through their interpreter", () => {
    assert.equal(scriptCommand("shell", "scripts/deploy.sh"), "bash scripts/deploy.sh");
    assert.equal(scriptCommand("python", "app.py"), "python app.py");
  });

  it("quotes file-entry arguments containing whitespace", () => {
    assert.equal(scriptCommand("shell", "my script.sh"), `bash "my script.sh"`);
    assert.equal(scriptCommand("python", "app file.py"), `python "app file.py"`);
  });
});

describe("dirOf", () => {
  it("returns the directory portion, empty for root-level paths", () => {
    assert.equal(dirOf("package.json"), "");
    assert.equal(dirOf("scripts/deploy.sh"), "scripts");
    assert.equal(dirOf("packages/api/.venv"), "packages/api");
    assert.equal(dirOf("/opt/tools/deploy.sh"), "/opt/tools");
  });
});

describe("fileEntryScript", () => {
  it("builds a bash entry keyed on the relative path, with a packageDir-relative command", () => {
    const entry = fileEntryScript("deploy.sh", "scripts/deploy.sh");
    assert.deepEqual(entry, {
      file: "scripts/deploy.sh",
      script: "scripts/deploy.sh",
      command: "bash deploy.sh",
      packageManager: "shell",
      packageDir: "scripts",
      icon: "terminal-bash",
    });
  });

  it("builds an entry for a file outside the workspace, keyed on the absolute path", () => {
    const entry = fileEntryScript("deploy.sh", "/opt/tools/deploy.sh");
    assert.deepEqual(entry, {
      file: "/opt/tools/deploy.sh",
      script: "/opt/tools/deploy.sh",
      command: "bash deploy.sh",
      packageManager: "shell",
      packageDir: "/opt/tools",
      icon: "terminal-bash",
    });
  });

  it("builds a python entry for each Python entry file", () => {
    for (const name of PYTHON_ENTRY_FILES) {
      const entry = fileEntryScript(name, `services/api/${name}`);
      assert.equal(entry?.command, `python ${name}`);
      assert.equal(entry?.packageManager, "python");
      assert.equal(entry?.packageDir, "services/api");
    }
  });

  it("returns null for other files", () => {
    assert.equal(fileEntryScript("helper.py", "utils/helper.py"), null);
    assert.equal(fileEntryScript("notes.txt", "notes.txt"), null);
    assert.equal(fileEntryScript("package.json", "package.json"), null);
  });
});

describe("script file types", () => {
  it("recognizes supported file types", () => {
    assert.deepEqual(SCRIPT_FILE_TYPES, [
      "package.json",
      "Makefile",
      "composer.json",
      "justfile",
      "shell",
      "python",
    ]);
    assert.equal(isScriptFileType("package.json"), true);
    assert.equal(isScriptFileType("justfile"), true);
    assert.equal(isScriptFileType("shell"), true);
    assert.equal(isScriptFileType("python"), true);
    assert.equal(isScriptFileType("pyproject.toml"), false);
  });

  it("derives the file type from a script's relative path", () => {
    assert.equal(scriptFileTypeOf({ file: "package.json" }), "package.json");
    assert.equal(scriptFileTypeOf({ file: "packages/api/composer.json" }), "composer.json");
    assert.equal(scriptFileTypeOf({ file: "Makefile" }), "Makefile");
    assert.equal(scriptFileTypeOf({ file: "scripts/deploy.sh" }), "shell");
    assert.equal(scriptFileTypeOf({ file: "app.py" }), "python");
    assert.equal(scriptFileTypeOf({ file: "services/api/main.py" }), "python");
    assert.equal(scriptFileTypeOf({ file: "venv" }), "python");
    assert.equal(scriptFileTypeOf({ file: "packages/api/.venv" }), "python");
    assert.equal(scriptFileTypeOf({ file: "unknown.lol" }), "package.json");
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
