import * as vscode from "vscode";
import type { ButtonsFile, RuntimeState } from "../models/types";
import { scanWorkspaceScripts } from "../scanner/scriptScanner";
import { isScriptFileType, scriptFileTypeOf, type ScriptFileType } from "../scanner/types";
import { emptyButtonsFile, parseButtonsFile, resolveButtons, serializeButtonsFile } from "./buttonsFile";
import { getGlobalButtonsFileUri, getProjectButtonsFileUri, getWorkspaceFolderUri } from "./findButtonsFile";

/** Read a `.buttons.json` file, returning an empty file (and optional error) when missing or malformed. */
export async function readButtonsFile(uri: vscode.Uri): Promise<{ file: ButtonsFile; error?: string; exists: boolean }> {
  try {
    const rawBytes = await vscode.workspace.fs.readFile(uri);
    const text = Buffer.from(rawBytes).toString("utf8");
    const parsed = parseButtonsFile(text);
    if (parsed.ok) {
      return { file: parsed.file, exists: true };
    }
    return { file: emptyButtonsFile(), error: parsed.error, exists: true };
  } catch {
    return { file: emptyButtonsFile(), exists: false };
  }
}

export async function writeButtonsFile(uri: vscode.Uri, file: ButtonsFile): Promise<void> {
  await vscode.workspace.fs.writeFile(uri, Buffer.from(serializeButtonsFile(file), "utf8"));
}

/** Read the `buttons.scriptFiles` setting, returning the enabled (and valid) file types. */
export function getEnabledScriptFiles(): ScriptFileType[] {
  const configured = vscode.workspace.getConfiguration("buttons").get<string[]>("scriptFiles") ?? ["package.json"];
  return configured.filter(isScriptFileType);
}

/** Load project + global files, scan the workspace, and resolve both button lists. */
export async function loadRuntimeState(): Promise<RuntimeState> {
  const projectUri = getProjectButtonsFileUri();
  const globalUri = getGlobalButtonsFileUri();

  const project = projectUri ? await readButtonsFile(projectUri) : { file: emptyButtonsFile(), exists: false };
  const global = await readButtonsFile(globalUri);

  const workspaceUri = getWorkspaceFolderUri();
  const allDiscovered = workspaceUri ? await scanWorkspaceScripts(workspaceUri) : [];
  const enabled = getEnabledScriptFiles();
  const discovered = allDiscovered.filter((d) => enabled.includes(scriptFileTypeOf(d)));

  const errors = [project.error, global.error].filter((e): e is string => Boolean(e));

  return {
    projectFile: project.file,
    globalFile: global.file,
    projectButtons: resolveButtons(project.file, allDiscovered, "project"),
    globalButtons: resolveButtons(global.file, allDiscovered, "global"),
    discovered,
    projectFileExists: project.exists,
    parseError: errors.length > 0 ? errors.join("\n") : undefined,
  };
}
