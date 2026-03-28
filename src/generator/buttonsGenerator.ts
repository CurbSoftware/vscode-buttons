import * as vscode from "vscode";
import { DiscoveredScript, scanWorkspaceScripts } from "../scanner/scriptScanner";
import { generateButtonsToml } from "./tomlGenerator";
import { getButtonsFileUri } from "../config/findButtonsFile";

export { generateButtonsToml } from "./tomlGenerator";

export async function importScriptsCommand(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    void vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }

  const workspaceUri = workspaceFolders[0].uri;
  const scripts = await scanWorkspaceScripts(workspaceUri);

  if (scripts.length === 0) {
    const create = await vscode.window.showInformationMessage(
      "No scripts found in package.json or Makefile.",
      "Create Empty .buttons",
    );
    if (create === "Create Empty .buttons") {
      await createMinimalButtonsFile();
    }
    return;
  }

  // Build QuickPick items grouped by source
  const items: (vscode.QuickPickItem & { script?: DiscoveredScript })[] = [];
  const sources = [...new Set(scripts.map((s) => s.source))];

  for (const source of sources) {
    items.push({ label: source, kind: vscode.QuickPickItemKind.Separator });
    for (const script of scripts.filter((s) => s.source === source)) {
      items.push({
        label: script.label,
        description: script.source,
        detail: script.command,
        picked: true,
        script,
      });
    }
  }

  const selected = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    placeHolder: "Select scripts to import as buttons",
    title: "Import Scripts",
  });

  if (!selected || selected.length === 0) {
    return;
  }

  const selectedScripts = selected
    .filter((item) => item.script !== undefined)
    .map((item) => item.script!);

  const workspaceName = workspaceFolders[0].name;
  const toml = generateButtonsToml(selectedScripts, workspaceName);

  const fileUri = getButtonsFileUri();
  if (!fileUri) {
    // No workspace — open as preview
    const doc = await vscode.workspace.openTextDocument({ content: toml, language: "toml" });
    await vscode.window.showTextDocument(doc);
    return;
  }

  let fileExists = false;
  try {
    await vscode.workspace.fs.stat(fileUri);
    fileExists = true;
  } catch { /* not found */ }

  if (fileExists) {
    const choice = await vscode.window.showWarningMessage(
      "A .buttons file already exists.",
      { modal: true },
      "Replace",
      "Open Preview",
    );

    if (choice === "Replace") {
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(toml, "utf8"));
      const doc = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(doc);
    } else if (choice === "Open Preview") {
      const doc = await vscode.workspace.openTextDocument({ content: toml, language: "toml" });
      await vscode.window.showTextDocument(doc);
    }
    return;
  }

  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(toml, "utf8"));
  const doc = await vscode.workspace.openTextDocument(fileUri);
  await vscode.window.showTextDocument(doc);
  void vscode.window.showInformationMessage("Created .buttons file from scripts.");
}

async function createMinimalButtonsFile(): Promise<void> {
  const fileUri = getButtonsFileUri();
  if (!fileUri) {
    void vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }

  const content = `version = 1
title = "My Buttons"

[groups.commands]
name = "Commands"
icon = "terminal"

[[groups.commands.buttons]]
id = "example"
label = "Example"
command = "echo Hello from Buttons!"
`;

  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, "utf8"));
  const doc = await vscode.workspace.openTextDocument(fileUri);
  await vscode.window.showTextDocument(doc);
}
