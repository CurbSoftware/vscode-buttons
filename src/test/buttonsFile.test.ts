import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addArgsChild,
  addCommandButton,
  addScriptButton,
  addScriptFile,
  duplicateButton,
  emptyButtonsFile,
  generateButtonsFile,
  hasScriptButton,
  parseButtonsFile,
  removeButton,
  reorderButtons,
  resolveButtons,
  removeScriptButton,
  removeScriptFile,
  serializeButtonsFile,
  setAllScripts,
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
  it("round-trips shell and python script entries unchanged", () => {
    const result = parseButtonsFile(
      JSON.stringify({
        version: 1,
        buttons: [
          { type: "script", file: "scripts/deploy.sh", script: "scripts/deploy.sh", packageManager: "shell", packageDir: "scripts" },
          { type: "script", file: "venv", script: "Activate venv", packageManager: "python", packageDir: "" },
        ],
      }),
    );
    if (!result.ok) {
      assert.fail(`expected ok: ${result.error}`);
    }
    assert.deepEqual(result.file.buttons[0], {
      type: "script",
      file: "scripts/deploy.sh",
      script: "scripts/deploy.sh",
      packageManager: "shell",
      packageDir: "scripts",
    });
    assert.deepEqual(result.file.buttons[1], {
      type: "script",
      file: "venv",
      script: "Activate venv",
      packageManager: "python",
      packageDir: "",
    });
  });

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
  it("maps every root-level script to a script entry", () => {
    const file = generateButtonsFile([
      script(),
      script({ file: "Makefile", script: "build", command: "make build", packageManager: "make", packageDir: "" }),
    ]);
    assert.deepEqual(file.buttons, [
      { type: "script", file: "package.json", script: "dev", packageDir: "", packageManager: "pnpm" },
      { type: "script", file: "Makefile", script: "build", packageDir: "", packageManager: "make" },
    ]);
  });

  it("excludes scripts from nested files", () => {
    const file = generateButtonsFile([
      script(),
      script({ file: "packages/app/package.json", script: "dev", command: "npm --prefix packages/app run dev", packageDir: "packages/app" }),
    ]);
    assert.deepEqual(file.buttons, [{ type: "script", file: "package.json", script: "dev", packageDir: "", packageManager: "pnpm" }]);
  });

  it("returns an empty file for no discovered scripts", () => {
    assert.deepEqual(generateButtonsFile([]), { version: 1, buttons: [] });
  });

  it("keeps custom commands, notes, and extra scripts when the file already exists", () => {
    const existing: ButtonsFile = {
      version: 1,
      buttons: [
        { type: "command", command: "docker ps", note: "containers" },
        { type: "script", file: "packages/app/package.json", script: "dev", packageDir: "packages/app", packageManager: "pnpm" },
        { type: "script", file: "package.json", script: "dev", packageDir: "", packageManager: "pnpm", note: "local", children: [{ args: "--filter app" }] },
      ],
    };
    const file = generateButtonsFile(
      [
        script(),
        script({ file: "Makefile", script: "build", command: "make build", packageManager: "make", packageDir: "" }),
        script({ file: "packages/app/package.json", script: "dev", command: "pnpm --dir packages/app dev", packageManager: "pnpm", packageDir: "packages/app" }),
      ],
      existing,
    );
    assert.deepEqual(file.buttons, [
      { type: "command", command: "docker ps", note: "containers" },
      { type: "script", file: "packages/app/package.json", script: "dev", packageDir: "packages/app", packageManager: "pnpm" },
      { type: "script", file: "package.json", script: "dev", packageDir: "", packageManager: "pnpm", note: "local", children: [{ args: "--filter app" }] },
      { type: "script", file: "Makefile", script: "build", packageDir: "", packageManager: "make" },
    ]);
  });
});

describe("setAllScripts", () => {
  it("selects all discovered scripts, skipping keys already present", () => {
    const base = addScriptButton(emptyButtonsFile(), script());
    const file = setAllScripts(base, [script(), script({ file: "Makefile", script: "build", command: "make build", packageManager: "make", packageDir: "" })], true);
    assert.deepEqual(file.buttons, [
      { type: "script", file: "package.json", script: "dev", packageDir: "", packageManager: "pnpm" },
      { type: "script", file: "Makefile", script: "build", packageDir: "", packageManager: "make" },
    ]);
  });

  it("unselecting removes all script entries but keeps command buttons", () => {
    const base = addCommandButton(addScriptButton(emptyButtonsFile(), script()), "docker ps");
    const file = setAllScripts(base, [script()], false);
    assert.deepEqual(file.buttons, [{ type: "command", command: "docker ps" }]);
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
    const next = updateCommandButton(base, [0], { command: "docker ps -a", note: "all" });
    assert.deepEqual(next.buttons[0], { type: "command", command: "docker ps -a", note: "all" });
  });

  it("updateCommandButton is a no-op on script entries", () => {
    const base = addScriptButton(emptyButtonsFile(), script());
    const next = updateCommandButton(base, [0], { command: "changed" });
    assert.equal(next, base);
  });

  it("setButtonNote updates the note on any entry", () => {
    const base = addScriptButton(emptyButtonsFile(), script());
    const next = setButtonNote(base, [0], "Vite dev server");
    assert.equal(next.buttons[0].note, "Vite dev server");
  });

  it("removeButton splices by index", () => {
    const base = addCommandButton(addCommandButton(emptyButtonsFile(), "a"), "b");
    const next = removeButton(base, [0]);
    assert.deepEqual(next.buttons, [{ type: "command", command: "b" }]);
  });
});

describe("addScriptFile", () => {
  it("appends all scripts of a file not already present", () => {
    const next = addScriptFile(emptyButtonsFile(), [
      script({ file: "package.json", script: "dev" }),
      script({ file: "package.json", script: "build" }),
    ]);
    assert.deepEqual(next.buttons, [
      { type: "script", file: "package.json", script: "dev", packageDir: "", packageManager: "pnpm" },
      { type: "script", file: "package.json", script: "build", packageDir: "", packageManager: "pnpm" },
    ]);
  });

  it("is idempotent for already-selected scripts", () => {
    const base = addScriptButton(emptyButtonsFile(), script());
    assert.equal(addScriptFile(base, [script()]), base);
  });

  it("leaves command entries and entries of other files untouched", () => {
    const base = addScriptButton(
      addScriptButton(
        addCommandButton(emptyButtonsFile(), "echo hi"),
        script({ file: "Makefile", script: "build", command: "make build", packageManager: "make", packageDir: "" }),
      ),
      script({ file: "package.json", script: "dev" }),
    );
    const next = addScriptFile(base, [script({ file: "package.json", script: "build" })]);
    assert.equal(next.buttons.length, 4);
    assert.deepEqual(next.buttons[0], { type: "command", command: "echo hi" });
    assert.deepEqual(next.buttons[1], { type: "script", file: "Makefile", script: "build", packageDir: "", packageManager: "make" });
  });

  it("returns the same object when given an empty script list", () => {
    const base = addScriptButton(emptyButtonsFile(), script());
    assert.equal(addScriptFile(base, []), base);
  });
});

describe("removeScriptFile", () => {
  it("removes every script entry with that file", () => {
    const base = addScriptButton(addScriptButton(emptyButtonsFile(), script({ script: "dev" })), script({ script: "build" }));
    const next = removeScriptFile(base, "package.json");
    assert.equal(next.buttons.length, 0);
  });

  it("leaves command entries and entries of other files", () => {
    const base = addScriptButton(
      addScriptButton(
        addCommandButton(emptyButtonsFile(), "echo hi"),
        script({ file: "Makefile", script: "build", command: "make build", packageManager: "make", packageDir: "" }),
      ),
      script({ file: "package.json", script: "dev" }),
    );
    const next = removeScriptFile(base, "package.json");
    assert.equal(next.buttons.length, 2);
    assert.deepEqual(next.buttons[0], { type: "command", command: "echo hi" });
    assert.deepEqual(next.buttons[1], { type: "script", file: "Makefile", script: "build", packageDir: "", packageManager: "make" });
  });

  it("returns the same object when no entries match", () => {
    const base = addScriptButton(emptyButtonsFile(), script());
    assert.equal(removeScriptFile(base, "Makefile"), base);
  });
});

describe("resolveButtons", () => {
  it("recomputes shell and python commands from the live scan", () => {
    const file = generateButtonsFile([
      script({ file: "deploy.sh", script: "deploy.sh", command: "bash deploy.sh", packageManager: "shell", packageDir: "" }),
      script({ file: "app.py", script: "app.py", command: "python app.py", packageManager: "python", packageDir: "" }),
    ]);
    const resolved = resolveButtons(file, [
      script({ file: "deploy.sh", script: "deploy.sh", command: "bash deploy.sh", packageManager: "shell", packageDir: "" }),
      script({ file: "app.py", script: "app.py", command: "python app.py", packageManager: "python", packageDir: "" }),
    ]);
    assert.equal(resolved[0].command, "bash deploy.sh");
    assert.equal(resolved[0].missing, false);
    assert.equal(resolved[1].command, "python app.py");
  });

  it("marks vanished venv buttons missing with a command fallback", () => {
    const file = generateButtonsFile([
      script({ file: "venv", script: "Activate venv", command: "source venv/bin/activate", packageManager: "python", packageDir: "" }),
    ]);
    const resolved = resolveButtons(file, []);
    assert.equal(resolved[0].missing, true);
    assert.equal(resolved[0].command, 'python "Activate venv"');
  });

  it("resolves a standalone entry for a file outside the workspace", () => {
    const external = script({
      file: "/opt/tools/deploy.sh",
      script: "/opt/tools/deploy.sh",
      command: "bash deploy.sh",
      packageManager: "shell",
      packageDir: "/opt/tools",
    });
    const file = addScriptButton(emptyButtonsFile(), external);
    const roundTrip = parseButtonsFile(serializeButtonsFile(file));
    assert.ok(roundTrip.ok);
    assert.deepEqual(roundTrip.file, file);

    const resolved = resolveButtons(file, [external]);
    assert.equal(resolved[0].missing, false);
    assert.equal(resolved[0].command, "bash deploy.sh");

    const vanished = resolveButtons(file, []);
    assert.equal(vanished[0].missing, true);
  });
});

describe("children and args", () => {
  it("parses args children, command children, and script children", () => {
    const result = parseButtonsFile(
      JSON.stringify({
        version: 1,
        buttons: [
          {
            type: "script",
            file: "package.json",
            script: "dev",
            packageManager: "pnpm",
            children: [
              { args: "--include app1 app2", note: "apps" },
              { type: "command", command: "pnpm dev --filter web", note: "web" },
              { type: "script", file: "apps/web/package.json", script: "dev", packageDir: "apps/web", packageManager: "pnpm" },
            ],
          },
        ],
      }),
    );
    if (!result.ok) {
      assert.fail(result.error);
    }
    assert.equal(result.file.buttons[0].children?.length, 3);
    assert.deepEqual(result.file.buttons[0].children?.[0], { args: "--include app1 app2", note: "apps" });
  });

  it("rejects empty args children", () => {
    const result = parseButtonsFile(
      JSON.stringify({ version: 1, buttons: [{ type: "command", command: "echo", children: [{ args: "  " }] }] }),
    );
    assert.equal(result.ok, false);
  });

  it("rejects args-only entries at the top level", () => {
    const result = parseButtonsFile(JSON.stringify({ version: 1, buttons: [{ args: "--x" }] }));
    assert.equal(result.ok, false);
  });

  it("ignores nested children on a child", () => {
    const result = parseButtonsFile(
      JSON.stringify({
        version: 1,
        buttons: [
          {
            type: "command",
            command: "echo a",
            children: [{ type: "command", command: "echo b", children: [{ args: "--nope" }] }],
          },
        ],
      }),
    );
    if (!result.ok) {
      assert.fail(result.error);
    }
    const child = result.file.buttons[0].children?.[0];
    assert.ok(child && "type" in child && child.type === "command");
    assert.equal("children" in child && Boolean(child.children), false);
  });

  it("resolves args children against the live parent command", () => {
    const file: ButtonsFile = {
      version: 1,
      buttons: [
        {
          type: "script",
          file: "package.json",
          script: "dev",
          packageDir: "",
          packageManager: "npm",
          children: [{ args: "--include app1 app2" }],
        },
      ],
    };
    const resolved = resolveButtons(file, [script({ command: "pnpm dev", packageManager: "pnpm" })]);
    assert.equal(resolved[0].command, "pnpm dev");
    assert.equal(resolved[0].children[0].command, "pnpm dev --include app1 app2");
    assert.equal(resolved[0].children[0].kind, "args");
    assert.deepEqual(resolved[0].children[0].path, [0, 0]);
  });

  it("resolves command children verbatim and script children from the scan", () => {
    const file: ButtonsFile = {
      version: 1,
      buttons: [
        {
          type: "command",
          command: "echo parent",
          children: [
            { type: "command", command: "echo child" },
            { type: "script", file: "apps/web/package.json", script: "dev", packageDir: "apps/web", packageManager: "pnpm" },
          ],
        },
      ],
    };
    const resolved = resolveButtons(file, [
      script({
        file: "apps/web/package.json",
        script: "dev",
        command: "pnpm dev",
        packageDir: "apps/web",
      }),
    ]);
    assert.equal(resolved[0].children[0].command, "echo child");
    assert.equal(resolved[0].children[1].command, "pnpm dev");
    assert.equal(resolved[0].children[1].missing, false);
  });

  it("removeScriptButton removes every top-level copy of a script key", () => {
    const two = duplicateButton(addScriptButton(emptyButtonsFile(), script()), [0]);
    assert.equal(two.buttons.length, 2);
    assert.equal(hasScriptButton(two, "package.json:dev"), true);
    const removed = removeScriptButton(two, "package.json:dev");
    assert.equal(removed.buttons.length, 0);
  });
});

describe("duplicateButton", () => {
  it("inserts a clone with a new id after the original", () => {
    const base = addCommandButton(emptyButtonsFile(), "echo hi", "one", "id-a");
    const next = duplicateButton(base, [0]);
    assert.equal(next.buttons.length, 2);
    assert.equal(next.buttons[0].id, "id-a");
    assert.notEqual(next.buttons[1].id, "id-a");
    assert.equal(next.buttons[1].type, "command");
    if (next.buttons[1].type === "command") {
      assert.equal(next.buttons[1].command, "echo hi");
    }
  });

  it("assigns an id to the original when it had none", () => {
    const base = addCommandButton(emptyButtonsFile(), "echo hi");
    const next = duplicateButton(base, [0]);
    assert.ok(next.buttons[0].id);
    assert.ok(next.buttons[1].id);
    assert.notEqual(next.buttons[0].id, next.buttons[1].id);
  });
});

describe("addArgsChild", () => {
  it("appends an args child on a top-level parent", () => {
    const base = addCommandButton(emptyButtonsFile(), "pnpm dev");
    const next = addArgsChild(base, [0], "--include app1");
    assert.deepEqual(next.buttons[0].children, [{ args: "--include app1" }]);
  });

  it("is a no-op for empty args or a child path", () => {
    const base = addCommandButton(emptyButtonsFile(), "pnpm dev");
    assert.equal(addArgsChild(base, [0], "  "), base);
    assert.equal(addArgsChild(base, [0, 0], "--x"), base);
  });
});

describe("reorderButtons", () => {
  it("reorders top-level siblings", () => {
    const base = addCommandButton(addCommandButton(emptyButtonsFile(), "a"), "b");
    const next = reorderButtons(base, [0], [1]);
    assert.equal(next.buttons[0].type === "command" ? next.buttons[0].command : "", "b");
    assert.equal(next.buttons[1].type === "command" ? next.buttons[1].command : "", "a");
  });

  it("reorders children and no-ops across parents", () => {
    const withKids = addArgsChild(addArgsChild(addCommandButton(emptyButtonsFile(), "p"), [0], "--a"), [0], "--b");
    const swapped = reorderButtons(withKids, [0, 0], [0, 1]);
    const first = swapped.buttons[0].children?.[0];
    assert.equal(first && "args" in first ? first.args : "", "--b");
    const other = addCommandButton(withKids, "q");
    assert.equal(reorderButtons(other, [0, 0], [1, 0]), other);
  });
});
