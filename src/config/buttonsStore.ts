import * as vscode from "vscode";
import type { ButtonColors, ButtonsFile, RuntimeState } from "../models/types";
import { normalizeScanDirectories, type ScanDirectory } from "../scanner/scanScope";
import { scanWorkspaceScripts } from "../scanner/scriptScanner";
import { isScriptFileType, scriptFileTypeOf, type ScriptFileType } from "../scanner/types";
import { emptyButtonsFile, parseButtonsFile, resolveButtons, scriptEntryFiles, serializeButtonsFile } from "./buttonsFile";
import { getGlobalButtonsFileUri, getProjectButtonsFileUri, getWorkspaceFolderUri } from "./findButtonsFile";

/** Read a `.buttons.json` file, returning an empty file (and optional error) when missing or malformed. */
async function readButtonsFile(uri: vscode.Uri): Promise<{ file: ButtonsFile; error?: string; exists: boolean }> {
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
function getEnabledScriptFiles(): ScriptFileType[] {
  const configured =
    vscode.workspace.getConfiguration("buttons").get<string[]>("scriptFiles") ?? ["package.json", "shell", "python"];
  return configured.filter(isScriptFileType);
}

/**
 * Read and normalize the `buttons.scanDirectories` setting. The setting is
 * resource-scoped, so pass the workspace folder URI to honor folder-level
 * overrides.
 */
export function getScanDirectories(resource?: vscode.Uri): ScanDirectory[] {
  return normalizeScanDirectories(vscode.workspace.getConfiguration("buttons", resource).get("scanDirectories"));
}

const CSS_COLOR = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\(\s*[\d.]+\s*(,\s*[\d.]+\s*){2,3}\))$/;

function sanitizeCssColor(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return CSS_COLOR.test(trimmed) ? trimmed : "";
}

/** Empty strings mean the webview should inherit VS Code button theme tokens. */
export function getButtonColors(): ButtonColors {
  const cfg = vscode.workspace.getConfiguration("buttons");
  return {
    background: sanitizeCssColor(cfg.get("colors.background")),
    foreground: sanitizeCssColor(cfg.get("colors.foreground")),
    hoverBackground: sanitizeCssColor(cfg.get("colors.hoverBackground")),
  };
}

/** Load project + global files, scan the workspace, and resolve both button lists. */
export async function loadRuntimeState(): Promise<RuntimeState> {
  const projectUri = getProjectButtonsFileUri();
  const globalUri = getGlobalButtonsFileUri();

  const project = projectUri ? await readButtonsFile(projectUri) : { file: emptyButtonsFile(), exists: false };
  const global = await readButtonsFile(globalUri);

  const workspaceUri = getWorkspaceFolderUri();
  // Standalone file entries (project + global) resolve without a matching scan
  // scope; the scanner stats them directly. Global absolute paths give buttons
  // that follow the user into every workspace.
  const entryFilePaths = [...scriptEntryFiles(project.file), ...scriptEntryFiles(global.file)];
  const allDiscovered = workspaceUri
    ? await scanWorkspaceScripts(workspaceUri, getScanDirectories(workspaceUri), entryFilePaths)
    : [];
  const enabled = getEnabledScriptFiles();
  const discovered = allDiscovered.filter((d) => enabled.includes(scriptFileTypeOf(d)));

  const errors = [project.error, global.error].filter((e): e is string => Boolean(e));

  return {
    projectFile: project.file,
    globalFile: global.file,
    projectButtons: resolveButtons(project.file, allDiscovered),
    globalButtons: resolveButtons(global.file, allDiscovered),
    discovered,
    projectFileExists: project.exists,
    parseError: errors.length > 0 ? errors.join("\n") : undefined,
  };
}
