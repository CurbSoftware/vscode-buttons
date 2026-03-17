import * as path from "path";
import * as TOML from "@iarna/toml";
import * as vscode from "vscode";
import {
  ButtonsDiagnostic,
  ButtonsDocument,
  CombinedButtonsState,
  LayoutMode,
  LoadedButtonsState,
  TerminalMode,
} from "../models/types";
import { getButtonsFileUri, getUserButtonsFileUri } from "./findButtonsFile";
import { mergeDisplaySettings, mergeDocuments, resolveDocument, validateDocument } from "./configHelpers";

const EMPTY_STATE: LoadedButtonsState = {
  filePath: undefined,
  document: undefined,
  resolved: undefined,
  diagnostics: [],
};

async function parseButtonsFile(fileUri: vscode.Uri): Promise<ButtonsDocument> {
  const rawBytes = await vscode.workspace.fs.readFile(fileUri);
  const rawText = Buffer.from(rawBytes).toString("utf8");
  return TOML.parse(rawText) as unknown as ButtonsDocument;
}

async function processIncludes(
  document: ButtonsDocument,
  fileUri: vscode.Uri,
  diagnostics: ButtonsDiagnostic[],
  visited: Set<string>,
): Promise<void> {
  if (!document.includes || document.includes.length === 0) {
    return;
  }

  const baseDir = vscode.Uri.joinPath(fileUri, "..");

  for (const includePath of document.includes) {
    if (typeof includePath !== "string" || !includePath.trim()) {
      diagnostics.push({ message: `Invalid include path: ${JSON.stringify(includePath)}`, severity: "error" });
      continue;
    }

    const includeUri = vscode.Uri.joinPath(baseDir, includePath);
    const normalizedPath = includeUri.fsPath;

    if (visited.has(normalizedPath)) {
      diagnostics.push({
        message: `Circular include detected: '${includePath}' has already been included.`,
        severity: "error",
      });
      continue;
    }

    visited.add(normalizedPath);

    try {
      await vscode.workspace.fs.stat(includeUri);
    } catch {
      diagnostics.push({
        message: `Included file not found: '${includePath}'`,
        severity: "error",
      });
      continue;
    }

    try {
      const included = await parseButtonsFile(includeUri);

      // Recursively process nested includes
      await processIncludes(included, includeUri, diagnostics, visited);

      // Merge included document into root
      mergeDocuments(document, included, includePath, diagnostics);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown parse error";
      diagnostics.push({
        message: `Failed to parse included file '${includePath}': ${message}`,
        severity: "error",
      });
    }
  }
}

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
    const parsed = await parseButtonsFile(fileUri);

    // Process includes before validation (merges groups/variables/macros into parsed)
    const includeDiagnostics: ButtonsDiagnostic[] = [];
    const visited = new Set<string>([fileUri.fsPath]);
    await processIncludes(parsed, fileUri, includeDiagnostics, visited);

    const diagnostics = [...includeDiagnostics, ...validateDocument(parsed)];
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
