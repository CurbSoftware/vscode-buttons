import * as TOML from "@iarna/toml";
import * as vscode from "vscode";
import {
  ButtonsDocument,
  CombinedButtonsState,
  LayoutMode,
  LoadedButtonsState,
  TerminalMode,
} from "../models/types";
import { getButtonsFileUri, getUserButtonsFileUri } from "./findButtonsFile";
import { mergeDisplaySettings, resolveDocument, validateDocument } from "./configHelpers";

const EMPTY_STATE: LoadedButtonsState = {
  filePath: undefined,
  document: undefined,
  resolved: undefined,
  diagnostics: [],
};

async function loadSingleButtonsState(
  fileUri: vscode.Uri | undefined,
  showCommandPreviewFallback: boolean,
  defaultLayout: LayoutMode,
  defaultTerminal: TerminalMode,
): Promise<LoadedButtonsState> {
  if (!fileUri) {
    return EMPTY_STATE;
  }

  try {
    await vscode.workspace.fs.stat(fileUri);
  } catch {
    return { ...EMPTY_STATE, filePath: fileUri.fsPath };
  }

  try {
    const rawBytes = await vscode.workspace.fs.readFile(fileUri);
    const rawText = Buffer.from(rawBytes).toString("utf8");
    const parsed = TOML.parse(rawText) as unknown as ButtonsDocument;
    const diagnostics = validateDocument(parsed);
    const resolved = diagnostics.some((diagnostic) => diagnostic.severity === "error")
      ? undefined
      : resolveDocument(parsed, showCommandPreviewFallback, defaultLayout, defaultTerminal, diagnostics);

    return {
      filePath: fileUri.fsPath,
      document: parsed,
      resolved,
      diagnostics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    return {
      filePath: fileUri.fsPath,
      document: undefined,
      resolved: undefined,
      diagnostics: [{ message, severity: "error" }],
    };
  }
}

export async function loadCombinedButtonsState(
  showCommandPreviewFallback: boolean,
  defaultLayout: LayoutMode,
  defaultTerminal: TerminalMode,
): Promise<CombinedButtonsState> {
  const projectFileUri = getButtonsFileUri();
  const userFileUri = getUserButtonsFileUri();

  const [project, user] = await Promise.all([
    loadSingleButtonsState(projectFileUri, showCommandPreviewFallback, defaultLayout, defaultTerminal),
    loadSingleButtonsState(userFileUri, showCommandPreviewFallback, defaultLayout, defaultTerminal),
  ]);

  const activeSource = project.resolved ? "project" : user.resolved ? "user" : "project";

  return {
    user,
    project,
    activeSource,
    mergedDisplay: mergeDisplaySettings(user.resolved, project.resolved, {
      showCommandPreview: showCommandPreviewFallback,
      layout: defaultLayout,
    }),
  };
}

/** @deprecated Use loadCombinedButtonsState instead. Kept for backward compatibility. */
export async function loadButtonsState(
  showCommandPreviewFallback: boolean,
  defaultLayout: LayoutMode,
  defaultTerminal: TerminalMode,
): Promise<LoadedButtonsState> {
  const fileUri = getButtonsFileUri();
  return loadSingleButtonsState(fileUri, showCommandPreviewFallback, defaultLayout, defaultTerminal);
}
