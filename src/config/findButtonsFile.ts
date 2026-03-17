import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
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

export function getUserButtonsFileUri(): vscode.Uri {
  return vscode.Uri.file(path.join(os.homedir(), ".buttons"));
}
