import * as vscode from "vscode";

const BUTTONS_TERMINAL_NAME = "Buttons";

/** Reuse the active terminal, else a named "Buttons" terminal, else create one at `cwd`. */
function getOrCreateCurrentTerminal(cwd?: string): { terminal: vscode.Terminal; fresh: boolean } {
  const activeTerminal = vscode.window.activeTerminal;
  if (activeTerminal) {
    return { terminal: activeTerminal, fresh: false };
  }

  const buttonsTerminal = vscode.window.terminals.find((terminal) => terminal.name === BUTTONS_TERMINAL_NAME);
  if (buttonsTerminal) {
    return { terminal: buttonsTerminal, fresh: false };
  }

  return { terminal: vscode.window.createTerminal({ name: BUTTONS_TERMINAL_NAME, cwd }), fresh: true };
}

/**
 * Run a command in the current integrated terminal (reusing an open one if
 * present). Commands are written relative to the button's directory, and a
 * reused terminal keeps whatever directory it is in, so the directory change
 * is sent as its own line first - a `cd "path" && cmd` one-liner would break
 * on Windows PowerShell 5.1, which has no `&&` operator.
 * ponytail: cmd.exe needs `cd /d` to switch drives; shell detection is not
 * worth it - fix by switching the workspace onto one drive if this bites.
 */
export function runInCurrentTerminal(command: string, cwd?: string): void {
  const { terminal, fresh } = getOrCreateCurrentTerminal(cwd);
  terminal.show(true);
  if (!fresh && cwd) {
    terminal.sendText(`cd "${cwd}"`, true);
  }
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
