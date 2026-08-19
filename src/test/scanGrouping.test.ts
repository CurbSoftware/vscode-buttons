import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { groupScriptsByFile } from "../panel/scanGrouping";
import type { DiscoveredScript } from "../scanner/types";

function script(overrides: Partial<DiscoveredScript> = {}): DiscoveredScript {
  return {
    file: "package.json",
    script: "dev",
    command: "pnpm dev",
    packageManager: "pnpm",
    packageDir: "",
    ...overrides,
  };
}

describe("groupScriptsByFile", () => {
  it("returns [] for no scripts", () => {
    assert.deepEqual(groupScriptsByFile([], []), []);
  });

  it("groups by file preserving first-seen file order", () => {
    const groups = groupScriptsByFile(
      [
        script({ file: "package.json", script: "dev" }),
        script({ file: "Makefile", script: "build", command: "make build", packageManager: "make" }),
        script({ file: "package.json", script: "test" }),
      ],
      [],
    );
    assert.deepEqual(groups.map((g) => g.file), ["package.json", "Makefile"]);
    assert.equal(groups[0].scripts.length, 2);
    assert.equal(groups[1].scripts.length, 1);
  });

  it("preserves script order within a group", () => {
    const groups = groupScriptsByFile(
      [
        script({ file: "package.json", script: "dev" }),
        script({ file: "package.json", script: "build" }),
        script({ file: "package.json", script: "test" }),
      ],
      [],
    );
    assert.deepEqual(groups[0].scripts.map((s) => s.script), ["dev", "build", "test"]);
  });

  it("reports none-selected", () => {
    const [g] = groupScriptsByFile([script(), script({ script: "build" })], []);
    assert.equal(g.selectedCount, 0);
    assert.equal(g.fileChecked, false);
    assert.equal(g.fileIndeterminate, false);
  });

  it("reports some-selected (indeterminate)", () => {
    const [g] = groupScriptsByFile([script(), script({ script: "build" })], ["package.json:dev"]);
    assert.equal(g.selectedCount, 1);
    assert.equal(g.fileChecked, false);
    assert.equal(g.fileIndeterminate, true);
  });

  it("reports all-selected (checked)", () => {
    const [g] = groupScriptsByFile([script(), script({ script: "build" })], ["package.json:dev", "package.json:build"]);
    assert.equal(g.selectedCount, 2);
    assert.equal(g.fileChecked, true);
    assert.equal(g.fileIndeterminate, false);
  });

  it("handles a single-script group (checked, never indeterminate)", () => {
    const [g] = groupScriptsByFile([script()], ["package.json:dev"]);
    assert.equal(g.fileChecked, true);
    assert.equal(g.fileIndeterminate, false);
  });

  it("ignores selectedKeys belonging to other files", () => {
    const groups = groupScriptsByFile(
      [
        script({ file: "package.json", script: "dev" }),
        script({ file: "Makefile", script: "build", command: "make build", packageManager: "make" }),
      ],
      ["Makefile:build"],
    );
    assert.equal(groups[0].selectedCount, 0);
    assert.equal(groups[1].selectedCount, 1);
    assert.equal(groups[1].fileChecked, true);
  });

  it("treats script names containing ':' opaquely", () => {
    const [g] = groupScriptsByFile([script({ script: "test:e2e" })], ["package.json:test:e2e"]);
    assert.equal(g.selectedCount, 1);
    assert.equal(g.fileChecked, true);
  });

  it("gives each standalone .sh file its own group", () => {
    const groups = groupScriptsByFile(
      [
        script({ file: "deploy.sh", script: "deploy.sh", command: "bash deploy.sh", packageManager: "shell", packageDir: "" }),
        script({ file: "scripts/build.sh", script: "scripts/build.sh", command: "bash scripts/build.sh", packageManager: "shell", packageDir: "scripts" }),
      ],
      [],
    );
    assert.deepEqual(groups.map((g) => g.file), ["deploy.sh", "scripts/build.sh"]);
  });

  it("groups venv buttons under the venv path", () => {
    const venvEntry = (name: string, command: string): DiscoveredScript =>
      script({ file: "venv", script: name, command, packageManager: "python", packageDir: "" });
    const [g] = groupScriptsByFile(
      [venvEntry("Activate venv", "source venv/bin/activate"), venvEntry("Deactivate", "deactivate")],
      ["venv:Activate venv"],
    );
    assert.equal(g.file, "venv");
    assert.equal(g.scripts.length, 2);
    assert.equal(g.selectedCount, 1);
    assert.equal(g.fileIndeterminate, true);
  });
});
