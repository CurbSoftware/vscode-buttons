import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderHtml } from "../panel/ButtonsRenderer";
import type { ResolvedButton } from "../models/types";
import { bootWebview, type WebviewSession } from "./support/miniDom";
import { commandButton, scriptRow, webviewState } from "./support/webviewState";

/** The webview script runs in a vm realm, so clone messages before deep equality. */
function posted(session: WebviewSession): unknown[] {
  return JSON.parse(JSON.stringify(session.api.messages)) as unknown[];
}

function parentWithChild(): ResolvedButton {
  const child = commandButton("echo hi --verbose", [0, 0], { id: "child", entry: { args: "--verbose" } });
  child.kind = "args";
  child.command = "echo hi --verbose";
  return commandButton("echo hi", [0], { id: "parent", note: "greet", children: [child] });
}

describe("Buttons view client", () => {
  it("posts header and row actions, including a click that starts on the icon", () => {
    const session = bootWebview(renderHtml(webviewState({ projectButtons: [parentWithChild()] }), "codicon.css"));
    session.click(".codicon-refresh");
    session.click('[data-action="generate"]');
    session.click('[data-action="open-main-panel"]');
    session.click('[data-action="open-project-file"]');
    session.click('[data-action="open-global-file"]');
    session.click('[data-action="export-skill"]');
    session.click('[data-action="open-settings"]');
    session.click('[data-action="run-current"]');
    session.click('[data-action="run-new"]');
    session.click('[data-action="open-system"]');
    session.click('[data-action="copy"]');
    session.click('[data-action="duplicate"]');
    session.click('[data-action="start-add"]');
    session.click('[data-tab="scripts"]');
    assert.deepEqual(
      session.api.messages.map((message) => (message as { type: string }).type),
      [
        "rescan",
        "generate",
        "open-main-panel",
        "open-project-file",
        "open-global-file",
        "export-skill",
        "open-settings",
        "run-current",
        "run-new",
        "open-system",
        "copy",
        "duplicate",
        "start-add",
        "set-tab",
      ],
    );
    assert.deepEqual(posted(session)[7], { type: "run-current", source: "project", path: [0] });
    assert.deepEqual(posted(session)[13], { type: "set-tab", tab: "scripts" });
    const focus = String(session.api.getState()?.focusTarget ?? "");
    assert.match(focus, /data-action="set-tab"/);
    assert.match(focus, /data-tab="scripts"/);
  });

  it("asks for a second click before removing and clears that prompt on another click", () => {
    const session = bootWebview(renderHtml(webviewState({ projectButtons: [commandButton("echo hi")] }), "codicon.css"));
    const remove = session.click('[data-action="remove"]');
    assert.equal(remove.classList.contains("confirming"), true);
    assert.equal(remove.getAttribute("title"), "Confirm");
    assert.deepEqual(session.api.messages, []);
    session.click('[data-action="rescan"]');
    assert.equal(remove.classList.contains("confirming"), false);
    assert.equal(remove.getAttribute("title"), "Remove");
    session.click('[data-action="remove"]');
    session.click('[data-action="remove"]');
    assert.deepEqual(posted(session).at(-1), { type: "remove", source: "project", path: [0] });
  });

  it("posts append with space or newline", () => {
    const session = bootWebview(renderHtml(webviewState({ projectButtons: [commandButton("echo hi")] }), "codicon.css"));
    session.click('[data-action="append"][data-sep="space"]');
    session.click('[data-action="append"][data-sep="newline"]');
    assert.deepEqual(posted(session), [
      { type: "append", source: "project", path: [0], sep: "space" },
      { type: "append", source: "project", path: [0], sep: "newline" },
    ]);
  });

  it("posts a missing run button without a path", () => {
    const missing: ResolvedButton = {
      ...commandButton("npm run gone"),
      kind: "script",
      missing: true,
      entry: { type: "script", file: "package.json", script: "gone", packageDir: "", packageManager: "npm" },
    };
    const session = bootWebview(renderHtml(webviewState({ projectButtons: [missing] }), "codicon.css"));
    session.click('[data-action="run-current"]');
    assert.deepEqual(posted(session)[0], { type: "run-current" });
  });

  it("posts script, file, and scan-directory changes from the scripts tab", () => {
    const html = renderHtml(
      webviewState({
        activeTab: "scripts",
        discovered: [scriptRow("package.json", "dev", "pnpm dev"), scriptRow("package.json", "test", "pnpm test")],
        selectedKeys: ["package.json:dev"],
        scanDirectories: [{ path: "packages/api", recursive: false }],
      }),
      "codicon.css",
    );
    const session = bootWebview(html);
    const fileBox = session.document.querySelector('input[data-action="toggle-file"]');
    assert.equal(fileBox?.indeterminate, true);
    const scriptBox = session.document.querySelector('input[data-action="toggle-script"]');
    assert.ok(scriptBox);
    scriptBox.checked = false;
    session.document.dispatch("change", { type: "change", target: scriptBox });
    assert.ok(fileBox);
    fileBox.checked = true;
    session.document.dispatch("change", { type: "change", target: fileBox });
    const recursive = session.document.querySelector('input[data-action="toggle-scan-dir-recursive"]');
    assert.ok(recursive);
    recursive.checked = true;
    session.document.dispatch("change", { type: "change", target: recursive });
    session.click('[data-action="toggle-all"]');
    session.click('[data-action="toggle-group"]');
    assert.equal(session.document.querySelector(".scan-group")?.classList.contains("collapsed"), false);
    assert.deepEqual(posted(session)[0], {
      type: "toggle-script",
      file: "package.json",
      script: "dev",
      checked: false,
    });
    assert.deepEqual(posted(session)[1], { type: "toggle-file", file: "package.json", checked: true });
    assert.deepEqual(posted(session)[2], {
      type: "toggle-scan-dir-recursive",
      path: "packages/api",
      recursive: true,
    });
    assert.deepEqual(posted(session)[3], { type: "toggle-all", checked: true });
    const expanded = JSON.parse(JSON.stringify(session.api.getState()?.expandedFiles));
    assert.deepEqual(expanded, ["package.json"]);
  });

  it("submits a scan path from Enter and from Add, and ignores a blank path", () => {
    const session = bootWebview(renderHtml(webviewState({ activeTab: "scripts" }), "codicon.css"));
    session.click('[data-action="add-scan-dir"]');
    assert.deepEqual(session.api.messages, []);
    session.input("#add-scan-path", "  packages/api  ");
    session.keydown("#add-scan-path", "Enter");
    assert.deepEqual(posted(session)[0], { type: "add-scan-dir", path: "  packages/api  " });
    assert.equal(session.document.getElementById("add-scan-path")?.value, "");
    session.input("#add-scan-path", "/opt/tools");
    session.click('[data-action="add-scan-dir"]');
    assert.deepEqual(posted(session)[1], { type: "add-scan-dir", path: "/opt/tools" });
  });

  it("reads add, edit, and variant fields when saving", () => {
    const adding = bootWebview(renderHtml(webviewState({ addingSource: "global" }), "codicon.css"));
    adding.input("#add-command", " docker ps ");
    adding.input("#add-note", "containers");
    adding.click('[data-action="save-add"]');
    assert.deepEqual(posted(adding)[0], {
      type: "save-add",
      source: "global",
      command: " docker ps ",
      note: "containers",
    });

    const editing = bootWebview(
      renderHtml(
        webviewState({
          projectButtons: [commandButton("echo hi", [0], { note: "old" })],
          editing: { source: "project", path: [0] },
        }),
        "codicon.css",
      ),
    );
    editing.input("#edit-command", "echo there");
    editing.input("#edit-note", "new");
    editing.click('[data-action="save-edit"]');
    assert.deepEqual(posted(editing)[0], {
      type: "save-edit",
      source: "project",
      path: [0],
      command: "echo there",
      note: "new",
    });

    const parent = parentWithChild();
    const variant = bootWebview(
      renderHtml(webviewState({ projectButtons: [parent], addingChildPath: [0] }), "codicon.css"),
    );
    variant.input("#add-args", "--include app");
    variant.input("#add-child-note", "app");
    variant.click('[data-action="save-add-child"]');
    assert.deepEqual(posted(variant)[0], {
      type: "save-add-child",
      source: "project",
      path: [0],
      args: "--include app",
      note: "app",
    });
  });

  it("restores drafts and expanded groups after a reload", () => {
    const first = bootWebview(renderHtml(webviewState({ activeTab: "scripts", projectButtons: [] }), "codicon.css"));
    first.input("#add-scan-path", "packages/api");
    const saved = first.api.getState();
    const second = bootWebview(renderHtml(webviewState({ activeTab: "scripts" }), "codicon.css"), saved);
    assert.equal(second.document.getElementById("add-scan-path")?.value, "packages/api");

    const parent = parentWithChild();
    const opened = bootWebview(renderHtml(webviewState({ projectButtons: [parent] }), "codicon.css"));
    opened.click('[data-action="toggle-variants"]');
    assert.equal(opened.document.querySelector(".button-block")?.classList.contains("collapsed"), false);
    const restored = bootWebview(
      renderHtml(webviewState({ projectButtons: [parent] }), "codicon.css"),
      opened.api.getState(),
    );
    assert.equal(restored.document.querySelector(".button-block")?.classList.contains("collapsed"), false);
    const toggle = restored.document.querySelector('[data-action="toggle-variants"]');
    assert.equal(toggle?.getAttribute("aria-expanded"), "true");
  });

  it("stores column widths from a pointer drag in the editor", () => {
    const session = bootWebview(
      renderHtml(webviewState({ projectButtons: [commandButton("echo hi")] }), "codicon.css", "editor"),
    );
    session.pointer("pointerdown", '.col-resize[data-col="0"]', 0);
    session.pointer("pointermove", '.col-resize[data-col="0"]', 30);
    session.pointer("pointerup", '.col-resize[data-col="0"]', 30);
    const widths = session.api.getState()?.colWidths as number[];
    assert.equal(widths.length, 3);
    const sum = widths.reduce((total, width) => total + width, 0);
    assert.ok(Math.abs(sum - 100) < 0.02);
    assert.ok(widths.every((width) => width > 0));
  });

  it("posts a reorder for the same source and ignores a drop on the other source", () => {
    const html = renderHtml(
      webviewState({
        projectButtons: [commandButton("echo one", [0]), commandButton("echo two", [1], { id: "two" })],
        globalButtons: [commandButton("echo global", [0], { id: "global" })],
      }),
      "codicon.css",
    );
    const session = bootWebview(html);
    const handles = session.document.querySelectorAll(".drag-handle");
    assert.ok(handles.length >= 2);
    session.drag(".drag-handle", '.button-card[data-source="global"]');
    assert.deepEqual(session.api.messages, []);
    session.drag(".drag-handle", '.button-card[data-path="[1]"]');
    assert.deepEqual(posted(session)[0], {
      type: "reorder",
      source: "project",
      from: [0],
      to: [1],
    });
  });
});
