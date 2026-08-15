import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addCommandButton,
  addScriptButton,
  emptyButtonsFile,
  generateButtonsFile,
  hasScriptButton,
  parseButtonsFile,
  removeButton,
  removeScriptButton,
  serializeButtonsFile,
  setButtonNote,
  updateCommandButton,
} from "../config/buttonsFile";
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

describe("parseButtonsFile", () => {
  it("parses a valid command entry", () => {
    const result = parseButtonsFile(JSON.stringify({ version: 1, buttons: [{ type: "command", command: "docker ps", note: "list" }] }));
    if (!result.ok) {
      assert.fail(`expected ok: ${result.error}`);
    }
    assert.equal(result.file.version, 1);
    assert.deepEqual(result.file.buttons, [{ type: "command", command: "docker ps", note: "list" }]);
  });

  it("parses a script entry with defaults and manager normalization", () => {
    const result = parseButtonsFile(
      JSON.stringify({ version: 1, buttons: [{ type: "script", file: "package.json", script: "dev", packageManager: "pnpm" }] }),
    );
    if (!result.ok) {
      assert.fail(`expected ok: ${result.error}`);
    }
    assert.deepEqual(result.file.buttons, [
      { type: "script", file: "package.json", script: "dev", packageManager: "pnpm", packageDir: "" },
    ]);
  });

  it("rejects an unsupported version", () => {
    const result = parseButtonsFile(JSON.stringify({ version: 2, buttons: [] }));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /version/i);
    }
  });

  it("rejects an unknown entry type", () => {
    const result = parseButtonsFile(JSON.stringify({ version: 1, buttons: [{ type: "group" }] }));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /unknown type/i);
    }
  });

  it("rejects a non-array buttons field", () => {
    const result = parseButtonsFile(JSON.stringify({ version: 1, buttons: {} }));
    assert.equal(result.ok, false);
  });

  it("rejects a command entry with an empty command", () => {
    const result = parseButtonsFile(JSON.stringify({ version: 1, buttons: [{ type: "command", command: "  " }] }));
    assert.equal(result.ok, false);
  });

  it("tolerates missing version and extra fields", () => {
    const result = parseButtonsFile(JSON.stringify({ buttons: [{ type: "command", command: "echo hi", extra: 1 }] }));
    if (!result.ok) {
      assert.fail(`expected ok: ${result.error}`);
    }
    assert.equal(result.file.version, 1);
    assert.equal(result.file.buttons.length, 1);
  });

  it("rejects invalid JSON", () => {
    const result = parseButtonsFile("{not json");
    assert.equal(result.ok, false);
  });
});

describe("serializeButtonsFile", () => {
  it("round-trips through parse", () => {
    const original: ButtonsFile = {
      version: 1,
      buttons: [
        { type: "command", command: "docker ps", note: "list" },
        { type: "script", file: "packages/api/package.json", script: "start", packageDir: "packages/api", packageManager: "pnpm" },
      ],
    };
    const reparsed = parseButtonsFile(serializeButtonsFile(original));
    if (!reparsed.ok) {
      assert.fail(`expected ok: ${reparsed.error}`);
    }
    assert.deepEqual(reparsed.file, original);
  });
});

describe("emptyButtonsFile", () => {
  it("returns the canonical empty file", () => {
    assert.deepEqual(emptyButtonsFile(), { version: 1, buttons: [] });
  });
});

describe("generateButtonsFile", () => {
  it("maps every discovered script to a script entry", () => {
    const file = generateButtonsFile([
      script(),
      script({ file: "Makefile", script: "build", command: "make build", packageManager: "make", packageDir: "" }),
    ]);
    assert.deepEqual(file.buttons, [
      { type: "script", file: "package.json", script: "dev", packageDir: "", packageManager: "pnpm" },
      { type: "script", file: "Makefile", script: "build", packageDir: "", packageManager: "make" },
    ]);
  });

  it("returns an empty file for no discovered scripts", () => {
    assert.deepEqual(generateButtonsFile([]), { version: 1, buttons: [] });
  });
});

describe("script mutations", () => {
  it("addScriptButton is idempotent by key", () => {
    const base = emptyButtonsFile();
    const once = addScriptButton(base, script());
    const twice = addScriptButton(once, script());
    assert.equal(twice.buttons.length, 1);
    assert.equal(twice, once);
  });

  it("removeScriptButton splices by key", () => {
    const base = addScriptButton(emptyButtonsFile(), script());
    const removed = removeScriptButton(base, "package.json:dev");
    assert.equal(removed.buttons.length, 0);
  });

  it("hasScriptButton reports presence by key", () => {
    const base = addScriptButton(emptyButtonsFile(), script());
    assert.equal(hasScriptButton(base, "package.json:dev"), true);
    assert.equal(hasScriptButton(base, "package.json:build"), false);
  });
});

describe("command mutations", () => {
  it("addCommandButton appends", () => {
    const next = addCommandButton(emptyButtonsFile(), "docker ps", "list");
    assert.deepEqual(next.buttons, [{ type: "command", command: "docker ps", note: "list" }]);
  });

  it("updateCommandButton patches command and note", () => {
    const base = addCommandButton(emptyButtonsFile(), "docker ps", "list");
    const next = updateCommandButton(base, 0, { command: "docker ps -a", note: "all" });
    assert.deepEqual(next.buttons[0], { type: "command", command: "docker ps -a", note: "all" });
  });

  it("updateCommandButton is a no-op on script entries", () => {
    const base = addScriptButton(emptyButtonsFile(), script());
    const next = updateCommandButton(base, 0, { command: "changed" });
    assert.equal(next, base);
  });

  it("setButtonNote updates the note on any entry", () => {
    const base = addScriptButton(emptyButtonsFile(), script());
    const next = setButtonNote(base, 0, "Vite dev server");
    assert.equal(next.buttons[0].note, "Vite dev server");
  });

  it("removeButton splices by index", () => {
    const base = addCommandButton(addCommandButton(emptyButtonsFile(), "a"), "b");
    const next = removeButton(base, 0);
    assert.deepEqual(next.buttons, [{ type: "command", command: "b" }]);
  });
});
