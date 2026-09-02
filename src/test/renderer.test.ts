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
    buttonColors: { background: "", foreground: "", hoverBackground: "" },
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
    assert.match(html, /Add variant/);
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
      state({ buttonColors: { background: "#111111", foreground: "#eeeeee", hoverBackground: "#222222" } }),
      "codicons.css",
    );
    assert.match(html, /--btn-bg: #111111/);
    assert.match(html, /--btn-fg: #eeeeee/);
    assert.match(html, /--btn-hover: #222222/);
  });
});
