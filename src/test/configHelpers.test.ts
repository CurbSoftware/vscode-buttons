import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  cartesian,
  applyTemplate,
  expandMacros,
  validateDocument,
  resolveDocument,
  isDangerousCommand,
  slugify,
  toTitleCase,
  deriveLabelFromCommand,
  buildCommand,
  validateColor,
  validateCodicon,
  validatePorts,
  resolveGroupDisplay,
  TemplateContext,
} from "../config/configHelpers";
import { ButtonsDiagnostic, ButtonsDocument, ResolvedGroupDisplay } from "../models/types";

// ── cartesian ──────────────────────────────────────────────

describe("cartesian", () => {
  it("returns [[]] for empty params", () => {
    assert.deepStrictEqual(cartesian([]), [[]]);
  });

  it("returns individual items for single param", () => {
    assert.deepStrictEqual(cartesian([["a", "b"]]), [["a"], ["b"]]);
  });

  it("produces correct product for two params", () => {
    const result = cartesian([["a", "b"], ["1", "2"]]);
    assert.deepStrictEqual(result, [["a", "1"], ["a", "2"], ["b", "1"], ["b", "2"]]);
  });

  it("produces correct count for three params", () => {
    const result = cartesian([["a", "b"], ["1", "2"], ["x", "y"]]);
    assert.strictEqual(result.length, 8);
  });
});

// ── applyTemplate ──────────────────────────────────────────

describe("applyTemplate", () => {
  const baseContext: TemplateContext = {
    base: "npm",
    variables: { service: "api" },
    macros: { run: "npm run" },
    args: ["build", "prod"],
  };

  it("substitutes {{base}}", () => {
    assert.strictEqual(applyTemplate("{{base}} install", baseContext), "npm install");
  });

  it("substitutes {{arg1}} and {{arg2}}", () => {
    assert.strictEqual(applyTemplate("{{arg1}} {{arg2}}", baseContext), "build prod");
  });

  it("substitutes variables", () => {
    assert.strictEqual(applyTemplate("deploy {{service}}", baseContext), "deploy api");
  });

  it("substitutes macros", () => {
    assert.strictEqual(applyTemplate("{{run}} test", baseContext), "npm run test");
  });

  it("resolves unknown tokens to empty string", () => {
    assert.strictEqual(applyTemplate("{{unknown}}", baseContext), "");
  });

  it("trims whitespace inside braces", () => {
    assert.strictEqual(applyTemplate("{{ base }}", baseContext), "npm");
  });

  it("handles missing base gracefully", () => {
    const ctx: TemplateContext = { variables: {}, macros: {}, args: [] };
    assert.strictEqual(applyTemplate("{{base}}", ctx), "");
  });
});

// ── expandMacros ───────────────────────────────────────────

describe("expandMacros", () => {
  it("expands simple macros", () => {
    const diagnostics: ButtonsDiagnostic[] = [];
    const result = expandMacros({ greet: "hello world" }, diagnostics);
    assert.strictEqual(result.greet, "hello world");
    assert.strictEqual(diagnostics.length, 0);
  });

  it("expands chained macros", () => {
    const diagnostics: ButtonsDiagnostic[] = [];
    const result = expandMacros({ base: "npm", run: "{{base}} run" }, diagnostics);
    assert.strictEqual(result.run, "npm run");
  });

  it("detects circular references", () => {
    const diagnostics: ButtonsDiagnostic[] = [];
    expandMacros({ a: "{{b}}", b: "{{a}}" }, diagnostics);
    assert.ok(diagnostics.some((d) => d.severity === "error" && d.message.includes("Circular")));
  });
});

// ── validateDocument ───────────────────────────────────────

describe("validateDocument", () => {
  function minimalDoc(overrides?: Partial<ButtonsDocument>): ButtonsDocument {
    return {
      version: 1,
      groups: {
        main: {
          buttons: [{ command: "echo hi" }],
        },
      },
      ...overrides,
    };
  }

  it("passes for valid minimal document", () => {
    const diagnostics = validateDocument(minimalDoc());
    const errors = diagnostics.filter((d) => d.severity === "error");
    assert.strictEqual(errors.length, 0);
  });

  it("errors on missing version", () => {
    const diagnostics = validateDocument(minimalDoc({ version: 2 }));
    assert.ok(diagnostics.some((d) => d.severity === "error" && d.message.includes("version")));
  });

  it("errors on invalid layout", () => {
    const diagnostics = validateDocument(minimalDoc({ layout: "invalid" as "grid" }));
    assert.ok(diagnostics.some((d) => d.severity === "error" && d.message.includes("layout")));
  });

  it("errors on invalid terminal mode", () => {
    const diagnostics = validateDocument(minimalDoc({ terminal: "invalid" as "current" }));
    assert.ok(diagnostics.some((d) => d.severity === "error" && d.message.includes("terminal")));
  });

  it("warns on empty groups", () => {
    const diagnostics = validateDocument(minimalDoc({ groups: {} }));
    assert.ok(diagnostics.some((d) => d.severity === "warning" && d.message.includes("group")));
  });

  it("warns on invalid color", () => {
    const diagnostics = validateDocument(minimalDoc({
      groups: { main: { color: "notacolor", buttons: [{ command: "echo" }] } },
    }));
    assert.ok(diagnostics.some((d) => d.severity === "warning" && d.message.includes("color")));
  });

  it("warns on invalid codicon", () => {
    const diagnostics = validateDocument(minimalDoc({
      groups: { main: { icon: "INVALID ICON", buttons: [{ command: "echo" }] } },
    }));
    assert.ok(diagnostics.some((d) => d.severity === "warning" && d.message.includes("codicon")));
  });

  it("errors on invalid port", () => {
    const diagnostics = validateDocument(minimalDoc({
      groups: { main: { ports: [99999], buttons: [{ command: "echo" }] } },
    }));
    assert.ok(diagnostics.some((d) => d.severity === "error" && d.message.includes("port")));
  });
});

// ── resolveDocument ────────────────────────────────────────

describe("resolveDocument", () => {
  function resolve(doc: ButtonsDocument, diagnostics?: ButtonsDiagnostic[]) {
    const diag = diagnostics ?? [];
    return resolveDocument(doc, true, "grid", "current", diag);
  }

  it("resolves a minimal document", () => {
    const doc: ButtonsDocument = {
      version: 1,
      groups: {
        main: {
          buttons: [{ id: "test", label: "Test", command: "npm test" }],
        },
      },
    };
    const result = resolve(doc);
    assert.strictEqual(result.title, "Buttons");
    assert.strictEqual(result.layout, "grid");
    assert.strictEqual(result.groups.length, 1);
    assert.strictEqual(result.groups[0].buttons.length, 1);
    assert.strictEqual(result.groups[0].buttons[0].command, "npm test");
  });

  it("applies defaults cascade", () => {
    const doc: ButtonsDocument = {
      version: 1,
      defaults: { danger: true },
      groups: {
        main: {
          buttons: [{ id: "test", label: "Test", command: "npm test" }],
        },
      },
    };
    const result = resolve(doc);
    assert.strictEqual(result.groups[0].buttons[0].danger, true);
  });

  it("generates cartesian buttons", () => {
    const doc: ButtonsDocument = {
      version: 1,
      groups: {
        scripts: {
          generate: {
            template: "npm run {{arg1}}",
            label_template: "{{arg1}}",
            params: [["build", "test", "lint"]],
          },
        },
      },
    };
    const result = resolve(doc);
    assert.strictEqual(result.groups[0].buttons.length, 3);
  });

  it("detects dangerous commands", () => {
    const doc: ButtonsDocument = {
      version: 1,
      groups: {
        main: {
          buttons: [{ id: "clean", label: "Clean", command: "git rm -rf ." }],
        },
      },
    };
    const result = resolve(doc);
    assert.strictEqual(result.groups[0].buttons[0].danger, true);
  });

  it("filters disabled groups", () => {
    const doc: ButtonsDocument = {
      version: 1,
      groups: {
        active: { buttons: [{ id: "a", command: "echo a" }] },
        disabled: { enabled: false, buttons: [{ id: "b", command: "echo b" }] },
      },
    };
    const result = resolve(doc);
    assert.strictEqual(result.groups.length, 1);
    assert.strictEqual(result.groups[0].id, "active");
  });

  it("filters disabled buttons", () => {
    const doc: ButtonsDocument = {
      version: 1,
      groups: {
        main: {
          buttons: [
            { id: "a", command: "echo a" },
            { id: "b", command: "echo b", enabled: false },
          ],
        },
      },
    };
    const result = resolve(doc);
    assert.strictEqual(result.groups[0].buttons.length, 1);
    assert.strictEqual(result.groups[0].buttons[0].id, "a");
  });

  it("filters duplicate button IDs and emits diagnostic", () => {
    const diagnostics: ButtonsDiagnostic[] = [];
    const doc: ButtonsDocument = {
      version: 1,
      groups: {
        main: {
          buttons: [
            { id: "dup", command: "echo first" },
            { id: "dup", command: "echo second" },
          ],
        },
      },
    };
    const result = resolve(doc, diagnostics);
    assert.strictEqual(result.groups[0].buttons.length, 1);
    assert.strictEqual(result.groups[0].buttons[0].command, "echo first");
    assert.ok(diagnostics.some((d) => d.message.includes("Duplicate")));
  });

  it("guards against cartesian explosion", () => {
    const diagnostics: ButtonsDiagnostic[] = [];
    // 11^3 = 1331 > 1000
    const bigParams = Array.from({ length: 3 }, () =>
      Array.from({ length: 11 }, (_, i) => String(i)),
    );
    const doc: ButtonsDocument = {
      version: 1,
      groups: {
        big: {
          generate: {
            template: "echo {{arg1}}",
            params: bigParams,
          },
        },
      },
    };
    const result = resolve(doc, diagnostics);
    assert.strictEqual(result.groups[0].buttons.length, 0);
    assert.ok(diagnostics.some((d) => d.message.includes("exceeding the limit")));
  });

  it("expands macros in commands", () => {
    const doc: ButtonsDocument = {
      version: 1,
      macros: { run: "pnpm run" },
      groups: {
        main: {
          buttons: [{ id: "dev", command: "{{run}} dev" }],
        },
      },
    };
    const result = resolve(doc);
    assert.strictEqual(result.groups[0].buttons[0].command, "pnpm run dev");
  });

  it("expands variables in commands", () => {
    const doc: ButtonsDocument = {
      version: 1,
      variables: { svc: "api" },
      groups: {
        main: {
          buttons: [{ id: "logs", command: "docker logs {{svc}}" }],
        },
      },
    };
    const result = resolve(doc);
    assert.strictEqual(result.groups[0].buttons[0].command, "docker logs api");
  });
});

// ── isDangerousCommand ─────────────────────────────────────

describe("isDangerousCommand", () => {
  it("matches rm", () => {
    assert.strictEqual(isDangerousCommand("git rm -rf ."), true);
  });

  it("matches deploy", () => {
    assert.strictEqual(isDangerousCommand("kubectl deploy app"), true);
  });

  it("does not match safe commands", () => {
    assert.strictEqual(isDangerousCommand("npm run build"), false);
  });

  it("does not match substrings like format", () => {
    assert.strictEqual(isDangerousCommand("npm run format"), false);
  });
});

// ── slugify ────────────────────────────────────────────────

describe("slugify", () => {
  it("lowercases and replaces non-alphanumeric", () => {
    assert.strictEqual(slugify("Hello World"), "hello-world");
  });

  it("strips leading and trailing hyphens", () => {
    assert.strictEqual(slugify("--test--"), "test");
  });
});

// ── toTitleCase ────────────────────────────────────────────

describe("toTitleCase", () => {
  it("capitalizes words", () => {
    assert.strictEqual(toTitleCase("hello world"), "Hello World");
  });

  it("converts dashes and underscores to spaces", () => {
    assert.strictEqual(toTitleCase("hello-world_test"), "Hello World Test");
  });
});

// ── deriveLabelFromCommand ─────────────────────────────────

describe("deriveLabelFromCommand", () => {
  it("takes first 3 words and title-cases", () => {
    assert.strictEqual(deriveLabelFromCommand("npm run build --verbose"), "Npm Run Build");
  });
});

// ── buildCommand ───────────────────────────────────────────

describe("buildCommand", () => {
  it("uses command directly when provided", () => {
    const result = buildCommand(
      { command: "echo hello" },
      {},
      { variables: {}, macros: {}, args: [] },
    );
    assert.strictEqual(result, "echo hello");
  });

  it("joins base and args with delimiter", () => {
    const result = buildCommand(
      { args: ["--flag", "value"] },
      { base: "cmd", delimiter: " " },
      { base: "cmd", variables: {}, macros: {}, args: [] },
    );
    assert.strictEqual(result, "cmd --flag value");
  });
});

// ── validation helpers ─────────────────────────────────────

describe("validateColor", () => {
  it("accepts valid hex colors", () => {
    const d: ButtonsDiagnostic[] = [];
    validateColor("#FF0000", "test", d);
    validateColor("#abc", "test", d);
    assert.strictEqual(d.length, 0);
  });

  it("warns on invalid colors", () => {
    const d: ButtonsDiagnostic[] = [];
    validateColor("red", "test", d);
    assert.strictEqual(d.length, 1);
  });
});

describe("validateCodicon", () => {
  it("accepts valid codicons", () => {
    const d: ButtonsDiagnostic[] = [];
    validateCodicon("play", "test", d);
    validateCodicon("chevron-right", "test", d);
    assert.strictEqual(d.length, 0);
  });

  it("warns on invalid codicons", () => {
    const d: ButtonsDiagnostic[] = [];
    validateCodicon("PLAY!", "test", d);
    assert.strictEqual(d.length, 1);
  });
});

describe("validatePorts", () => {
  it("accepts valid ports", () => {
    const d: ButtonsDiagnostic[] = [];
    validatePorts([80, 443, 3000, 65535], "test", d);
    assert.strictEqual(d.length, 0);
  });

  it("errors on invalid ports", () => {
    const d: ButtonsDiagnostic[] = [];
    validatePorts([0, -1, 70000], "test", d);
    assert.strictEqual(d.length, 3);
  });
});

// ── new layout modes ──────────────────────────────────────

describe("validateDocument layout modes", () => {
  function minimalDoc(overrides?: Partial<ButtonsDocument>): ButtonsDocument {
    return {
      version: 1,
      groups: { main: { buttons: [{ command: "echo hi" }] } },
      ...overrides,
    };
  }

  it("accepts columns layout", () => {
    const diagnostics = validateDocument(minimalDoc({ layout: "columns" }));
    const errors = diagnostics.filter((d) => d.severity === "error");
    assert.strictEqual(errors.length, 0);
  });

  it("accepts table layout", () => {
    const diagnostics = validateDocument(minimalDoc({ layout: "table" }));
    const errors = diagnostics.filter((d) => d.severity === "error");
    assert.strictEqual(errors.length, 0);
  });

  it("accepts flow layout", () => {
    const diagnostics = validateDocument(minimalDoc({ layout: "flow" }));
    const errors = diagnostics.filter((d) => d.severity === "error");
    assert.strictEqual(errors.length, 0);
  });
});

// ── display config validation ──────────────────────────────

describe("validateDocument display config", () => {
  function minimalDoc(overrides?: Partial<ButtonsDocument>): ButtonsDocument {
    return {
      version: 1,
      groups: { main: { buttons: [{ command: "echo hi" }] } },
      ...overrides,
    };
  }

  it("accepts valid button_color and group_bg_color", () => {
    const diagnostics = validateDocument(minimalDoc({
      display: { button_color: "#FF0000", group_bg_color: "#00FF00" },
    }));
    const colorWarnings = diagnostics.filter((d) => d.message.includes("color"));
    assert.strictEqual(colorWarnings.length, 0);
  });

  it("warns on invalid button_color", () => {
    const diagnostics = validateDocument(minimalDoc({
      display: { button_color: "red" },
    }));
    assert.ok(diagnostics.some((d) => d.severity === "warning" && d.message.includes("color")));
  });

  it("warns on invalid group_bg_color", () => {
    const diagnostics = validateDocument(minimalDoc({
      display: { group_bg_color: "blue" },
    }));
    assert.ok(diagnostics.some((d) => d.severity === "warning" && d.message.includes("color")));
  });
});

// ── resolveDocument new display fields ─────────────────────

describe("resolveDocument display fields", () => {
  it("passes through buttonColor and groupBgColor", () => {
    const doc: ButtonsDocument = {
      version: 1,
      display: { button_color: "#FF0000", group_bg_color: "#00FF00" },
      groups: { main: { buttons: [{ id: "test", command: "echo" }] } },
    };
    const result = resolveDocument(doc, true, "grid", "current", []);
    assert.strictEqual(result.buttonColor, "#FF0000");
    assert.strictEqual(result.groupBgColor, "#00FF00");
  });

  it("leaves buttonColor and groupBgColor undefined when not set", () => {
    const doc: ButtonsDocument = {
      version: 1,
      groups: { main: { buttons: [{ id: "test", command: "echo" }] } },
    };
    const result = resolveDocument(doc, true, "grid", "current", []);
    assert.strictEqual(result.buttonColor, undefined);
    assert.strictEqual(result.groupBgColor, undefined);
  });
});

// ── resolveGroupDisplay ───────────────────────────────────

describe("resolveGroupDisplay", () => {
  const baseDisplay: ResolvedGroupDisplay = {
    layout: "grid",
    showCommandPreview: true,
    showLabels: true,
    showIcons: true,
    compact: false,
    showRun: true,
    showNewTerminal: true,
    showCopyToTerminal: true,
    showCopyToNewTerminal: true,
    showCopyToClipboard: true,
    runLabel: "Run",
    newTerminalLabel: "New Terminal",
    copyToTerminalLabel: "Copy to Terminal",
    copyToNewTerminalLabel: "Copy to New Terminal",
    copyToClipboardLabel: "Copy",
    commandClickToCopy: false,
  };

  it("returns base when no group display or layout", () => {
    const result = resolveGroupDisplay(baseDisplay, undefined, undefined);
    assert.deepStrictEqual(result, baseDisplay);
  });

  it("overrides layout from group.layout", () => {
    const result = resolveGroupDisplay(baseDisplay, undefined, "table");
    assert.strictEqual(result.layout, "table");
  });

  it("overrides fields from group display", () => {
    const result = resolveGroupDisplay(baseDisplay, { show_icons: false, compact: true }, undefined);
    assert.strictEqual(result.showIcons, false);
    assert.strictEqual(result.compact, true);
    assert.strictEqual(result.showLabels, true); // unchanged
  });

  it("overrides action button settings from group display", () => {
    const result = resolveGroupDisplay(baseDisplay, {
      show_run: false,
      show_copy_to_clipboard: false,
      run_color: "#FF0000",
    }, undefined);
    assert.strictEqual(result.showRun, false);
    assert.strictEqual(result.showCopyToClipboard, false);
    assert.strictEqual(result.runColor, "#FF0000");
    assert.strictEqual(result.showNewTerminal, true); // unchanged
  });

  it("group display colors override document colors", () => {
    const base = { ...baseDisplay, buttonColor: "#AAA", groupBgColor: "#BBB" };
    const result = resolveGroupDisplay(base, { button_color: "#CCC" }, undefined);
    assert.strictEqual(result.buttonColor, "#CCC");
    assert.strictEqual(result.groupBgColor, "#BBB"); // unchanged
  });

  it("overrides custom labels from group display", () => {
    const result = resolveGroupDisplay(baseDisplay, {
      run_label: "Execute",
      copy_to_clipboard_label: "Clipboard",
    }, undefined);
    assert.strictEqual(result.runLabel, "Execute");
    assert.strictEqual(result.copyToClipboardLabel, "Clipboard");
    assert.strictEqual(result.newTerminalLabel, "New Terminal"); // unchanged
  });

  it("overrides action icons from group display", () => {
    const result = resolveGroupDisplay(baseDisplay, {
      run_icon: "play",
      copy_to_clipboard_icon: "copy",
    }, undefined);
    assert.strictEqual(result.runIcon, "play");
    assert.strictEqual(result.copyToClipboardIcon, "copy");
    assert.strictEqual(result.newTerminalIcon, undefined); // unchanged
  });

  it("overrides sizes from group display", () => {
    const result = resolveGroupDisplay(baseDisplay, {
      label_size: "18px",
      action_size: "14px",
      action_border_radius: "999px",
    }, undefined);
    assert.strictEqual(result.labelSize, "18px");
    assert.strictEqual(result.actionSize, "14px");
    assert.strictEqual(result.actionBorderRadius, "999px");
  });

  it("overrides command_click_to_copy from group display", () => {
    const result = resolveGroupDisplay(baseDisplay, { command_click_to_copy: true }, undefined);
    assert.strictEqual(result.commandClickToCopy, true);
  });
});

// ── resolveDocument action button fields ───────────────────

describe("resolveDocument action button fields", () => {
  it("defaults all action buttons to visible", () => {
    const doc: ButtonsDocument = {
      version: 1,
      groups: { main: { buttons: [{ id: "test", command: "echo" }] } },
    };
    const result = resolveDocument(doc, true, "grid", "current", []);
    assert.strictEqual(result.showRun, true);
    assert.strictEqual(result.showNewTerminal, true);
    assert.strictEqual(result.showCopyToTerminal, true);
    assert.strictEqual(result.showCopyToNewTerminal, true);
    assert.strictEqual(result.showCopyToClipboard, true);
  });

  it("passes through action button display settings", () => {
    const doc: ButtonsDocument = {
      version: 1,
      display: { show_run: false, run_color: "#FF0000" },
      groups: { main: { buttons: [{ id: "test", command: "echo" }] } },
    };
    const result = resolveDocument(doc, true, "grid", "current", []);
    assert.strictEqual(result.showRun, false);
    assert.strictEqual(result.runColor, "#FF0000");
    assert.strictEqual(result.groups[0].showRun, false);
    assert.strictEqual(result.groups[0].runColor, "#FF0000");
  });

  it("group display overrides document display", () => {
    const doc: ButtonsDocument = {
      version: 1,
      display: { show_run: false },
      groups: {
        main: {
          display: { show_run: true },
          buttons: [{ id: "test", command: "echo" }],
        },
      },
    };
    const result = resolveDocument(doc, true, "grid", "current", []);
    assert.strictEqual(result.showRun, false); // document level
    assert.strictEqual(result.groups[0].showRun, true); // group overrides
  });

  it("group layout overrides document layout", () => {
    const doc: ButtonsDocument = {
      version: 1,
      layout: "grid",
      groups: {
        main: {
          layout: "table",
          buttons: [{ id: "test", command: "echo" }],
        },
      },
    };
    const result = resolveDocument(doc, true, "grid", "current", []);
    assert.strictEqual(result.layout, "grid");
    assert.strictEqual(result.groups[0].layout, "table");
  });
});

// ── action button color validation ────────────────────────

describe("validateDocument action button colors", () => {
  function minimalDoc(overrides?: Partial<ButtonsDocument>): ButtonsDocument {
    return {
      version: 1,
      groups: { main: { buttons: [{ command: "echo hi" }] } },
      ...overrides,
    };
  }

  it("accepts valid action button colors", () => {
    const diagnostics = validateDocument(minimalDoc({
      display: { run_color: "#FF0000", copy_to_clipboard_color: "#00FF00" },
    }));
    const colorWarnings = diagnostics.filter((d) => d.message.includes("color"));
    assert.strictEqual(colorWarnings.length, 0);
  });

  it("warns on invalid action button color", () => {
    const diagnostics = validateDocument(minimalDoc({
      display: { run_color: "red" },
    }));
    assert.ok(diagnostics.some((d) => d.severity === "warning" && d.message.includes("color")));
  });

  it("validates group display colors", () => {
    const diagnostics = validateDocument(minimalDoc({
      groups: {
        main: {
          display: { run_color: "bad" },
          buttons: [{ command: "echo" }],
        },
      },
    }));
    assert.ok(diagnostics.some((d) => d.severity === "warning" && d.message.includes("color")));
  });

  it("validates action button icon codicons", () => {
    const diagnostics = validateDocument(minimalDoc({
      display: { run_icon: "INVALID!" },
    }));
    assert.ok(diagnostics.some((d) => d.severity === "warning" && d.message.includes("codicon")));
  });

  it("accepts valid action button icons", () => {
    const diagnostics = validateDocument(minimalDoc({
      display: { run_icon: "play", copy_to_clipboard_icon: "copy" },
    }));
    const iconWarnings = diagnostics.filter((d) => d.message.includes("codicon"));
    assert.strictEqual(iconWarnings.length, 0);
  });
});

// ── resolveDocument custom labels and sizes ────────────────

describe("resolveDocument custom labels and sizes", () => {
  it("defaults action labels to standard text", () => {
    const doc: ButtonsDocument = {
      version: 1,
      groups: { main: { buttons: [{ id: "test", command: "echo" }] } },
    };
    const result = resolveDocument(doc, true, "grid", "current", []);
    assert.strictEqual(result.runLabel, "Run");
    assert.strictEqual(result.newTerminalLabel, "New Terminal");
    assert.strictEqual(result.copyToTerminalLabel, "Copy to Terminal");
    assert.strictEqual(result.copyToNewTerminalLabel, "Copy to New Terminal");
    assert.strictEqual(result.copyToClipboardLabel, "Copy");
    assert.strictEqual(result.commandClickToCopy, false);
  });

  it("passes custom labels to groups", () => {
    const doc: ButtonsDocument = {
      version: 1,
      display: { run_label: "Execute", copy_to_clipboard_label: "Clipboard" },
      groups: { main: { buttons: [{ id: "test", command: "echo" }] } },
    };
    const result = resolveDocument(doc, true, "grid", "current", []);
    assert.strictEqual(result.groups[0].runLabel, "Execute");
    assert.strictEqual(result.groups[0].copyToClipboardLabel, "Clipboard");
  });

  it("passes sizes and click-to-copy to groups", () => {
    const doc: ButtonsDocument = {
      version: 1,
      display: { label_size: "16px", action_size: "14px", command_click_to_copy: true },
      groups: { main: { buttons: [{ id: "test", command: "echo" }] } },
    };
    const result = resolveDocument(doc, true, "grid", "current", []);
    assert.strictEqual(result.groups[0].labelSize, "16px");
    assert.strictEqual(result.groups[0].actionSize, "14px");
    assert.strictEqual(result.groups[0].commandClickToCopy, true);
  });
});
