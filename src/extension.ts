import * as vscode from "vscode";
import { loadButtonsState } from "./config/loadButtonsConfig";
import { getButtonsFileUri } from "./config/findButtonsFile";
import { copyButtonCommand, openButtonPort, openButtonUrl, runButton } from "./execution/actions";
import { LoadedButtonsState, PanelActionMessage, ResolvedButtonsButton, ResolvedButtonsGroup } from "./models/types";
import { ButtonsPanel } from "./panel/ButtonsPanel";

let currentState: LoadedButtonsState | undefined;

export function activate(context: vscode.ExtensionContext): void {
  let panel: ButtonsPanel;
  panel = new ButtonsPanel(
    context.extensionUri,
    async () => refreshState(),
    async (message: PanelActionMessage): Promise<void> => handlePanelMessage(message, panel),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("buttons.openPanel", async () => {
      await panel.show();
    }),
    vscode.commands.registerCommand("buttons.reloadConfig", async () => {
      await refreshState(true);
      await panel.refresh();
      void vscode.window.showInformationMessage("Buttons config reloaded.");
    }),
    vscode.commands.registerCommand("buttons.openButtonsFile", async () => {
      const fileUri = getButtonsFileUri();
      if (!fileUri) {
        void vscode.window.showErrorMessage("No workspace folder is open.");
        return;
      }

      try {
        await vscode.workspace.fs.stat(fileUri);
      } catch {
        const createFile = await vscode.window.showInformationMessage("No .buttons file exists yet.", "Create Example");
        if (createFile === "Create Example") {
          await createExampleButtonsFile();
        }
        return;
      }

      const document = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(document);
    }),
    vscode.commands.registerCommand("buttons.createExampleButtons", async () => {
      await createExampleButtonsFile();
      await refreshState(true);
      await panel.refresh();
    }),
    vscode.commands.registerCommand("buttons.runButton", async (payload?: { groupId: string; buttonId: string }) => {
      const target = payload ?? (await pickButtonTarget("Select a button to run"));
      if (!target) {
        return;
      }

      await runButton((await refreshState()).resolved, target.groupId, target.buttonId, "current", getConfirmDangerousCommands());
      await panel.refresh();
    }),
    vscode.commands.registerCommand("buttons.runButtonInNewTerminal", async (payload?: { groupId: string; buttonId: string }) => {
      const target = payload ?? (await pickButtonTarget("Select a button to run in a new terminal"));
      if (!target) {
        return;
      }

      await runButton((await refreshState()).resolved, target.groupId, target.buttonId, "new", getConfirmDangerousCommands());
      await panel.refresh();
    }),
    vscode.commands.registerCommand("buttons.copyButtonCommand", async (payload?: { groupId: string; buttonId: string }) => {
      const target = payload ?? (await pickButtonTarget("Select a button command to copy"));
      if (!target) {
        return;
      }

      await copyButtonCommand((await refreshState()).resolved, target.groupId, target.buttonId);
    }),
    vscode.commands.registerCommand("buttons.openButtonUrl", async (url?: string) => {
      if (url) {
        await openButtonUrl(url);
      }
    }),
    vscode.commands.registerCommand("buttons.openButtonPort", async (port?: number) => {
      if (typeof port === "number") {
        await openButtonPort(port);
      }
    }),
  );

  if (vscode.workspace.getConfiguration("buttons").get<boolean>("watchConfigChanges", true)) {
    const watcher = vscode.workspace.createFileSystemWatcher("**/.buttons");
    const refreshPanel = async (): Promise<void> => {
      await refreshState(true);
      await panel.refresh();
    };

    watcher.onDidChange(refreshPanel, undefined, context.subscriptions);
    watcher.onDidCreate(refreshPanel, undefined, context.subscriptions);
    watcher.onDidDelete(refreshPanel, undefined, context.subscriptions);
    context.subscriptions.push(watcher);
  }
}

export function deactivate(): void {
  currentState = undefined;
}

async function refreshState(force = false): Promise<LoadedButtonsState> {
  if (!force && currentState) {
    return currentState;
  }

  const configuration = vscode.workspace.getConfiguration("buttons");
  currentState = await loadButtonsState(
    configuration.get<boolean>("showCommandPreview", true),
    configuration.get<"grid" | "rows">("defaultLayout", "grid"),
    configuration.get<"current" | "new">("defaultTerminalMode", "current"),
  );
  return currentState;
}

async function handlePanelMessage(message: PanelActionMessage, panel: ButtonsPanel): Promise<void> {
  switch (message.type) {
    case "reload":
      await refreshState(true);
      await panel.refresh();
      return;
    case "open-file":
      await vscode.commands.executeCommand("buttons.openButtonsFile");
      return;
    case "run-current":
      if (message.groupId && message.buttonId) {
        await vscode.commands.executeCommand("buttons.runButton", { groupId: message.groupId, buttonId: message.buttonId });
      }
      return;
    case "run-new":
      if (message.groupId && message.buttonId) {
        await vscode.commands.executeCommand("buttons.runButtonInNewTerminal", { groupId: message.groupId, buttonId: message.buttonId });
      }
      return;
    case "copy":
      if (message.groupId && message.buttonId) {
        await vscode.commands.executeCommand("buttons.copyButtonCommand", { groupId: message.groupId, buttonId: message.buttonId });
      }
      return;
    case "open-url":
      if (message.url) {
        await vscode.commands.executeCommand("buttons.openButtonUrl", message.url);
      }
      return;
    case "open-port":
      if (typeof message.port === "number") {
        await vscode.commands.executeCommand("buttons.openButtonPort", message.port);
      }
      return;
    default:
      return;
  }
}

async function createExampleButtonsFile(): Promise<void> {
  const fileUri = getButtonsFileUri();
  if (!fileUri) {
    void vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }

  const example = `version = 1
title = "Buttons Example"
description = "Shared project commands"
layout = "grid"
terminal = "current"

[display]
show_command = true
show_labels = true
show_icons = true
compact = false

[defaults]
enabled = true
copy_to_clipboard = true
run_in_current_terminal = true
run_in_new_terminal = false
confirm = false
danger = false
reveal_terminal = true

[variables]
workspace = "\${workspaceFolder}"

[macros]
pnpm_run = "pnpm run"

[groups.pnpm]
name = "PNPM"
description = "Package workflows"
base = "pnpm"
icon = "package"
color = "#F54927"
ports = [3000]

[[groups.pnpm.buttons]]
id = "dev"
label = "Dev"
command = "{{pnpm_run}} dev"
icon = "play"
open_ports = [3000]

[[groups.pnpm.buttons]]
id = "build"
label = "Build"
command = "{{pnpm_run}} build"
icon = "package"

[groups.pnpm.generate]
mode = "cartesian"
template = "{{pnpm_run}} {{arg1}}"
label_template = "{{arg1}}"
params = [["lint", "test"]]

[[groups.pnpm.links]]
label = "Local App"
url = "http://localhost:3000"
icon = "link-external"
`;

  let exists = true;
  try {
    await vscode.workspace.fs.stat(fileUri);
  } catch {
    exists = false;
  }

  if (exists) {
    const answer = await vscode.window.showWarningMessage("A .buttons file already exists. Replace it with the example file?", { modal: true }, "Replace");
    if (answer !== "Replace") {
      return;
    }
  }

  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(example, "utf8"));
  const document = await vscode.workspace.openTextDocument(fileUri);
  await vscode.window.showTextDocument(document);
}

function getConfirmDangerousCommands(): boolean {
  return vscode.workspace.getConfiguration("buttons").get<boolean>("confirmDangerousCommands", true);
}

async function pickButtonTarget(placeHolder: string): Promise<{ groupId: string; buttonId: string } | undefined> {
  const state = await refreshState(true);
  if (!state.resolved) {
    const firstError = state.diagnostics.find((diagnostic) => diagnostic.severity === "error");
    void vscode.window.showErrorMessage(firstError?.message ?? "Buttons config is not available.");
    return undefined;
  }

  const items = state.resolved.groups.flatMap((group) =>
    group.buttons.map((button) => toQuickPickItem(group, button, state.resolved?.showCommandPreview ?? true)),
  );

  if (items.length === 0) {
    void vscode.window.showInformationMessage("No buttons are defined in the current .buttons file.");
    return undefined;
  }

  const selection = await vscode.window.showQuickPick(items, {
    placeHolder,
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!selection) {
    return undefined;
  }

  return {
    groupId: selection.groupId,
    buttonId: selection.buttonId,
  };
}

function toQuickPickItem(
  group: ResolvedButtonsGroup,
  button: ResolvedButtonsButton,
  showCommandPreview: boolean,
): vscode.QuickPickItem & { groupId: string; buttonId: string } {
  const descriptionParts = [group.name];
  if (button.danger) {
    descriptionParts.push("Danger");
  }

  return {
    label: button.label,
    description: descriptionParts.join(" • "),
    detail: showCommandPreview ? button.command : button.description,
    groupId: group.id,
    buttonId: button.id,
  };
}