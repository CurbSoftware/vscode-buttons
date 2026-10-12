import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import * as os from "os";
import * as path from "path";
import type { Uri } from "vscode";
import { vscode } from "./support/vscodeDouble";
import { getButtonColors, getScanDirectories, loadRuntimeState, writeButtonsFile } from "../config/buttonsStore";
import { emptyButtonsFile } from "../config/buttonsFile";

function vsUri(fsPath: string): Uri {
  return vscode.Uri.file(fsPath) as unknown as Uri;
}

const projectFile = "/ws/.buttons.json";
const globalFile = path.join(os.homedir(), ".buttons.json");

beforeEach(() => {
  vscode.reset();
  vscode.setWorkspace("/ws");
});

describe("buttons file store", { concurrency: false }, () => {
  it("round-trips a project file through the workspace file system", async () => {
    const file = {
      version: 1 as const,
      buttons: [{ type: "command" as const, command: "echo hi", children: [{ args: "--a" }] }],
    };
    await writeButtonsFile(vsUri(projectFile), file);
    const state = await loadRuntimeState();
    assert.equal(state.projectFileExists, true);
    assert.deepEqual(state.projectFile, file);
    assert.equal(state.projectButtons[0].command, "echo hi");
    assert.equal(state.projectButtons[0].children[0].command, "echo hi --a");
    assert.equal(vscode.readText(projectFile)?.endsWith("\n"), true);
  });

  it("keeps a missing project file distinct from a malformed one", async () => {
    const missing = await loadRuntimeState();
    assert.equal(missing.projectFileExists, false);
    assert.deepEqual(missing.projectFile, emptyButtonsFile());
    assert.equal(missing.parseError, undefined);

    vscode.writeFile(projectFile, "{");
    vscode.writeFile(globalFile, "[1]");
    const bad = await loadRuntimeState();
    assert.equal(bad.projectFileExists, true);
    assert.deepEqual(bad.projectFile.buttons, []);
    assert.deepEqual(bad.globalFile.buttons, []);
    assert.equal(bad.parseError, "Invalid JSON.\nTop-level value must be an object.");
    assert.deepEqual(bad.projectButtons, []);
  });

  it("returns no discovered scripts when no folder is open", async () => {
    vscode.workspace.workspaceFolders = undefined;
    vscode.writeFile(globalFile, JSON.stringify({ version: 1, buttons: [{ type: "command", command: "echo global" }] }));
    const state = await loadRuntimeState();
    assert.equal(state.projectFileExists, false);
    assert.deepEqual(state.discovered, []);
    assert.equal(state.globalButtons[0].command, "echo global");
  });

  it("filters the scripts tab by enabled file types but still resolves other buttons", async () => {
    vscode.writeFile("/ws/package.json", JSON.stringify({ scripts: { dev: "vite" } }));
    vscode.writeFile("/ws/pnpm-lock.yaml", "");
    vscode.writeFile("/ws/Makefile", "build:\n\ttrue\n");
    vscode.writeFile(
      projectFile,
      JSON.stringify({
        version: 1,
        buttons: [{ type: "script", file: "Makefile", script: "build", packageDir: "", packageManager: "make" }],
      }),
    );
    const state = await loadRuntimeState();
    assert.deepEqual(
      state.discovered.map((script) => script.script),
      ["dev"],
    );
    assert.equal(state.projectButtons[0].command, "make build");
    assert.equal(state.projectButtons[0].missing, false);

    vscode.setConfig("buttons.scriptFiles", ["package.json", "not-a-type", "shell"]);
    const filtered = await loadRuntimeState();
    assert.deepEqual(
      filtered.discovered.map((script) => script.file),
      ["package.json"],
    );
  });

  it("normalizes scan directories from settings", () => {
    assert.deepEqual(getScanDirectories(vsUri("/ws")), []);
    vscode.setConfig("buttons.scanDirectories", [
      { path: "./packages/api/", recursive: "yes" },
      { path: "node_modules" },
    ]);
    assert.deepEqual(getScanDirectories(vsUri("/ws")), [{ path: "packages/api", recursive: false }]);
  });

  it("keeps only css colors the webview can safely inline", () => {
    vscode.setConfig("buttons.colors.runBackground", "  #0a0  ");
    vscode.setConfig("buttons.colors.runForeground", "#112233ff");
    vscode.setConfig("buttons.colors.copyBackground", "rgb(1, 2, 3)");
    vscode.setConfig("buttons.colors.copyForeground", "rgba(1, 2, 3, 0.5)");
    vscode.setConfig("buttons.colors.commandForeground", "red");
    vscode.setConfig("buttons.colors.commandBackground", "#gg0000");
    vscode.setConfig("buttons.colors.rowBackground", "expression(alert(1))");
    vscode.setConfig("buttons.colors.actionBackground", 12);
    const colors = getButtonColors();
    assert.equal(colors.runBackground, "#0a0");
    assert.equal(colors.runForeground, "#112233ff");
    assert.equal(colors.copyBackground, "rgb(1, 2, 3)");
    assert.equal(colors.copyForeground, "rgba(1, 2, 3, 0.5)");
    assert.equal(colors.commandForeground, "");
    assert.equal(colors.commandBackground, "");
    assert.equal(colors.rowBackground, "");
    assert.equal(colors.actionBackground, "");
    assert.equal(colors.hoverBackground, "");
  });
});
