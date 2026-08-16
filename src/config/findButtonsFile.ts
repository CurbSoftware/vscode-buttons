import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const [firstFolder] = vscode.workspace.workspaceFolders ?? [];
  return firstFolder;
}

export function getWorkspaceFolderUri(): vscode.Uri | undefined {
  return getWorkspaceFolder()?.uri;
}

/** `<workspace root>/.buttons.json`, or undefined when no workspace folder is open. */
export function getProjectButtonsFileUri(): vscode.Uri | undefined {
  const workspaceFolder = getWorkspaceFolder();
  if (!workspaceFolder) {
    return undefined;
  }
  return vscode.Uri.joinPath(workspaceFolder.uri, ".buttons.json");
}

/** `~/.buttons.json` - the global profile that applies to every project. */
export function getGlobalButtonsFileUri(): vscode.Uri {
  return vscode.Uri.file(path.join(os.homedir(), ".buttons.json"));
}
