import * as fs from "fs";
import * as vscode from "vscode";
import { loadCombinedButtonsState } from "./config/loadButtonsConfig";
import { getButtonsFileUri, getUserButtonsFileUri } from "./config/findButtonsFile";
import { copyButtonCommand, copyToTerminal, openButtonPort, openButtonUrl, runButton } from "./execution/actions";
import { CombinedButtonsState, LayoutMode, PanelActionMessage, ResolvedButtonsButton, ResolvedButtonsGroup } from "./models/types";
import { ButtonsPanel } from "./panel/ButtonsPanel";
import { ButtonsSidebarProvider } from "./panel/ButtonsSidebarProvider";

let currentState: CombinedButtonsState | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const panel = new ButtonsPanel(
    context.extensionUri,
    async () => refreshState(),
    async (message: PanelActionMessage): Promise<void> => handlePanelMessage(message, panel, sidebarProvider),
  );

  const sidebarProvider = new ButtonsSidebarProvider(
    context.extensionUri,
    async () => refreshState(),
    async (message: PanelActionMessage): Promise<void> => handlePanelMessage(message, panel, sidebarProvider),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("buttons.sidebarView", sidebarProvider),
  );

  // Status bar item
  const statusBarItem = vscode.window.createStatusBarItem("buttons.status", vscode.StatusBarAlignment.Left, 50);
  statusBarItem.text = "$(list-selection) Buttons";
  statusBarItem.tooltip = "Open Buttons";
  statusBarItem.command = "buttons.openPanel";
  context.subscriptions.push(statusBarItem);

  // Show/hide status bar based on .buttons file existence (either user or project)
  const updateStatusBar = async (): Promise<void> => {
    const projectUri = getButtonsFileUri();
    const userUri = getUserButtonsFileUri();

    let hasAnyFile = false;

    if (projectUri) {
      try {
        await vscode.workspace.fs.stat(projectUri);
        hasAnyFile = true;
      } catch { /* not found */ }
    }

    if (!hasAnyFile) {
      try {
        await vscode.workspace.fs.stat(userUri);
        hasAnyFile = true;
      } catch { /* not found */ }
    }

    if (hasAnyFile) {
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  };

  void updateStatusBar();

  context.subscriptions.push(
    vscode.commands.registerCommand("buttons.openPanel", async () => {
      await panel.show();
    }),
    vscode.commands.registerCommand("buttons.reloadConfig", async () => {
      await refreshState(true);
      await panel.refresh();
      await sidebarProvider.refresh();
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
    vscode.commands.registerCommand("buttons.openUserButtonsFile", async () => {
      const fileUri = getUserButtonsFileUri();

      try {
        await vscode.workspace.fs.stat(fileUri);
      } catch {
        const createFile = await vscode.window.showInformationMessage("No user .buttons file exists yet.", "Create Example");
        if (createFile === "Create Example") {
          await createUserExampleButtonsFile();
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
      await sidebarProvider.refresh();
    }),
    vscode.commands.registerCommand("buttons.runButton", async (payload?: { groupId: string; buttonId: string }) => {
      const target = payload ?? (await pickButtonTarget("Select a button to run"));
      if (!target) {
        return;
      }

      const state = await refreshState();
      const activeResolved = getActiveResolved(state);
      await runButton(activeResolved, target.groupId, target.buttonId, "current", getConfirmDangerousCommands());
      await panel.refresh();
      await sidebarProvider.refresh();
    }),
    vscode.commands.registerCommand("buttons.runButtonInNewTerminal", async (payload?: { groupId: string; buttonId: string }) => {
      const target = payload ?? (await pickButtonTarget("Select a button to run in a new terminal"));
      if (!target) {
        return;
      }

      const state = await refreshState();
      const activeResolved = getActiveResolved(state);
      await runButton(activeResolved, target.groupId, target.buttonId, "new", getConfirmDangerousCommands());
      await panel.refresh();
      await sidebarProvider.refresh();
    }),
    vscode.commands.registerCommand("buttons.copyButtonCommand", async (payload?: { groupId: string; buttonId: string }) => {
      const target = payload ?? (await pickButtonTarget("Select a button command to copy"));
      if (!target) {
        return;
      }

      const state = await refreshState();
      const activeResolved = getActiveResolved(state);
      await copyButtonCommand(activeResolved, target.groupId, target.buttonId);
    }),
    vscode.commands.registerCommand("buttons.copyToTerminal", async (payload?: { groupId: string; buttonId: string }) => {
      const target = payload ?? (await pickButtonTarget("Select a button to copy to terminal"));
      if (!target) {
        return;
      }

      const state = await refreshState();
      const activeResolved = getActiveResolved(state);
      await copyToTerminal(activeResolved, target.groupId, target.buttonId, "current");
    }),
    vscode.commands.registerCommand("buttons.copyToNewTerminal", async (payload?: { groupId: string; buttonId: string }) => {
      const target = payload ?? (await pickButtonTarget("Select a button to copy to new terminal"));
      if (!target) {
        return;
      }

      const state = await refreshState();
      const activeResolved = getActiveResolved(state);
      await copyToTerminal(activeResolved, target.groupId, target.buttonId, "new");
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

  // Watch project .buttons file
  if (vscode.workspace.getConfiguration("buttons").get<boolean>("watchConfigChanges", true)) {
    const watcher = vscode.workspace.createFileSystemWatcher("**/.buttons");
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const refreshAll = (): void => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        void (async () => {
          await refreshState(true);
          await panel.refresh();
          await sidebarProvider.refresh();
          await updateStatusBar();
        })();
      }, 300);
    };

    watcher.onDidChange(refreshAll, undefined, context.subscriptions);
    watcher.onDidCreate(refreshAll, undefined, context.subscriptions);
    watcher.onDidDelete(refreshAll, undefined, context.subscriptions);
    context.subscriptions.push(watcher);

    // Watch user ~/.buttons file using Node.js fs.watch (workspace watcher is workspace-scoped)
    const userFileUri = getUserButtonsFileUri();
    const userFilePath = userFileUri.fsPath;
    let userWatcher: fs.FSWatcher | undefined;
    try {
      userWatcher = fs.watch(userFilePath, { persistent: false }, () => {
        refreshAll();
      });
    } catch {
      // User file may not exist yet; that's fine
    }

    // If user file doesn't exist yet, poll periodically to detect creation
    let userFileCheckInterval: ReturnType<typeof setInterval> | undefined;
    if (!userWatcher) {
      userFileCheckInterval = setInterval(() => {
        try {
          fs.accessSync(userFilePath);
          // File now exists, start watching
          if (!userWatcher) {
            userWatcher = fs.watch(userFilePath, { persistent: false }, () => {
              refreshAll();
            });
          }
          if (userFileCheckInterval) {
            clearInterval(userFileCheckInterval);
            userFileCheckInterval = undefined;
          }
          refreshAll();
        } catch {
          // Still doesn't exist
        }
      }, 5000);
    }

    context.subscriptions.push({
      dispose: () => {
        userWatcher?.close();
        if (userFileCheckInterval) {
          clearInterval(userFileCheckInterval);
        }
      },
    });
  }

  // Auto-open sidebar on first detection of .buttons file
  void autoRevealSidebar(context);
}

export function deactivate(): void {
  currentState = undefined;
}

function getActiveResolved(state: CombinedButtonsState) {
  return state.activeSource === "user" ? state.user.resolved : state.project.resolved;
}

async function autoRevealSidebar(context: vscode.ExtensionContext): Promise<void> {
  const autoOpen = vscode.workspace.getConfiguration("buttons").get<string>("autoOpen", "firstTime");
  if (autoOpen === "never") {
    return;
  }

  // Check if any buttons file exists (project or user)
  const projectUri = getButtonsFileUri();
  const userUri = getUserButtonsFileUri();
  let hasAnyFile = false;

  if (projectUri) {
    try {
      await vscode.workspace.fs.stat(projectUri);
      hasAnyFile = true;
    } catch { /* not found */ }
  }

  if (!hasAnyFile) {
    try {
      await vscode.workspace.fs.stat(userUri);
      hasAnyFile = true;
    } catch { /* not found */ }
  }

  if (!hasAnyFile) {
    return;
  }

  if (autoOpen === "firstTime") {
    const hasAutoOpened = context.workspaceState.get<boolean>("buttons.hasAutoOpened");
    if (hasAutoOpened) {
      return;
    }
    await context.workspaceState.update("buttons.hasAutoOpened", true);
  }

  await vscode.commands.executeCommand("buttons.sidebarView.focus");
}

async function refreshState(force = false): Promise<CombinedButtonsState> {
  if (!force && currentState) {
    return currentState;
  }

  const configuration = vscode.workspace.getConfiguration("buttons");
  currentState = await loadCombinedButtonsState(
    configuration.get<boolean>("showCommandPreview", true),
    configuration.get<LayoutMode>("defaultLayout", "grid"),
    configuration.get<"current" | "new">("defaultTerminalMode", "current"),
  );
  return currentState;
}

async function handlePanelMessage(message: PanelActionMessage, panel: ButtonsPanel, sidebar: ButtonsSidebarProvider): Promise<void> {
  switch (message.type) {
    case "reload":
      await refreshState(true);
      await panel.refresh();
      await sidebar.refresh();
      return;
    case "open-file":
      await vscode.commands.executeCommand("buttons.openButtonsFile");
      return;
    case "open-panel":
      await vscode.commands.executeCommand("buttons.openPanel");
      return;
    case "toggle-source":
      if (currentState && message.source) {
        currentState = { ...currentState, activeSource: message.source };
        await panel.refresh();
        await sidebar.refresh();
      }
      return;
    case "toggle-group":
    case "toggle-button-visibility":
      // Managed client-side in webview JS via vscode.getState/setState
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
    case "copy-to-terminal":
      if (message.groupId && message.buttonId) {
        await vscode.commands.executeCommand("buttons.copyToTerminal", { groupId: message.groupId, buttonId: message.buttonId });
      }
      return;
    case "copy-to-new-terminal":
      if (message.groupId && message.buttonId) {
        await vscode.commands.executeCommand("buttons.copyToNewTerminal", { groupId: message.groupId, buttonId: message.buttonId });
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

async function createUserExampleButtonsFile(): Promise<void> {
  const fileUri = getUserButtonsFileUri();

  const example = `version = 1
title = "My Buttons"
description = "Personal commands available across all projects"
layout = "grid"

[display]
show_command = true
show_labels = true
show_icons = true
compact = false

[groups.tools]
name = "Tools"
description = "Common developer tools"
icon = "tools"

[[groups.tools.buttons]]
id = "git-status"
label = "Git Status"
command = "git status"
icon = "git-branch"

[[groups.tools.buttons]]
id = "git-log"
label = "Git Log"
command = "git log --oneline -10"
icon = "history"
`;

  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(example, "utf8"));
  const document = await vscode.workspace.openTextDocument(fileUri);
  await vscode.window.showTextDocument(document);
}

function getConfirmDangerousCommands(): boolean {
  return vscode.workspace.getConfiguration("buttons").get<boolean>("confirmDangerousCommands", true);
}

async function pickButtonTarget(placeHolder: string): Promise<{ groupId: string; buttonId: string } | undefined> {
  const state = await refreshState(true);
  const activeResolved = getActiveResolved(state);
  if (!activeResolved) {
    const allDiagnostics = [...state.project.diagnostics, ...state.user.diagnostics];
    const firstError = allDiagnostics.find((diagnostic) => diagnostic.severity === "error");
    void vscode.window.showErrorMessage(firstError?.message ?? "Buttons config is not available.");
    return undefined;
  }

  const items = activeResolved.groups.flatMap((group) =>
    group.buttons.map((button) => toQuickPickItem(group, button, activeResolved.showCommandPreview)),
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
