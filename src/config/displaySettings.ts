import * as vscode from "vscode";
import { LayoutMode, ResolvedGroupDisplay } from "../models/types";

export function buildDisplayFromSettings(): ResolvedGroupDisplay {
  const config = vscode.workspace.getConfiguration("buttons");
  const appearance = vscode.workspace.getConfiguration("buttons.appearance");
  const actions = vscode.workspace.getConfiguration("buttons.actions");

  return {
    layout: config.get<LayoutMode>("defaultLayout", "grid"),
    showCommandPreview: config.get<boolean>("showCommandPreview", true),
    showLabels: appearance.get<boolean>("showLabels", true),
    showIcons: appearance.get<boolean>("showIcons", true),
    compact: appearance.get<boolean>("compact", false),
    buttonColor: appearance.get<string>("buttonColor", "") || undefined,
    groupBgColor: appearance.get<string>("groupBackgroundColor", "") || undefined,
    showRun: actions.get<boolean>("showRun", true),
    showNewTerminal: actions.get<boolean>("showNewTerminal", true),
    showCopyToTerminal: actions.get<boolean>("showCopyToTerminal", true),
    showCopyToNewTerminal: actions.get<boolean>("showCopyToNewTerminal", true),
    showCopyToClipboard: actions.get<boolean>("showCopyToClipboard", true),
    runLabel: actions.get<string>("runLabel", "Run"),
    newTerminalLabel: actions.get<string>("newTerminalLabel", "New Terminal"),
    copyToTerminalLabel: actions.get<string>("copyToTerminalLabel", "Copy to Terminal"),
    copyToNewTerminalLabel: actions.get<string>("copyToNewTerminalLabel", "Copy to New Terminal"),
    copyToClipboardLabel: actions.get<string>("copyToClipboardLabel", "Copy"),
    commandClickToCopy: appearance.get<boolean>("commandClickToCopy", false),
    labelSize: appearance.get<string>("labelSize", "") || undefined,
    actionSize: actions.get<string>("actionSize", "") || undefined,
    actionBorderRadius: actions.get<string>("actionBorderRadius", "") || undefined,
  };
}
