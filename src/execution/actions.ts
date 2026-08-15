import * as vscode from "vscode";

const BUTTONS_TERMINAL_NAME = "Buttons";

/** Reuse the active terminal, else a named "Buttons" terminal, else create one. */
function getOrCreateCurrentTerminal(cwd?: string): vscode.Terminal {
  const activeTerminal = vscode.window.activeTerminal;
  if (activeTerminal) {
    return activeTerminal;
  }

  const buttonsTerminal = vscode.window.terminals.find((terminal) => terminal.name === BUTTONS_TERMINAL_NAME);
  if (buttonsTerminal) {
    return buttonsTerminal;
  }

  return vscode.window.createTerminal({ name: BUTTONS_TERMINAL_NAME, cwd });
}

/** Run a command in the current integrated terminal (reusing an open one if present). */
export function runInCurrentTerminal(command: string, cwd?: string): void {
  const terminal = getOrCreateCurrentTerminal(cwd);
  terminal.show(true);
  terminal.sendText(command, true);
}

/** Run a command in a fresh integrated terminal instance. */
export function runInNewTerminal(command: string, cwd?: string, label?: string): void {
  const firstToken = command.trim().split(/\s+/)[0];
  const name = label ? `Buttons: ${label}` : firstToken ? `Buttons: ${firstToken}` : BUTTONS_TERMINAL_NAME;
  const terminal = vscode.window.createTerminal({ name, cwd });
  terminal.show(true);
  terminal.sendText(command, true);
}

/** Copy a command string to the system clipboard. */
export async function copyToClipboard(command: string): Promise<void> {
  try {
    await vscode.env.clipboard.writeText(command);
    void vscode.window.showInformationMessage("Copied command to clipboard.");
  } catch {
    void vscode.window.showErrorMessage("Failed to copy command to clipboard.");
  }
}
