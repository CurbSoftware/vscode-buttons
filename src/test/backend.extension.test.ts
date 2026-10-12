import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { ExtensionContext } from "vscode";
import { vscode, type FakeWebviewView } from "./support/vscodeDouble";
import { activate, deactivate } from "../extension";

const repoRoot = path.resolve(__dirname, "../..");
const projectFile = "/ws/.buttons.json";
const globalFile = path.join(os.homedir(), ".buttons.json");
const termScript = path.join(os.tmpdir(), `buttons-term-${process.pid}.sh`);

let subscriptions: { dispose(): void }[] = [];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function boot(extensionPath = repoRoot): void {
  subscriptions = [];
  activate({
    extensionPath,
    extensionUri: vscode.Uri.file(extensionPath),
    subscriptions,
  } as unknown as ExtensionContext);
}

async function waitFor(pred: () => boolean, label: string): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > 2000) {
      throw new Error(`timed out waiting for ${label}`);
    }
    await delay(10);
  }
}

async function sidebar(): Promise<FakeWebviewView> {
  const provider = vscode.providers.get("buttons.sidebarView");
  assert.ok(provider, "sidebar provider was not registered");
  const view = vscode.createView();
  provider.resolveWebviewView(view);
  await waitFor(() => view.webview.html.includes("Buttons"), "sidebar html");
  return view;
}

function writeJson(file: string, value: unknown): void {
  vscode.writeFile(file, JSON.stringify(value, null, 2) + "\n");
}

function seedPackage(): void {
  writeJson("/ws/package.json", { scripts: { dev: "vite", test: "vitest" } });
  vscode.writeFile("/ws/pnpm-lock.yaml", "");
}

function seedButtons(buttons: unknown[]): void {
  writeJson(projectFile, { version: 1, buttons });
}

function readButtons(file = projectFile): { buttons: Array<Record<string, unknown>> } {
  return JSON.parse(vscode.readText(file) ?? "{}") as { buttons: Array<Record<string, unknown>> };
}

beforeEach(() => {
  vscode.reset();
  vscode.setWorkspace("/ws");
});

afterEach(async () => {
  for (const item of subscriptions) {
    item.dispose();
  }
  subscriptions = [];
  deactivate();
  vscode.reset();
  await delay(450);
  deactivate();
  vscode.reset();
  fs.rmSync(termScript, { force: true });
});

describe("extension host", { concurrency: false }, () => {
  it("registers the sidebar and the Buttons commands", () => {
    boot();
    assert.equal(vscode.providers.has("buttons.sidebarView"), true);
    assert.deepEqual(
      [...vscode.commandHandlers.keys()].sort(),
      [
        "buttons.addFileButton",
        "buttons.openGlobalButtons",
        "buttons.openMainPanel",
        "buttons.openPanel",
        "buttons.openProjectButtons",
        "buttons.rescan",
      ],
    );
  });

  it("focuses the sidebar and opens the editor from commands and messages", async () => {
    boot();
    await vscode.commands.executeCommand("buttons.openPanel");
    assert.deepEqual(
      vscode.executed.map((entry) => entry.command),
      ["buttons.openPanel", "buttons.sidebarView.focus"],
    );
    const view = await sidebar();
    await view.webview.fire({ type: "open-main-panel" });
    assert.equal(vscode.panels.length, 1);
    assert.equal(vscode.panels[0].title, "Buttons");
    assert.match(vscode.panels[0].webview.html, /buttons-table/);
    await view.webview.fire({ type: "open-settings" });
    const settings = vscode.executed.find((entry) => entry.command === "workbench.action.openSettings");
    assert.deepEqual(settings?.args, ["buttons"]);
  });

  it("creates a missing buttons file and leaves an existing one alone", async () => {
    boot();
    await vscode.commands.executeCommand("buttons.openProjectButtons");
    assert.match(vscode.readText(projectFile) ?? "", /"version": 1/);
    assert.equal(vscode.opened[0]?.fsPath, projectFile);
    assert.equal(vscode.shown[0]?.fsPath, projectFile);

    writeJson(projectFile, { version: 1, buttons: [{ type: "command", command: "echo stay" }] });
    await vscode.commands.executeCommand("buttons.openProjectButtons");
    assert.match(vscode.readText(projectFile) ?? "", /echo stay/);

    await vscode.commands.executeCommand("buttons.openGlobalButtons");
    assert.match(vscode.readText(globalFile) ?? "", /"version": 1/);
    assert.equal(vscode.opened.at(-1)?.fsPath, globalFile);
  });

  it("reports a missing workspace for file, generate, and explorer actions", async () => {
    vscode.workspace.workspaceFolders = undefined;
    boot();
    const view = await sidebar();
    await vscode.commands.executeCommand("buttons.openProjectButtons");
    await view.webview.fire({ type: "generate" });
    await view.webview.fire({ type: "open-project-file" });
    await vscode.commands.executeCommand("buttons.addFileButton", vscode.Uri.file("/tmp/run.sh"));
    assert.deepEqual(vscode.errors, [
      "No workspace folder is open.",
      "No workspace folder is open.",
      "No workspace folder is open.",
      "No workspace folder is open.",
    ]);
  });

  it("shows a parse error from a broken project file", async () => {
    vscode.writeFile(projectFile, "{");
    boot();
    const view = await sidebar();
    assert.match(view.webview.html, /class="error"/);
    assert.match(view.webview.html, /Invalid JSON\./);
  });

  it("adds, edits, duplicates, reorders, and removes buttons", async () => {
    seedButtons([{ type: "command", command: "echo a" }, { type: "command", command: "echo b", note: "second" }]);
    boot();
    const view = await sidebar();

    await view.webview.fire({ type: "save-add", source: "project", command: "   ", note: "" });
    assert.equal(readButtons().buttons.length, 2);
    await view.webview.fire({ type: "save-add", source: "global", command: "echo global", note: "everywhere" });
    assert.equal(readButtons(globalFile).buttons[0].command, "echo global");
    assert.match(view.webview.html, /echo global/);

    await view.webview.fire({ type: "start-add", source: "project" });
    assert.match(view.webview.html, /id="add-command"/);
    await view.webview.fire({ type: "cancel-add" });
    assert.doesNotMatch(view.webview.html, /id="add-command"/);

    await view.webview.fire({ type: "start-edit", source: "project", path: [0] });
    assert.match(view.webview.html, /id="edit-command"/);
    await view.webview.fire({ type: "cancel-edit" });
    assert.doesNotMatch(view.webview.html, /id="edit-command"/);
    await view.webview.fire({
      type: "save-edit",
      source: "project",
      path: [1],
      command: "echo changed",
      note: "later",
    });
    assert.equal(readButtons().buttons[1].command, "echo changed");
    assert.equal(readButtons().buttons[1].note, "later");

    await view.webview.fire({ type: "save-add-child", source: "project", path: [1], args: "   ", note: "" });
    assert.equal(readButtons().buttons[1].children, undefined);
    await view.webview.fire({ type: "save-add-child", source: "project", path: [1], args: "--verbose", note: "loud" });
    const child = (readButtons().buttons[1].children as Array<Record<string, unknown>>)[0];
    assert.equal(child.args, "--verbose");
    assert.equal(child.note, "loud");
    assert.equal(typeof child.id, "string");

    await view.webview.fire({ type: "duplicate", source: "project", path: [0] });
    assert.equal(readButtons().buttons.length, 3);
    assert.notEqual(readButtons().buttons[0].id, readButtons().buttons[1].id);

    await view.webview.fire({ type: "reorder", source: "project", path: [0], from: [2], to: [0] });
    assert.equal(readButtons().buttons[0].command, "echo changed");

    await view.webview.fire({ type: "start-edit", source: "project", path: [0] });
    await view.webview.fire({ type: "remove", source: "project", path: [0] });
    assert.doesNotMatch(view.webview.html, /id="edit-command"/);
    assert.equal(readButtons().buttons.some((button) => button.command === "echo changed"), false);
  });

  it("keeps the sidebar and editor on independent tabs", async () => {
    boot();
    const view = await sidebar();
    await vscode.commands.executeCommand("buttons.openMainPanel");
    const editor = vscode.panels[0];
    await view.webview.fire({ type: "set-tab", tab: "scripts" });
    assert.match(view.webview.html, /id="add-scan-path"/);
    assert.doesNotMatch(editor.webview.html, /id="add-scan-path"/);
    await editor.webview.fire({ type: "set-tab", tab: "scripts" });
    assert.match(editor.webview.html, /id="add-scan-path"/);
    await view.webview.fire({ type: "set-tab", tab: "buttons" });
    assert.doesNotMatch(view.webview.html, /id="add-scan-path"/);
    assert.match(editor.webview.html, /id="add-scan-path"/);
  });

  it("generates root scripts and toggles selection in the project file", async () => {
    seedPackage();
    vscode.writeFile("/ws/packages/api/package.json", JSON.stringify({ scripts: { start: "node ." } }));
    seedButtons([
      { type: "command", command: "echo keep" },
      {
        type: "script",
        file: "package.json",
        script: "dev",
        packageDir: "",
        packageManager: "pnpm",
        children: [{ args: "--open" }],
      },
    ]);
    boot();
    const view = await sidebar();
    await view.webview.fire({ type: "generate" });
    const generated = readButtons().buttons;
    assert.equal(generated[0].command, "echo keep");
    assert.equal(generated[1].script, "dev");
    assert.equal((generated[1].children as Array<{ args: string }>)[0].args, "--open");
    assert.equal(generated.some((button) => button.script === "test"), true);
    assert.equal(generated.some((button) => button.script === "start"), false);

    await view.webview.fire({ type: "toggle-script", file: "nope.json", script: "nope", checked: true });
    assert.equal(readButtons().buttons.length, generated.length);
    await view.webview.fire({ type: "toggle-script", file: "package.json", script: "dev", checked: false });
    assert.equal(readButtons().buttons.some((button) => button.script === "dev"), false);
    await view.webview.fire({ type: "toggle-file", file: "package.json", checked: true });
    assert.equal(readButtons().buttons.some((button) => button.script === "dev"), true);
    assert.equal(readButtons().buttons.some((button) => button.script === "test"), true);
    await view.webview.fire({ type: "toggle-all", checked: false });
    assert.equal(readButtons().buttons.every((button) => button.type === "command"), true);
    assert.equal(readButtons().buttons[0].command, "echo keep");
  });

  it("does not toggle scripts until the project file exists", async () => {
    seedPackage();
    boot();
    const view = await sidebar();
    await view.webview.fire({ type: "toggle-script", file: "package.json", script: "dev", checked: true });
    await view.webview.fire({ type: "toggle-file", file: "package.json", checked: true });
    await view.webview.fire({ type: "toggle-all", checked: true });
    assert.equal(vscode.readText(projectFile), undefined);
  });

  it("runs, copies, and appends from a button, and skips a missing one", async () => {
    seedPackage();
    vscode.setConfig("buttons.scanDirectories", [{ path: "packages/api", recursive: false }]);
    vscode.writeFile("/ws/packages/api/package.json", JSON.stringify({ scripts: { start: "node ." } }));
    seedButtons([
      {
        type: "script",
        file: "packages/api/package.json",
        script: "start",
        packageDir: "packages/api",
        packageManager: "npm",
      },
    ]);
    boot();
    const view = await sidebar();
    const active = vscode.window.createTerminal({ name: "shell" });
    vscode.window.activeTerminal = active;
    await view.webview.fire({ type: "run-current", source: "project", path: [0] });
    assert.deepEqual(
      active.sent.map((line) => line.text),
      ['cd "/ws/packages/api"', "pnpm start"],
    );
    assert.equal(active.sent.every((line) => line.execute), true);
    assert.equal(active.sent.some((line) => line.text.includes("&&")), false);

    await view.webview.fire({ type: "run-new", source: "project", path: [0] });
    const created = vscode.window.terminals.at(-1);
    assert.equal(created?.name, "Buttons: start");
    assert.equal(created?.cwd, "/ws/packages/api");
    assert.deepEqual(created?.sent, [{ text: "pnpm start", execute: true }]);

    await view.webview.fire({ type: "copy", source: "project", path: [0] });
    assert.equal(vscode.env.clipboard.text, "pnpm start");
    assert.deepEqual(vscode.infos, ["Copied command to clipboard."]);

    await view.webview.fire({ type: "append", source: "project", path: [0], sep: "space" });
    await view.webview.fire({ type: "append", source: "project", path: [0], sep: "newline" });
    const composed = vscode.window.terminals.find((terminal) => terminal.sent.some((line) => line.execute === false));
    assert.ok(composed);
    assert.equal(composed.sent.at(-1)?.execute, false);
    assert.match(composed.sent.at(-1)?.text ?? "", /\u001b\[200~/);

    vscode.setConfig("terminal.external.linuxExec", "/usr/bin/gnome-terminal");
    await view.webview.fire({ type: "open-system", source: "project", path: [0] });
    assert.equal(vscode.spawned[0]?.cmd, "/usr/bin/gnome-terminal");
    assert.equal(vscode.spawned[0]?.args[1], "/ws");

    seedButtons([{ type: "script", file: "gone.sh", script: "gone.sh", packageDir: "", packageManager: "shell" }]);
    await vscode.commands.executeCommand("buttons.rescan");
    const beforeTerminals = vscode.window.terminals.length;
    const beforeSpawn = vscode.spawned.length;
    await view.webview.fire({ type: "run-current", source: "project", path: [0] });
    await view.webview.fire({ type: "open-system", source: "project", path: [0] });
    assert.equal(vscode.window.terminals.length, beforeTerminals);
    assert.equal(vscode.spawned.length, beforeSpawn);
  });

  it("refuses the system terminal when the folder closes", async () => {
    seedButtons([{ type: "command", command: "echo hi", note: "Greet" }]);
    boot();
    const view = await sidebar();
    vscode.workspace.workspaceFolders = undefined;
    await view.webview.fire({ type: "open-system", source: "project", path: [0] });
    assert.deepEqual(vscode.errors, ["No workspace folder is open."]);
    assert.equal(vscode.spawned.length, 0);
    const active = vscode.window.createTerminal({ name: "shell" });
    vscode.window.activeTerminal = active;
    vscode.workspace.workspaceFolders = [{ uri: vscode.Uri.file("/ws"), name: "fixture", index: 0 }];
    await view.webview.fire({ type: "run-new", source: "project", path: [0] });
    assert.equal(vscode.window.terminals.at(-1)?.name, "Buttons: Greet");
  });

  it("turns paths into scan directories or standalone buttons", async () => {
    vscode.setDir("/ws/packages/api");
    vscode.writeFile("/ws/packages/api/package.json", "{}\n");
    vscode.writeFile("/ws/scripts/migrate.sh", "echo hi\n");
    boot();
    const view = await sidebar();

    await view.webview.fire({ type: "add-scan-dir", path: "." });
    assert.deepEqual(vscode.config["buttons.scanDirectories"], [{ path: "/ws", recursive: false }]);
    await view.webview.fire({ type: "remove-scan-dir", path: "/ws" });

    vscode.setDir("/ws/node_modules");
    await view.webview.fire({ type: "add-scan-dir", path: "node_modules" });
    assert.match(vscode.warnings[0] ?? "", /cannot be scanned/);

    await view.webview.fire({ type: "add-scan-dir", path: "missing/place" });
    assert.match(vscode.warnings.at(-1) ?? "", /does not exist/);

    await view.webview.fire({ type: "add-scan-dir", path: '"packages/api"' });
    assert.deepEqual(vscode.config["buttons.scanDirectories"], [{ path: "packages/api", recursive: false }]);
    await view.webview.fire({ type: "add-scan-dir", path: "packages/api" });
    assert.match(vscode.infos.at(-1) ?? "", /already a scan directory/);

    vscode.setDir("/opt/tools");
    await view.webview.fire({ type: "add-scan-dir", path: "/opt/tools" });
    assert.deepEqual(
      (vscode.config["buttons.scanDirectories"] as { path: string }[]).map((dir) => dir.path),
      ["packages/api", "/opt/tools"],
    );

    await view.webview.fire({ type: "add-scan-dir", path: "  \"scripts/migrate.sh\"  " });
    assert.equal(readButtons().buttons[0].script, "scripts/migrate.sh");
    await view.webview.fire({ type: "add-scan-dir", path: "scripts/migrate.sh" });
    assert.match(vscode.infos.at(-1) ?? "", /already a button/);

    await view.webview.fire({ type: "remove-scan-dir", path: "packages/api" });
    await view.webview.fire({ type: "toggle-scan-dir-recursive", path: "/opt/tools", recursive: true });
    assert.deepEqual(vscode.config["buttons.scanDirectories"], [{ path: "/opt/tools", recursive: true }]);
  });

  it("adds explorer files as buttons and manifest folders as scan directories", async () => {
    vscode.writeFile("/ws/scripts/a.sh", "echo a\n");
    vscode.writeFile("/ws/scripts/b.sh", "echo b\n");
    boot();
    await vscode.commands.executeCommand(
      "buttons.addFileButton",
      vscode.Uri.file("/ws/scripts/a.sh"),
      [vscode.Uri.file("/ws/scripts/a.sh"), vscode.Uri.file("/ws/scripts/b.sh")],
    );
    assert.deepEqual(
      readButtons().buttons.map((button) => button.script),
      ["scripts/a.sh", "scripts/b.sh"],
    );
    await vscode.commands.executeCommand("buttons.addFileButton", vscode.Uri.file("/ws/packages/api/package.json"));
    assert.deepEqual(vscode.config["buttons.scanDirectories"], [{ path: "packages/api", recursive: false }]);
  });

  it("clears an open edit form on rescan and keeps a failed scan-directory write", async () => {
    seedButtons([{ type: "command", command: "echo hi" }]);
    vscode.setConfig("buttons.scanDirectories", [{ path: "pkg", recursive: false }]);
    boot();
    const view = await sidebar();
    await view.webview.fire({ type: "start-edit", source: "project", path: [0] });
    assert.match(view.webview.html, /id="edit-command"/);
    await vscode.commands.executeCommand("buttons.rescan");
    assert.doesNotMatch(view.webview.html, /id="edit-command"/);

    vscode.failNextConfigUpdate = true;
    await view.webview.fire({ type: "remove-scan-dir", path: "pkg" });
    assert.deepEqual(vscode.errors, ["Could not save scan directories to workspace settings."]);
    assert.deepEqual(vscode.config["buttons.scanDirectories"], [{ path: "pkg", recursive: false }]);
  });

  it("applies text size and button colors on the next render", async () => {
    vscode.setConfig("buttons.textSize", "plus2");
    boot();
    const view = await sidebar();
    assert.match(view.webview.html, /\+ 2px/);
    vscode.setConfig("buttons.textSize", "plus4");
    vscode.workspace.fireConfiguration("buttons.textSize");
    await waitFor(() => view.webview.html.includes("+ 4px"), "text size");
    vscode.setConfig("buttons.colors.runBackground", "#123456");
    vscode.workspace.fireConfiguration("buttons.colors.runBackground");
    await waitFor(() => view.webview.html.includes("#123456"), "run color");
  });

  it("ignores script changes inside excluded directories and rescans the rest", async () => {
    seedPackage();
    boot();
    const view = await sidebar();
    assert.match(view.webview.html, /pnpm dev|Buttons/);
    const watcher = vscode.watchers.find((item) => typeof item.pattern === "string" && item.pattern.includes("requirements.txt"));
    assert.ok(watcher);
    const before = vscode.readCount;
    watcher.fireChange(vscode.Uri.file("/ws/node_modules/leftpad/package.json"));
    watcher.fireChange(vscode.Uri.file("/ws/.secret/package.json"));
    await delay(450);
    assert.equal(vscode.readCount, before);
    watcher.fireChange(vscode.Uri.file("/ws/package.json"));
    await delay(450);
    assert.ok(vscode.readCount > before);
  });

  it("watches absolute scan directories and disposes them on deactivate", () => {
    vscode.setConfig("buttons.scanDirectories", [{ path: "/opt/tools", recursive: true }]);
    boot();
    const external = vscode.watchers.filter((item) => typeof item.pattern !== "string");
    assert.equal(external.length, 1);
    deactivate();
    assert.equal(external[0].disposed, true);

    subscriptions.forEach((item) => item.dispose());
    subscriptions = [];
    vscode.watchers.splice(0);
    vscode.setConfig("buttons.scanDirectories", [{ path: "packages/api", recursive: false }]);
    boot();
    assert.equal(vscode.watchers.filter((item) => typeof item.pattern !== "string").length, 0);
  });

  it("copies the skill, writes it into the project, and reports load or clipboard failure", async () => {
    boot();
    const view = await sidebar();
    await view.webview.fire({ type: "export-skill" });
    assert.equal(vscode.env.clipboard.text, "");
    assert.equal(vscode.readText("/ws/BUTTONS-SKILL.md"), undefined);

    vscode.quickPickQueue.push({ label: "copy", action: "copy" });
    await view.webview.fire({ type: "export-skill" });
    assert.match(vscode.env.clipboard.text, /Create Buttons files/);
    assert.match(vscode.env.clipboard.text, /Buttons file JSON Schema/);
    assert.match(vscode.env.clipboard.text, /Buttons file examples/);
    assert.deepEqual(vscode.infos, ["Copied Buttons skill to clipboard."]);

    vscode.env.clipboard.fail = true;
    vscode.quickPickQueue.push({ label: "copy", action: "copy" });
    await view.webview.fire({ type: "export-skill" });
    assert.deepEqual(vscode.errors, ["Failed to copy the Buttons skill."]);
    vscode.env.clipboard.fail = false;

    vscode.quickPickQueue.push({ label: "add", action: "add" });
    await view.webview.fire({ type: "export-skill" });
    assert.match(vscode.readText("/ws/BUTTONS-SKILL.md") ?? "", /Create Buttons files/);
    assert.equal(vscode.shown.at(-1)?.fsPath, "/ws/BUTTONS-SKILL.md");

    vscode.writeFile("/ws/BUTTONS-SKILL.md", "old");
    vscode.warningChoice = undefined;
    vscode.quickPickQueue.push({ label: "add", action: "add" });
    await view.webview.fire({ type: "export-skill" });
    assert.equal(vscode.readText("/ws/BUTTONS-SKILL.md"), "old");
    assert.match(vscode.warnings[0] ?? "", /already exists/);

    vscode.warningChoice = "Replace";
    vscode.quickPickQueue.push({ label: "add", action: "add" });
    await view.webview.fire({ type: "export-skill" });
    assert.match(vscode.readText("/ws/BUTTONS-SKILL.md") ?? "", /Create Buttons files/);

    for (const item of subscriptions) {
      item.dispose();
    }
    deactivate();
    subscriptions = [];
    boot("/missing-extension-root");
    const broken = await sidebar();
    await broken.webview.fire({ type: "export-skill" });
    assert.deepEqual(vscode.errors.at(-1), "Could not load the Buttons AI skill.");
  });
});
