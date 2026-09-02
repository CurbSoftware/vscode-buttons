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
  it("renders insert, duplicate, variants, and theme fallbacks", () => {
    const html = renderHtml(state({ projectButtons: [parent] }), "codicons.css");
    assert.match(html, /Insert selected/);
    assert.match(html, /data-action="insert"/);
    assert.match(html, /Duplicate/);
    assert.match(html, /drag-handle/);
    assert.match(html, /Add variant/);
    assert.match(html, /--btn-bg: var\(--vscode-button-background\)/);
    assert.match(html, /pnpm dev --include app1/);
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
