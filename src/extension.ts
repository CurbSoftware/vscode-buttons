import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import {
  addCommandButton,
  addScriptButton,
  addScriptFile,
  buttonId,
  emptyButtonsFile,
  generateButtonsFile,
  removeButton,
  removeScriptButton,
  removeScriptFile,
  setAllScripts,
  setButtonNote,
  updateCommandButton,
} from "./config/buttonsFile";
import { getScanDirectories, loadRuntimeState, writeButtonsFile } from "./config/buttonsStore";
import { getGlobalButtonsFileUri, getProjectButtonsFileUri, getWorkspaceFolderUri } from "./config/findButtonsFile";
import { copyToClipboard, runInCurrentTerminal, runInNewTerminal } from "./execution/actions";
import { ButtonsPanel } from "./panel/ButtonsPanel";
import { ButtonsSidebarProvider } from "./panel/ButtonsSidebarProvider";
import { normalizeScanDirectories, SCAN_FILE_GLOB, type ScanDirectory } from "./scanner/scanScope";
import { scriptKey, shouldIgnoreDir } from "./scanner/types";
import type { ButtonsFile, ButtonsSource, ButtonsTab, PanelActionMessage, ResolvedButton, RuntimeState, WebviewState } from "./models/types";

type PanelId = "sidebar" | "editor";

let currentState: RuntimeState | undefined;
let sidebarProvider: ButtonsSidebarProvider | undefined;
let mainPanel: ButtonsPanel | undefined;
const editingByPanel = new Map<PanelId, { source: ButtonsSource; id: string }>();
const addingByPanel = new Map<PanelId, ButtonsSource>();
const activeTabByPanel = new Map<PanelId, ButtonsTab>();

export function activate(context: vscode.ExtensionContext): void {
  sidebarProvider = new ButtonsSidebarProvider(
    context.extensionUri,
    async () => buildWebviewState("sidebar"),
    async (message: PanelActionMessage) => handlePanelMessage("sidebar", message),
  );

  mainPanel = new ButtonsPanel(
    context.extensionUri,
    async () => buildWebviewState("editor"),
    async (message: PanelActionMessage) => handlePanelMessage("editor", message),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("buttons.sidebarView", sidebarProvider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("buttons.openPanel", async () => {
      await vscode.commands.executeCommand("buttons.sidebarView.focus");
    }),
    vscode.commands.registerCommand("buttons.openMainPanel", async () => {
      await mainPanel?.createOrShow();
    }),
    vscode.commands.registerCommand("buttons.rescan", async () => {
      editingByPanel.clear();
      addingByPanel.clear();
      await refreshState(true);
      await refreshWebview();
    }),
    vscode.commands.registerCommand("buttons.openProjectButtons", async () => {
      const uri = getProjectButtonsFileUri();
      if (!uri) {
        void vscode.window.showErrorMessage("No workspace folder is open.");
        return;
      }
      await openOrCreateFile(uri);
    }),
    vscode.commands.registerCommand("buttons.openGlobalButtons", async () => {
      await openOrCreateFile(getGlobalButtonsFileUri());
    }),
  );

  const refreshAll = sharedRefreshAll;

  // Watch the project .buttons.json file.
  const fileWatcher = vscode.workspace.createFileSystemWatcher("**/.buttons.json");
  fileWatcher.onDidChange(refreshAll, undefined, context.subscriptions);
  fileWatcher.onDidCreate(refreshAll, undefined, context.subscriptions);
  fileWatcher.onDidDelete(refreshAll, undefined, context.subscriptions);
  context.subscriptions.push(fileWatcher);

  // Watch script files (and requirements.txt for venv buttons) so commands stay current.
  const scriptWatcher = vscode.workspace.createFileSystemWatcher(`**/{${SCAN_FILE_GLOB},requirements.txt}`);
  const onScriptChange = (uri: vscode.Uri): void => {
    if (isIgnoredScriptPath(uri)) {
      return;
    }
    refreshAll();
  };
  scriptWatcher.onDidChange(onScriptChange, undefined, context.subscriptions);
  scriptWatcher.onDidCreate(onScriptChange, undefined, context.subscriptions);
  scriptWatcher.onDidDelete(onScriptChange, undefined, context.subscriptions);
  context.subscriptions.push(scriptWatcher);

  // Watch the global ~/.buttons.json file with Node fs.watch (workspace-scoped watcher can't see it).
  const globalPath = getGlobalButtonsFileUri().fsPath;
  let globalWatcher: fs.FSWatcher | undefined;
  try {
    globalWatcher = fs.watch(globalPath, { persistent: false }, () => refreshAll());
  } catch {
    // File may not exist yet; poll below.
  }

  let globalPoll: ReturnType<typeof setInterval> | undefined;
  if (!globalWatcher) {
    globalPoll = setInterval(() => {
      try {
        fs.accessSync(globalPath);
        if (!globalWatcher) {
          globalWatcher = fs.watch(globalPath, { persistent: false }, () => refreshAll());
        }
        if (globalPoll) {
          clearInterval(globalPoll);
          globalPoll = undefined;
        }
        refreshAll();
      } catch {
        // Still does not exist.
      }
    }, 5000);
  }

  context.subscriptions.push({
    dispose: () => {
      globalWatcher?.close();
      if (globalPoll) {
        clearInterval(globalPoll);
      }
    },
  });

  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => refreshAll()));

  // React to settings changes: text size re-renders, scan settings re-scan.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("buttons.textSize")) {
        void refreshWebview();
      }
      if (e.affectsConfiguration("buttons.scriptFiles") || e.affectsConfiguration("buttons.scanDirectories")) {
        refreshAll();
      }
    }),
  );
}

export function deactivate(): void {
  currentState = undefined;
  sidebarProvider = undefined;
  mainPanel = undefined;
  editingByPanel.clear();
  addingByPanel.clear();
  activeTabByPanel.clear();
}

async function refreshState(force = false): Promise<RuntimeState> {
  if (!force && currentState) {
    return currentState;
  }
  currentState = await loadRuntimeState();
  return currentState;
}

async function refreshWebview(): Promise<void> {
  await sidebarProvider?.refresh();
  await mainPanel?.refresh();
}

/**
 * Shared debounced full refresh. Every watcher, settings change, and
 * scan-directory mutation funnels through here so overlapping triggers
 * (e.g. a settings write plus its onDidChangeConfiguration event) coalesce
 * into a single re-render instead of a double document reload. Open edit/add
 * forms are deliberately kept across background refreshes; the webview
 * preserves their draft values, and rows that vanish simply stop rendering.
 */
const sharedRefreshAll = debounce(() => {
  void (async () => {
    await refreshState(true);
    await refreshWebview();
  })();
}, 300);

async function buildWebviewState(panelId: PanelId): Promise<WebviewState> {
  const state = await refreshState();
  return {
    projectButtons: state.projectButtons,
    globalButtons: state.globalButtons,
    discovered: state.discovered,
    selectedKeys: selectedScriptKeys(state),
    hasWorkspace: Boolean(getWorkspaceFolderUri()),
    parseError: state.parseError,
    editing: editingByPanel.get(panelId),
    addingSource: addingByPanel.get(panelId),
    textSizePx: textSizePx(),
    projectFileExists: state.projectFileExists,
    activeTab: activeTabByPanel.get(panelId) ?? "buttons",
    scanDirectories: getScanDirectories(getWorkspaceFolderUri()),
  };
}

function textSizePx(): number {
  const value = vscode.workspace.getConfiguration("buttons").get<string>("textSize");
  if (value === "plus2") {
    return 2;
  }
  if (value === "plus4") {
    return 4;
  }
  return 0;
}

function selectedScriptKeys(state: RuntimeState): string[] {
  return state.projectFile.buttons.filter((b) => b.type === "script").map((b) => scriptKey(b));
}

function findButton(state: RuntimeState, source: ButtonsSource, index: number): ResolvedButton | undefined {
  const list = source === "project" ? state.projectButtons : state.globalButtons;
  return list.find((b) => b.index === index);
}

/** Open a native folder picker and append the chosen workspace-relative directories to the setting. */
async function addScanDirectory(): Promise<void> {
  const root = getWorkspaceFolderUri();
  if (!root) {
    return;
  }
  const picks = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectMany: true,
    canSelectFiles: false,
    defaultUri: root,
    openLabel: "Add Scan Directory",
    title: "Choose directories to scan for scripts",
  });
  if (!picks || picks.length === 0) {
    return;
  }

  const additions: string[] = [];
  for (const pick of picks) {
    const rel = path.relative(root.fsPath, pick.fsPath).split(path.sep).join("/");
    if (rel === "") {
      void vscode.window.showInformationMessage("The project root is always scanned - not added again.");
      continue;
    }
    if (rel === ".." || rel.startsWith("../") || path.isAbsolute(rel)) {
      void vscode.window.showWarningMessage(`"${rel}" is outside the workspace and was skipped.`);
      continue;
    }
    // Reject what the scanner would silently drop anyway (hidden/ignored names, glob metacharacters).
    if (normalizeScanDirectories([{ path: rel }]).length === 0) {
      void vscode.window.showWarningMessage(
        `"${rel}" cannot be scanned - hidden, ignored, or unsupported directory names are skipped.`,
      );
      continue;
    }
    additions.push(rel);
  }
  if (additions.length === 0) {
    return;
  }

  const foldCase = process.platform === "win32" ? (p: string) => p.toLowerCase() : (p: string) => p;
  await mutateScanDirectories((dirs) => {
    const existing = new Set(dirs.map((d) => foldCase(d.path)));
    const next = [...dirs];
    for (const p of additions) {
      if (!existing.has(foldCase(p))) {
        existing.add(foldCase(p));
        next.push({ path: p, recursive: false });
      } else {
        void vscode.window.showInformationMessage(`"${p}" is already a scan directory.`);
      }
    }
    return next;
  });
}

/** Rewrite the `buttons.scanDirectories` workspace setting, then refresh. Serialized so
 * concurrent panel messages can't read-modify-write past each other and lose a toggle. */
let scanDirMutationQueue: Promise<void> = Promise.resolve();

function mutateScanDirectories(mutate: (dirs: ScanDirectory[]) => ScanDirectory[]): Promise<void> {
  const run = scanDirMutationQueue.then(() => applyScanDirectoriesMutation(mutate));
  scanDirMutationQueue = run.then(
    () => {},
    () => {},
  );
  return run;
}

async function applyScanDirectoriesMutation(mutate: (dirs: ScanDirectory[]) => ScanDirectory[]): Promise<void> {
  const root = getWorkspaceFolderUri();
  const next = mutate(getScanDirectories(root).map((d) => ({ ...d })));
  try {
    await vscode.workspace.getConfiguration("buttons", root).update(
      "scanDirectories",
      next,
      vscode.ConfigurationTarget.Workspace,
    );
  } catch {
    void vscode.window.showErrorMessage("Could not save scan directories to workspace settings.");
    // Re-render from persisted state so the webview checkbox doesn't show the failed toggle.
    await refreshWebview();
    return;
  }
  // The settings write also fires onDidChangeConfiguration; both routes go through the
  // shared debounce, so this coalesces into a single refresh.
  sharedRefreshAll();
}

function buttonCwd(button: ResolvedButton): string | undefined {
  const root = getWorkspaceFolderUri();
  if (!root) {
    return undefined;
  }
  if (button.entry.type === "script" && button.entry.packageDir) {
    return path.join(root.fsPath, ...button.entry.packageDir.split("/"));
  }
  return root.fsPath;
}

function buttonLabel(button: ResolvedButton): string | undefined {
  return button.entry.type === "script" ? button.entry.script : undefined;
}

function fileUriFor(source: ButtonsSource): vscode.Uri | undefined {
  return source === "project" ? getProjectButtonsFileUri() : getGlobalButtonsFileUri();
}

async function handlePanelMessage(panelId: PanelId, message: PanelActionMessage): Promise<void> {
  switch (message.type) {
    case "rescan": {
      editingByPanel.clear();
      addingByPanel.clear();
      await refreshState(true);
      await refreshWebview();
      return;
    }

    case "set-tab":
      activeTabByPanel.set(panelId, message.tab);
      await refreshWebview();
      return;

    case "generate": {
      const fileUri = getProjectButtonsFileUri();
      if (!fileUri) {
        void vscode.window.showErrorMessage("No workspace folder is open.");
        return;
      }
      const state = await refreshState();
      await writeButtonsFile(fileUri, generateButtonsFile(state.discovered));
      editingByPanel.clear();
      addingByPanel.clear();
      await refreshState(true);
      await refreshWebview();
      return;
    }

    case "add-scan-dir":
      await addScanDirectory();
      return;

    case "remove-scan-dir":
      await mutateScanDirectories((dirs) => dirs.filter((d) => d.path !== message.path));
      return;

    case "toggle-scan-dir-recursive":
      await mutateScanDirectories((dirs) =>
        dirs.map((d) => (d.path === message.path ? { ...d, recursive: message.recursive } : d)),
      );
      return;

    case "toggle-script": {
      const fileUri = getProjectButtonsFileUri();
      if (!fileUri) {
        return;
      }
      const key = scriptKey({ file: message.file, script: message.script });
      const state = await refreshState();
      if (!state.projectFileExists) {
        return;
      }
      let next: ButtonsFile;
      if (message.checked) {
        const discovered = state.discovered.find((d) => scriptKey(d) === key);
        if (!discovered) {
          return;
        }
        next = addScriptButton(state.projectFile, discovered);
      } else {
        next = removeScriptButton(state.projectFile, key);
      }
      await writeButtonsFile(fileUri, next);
      await refreshState(true);
      await refreshWebview();
      return;
    }

    case "toggle-file": {
      const fileUri = getProjectButtonsFileUri();
      if (!fileUri) {
        return;
      }
      const state = await refreshState();
      if (!state.projectFileExists) {
        return;
      }
      const inFile = state.discovered.filter((d) => d.file === message.file);
      if (inFile.length === 0) {
        return;
      }
      const next = message.checked
        ? addScriptFile(state.projectFile, inFile)
        : removeScriptFile(state.projectFile, message.file);
      await writeButtonsFile(fileUri, next);
      await refreshState(true);
      await refreshWebview();
      return;
    }

    case "toggle-all": {
      const fileUri = getProjectButtonsFileUri();
      if (!fileUri) {
        return;
      }
      const state = await refreshState();
      if (!state.projectFileExists) {
        return;
      }
      const next = setAllScripts(state.projectFile, state.discovered, message.checked);
      await writeButtonsFile(fileUri, next);
      await refreshState(true);
      await refreshWebview();
      return;
    }

    case "run-current":
    case "run-new": {
      const state = await refreshState();
      const button = findButton(state, message.source, message.index);
      if (!button || button.missing) {
        return;
      }
      const cwd = buttonCwd(button);
      if (message.type === "run-current") {
        runInCurrentTerminal(button.command, cwd);
      } else {
        runInNewTerminal(button.command, cwd, buttonLabel(button));
      }
      return;
    }

    case "copy": {
      const state = await refreshState();
      const button = findButton(state, message.source, message.index);
      if (!button || button.missing) {
        return;
      }
      await copyToClipboard(button.command);
      return;
    }

    case "start-edit": {
      const state = await refreshState();
      const button = findButton(state, message.source, message.index);
      if (!button) {
        return;
      }
      editingByPanel.set(panelId, { source: message.source, id: button.id });
      await refreshWebview();
      return;
    }

    case "cancel-edit":
      editingByPanel.delete(panelId);
      await refreshWebview();
      return;

    case "save-edit": {
      const fileUri = fileUriFor(message.source);
      if (!fileUri) {
        return;
      }
      const state = await refreshState();
      const file = message.source === "project" ? state.projectFile : state.globalFile;
      const index = file.buttons.findIndex((entry) => buttonId(entry) === message.id);
      if (index < 0) {
        return;
      }
      const entry = file.buttons[index];
      let next: ButtonsFile;
      if (entry.type === "command") {
        next = updateCommandButton(file, index, {
          command: message.command?.trim() || entry.command,
          note: message.note,
        });
      } else {
        next = setButtonNote(file, index, message.note);
      }
      await writeButtonsFile(fileUri, next);
      editingByPanel.delete(panelId);
      await refreshState(true);
      await refreshWebview();
      return;
    }

    case "remove": {
      const fileUri = fileUriFor(message.source);
      if (!fileUri) {
        return;
      }
      const state = await refreshState();
      const file = message.source === "project" ? state.projectFile : state.globalFile;
      const removedEntry = file.buttons[message.index];
      const next = removeButton(file, message.index);
      await writeButtonsFile(fileUri, next);
      const currentEditing = editingByPanel.get(panelId);
      if (removedEntry && currentEditing?.source === message.source && currentEditing.id === buttonId(removedEntry)) {
        editingByPanel.delete(panelId);
      }
      await refreshState(true);
      await refreshWebview();
      return;
    }

    case "start-add":
      addingByPanel.set(panelId, message.source);
      await refreshWebview();
      return;

    case "cancel-add":
      addingByPanel.delete(panelId);
      await refreshWebview();
      return;

    case "save-add": {
      const fileUri = fileUriFor(message.source);
      if (!fileUri) {
        return;
      }
      const command = message.command.trim();
      if (!command) {
        return;
      }
      const state = await refreshState();
      const file = message.source === "project" ? state.projectFile : state.globalFile;
      const next = addCommandButton(file, command, message.note.trim() || undefined);
      await writeButtonsFile(fileUri, next);
      addingByPanel.delete(panelId);
      await refreshState(true);
      await refreshWebview();
      return;
    }

    case "open-project-file": {
      const uri = getProjectButtonsFileUri();
      if (!uri) {
        void vscode.window.showErrorMessage("No workspace folder is open.");
        return;
      }
      await openOrCreateFile(uri);
      return;
    }

    case "open-global-file":
      await openOrCreateFile(getGlobalButtonsFileUri());
      return;

    case "open-settings":
      await vscode.commands.executeCommand("workbench.action.openSettings", "buttons.textSize");
      return;
  }
}

async function openOrCreateFile(uri: vscode.Uri): Promise<void> {
  try {
    await vscode.workspace.fs.stat(uri);
  } catch {
    await writeButtonsFile(uri, emptyButtonsFile());
  }
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
}

function isIgnoredScriptPath(uri: vscode.Uri): boolean {
  const root = getWorkspaceFolderUri();
  if (!root) {
    return false;
  }
  const relative = path.relative(root.fsPath, uri.fsPath);
  return relative.split(path.sep).some((segment) => shouldIgnoreDir(segment));
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(fn, ms);
  };
}
