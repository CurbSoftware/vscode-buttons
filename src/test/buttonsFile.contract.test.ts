import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addScriptFile,
  duplicateButton,
  emptyButtonsFile,
  findResolved,
  generateButtonsFile,
  getAtPath,
  parseButtonsFile,
  removeButton,
  reorderButtons,
  resolveButtons,
  scriptEntryFiles,
  serializeButtonsFile,
  setAllScripts,
  updateButton,
} from "../config/buttonsFile";
import { isArgsButton, isCommandButton, isScriptButton, type ButtonsFile } from "../models/types";
import type { DiscoveredScript } from "../scanner/types";

function parsed(value: unknown): ButtonsFile {
  const result = parseButtonsFile(JSON.stringify(value));
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.file;
}

function rejected(value: unknown): string {
  const result = parseButtonsFile(JSON.stringify(value));
  if (result.ok) {
    throw new Error("expected a parse error");
  }
  return result.error;
}

const dev: DiscoveredScript = {
  file: "package.json",
  script: "dev",
  command: "pnpm dev",
  packageManager: "pnpm",
  packageDir: "",
};

const nested: DiscoveredScript = {
  file: "packages/api/package.json",
  script: "start",
  command: "pnpm start",
  packageManager: "pnpm",
  packageDir: "packages/api",
};

describe(".buttons.json contract", () => {
  it("accepts an empty object as version 1", () => {
    assert.deepEqual(parsed({}), emptyButtonsFile());
  });

  it("rejects values that are not an object", () => {
    assert.equal(rejected([]), "Top-level value must be an object.");
    assert.equal(rejected(null), "Top-level value must be an object.");
    assert.equal(rejected("nope"), "Top-level value must be an object.");
  });

  it("rejects a non-object entry and a script missing file or script", () => {
    assert.equal(rejected({ buttons: ["x"] }), "buttons[0] must be an object.");
    assert.equal(
      rejected({ buttons: [{ type: "script", file: "package.json" }] }),
      'buttons[0] script entry requires string "file" and "script".',
    );
  });

  it("rejects a blank command and a children field that is not an array", () => {
    assert.equal(
      rejected({ buttons: [{ type: "command", command: "   " }] }),
      'buttons[0] command entry requires a non-empty "command".',
    );
    assert.equal(
      rejected({ buttons: [{ type: "command", command: "echo", children: "nope" }] }),
      'buttons[0] "children" must be an array.',
    );
    assert.equal(
      rejected({ buttons: [{ type: "command", command: "echo", children: [{ args: "  " }] }] }),
      'buttons[0].children[0] args entry requires a non-empty "args".',
    );
  });

  it("normalizes an unknown package manager, trims args, drops an empty id, and keeps a note", () => {
    const file = parsed({
      buttons: [
        {
          type: "script",
          file: "package.json",
          script: "dev",
          packageManager: "cargo-bin",
          args: "  --port 3000  ",
          id: "",
          note: "",
        },
      ],
    });
    const entry = file.buttons[0];
    assert.equal(entry.type, "script");
    if (entry.type !== "script") {
      return;
    }
    assert.equal(entry.packageManager, "npm");
    assert.equal(entry.args, "--port 3000");
    assert.equal(entry.id, undefined);
    assert.equal(entry.note, "");
  });

  it("appends command args and marks a missing script's args children missing", () => {
    const file = parsed({
      buttons: [
        { type: "command", command: "echo", args: "--hi" },
        {
          type: "script",
          file: "package.json",
          script: "dev",
          packageManager: "npm",
          args: "--watch",
          children: [{ args: "--verbose", note: "loud" }],
        },
      ],
    });
    const [command, script] = resolveButtons(file, []);
    assert.equal(command.command, "echo --hi");
    assert.equal(command.missing, undefined);
    assert.equal(script.command, "npm run dev --watch");
    assert.equal(script.missing, true);
    assert.equal(script.children[0].command, "npm run dev --watch --verbose");
    assert.equal(script.children[0].missing, true);
    assert.equal(script.children[0].packageDir, "");
  });

  it("updates notes and args without dropping a blank replacement on an args row", () => {
    const file = parsed({
      buttons: [
        {
          type: "script",
          file: "package.json",
          script: "dev",
          packageManager: "pnpm",
          args: "--watch",
          children: [{ args: "--keep", id: "child" }],
        },
        { type: "command", command: "echo hi" },
      ],
    });
    const cleared = updateButton(file, [0], { args: "   ", note: "local" });
    const script = cleared.buttons[0];
    assert.equal(script.type, "script");
    if (script.type === "script") {
      assert.equal(script.args, undefined);
      assert.equal(script.note, "local");
    }
    const kept = updateButton(file, [0, 0], { args: "  ", note: "still" });
    const child = getAtPath(kept, [0, 0]);
    assert.ok(child && isArgsButton(child));
    if (child && isArgsButton(child)) {
      assert.equal(child.args, "--keep");
      assert.equal(child.note, "still");
    }
    const command = updateButton(file, [1], { command: "   ", note: "named" });
    assert.equal(command.buttons[1].type === "command" && command.buttons[1].command, "echo hi");
    assert.equal(updateButton(file, [9], { note: "nope" }), file);
  });

  it("removes a nested child and leaves a missing path untouched", () => {
    const file = parsed({
      buttons: [{ type: "command", command: "echo", children: [{ args: "--a" }, { args: "--b" }] }],
    });
    const next = removeButton(file, [0, 0]);
    const parent = next.buttons[0];
    assert.deepEqual(parent.children?.map((child) => (isArgsButton(child) ? child.args : "")), ["--b"]);
    assert.equal(removeButton(file, [4]), file);
    assert.equal(removeButton(file, []), file);
  });

  it("gives a duplicate and its nested children new ids", () => {
    const file = parsed({
      buttons: [
        {
          type: "command",
          command: "echo",
          id: "parent",
          children: [{ args: "--a", id: "child" }],
        },
      ],
    });
    const next = duplicateButton(file, [0]);
    assert.equal(next.buttons.length, 2);
    assert.equal(next.buttons[0].id, "parent");
    assert.notEqual(next.buttons[1].id, "parent");
    const originalChild = next.buttons[0].children?.[0];
    const clonedChild = next.buttons[1].children?.[0];
    assert.equal(originalChild && isArgsButton(originalChild) && originalChild.id, "child");
    assert.notEqual(clonedChild && "id" in clonedChild ? clonedChild.id : "", "child");
    assert.equal(duplicateButton(file, [3]), file);
  });

  it("reorders only siblings and ignores a bad index", () => {
    const file = parsed({
      buttons: [
        { type: "command", command: "one", children: [{ args: "--a" }, { args: "--b" }] },
        { type: "command", command: "two" },
      ],
    });
    const top = reorderButtons(file, [1], [0]);
    assert.deepEqual(
      top.buttons.map((button) => (button.type === "command" ? button.command : "")),
      ["two", "one"],
    );
    const nestedOrder = reorderButtons(file, [0, 1], [0, 0]);
    const kids = nestedOrder.buttons[0].children ?? [];
    assert.deepEqual(
      kids.map((child) => (isArgsButton(child) ? child.args : "")),
      ["--b", "--a"],
    );
    assert.equal(reorderButtons(file, [0], [0]), file);
    assert.equal(reorderButtons(file, [0], [5]), file);
    assert.equal(reorderButtons(file, [0, 0], [1, 0]), file);
  });

  it("collects nested script files and finds a resolved row by path", () => {
    const file = parsed({
      buttons: [
        {
          type: "command",
          command: "echo",
          children: [
            { type: "script", file: "tools/run.sh", script: "tools/run.sh", packageManager: "shell" },
          ],
        },
      ],
    });
    assert.deepEqual(scriptEntryFiles(file), ["tools/run.sh"]);
    const resolved = resolveButtons(file, [
      {
        file: "tools/run.sh",
        script: "tools/run.sh",
        command: "bash run.sh",
        packageManager: "shell",
        packageDir: "tools",
      },
    ]);
    assert.equal(findResolved(resolved, [0, 0])?.command, "bash run.sh");
    assert.equal(findResolved(resolved, []), undefined);
    assert.equal(findResolved(resolved, [0, 4]), undefined);
    assert.equal(getAtPath(file, []), undefined);
  });

  it("generate keeps an existing script's children and skips nested discoveries", () => {
    const existing = parsed({
      buttons: [
        { type: "command", command: "echo keep" },
        {
          type: "script",
          file: "package.json",
          script: "dev",
          packageManager: "pnpm",
          children: [{ args: "--open" }],
        },
      ],
    });
    const next = generateButtonsFile([dev, nested], existing);
    assert.equal(next.buttons.length, 2);
    assert.equal(next.buttons[0].type === "command" && next.buttons[0].command, "echo keep");
    assert.equal(next.buttons[1].children?.[0] && isArgsButton(next.buttons[1].children[0]) && next.buttons[1].children[0].args, "--open");
    assert.equal(addScriptFile(next, [dev]), next);
  });

  it("setAllScripts can drop every script and leave commands", () => {
    const file = parsed({
      buttons: [
        { type: "script", file: "package.json", script: "dev", packageManager: "pnpm" },
        { type: "command", command: "echo" },
      ],
    });
    const cleared = setAllScripts(file, [dev], false);
    assert.deepEqual(
      cleared.buttons.map((button) => button.type),
      ["command"],
    );
  });

  it("serializes with a trailing newline and round-trips children", () => {
    const file = parsed({
      version: 1,
      buttons: [{ type: "command", command: "echo", children: [{ args: "--a", note: "first" }] }],
    });
    const text = serializeButtonsFile(file);
    assert.equal(text.endsWith("\n"), true);
    assert.deepEqual(parsed(JSON.parse(text)), file);
  });

  it("distinguishes args, script, and command entries", () => {
    const file = parsed({
      buttons: [
        { type: "script", file: "package.json", script: "dev" },
        { type: "command", command: "echo", children: [{ args: "--a" }] },
      ],
    });
    assert.equal(isScriptButton(file.buttons[0]), true);
    assert.equal(isCommandButton(file.buttons[1]), true);
    const child = file.buttons[1].children?.[0];
    assert.ok(child);
    assert.equal(child !== undefined && isArgsButton(child), true);
    assert.equal(child !== undefined && isScriptButton(child), false);
  });
});
