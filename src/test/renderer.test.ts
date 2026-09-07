import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderHtml } from "../panel/ButtonsRenderer";
import type { ResolvedButton, WebviewState } from "../models/types";

function state(overrides: Partial<WebviewState> = {}): WebviewState {
  return {
    projectButtons: [],
    globalButtons: [],
    discovered: [],
    selectedKeys: [],
    hasWorkspace: true,
    textSizePx: 0,
    projectFileExists: true,
    activeTab: "buttons",
    scanDirectories: [],
    buttonColors: {
      background: "",
      foreground: "",
      hoverBackground: "",
      actionBackground: "",
      actionForeground: "",
      commandForeground: "",
      rowBackground: "",
    },
    ...overrides,
  };
}

const child: ResolvedButton = {
  index: 0,
  path: [0, 0],
  id: "a1",
  kind: "args",
  command: "pnpm dev --include app1",
  entry: { args: "--include app1" },
  children: [],
};

const parent: ResolvedButton = {
  index: 0,
  path: [0],
  id: "c1",
  kind: "command",
  command: "pnpm dev",
  entry: { type: "command", command: "pnpm dev", children: [{ args: "--include app1" }] },
  children: [child],
};

describe("renderHtml", () => {
  it("renders append, duplicate, variants, and theme fallbacks", () => {
    const html = renderHtml(state({ projectButtons: [parent] }), "codicons.css");
    assert.doesNotMatch(html, /Insert selected/);
    assert.doesNotMatch(html, /data-action="insert"/);
    assert.doesNotMatch(html, /toggle-select/);
    assert.match(html, /data-action="append"/);
    assert.match(html, /data-sep="space"/);
    assert.match(html, /data-sep="newline"/);
    assert.match(html, /Duplicate/);
    assert.match(html, /drag-handle/);
    assert.match(html, /padding: 0 0 0 32px/);
    assert.match(html, /data-action="open-main-panel"/);
    assert.match(html, /class="badge variant-count"/);
    assert.match(html, /aria-label="1 variant"/);
    assert.match(html, /variant-count"[^>]*>1</);
    assert.match(html, /--btn-bg: var\(--vscode-button-background\)/);
    assert.match(html, /pnpm dev --include app1/);
    assert.match(html, /title="Remove"/);
    assert.match(html, /\.btn\.danger\.confirming::after/);
    assert.match(html, /setAttribute\("title", "Confirm"\)/);
  });

  it("keeps Generate available after the file exists", () => {
    const html = renderHtml(state({ projectFileExists: true }), "codicons.css");
    assert.match(html, /data-action="generate"/);
    assert.match(html, /Custom commands and your edits stay/);
  });

  it("applies custom button colors", () => {
    const html = renderHtml(
      state({
        buttonColors: {
          background: "#111111",
          foreground: "#eeeeee",
          hoverBackground: "#222222",
          actionBackground: "",
          actionForeground: "",
          commandForeground: "",
          rowBackground: "",
        },
      }),
      "codicons.css",
    );
    assert.match(html, /--btn-bg: #111111/);
    assert.match(html, /--btn-fg: #eeeeee/);
    assert.match(html, /--btn-hover: #222222/);
    assert.match(html, /--row-bg: #111111/);
  });

  it("applies split action, command, and row colors", () => {
    const html = renderHtml(
      state({
        buttonColors: {
          background: "",
          foreground: "",
          hoverBackground: "#222222",
          actionBackground: "#aaaaaa",
          actionForeground: "#bbbbbb",
          commandForeground: "#cccccc",
          rowBackground: "#dddddd",
        },
      }),
      "codicons.css",
    );
    assert.match(html, /--action-bg: #aaaaaa/);
    assert.match(html, /--action-fg: #bbbbbb/);
    assert.match(html, /--cmd-fg: #cccccc/);
    assert.match(html, /--row-bg: #dddddd/);
    assert.match(html, /--btn-bg: #aaaaaa/);
  });

  it("omits the variant count badge when a parent has no children", () => {
    const lone: ResolvedButton = { ...parent, children: [], entry: { type: "command", command: "pnpm dev" } };
    const html = renderHtml(state({ projectButtons: [lone] }), "codicons.css");
    assert.doesNotMatch(html, /class="badge variant-count"/);
  });

  it("nests a command child as its own block with a chevron", () => {
    const grand: ResolvedButton = {
      index: 0,
      path: [0, 0, 0],
      id: "g1",
      kind: "args",
      command: "echo b --x",
      entry: { args: "--x" },
      children: [],
    };
    const nested: ResolvedButton = {
      index: 0,
      path: [0, 0],
      id: "c2",
      kind: "command",
      command: "echo b",
      entry: { type: "command", command: "echo b", children: [{ args: "--x" }] },
      children: [grand],
    };
    const root: ResolvedButton = { ...parent, children: [nested], entry: { type: "command", command: "pnpm dev", children: [{ type: "command", command: "echo b" }] } };
    const html = renderHtml(state({ projectButtons: [root] }), "codicons.css");
    assert.match(html, /data-path="\[0,0\]"/);
    assert.match(html, /echo b --x/);
    const editor = renderHtml(state({ projectButtons: [root] }), "codicons.css", "editor");
    assert.doesNotMatch(editor, /data-action="open-main-panel"/);
  });
});
