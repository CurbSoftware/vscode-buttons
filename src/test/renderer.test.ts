import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderHtml, variantBadgeLabel } from "../panel/ButtonsRenderer";
import { emptyButtonColors, type ResolvedButton, type WebviewState } from "../models/types";

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
    buttonColors: emptyButtonColors(),
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
    assert.match(html, /data-action="export-skill"/);
    assert.match(html, /data-action="open-system"/);
    assert.match(html, /class="badge variant-count"/);
    assert.match(html, /aria-label="1 variant"/);
    assert.match(html, /variant-count"[^>]*>1</);
    assert.doesNotMatch(html, /\.variant-count\{[^}]*display:\s*none/);
    assert.doesNotMatch(html, /variant-count \{ display: none/);
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
          ...emptyButtonColors(),
          background: "#111111",
          foreground: "#eeeeee",
          hoverBackground: "#222222",
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
          ...emptyButtonColors(),
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

  it("applies per-action, command background, variant, and striped row colors", () => {
    const html = renderHtml(
      state({
        buttonColors: {
          ...emptyButtonColors(),
          runBackground: "#111111",
          runForeground: "#eeeeee",
          copyBackground: "#222222",
          commandBackground: "#333333",
          variantCommandForeground: "#444444",
          variantCommandBackground: "#555555",
          rowOddBackground: "#666666",
          rowEvenBackground: "#777777",
          variantRowOddBackground: "#888888",
          variantRowEvenBackground: "#999999",
        },
      }),
      "codicons.css",
    );
    assert.match(html, /data-action="run-current"\]\{background:#111111/);
    assert.match(html, /data-action="copy"\]\{background:#222222/);
    assert.match(html, /--cmd-bg: #333333/);
    assert.match(html, /--variant-cmd-fg: #444444/);
    assert.match(html, /--variant-cmd-bg: #555555/);
    assert.match(html, /--row-odd: #666666/);
    assert.match(html, /--row-even: #777777/);
    assert.match(html, /--variant-row-odd: #888888/);
    assert.match(html, /--variant-row-even: #999999/);
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
    assert.match(editor, /data-action="export-skill"/);
  });

  it("lets an args variant nest further with its own chevron and add-variant", () => {
    const html = renderHtml(state({ projectButtons: [parent] }), "codicons.css");
    assert.match(html, /data-path="\[0,0\]"/);
    assert.match(html, /data-action="start-add-child"[^>]*data-path="\[0,0\]"/);
    assert.match(html, /data-action="toggle-variants"[^>]*data-path="\[0,0\]"/);
    const editor = renderHtml(state({ projectButtons: [parent] }), "codicons.css", "editor");
    assert.match(editor, /data-action="start-add-child"[^>]*data-path="\[0,0\]"/);
    assert.match(editor, /class="nested-block-row"/);
    assert.match(editor, /--nest-indent:32px/);
    assert.match(editor, /padding-left: calc\(6px \+ var\(--nest-indent\)\)/);
    assert.match(editor, /tr\[data-path\]:hover > td/);
    assert.match(editor, /class="add-variant-row"/);
    assert.match(editor, /table-layout: fixed/);
    assert.match(editor, /--nest-accent: var\(--vscode-charts-blue/);
    assert.match(editor, /<tbody class="button-block collapsed" data-nest="1"/);
    assert.match(editor, /overflow-x: hidden/);
    assert.doesNotMatch(editor, /overflow-x: auto/);
    assert.match(editor, /class="action-group"/);
    assert.match(editor, /\.badge\.variant-count \{[\s\S]*?background: transparent/);
    assert.match(editor, /border-color: var\(--nest-accent/);
    assert.match(editor, /class="col-resize"/);
    assert.match(editor, /--col-cmd: 56%/);
    assert.doesNotMatch(editor, /--vscode-badge-background/);
    assert.match(editor, /tr\[data-path\],/);
  });

  it("shows direct:deeper on the parent badge when variants nest further", () => {
    const gA1: ResolvedButton = { index: 0, path: [0, 0, 0], id: "a1", kind: "args", command: "a --1", entry: { args: "--1" }, children: [] };
    const gA2: ResolvedButton = { index: 1, path: [0, 0, 1], id: "a2", kind: "args", command: "a --2", entry: { args: "--2" }, children: [] };
    const gA3: ResolvedButton = { index: 2, path: [0, 0, 2], id: "a3", kind: "args", command: "a --3", entry: { args: "--3" }, children: [] };
    const gB1: ResolvedButton = { index: 0, path: [0, 1, 0], id: "b1", kind: "args", command: "b --1", entry: { args: "--1" }, children: [] };
    const gB2: ResolvedButton = { index: 1, path: [0, 1, 1], id: "b2", kind: "args", command: "b --2", entry: { args: "--2" }, children: [] };
    const first: ResolvedButton = {
      index: 0,
      path: [0, 0],
      id: "c-a",
      kind: "command",
      command: "echo a",
      entry: { type: "command", command: "echo a", children: [{ args: "--1" }, { args: "--2" }, { args: "--3" }] },
      children: [gA1, gA2, gA3],
    };
    const second: ResolvedButton = {
      index: 1,
      path: [0, 1],
      id: "c-b",
      kind: "command",
      command: "echo b",
      entry: { type: "command", command: "echo b", children: [{ args: "--1" }, { args: "--2" }] },
      children: [gB1, gB2],
    };
    const root: ResolvedButton = {
      ...parent,
      children: [first, second],
      entry: { type: "command", command: "pnpm dev", children: [first.entry, second.entry] },
    };
    assert.equal(variantBadgeLabel(root), "2:5");
    assert.equal(variantBadgeLabel(first), "3");
    assert.equal(variantBadgeLabel(second), "2");
    const html = renderHtml(state({ projectButtons: [root] }), "codicons.css", "editor");
    assert.match(html, /variant-count"[^>]*>2:5</);
    assert.match(html, /aria-label="2 variants, 5 nested"/);
    assert.match(html, /<tbody class="button-block collapsed" data-nest="0"/);
  });
});
