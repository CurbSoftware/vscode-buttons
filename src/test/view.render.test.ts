import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderHtml } from "../panel/ButtonsRenderer";
import { emptyButtonColors, type ResolvedButton } from "../models/types";
import { commandButton, scriptRow, webviewState } from "./support/webviewState";

function scriptButton(missing = false): ResolvedButton {
  return {
    index: 0,
    path: [0],
    id: "dev",
    kind: "script",
    command: "pnpm dev",
    note: "Vite",
    packageDir: "",
    missing,
    entry: {
      type: "script",
      file: "package.json",
      script: "dev",
      packageDir: "",
      packageManager: "pnpm",
      note: "Vite",
    },
    children: [],
  };
}

describe("Buttons view markup", () => {
  it("renders the sidebar as cards and the editor as a table", () => {
    const state = webviewState({ projectButtons: [commandButton("echo hi")] });
    const sidebar = renderHtml(state, "codicon.css", "sidebar");
    const editor = renderHtml(state, "codicon.css", "editor");
    assert.match(sidebar, /class="button-card/);
    assert.match(sidebar, /data-action="open-main-panel"/);
    assert.match(sidebar, /var\(--vscode-sideBar-background\)/);
    assert.doesNotMatch(sidebar, /class="buttons-table"/);
    assert.match(editor, /class="buttons-table"/);
    assert.match(editor, /aria-label="Resize Command column"/);
    assert.match(editor, /var\(--vscode-editor-background\)/);
    assert.doesNotMatch(editor, /data-action="open-main-panel"/);
    assert.match(editor, /Open in the system terminal/);
  });

  it("explains an empty workspace and hides Generate", () => {
    const html = renderHtml(webviewState({ hasWorkspace: false, projectFileExists: false }), "codicon.css");
    assert.match(html, /Open a folder to get started/);
    assert.match(html, /No global buttons yet/);
    assert.doesNotMatch(html, /data-action="generate"/);
    const scripts = renderHtml(
      webviewState({ hasWorkspace: false, activeTab: "scripts", projectFileExists: false }),
      "codicon.css",
    );
    assert.match(scripts, /Open a folder to scan for scripts/);
  });

  it("escapes parse errors and still shows the header", () => {
    const html = renderHtml(webviewState({ parseError: "bad <script>x</script>" }), "codicon.css");
    assert.match(html, /class="error"/);
    assert.match(html, /bad &lt;script&gt;x&lt;\/script&gt;/);
    assert.doesNotMatch(html, /bad <script>x<\/script>/);
    assert.match(html, /data-action="rescan"/);
  });

  it("renders scan directories, the locked root, and bulk selection", () => {
    const discovered = [scriptRow("package.json", "dev", "pnpm dev"), scriptRow("package.json", "test", "pnpm test")];
    const partial = renderHtml(
      webviewState({
        activeTab: "scripts",
        discovered,
        selectedKeys: ["package.json:dev"],
        scanDirectories: [{ path: "packages/api", recursive: true }],
      }),
      "codicon.css",
    );
    assert.match(partial, /always on/);
    assert.match(partial, /non-recursive/);
    assert.match(partial, /packages\/api/);
    assert.match(partial, /data-action="toggle-scan-dir-recursive"[^>]*checked/);
    assert.match(partial, /Select all/);
    assert.match(partial, /data-checked="true"/);
    assert.match(partial, /data-selected-count="1"/);
    assert.match(partial, /data-total="2"/);

    const all = renderHtml(
      webviewState({
        activeTab: "scripts",
        discovered,
        selectedKeys: ["package.json:dev", "package.json:test"],
      }),
      "codicon.css",
    );
    assert.match(all, /Unselect all/);
    assert.match(all, /data-checked="false"/);
  });

  it("shows the generate call to action once when the project file is missing", () => {
    const html = renderHtml(
      webviewState({
        activeTab: "scripts",
        projectFileExists: false,
        discovered: [scriptRow("package.json", "dev", "pnpm dev")],
      }),
      "codicon.css",
    );
    assert.equal(html.match(/data-action="generate"/g)?.length, 1);
    assert.match(html, /Generate buttons file/);
    assert.match(html, /disabled/);
    assert.doesNotMatch(html, /Select all/);
  });

  it("says when a scan finds nothing", () => {
    const html = renderHtml(webviewState({ activeTab: "scripts", discovered: [] }), "codicon.css");
    assert.match(html, /No scripts found/);
    assert.match(html, /id="add-scan-path"/);
  });

  it("hides run actions on a missing script and keeps duplicate and remove", () => {
    const html = renderHtml(webviewState({ projectButtons: [scriptButton(true)] }), "codicon.css");
    assert.match(html, /class="badge missing"/);
    assert.match(html, /not found/);
    const run = html.match(/<button class="btn primary action-hidden"[^>]*>Run<\/button>/);
    assert.ok(run);
    assert.equal(run[0].includes("data-path"), false);
    assert.match(html, /data-action="duplicate"/);
    assert.match(html, /data-action="remove"/);
  });

  it("applies the text size delta", () => {
    assert.match(renderHtml(webviewState({ textSizePx: 0 }), "c.css"), /\+ 0px\)/);
    assert.match(renderHtml(webviewState({ textSizePx: 2 }), "c.css"), /\+ 2px\)/);
    assert.match(renderHtml(webviewState({ textSizePx: 4 }), "c.css"), /\+ 4px\)/);
  });

  it("opens edit and add forms for commands, scripts, and variants", () => {
    const command = commandButton("echo hi", [0], { note: "greet" });
    const editing = renderHtml(
      webviewState({ projectButtons: [command], editing: { source: "project", path: [0] } }),
      "c.css",
    );
    assert.match(editing, /id="edit-command"/);
    assert.match(editing, /id="edit-note"/);
    assert.match(editing, />Save</);
    assert.match(editing, /data-action="cancel-edit"/);

    const scriptEdit = renderHtml(
      webviewState({ projectButtons: [scriptButton()], editing: { source: "project", path: [0] } }),
      "c.css",
    );
    assert.doesNotMatch(scriptEdit, /id="edit-command"/);
    assert.match(scriptEdit, /id="edit-note"/);
    assert.match(renderHtml(webviewState({ projectButtons: [scriptButton()] }), "c.css"), />Note</);
    assert.match(renderHtml(webviewState({ projectButtons: [command] }), "c.css"), />Edit</);

    const adding = renderHtml(webviewState({ addingSource: "project" }), "c.css");
    assert.match(adding, /id="add-command"/);
    assert.match(adding, /data-action="save-add"/);

    const child = commandButton("echo hi --verbose", [0, 0], {
      id: "child",
      entry: { args: "--verbose" },
    });
    child.kind = "args";
    const parent = commandButton("echo hi", [0], { children: [child] });
    const variant = renderHtml(webviewState({ projectButtons: [parent], addingChildPath: [0] }), "c.css");
    assert.match(variant, /id="add-args"/);
    assert.match(variant, /data-action="save-add-child"/);
    assert.match(variant, /data-nest="0"/);
    assert.match(variant, /data-nest="1"/);
  });

  it("cycles nest colors and escapes command text", () => {
    const deep = commandButton("echo", [0, 0, 0, 0]);
    const html = renderHtml(webviewState({ projectButtons: [deep] }), "c.css");
    assert.match(html, /data-nest="3"/);
    for (const level of ["0", "1", "2", "3", "4"]) {
      assert.match(html, new RegExp(`button-block\\[data-nest="${level}"\\]`));
    }
    const hostile = commandButton(`</code><img src=x onerror=alert(1)>`, [0], {
      note: `<img src=x onerror=alert(1)>`,
    });
    const escaped = renderHtml(
      webviewState({
        projectButtons: [hostile],
        scanDirectories: [{ path: "pkg/<script>", recursive: false }],
        activeTab: "buttons",
      }),
      "c.css",
    );
    assert.match(escaped, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.doesNotMatch(escaped, /<img src=x onerror=alert\(1\)>/);
    const scripts = renderHtml(
      webviewState({
        activeTab: "scripts",
        scanDirectories: [{ path: "pkg/<script>alert(1)</script>", recursive: false }],
      }),
      "c.css",
    );
    assert.match(scripts, /pkg\/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(scripts, /pkg\/<script>alert/);
  });

  it("labels the global section and uses empty colors as theme tokens", () => {
    const html = renderHtml(webviewState(), "codicon.css");
    assert.match(html, /Applies to every project/);
    assert.match(html, /--btn-bg: var\(--vscode-button-background\)/);
    assert.equal(emptyButtonColors().runBackground, "");
  });
});
