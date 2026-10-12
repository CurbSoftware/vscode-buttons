import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Uri, WebviewView } from "vscode";
import { vscode } from "./support/vscodeDouble";
import { ButtonsPanel } from "../panel/ButtonsPanel";
import { ButtonsSidebarProvider } from "../panel/ButtonsSidebarProvider";
import { commandButton, webviewState } from "./support/webviewState";

const extensionUri = vscode.Uri.file("/ext") as unknown as Uri;

describe("Buttons view host", { concurrency: false }, () => {
  it("renders the sidebar, forwards messages, and stops updating after dispose", async () => {
    vscode.reset();
    const messages: unknown[] = [];
    let current = webviewState({ projectButtons: [commandButton("echo first")] });
    const provider = new ButtonsSidebarProvider(
      extensionUri,
      async () => current,
      async (message) => {
        messages.push(message);
      },
    );
    const view = vscode.createView();
    await provider.refresh();
    assert.equal(view.webview.html, "");
    provider.resolveWebviewView(view as unknown as WebviewView);
    await view.webview.fire({ type: "rescan" });
    assert.equal(view.webview.options.enableScripts, true);
    assert.deepEqual(view.webview.options.localResourceRoots, [vscode.Uri.file("/ext")]);
    assert.match(view.webview.html, /class="button-card/);
    assert.match(view.webview.html, /echo first/);
    assert.match(view.webview.html, /codicon\.css/);
    assert.doesNotMatch(view.webview.html, /<table class="buttons-table"/);
    assert.deepEqual(messages, [{ type: "rescan" }]);
    current = webviewState({ projectButtons: [commandButton("echo second")] });
    await provider.refresh();
    assert.match(view.webview.html, /echo second/);
    view.dispose();
    current = webviewState({ projectButtons: [commandButton("echo third")] });
    await provider.refresh();
    assert.match(view.webview.html, /echo second/);
    assert.doesNotMatch(view.webview.html, /echo third/);
  });

  it("opens one editor panel, reveals it again, and drops it on dispose", async () => {
    vscode.reset();
    const messages: unknown[] = [];
    const panel = new ButtonsPanel(
      extensionUri,
      async () => webviewState({ projectButtons: [commandButton("echo editor")] }),
      async (message) => {
        messages.push(message);
      },
    );
    await panel.refresh();
    assert.equal(vscode.panels.length, 0);
    await panel.createOrShow();
    assert.equal(vscode.panels.length, 1);
    const created = vscode.panels[0];
    assert.equal(created.viewType, "buttons.mainPanel");
    assert.equal(created.title, "Buttons");
    assert.equal(created.options.enableScripts, true);
    assert.equal(created.options.retainContextWhenHidden, true);
    assert.equal(created.iconPath?.light.fsPath, "/ext/media/buttons-icon.svg");
    assert.match(created.webview.html, /buttons-table/);
    assert.match(created.webview.html, /echo editor/);
    await created.webview.fire({ type: "copy", source: "project", path: [0] });
    assert.deepEqual(messages, [{ type: "copy", source: "project", path: [0] }]);
    await panel.createOrShow();
    assert.equal(vscode.panels.length, 1);
    assert.equal(created.revealed, 1);
    created.dispose();
    await panel.createOrShow();
    assert.equal(vscode.panels.length, 2);
    assert.match(vscode.panels[1].webview.html, /echo editor/);
  });
});
