import * as path from "node:path";
import * as vscode from "vscode";

export function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const [firstFolder] = vscode.workspace.workspaceFolders ?? [];
  return firstFolder;
}

export function getButtonsFileUri(): vscode.Uri | undefined {
  const workspaceFolder = getWorkspaceFolder();
  if (!workspaceFolder) {
    return undefined;
  }

  return vscode.Uri.joinPath(workspaceFolder.uri, ".buttons");
}

export function getRelativeButtonsFilePath(): string {
  return path.join(".", ".buttons");
}