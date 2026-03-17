import * as vscode from "vscode";
import { ResolvedButtonsButton, ResolvedButtonsConfig } from "../models/types";

const BUTTONS_TERMINAL_NAME = "Buttons";

export async function runButton(
  resolved: ResolvedButtonsConfig | undefined,
  groupId: string,
  buttonId: string,
  terminalMode: "current" | "new",
  confirmDangerousCommands: boolean,
): Promise<void> {
  const button = findButton(resolved, groupId, buttonId);
  if (!button) {
    void vscode.window.showErrorMessage("Button not found in the current Buttons config.");
    return;
  }

  if (confirmDangerousCommands && (button.confirm || button.danger)) {
    const answer = await vscode.window.showWarningMessage(
      `Run '${button.label}'?`,
      { modal: true, detail: button.command },
      "Run",
    );

    if (answer !== "Run") {
      return;
    }
  }

  const terminal = terminalMode === "new" ? createNewTerminal(button) : getOrCreateCurrentTerminal(button);
  terminal.show(Boolean(button.reveal_terminal));
  terminal.sendText(button.command, true);
}

export async function copyButtonCommand(resolved: ResolvedButtonsConfig | undefined, groupId: string, buttonId: string): Promise<void> {
  const button = findButton(resolved, groupId, buttonId);
  if (!button) {
    void vscode.window.showErrorMessage("Button not found in the current Buttons config.");
    return;
  }

  try {
    await vscode.env.clipboard.writeText(button.command);
    void vscode.window.showInformationMessage(`Copied '${button.label}' command.`);
  } catch {
    void vscode.window.showErrorMessage("Failed to copy command to clipboard.");
  }
}

export async function openButtonUrl(url: string): Promise<void> {
  try {
    await vscode.env.openExternal(vscode.Uri.parse(url));
  } catch {
    void vscode.window.showErrorMessage(`Failed to open URL: ${url}`);
  }
}

export async function openButtonPort(port: number): Promise<void> {
  try {
    await vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}`));
  } catch {
    void vscode.window.showErrorMessage(`Failed to open port ${port}.`);
  }
}

function findButton(resolved: ResolvedButtonsConfig | undefined, groupId: string, buttonId: string): ResolvedButtonsButton | undefined {
  return resolved?.groups.find((group) => group.id === groupId)?.buttons.find((button) => button.id === buttonId);
}

function getOrCreateCurrentTerminal(button: ResolvedButtonsButton): vscode.Terminal {
  const activeTerminal = vscode.window.activeTerminal;
  if (activeTerminal) {
    return activeTerminal;
  }

  const buttonsTerminal = vscode.window.terminals.find((terminal) => terminal.name === BUTTONS_TERMINAL_NAME);
  if (buttonsTerminal) {
    return buttonsTerminal;
  }

  return vscode.window.createTerminal({
    name: BUTTONS_TERMINAL_NAME,
    cwd: button.cwd,
    env: button.env,
  });
}

function createNewTerminal(button: ResolvedButtonsButton): vscode.Terminal {
  return vscode.window.createTerminal({
    name: `Buttons: ${button.label}`,
    cwd: button.cwd,
    env: button.env,
  });
}