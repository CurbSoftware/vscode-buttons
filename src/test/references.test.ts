import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buttonId, resolveButtons } from "../config/buttonsFile";
import type { ButtonsFile } from "../models/types";
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

describe("resolveButtons", () => {
  it("recomputes a script command from the current scan", () => {
    const file: ButtonsFile = {
      version: 1,
      buttons: [{ type: "script", file: "package.json", script: "dev", packageDir: "", packageManager: "npm" }],
    };
    const resolved = resolveButtons(file, [script({ command: "pnpm dev", packageManager: "pnpm" })]);
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0].command, "pnpm dev");
    assert.equal(resolved[0].missing, false);
    assert.equal(resolved[0].index, 0);
  });

  it("marks a script entry missing when no longer in the scan", () => {
    const file: ButtonsFile = {
      version: 1,
      buttons: [{ type: "script", file: "package.json", script: "deleted", packageDir: "", packageManager: "npm" }],
    };
    const resolved = resolveButtons(file, []);
    assert.equal(resolved[0].missing, true);
    assert.equal(resolved[0].command, "npm run deleted");
  });

  it("passes command entries through verbatim", () => {
    const file: ButtonsFile = {
      version: 1,
      buttons: [{ type: "command", command: "docker ps", note: "list" }],
    };
    const resolved = resolveButtons(file, []);
    assert.equal(resolved[0].command, "docker ps");
    assert.equal(resolved[0].kind, "command");
    assert.equal(resolved[0].missing, undefined);
  });

  it("assigns indexes per file independently", () => {
    const projectFile: ButtonsFile = { version: 1, buttons: [{ type: "command", command: "npm run dev" }] };
    const globalFile: ButtonsFile = { version: 1, buttons: [{ type: "command", command: "gh pr list" }] };

    const project = resolveButtons(projectFile, []);
    const global = resolveButtons(globalFile, []);

    assert.equal(project[0].index, 0);
    assert.equal(global[0].index, 0);
  });

  it("assigns ids that are stable across array position changes", () => {
    const before: ButtonsFile = {
      version: 1,
      buttons: [
        { type: "command", command: "a" },
        { type: "command", command: "b" },
      ],
    };
    const after: ButtonsFile = {
      version: 1,
      buttons: [{ type: "command", command: "b" }],
    };
    const beforeId = resolveButtons(before, [])[1].id;
    const afterId = resolveButtons(after, [])[0].id;
    assert.equal(beforeId, afterId);
  });
});

describe("buttonId", () => {
  it("keys script entries by script key", () => {
    const entry = {
      type: "script" as const,
      file: "package.json",
      script: "dev",
      packageDir: "",
      packageManager: "npm" as const,
    };
    assert.equal(buttonId(entry), "script:package.json:dev");
  });

  it("keys command entries by command and note", () => {
    assert.equal(
      buttonId({ type: "command" as const, command: "echo hi", note: "one" }),
      buttonId({ type: "command" as const, command: "echo hi", note: "one" }),
    );
    assert.notEqual(
      buttonId({ type: "command" as const, command: "echo hi", note: "one" }),
      buttonId({ type: "command" as const, command: "echo hi", note: "two" }),
    );
  });
});
