import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeScanDirectories,
  scanScopePatterns,
  venvActivateCommand,
  venvButtons,
} from "../scanner/scanScope";
import { PYTHON_ENTRY_FILES, scriptKey, VENV_DIR_NAMES } from "../scanner/types";

describe("normalizeScanDirectories", () => {
  it("accepts well-formed entries and keeps their recursive flag", () => {
    assert.deepEqual(
      normalizeScanDirectories([{ path: "scripts", recursive: true }, { path: "tools", recursive: false }]),
      [{ path: "scripts", recursive: true }, { path: "tools", recursive: false }],
    );
  });

  it("normalizes backslashes, leading ./, and trailing slashes", () => {
    assert.deepEqual(normalizeScanDirectories([{ path: ".\\scripts\\", recursive: true }]), [
      { path: "scripts", recursive: true },
    ]);
    assert.deepEqual(normalizeScanDirectories([{ path: "./scripts/" }]), [{ path: "scripts", recursive: false }]);
  });

  it("drops root, parent, absolute, and empty paths", () => {
    assert.deepEqual(
      normalizeScanDirectories([
        { path: "" },
        { path: "." },
        { path: ".." },
        { path: "../outside" },
        { path: "/abs" },
        { path: "C:/abs" },
        { path: "a//b" },
      ]),
      [],
    );
  });

  it("drops glob-metachar, hidden, and ignore-listed paths", () => {
    assert.deepEqual(
      normalizeScanDirectories([
        { path: "foo{bar}" },
        { path: "a*b" },
        { path: "why?" },
        { path: "!negated" },
        { path: ".devcontainer" },
        { path: "sub/.hidden" },
        { path: "node_modules" },
        { path: "packages/dist" },
        { path: "app (1)" },
        { path: "docs!" },
        { path: "scripts" },
      ]),
      [
        { path: "app (1)", recursive: false },
        { path: "docs!", recursive: false },
        { path: "scripts", recursive: false },
      ],
    );
  });

  it("drops non-objects and entries without a string path", () => {
    assert.deepEqual(normalizeScanDirectories(["scripts", null, 3, { recursive: true }, { path: 42 }]), []);
  });

  it("dedupes by path, first occurrence wins", () => {
    assert.deepEqual(
      normalizeScanDirectories([{ path: "scripts", recursive: true }, { path: "scripts", recursive: false }]),
      [{ path: "scripts", recursive: true }],
    );
  });

  it("returns [] for non-array values", () => {
    assert.deepEqual(normalizeScanDirectories(undefined), []);
    assert.deepEqual(normalizeScanDirectories("scripts"), []);
  });
});

describe("scanScopePatterns", () => {
  it("always starts with the non-recursive root pattern", () => {
    const [root] = scanScopePatterns([]);
    assert.match(root, /^\{package\.json/);
    assert.ok(root.includes("Makefile"));
    assert.ok(root.includes("*.sh"));
    for (const name of PYTHON_ENTRY_FILES) {
      assert.ok(root.includes(name), name);
    }
    assert.ok(!root.includes("**"));
  });

  it("scans non-recursive directories at their top level only", () => {
    assert.deepEqual(scanScopePatterns([{ path: "scripts", recursive: false }]), [
      scanScopePatterns([])[0],
      "scripts/{package.json,Makefile,composer.json,justfile,*.sh,app.py,main.py,manage.py,run.py,server.py}",
    ]);
  });

  it("scans recursive directories with **", () => {
    const patterns = scanScopePatterns([{ path: "packages", recursive: true }]);
    assert.equal(patterns[1], "packages/**/{package.json,Makefile,composer.json,justfile,*.sh,app.py,main.py,manage.py,run.py,server.py}");
  });
});

describe("venv buttons", () => {
  it("activates with source on posix and & on PowerShell", () => {
    assert.equal(venvActivateCommand("venv", "posix"), "source venv/bin/activate");
    assert.equal(venvActivateCommand(".venv", "ps1"), "& .venv\\Scripts\\Activate.ps1");
    assert.equal(venvActivateCommand(".venv", "bat"), ".venv\\Scripts\\activate.bat");
  });

  it("offers activate + deactivate, plus install only with requirements.txt", () => {
    assert.deepEqual(
      venvButtons("venv", "posix", false).map((b) => [b.script, b.command]),
      [
        ["Activate venv", "source venv/bin/activate"],
        ["Deactivate", "deactivate"],
      ],
    );
    assert.deepEqual(
      venvButtons("venv", "posix", true).map((b) => b.command),
      ["source venv/bin/activate", "deactivate", "venv/bin/pip install -r requirements.txt"],
    );
  });

  it("writes commands relative to the venv's parent directory (the run cwd) and keys on the venv path", () => {
    const buttons = venvButtons("packages/api/.venv", "posix", true);
    assert.deepEqual(
      buttons.map((b) => b.command),
      ["source .venv/bin/activate", "deactivate", ".venv/bin/pip install -r requirements.txt"],
    );
    assert.ok(buttons.every((b) => b.packageDir === "packages/api" && b.packageManager === "python"));
    assert.deepEqual(
      buttons.map((b) => scriptKey(b)),
      ["packages/api/.venv:Activate venv", "packages/api/.venv:Deactivate", "packages/api/.venv:Install requirements"],
    );
  });

  it("uses the venv's Scripts pip on Windows activation kinds", () => {
    const buttons = venvButtons("venv", "ps1", true);
    assert.equal(buttons[2].command, "venv\\Scripts\\pip.exe install -r requirements.txt");
  });

  it("treats exactly venv and .venv as venv directory names", () => {
    assert.deepEqual([...VENV_DIR_NAMES], ["venv", ".venv"]);
  });
});
