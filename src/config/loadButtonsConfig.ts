import * as TOML from "@iarna/toml";
import * as vscode from "vscode";
import {
  ButtonsDocument,
  LoadedButtonsState,
  TerminalMode,
} from "../models/types";
import { getButtonsFileUri } from "./findButtonsFile";
import { resolveDocument, validateDocument } from "./configHelpers";

export async function loadButtonsState(showCommandPreviewFallback: boolean, defaultLayout: "grid" | "rows", defaultTerminal: TerminalMode): Promise<LoadedButtonsState> {
  const fileUri = getButtonsFileUri();
  if (!fileUri) {
    return {
      filePath: undefined,
      document: undefined,
      resolved: undefined,
      diagnostics: [
        {
          message: "No workspace folder is open.",
          severity: "error",
        },
      ],
    };
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
      diagnostics: [
        {
          message,
          severity: "error",
        },
      ],
    };
  }
}
