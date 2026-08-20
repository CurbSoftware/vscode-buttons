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
import { isAbsolutePosix, normalizeScanDirectories, SCAN_FILE_GLOB, type ScanDirectory } from "./scanner/scanScope";
import { fileEntryScript, scriptKey, shouldIgnoreDir, type DiscoveredScript } from "./scanner/types";
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
    vscode.commands.registerCommand("buttons.addFileButton", async (uri?: vscode.Uri, uris?: vscode.Uri[]) => {
      // Explorer passes the clicked uri; multi-select arrives via the second argument.
      for (const u of uris && uris.length > 0 ? uris : uri ? [uri] : []) {
        await addFileFromExplorer(u);
      }
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

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      rebuildExternalWatchers();
      refreshAll();
    }),
  );

  // React to settings changes: text size re-renders, scan settings re-scan.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("buttons.textSize")) {
        void refreshWebview();
      }
      if (e.affectsConfiguration("buttons.scriptFiles") || e.affectsConfiguration("buttons.scanDirectories")) {
        rebuildExternalWatchers();
        refreshAll();
      }
    }),
  );

  rebuildExternalWatchers();
}

/** Watchers for absolute scan directories; the workspace-glob script watcher cannot see them. */
let externalWatchers: vscode.FileSystemWatcher[] = [];

function rebuildExternalWatchers(): void {
  for (const watcher of externalWatchers) {
    watcher.dispose();
  }
  externalWatchers = [];
  for (const dir of getScanDirectories(getWorkspaceFolderUri())) {
    if (!isAbsolutePosix(dir.path)) {
      continue;
    }
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(vscode.Uri.file(dir.path), `**/{${SCAN_FILE_GLOB},requirements.txt}`),
    );
    watcher.onDidChange(sharedRefreshAll);
    watcher.onDidCreate(sharedRefreshAll);
    watcher.onDidDelete(sharedRefreshAll);
    externalWatchers.push(watcher);
  }
}

export function deactivate(): void {
  currentState = undefined;
  sidebarProvider = undefined;
  mainPanel = undefined;
  for (const watcher of externalWatchers) {
    watcher.dispose();
  }
  externalWatchers = [];
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

/** Stable path identity for a file: workspace-relative when inside the project, absolute posix otherwise. */
function toEntryPath(root: vscode.Uri, fsPath: string): string {
  const rel = path.relative(root.fsPath, fsPath).split(path.sep).join("/");
  if (rel === "" || rel === ".." || rel.startsWith("../") || path.isAbsolute(rel)) {
    return fsPath.split(path.sep).join("/");
  }
  return rel;
}

/** Append one directory (workspace-relative when inside the project, absolute otherwise) to the setting. */
async function addScanDirectoryPath(absoluteFsPath: string): Promise<void> {
  const root = getWorkspaceFolderUri();
  if (!root) {
    return;
  }
  const entry = toEntryPath(root, absoluteFsPath);
  if (entry === "") {
    void vscode.window.showInformationMessage("The project root is always scanned - not added again.");
    return;
  }
  // Reject what the scanner would silently drop anyway (hidden/ignored names, glob metacharacters).
  if (normalizeScanDirectories([{ path: entry }]).length === 0) {
    void vscode.window.showWarningMessage(
      `"${entry}" cannot be scanned - hidden, ignored, or unsupported directory names are skipped.`,
    );
    return;
  }

  const foldCase = process.platform === "win32" ? (p: string) => p.toLowerCase() : (p: string) => p;
  await mutateScanDirectories((dirs) => {
    if (dirs.some((d) => foldCase(d.path) === foldCase(entry))) {
      void vscode.window.showInformationMessage(`"${entry}" is already a scan directory.`);
      return dirs;
    }
    return [...dirs, { path: entry, recursive: false }];
  });
}

/** Add one standalone script file (.sh / Python entry file) as a project button. */
async function addStandaloneFile(entry: DiscoveredScript): Promise<void> {
  const fileUri = getProjectButtonsFileUri();
  if (!fileUri) {
    void vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }
  const state = await refreshState();
  const base = state.projectFileExists ? state.projectFile : emptyButtonsFile();
  const next = addScriptButton(base, entry);
  if (next === base) {
    void vscode.window.showInformationMessage(`"${entry.script}" is already a button.`);
    return;
  }
  await writeButtonsFile(fileUri, next);
  await refreshState(true);
  await refreshWebview();
}

/**
 * Turn a pasted path into scan scope or buttons. Directories become scan
 * directories (relative inside the project, absolute outside); .sh and Python
 * entry files become standalone buttons; manifest files are covered by
 * scanning their folder.
 */
async function addScanPath(rawPath: string): Promise<void> {
  const root = getWorkspaceFolderUri();
  if (!root) {
    return;
  }
  const trimmed = rawPath.trim().replace(/^"(.*)"$/, "$1"); // Windows "Copy as path" pastes quoted.
  if (!trimmed) {
    return;
  }
  const absolute =
    path.isAbsolute(trimmed) || /^[a-zA-Z]:/.test(trimmed) ? trimmed : path.resolve(root.fsPath, trimmed);

  let isDirectory: boolean;
  try {
    isDirectory = (await vscode.workspace.fs.stat(vscode.Uri.file(absolute))).type === vscode.FileType.Directory;
  } catch {
    void vscode.window.showWarningMessage(`"${trimmed}" does not exist.`);
    return;
  }

  if (isDirectory) {
    await addScanDirectoryPath(absolute);
    return;
  }
  const entryPath = toEntryPath(root, absolute);
  const entry = fileEntryScript(path.basename(absolute), entryPath);
  if (entry) {
    await addStandaloneFile(entry);
    return;
  }
  // A manifest file: its scripts come from scanning its folder.
  await addScanDirectoryPath(path.dirname(absolute));
}

/** Context-menu handler: add a right-clicked file as a button, or scan its folder for manifests. */
async function addFileFromExplorer(uri: vscode.Uri): Promise<void> {
  const root = getWorkspaceFolderUri();
  if (!root) {
    void vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }
  const entryPath = toEntryPath(root, uri.fsPath);
  const entry = fileEntryScript(path.basename(uri.fsPath), entryPath);
  if (entry) {
    await addStandaloneFile(entry);
    return;
  }
  await addScanDirectoryPath(path.dirname(uri.fsPath));
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
    // Absolute package dirs (scripts outside the workspace) are used as-is.
    if (isAbsolutePosix(button.entry.packageDir)) {
      return button.entry.packageDir;
    }
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
      await addScanPath(message.path);
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
