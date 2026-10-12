/**
 * In-memory VS Code stand-in for headless host tests.
 * Installs itself as the `vscode` module before extension code loads.
 * `child_process.spawn` is captured so system-terminal tests never open a window.
 */
import moduleNamespace = require("module");

type Disposable = { dispose: () => void };

export class Uri {
  constructor(public readonly fsPath: string) {}

  static file(fsPath: string): Uri {
    return new Uri(normalizePath(fsPath));
  }

  static joinPath(base: Uri, ...parts: string[]): Uri {
    return new Uri(normalizePath(joinPath(base.fsPath, ...parts)));
  }

  toString(): string {
    return this.fsPath;
  }
}

export class RelativePattern {
  readonly base: Uri;
  readonly pattern: string;

  constructor(base: Uri | string, pattern: string) {
    this.base = typeof base === "string" ? Uri.file(base) : base;
    this.pattern = pattern;
  }
}

export interface SpawnCall {
  cmd: string;
  args: string[];
  options: { cwd?: string; detached?: boolean; stdio?: string };
  child: FakeChild;
}

export interface FakeChild {
  on(event: string, cb: (...args: unknown[]) => void): FakeChild;
  unref(): void;
  emit(event: string, ...args: unknown[]): void;
}

export interface SentText {
  text: string;
  execute: boolean;
}

export interface FakeTerminal {
  name: string;
  cwd?: string;
  shown: boolean;
  preserveFocus?: boolean;
  sent: SentText[];
  sendText(text: string, execute?: boolean): void;
  show(preserveFocus?: boolean): void;
  dispose(): void;
}

interface MemEntry {
  kind: "file" | "dir";
  data?: Uint8Array;
}

class Watcher {
  disposed = false;
  private change: Array<(uri: Uri) => void> = [];
  private create: Array<(uri: Uri) => void> = [];
  private delete: Array<(uri: Uri) => void> = [];

  constructor(readonly pattern: string | RelativePattern) {}

  onDidChange(listener: (uri: Uri) => void, _thisArg?: unknown, disposables?: Disposable[]): Disposable {
    return listen(this.change, listener, disposables);
  }

  onDidCreate(listener: (uri: Uri) => void, _thisArg?: unknown, disposables?: Disposable[]): Disposable {
    return listen(this.create, listener, disposables);
  }

  onDidDelete(listener: (uri: Uri) => void, _thisArg?: unknown, disposables?: Disposable[]): Disposable {
    return listen(this.delete, listener, disposables);
  }

  fireChange(uri: Uri): void {
    if (!this.disposed) {
      for (const listener of this.change) {
        listener(uri);
      }
    }
  }

  fireCreate(uri: Uri): void {
    if (!this.disposed) {
      for (const listener of this.create) {
        listener(uri);
      }
    }
  }

  fireDelete(uri: Uri): void {
    if (!this.disposed) {
      for (const listener of this.delete) {
        listener(uri);
      }
    }
  }

  dispose(): void {
    this.disposed = true;
  }
}

export interface FakeWebview {
  html: string;
  options: { enableScripts?: boolean; localResourceRoots?: Uri[] };
  asWebviewUri(uri: Uri): { toString(): string };
  onDidReceiveMessage(listener: (message: unknown) => unknown): Disposable;
  fire(message: unknown): Promise<void>;
}

export interface FakeWebviewView {
  webview: FakeWebview;
  onDidDispose(listener: () => void): Disposable;
  dispose(): void;
}

export interface FakeWebviewPanel {
  viewType: string;
  title: string;
  options: { enableScripts?: boolean; localResourceRoots?: Uri[]; retainContextWhenHidden?: boolean };
  iconPath?: { light: Uri; dark: Uri };
  revealed: number;
  webview: FakeWebview;
  reveal(): void;
  onDidDispose(listener: () => void): Disposable;
  dispose(): void;
}

function listen(bucket: Function[], listener: Function, disposables?: Disposable[]): Disposable {
  bucket.push(listener);
  const disposable = {
    dispose: () => {
      const index = bucket.indexOf(listener);
      if (index >= 0) {
        bucket.splice(index, 1);
      }
    },
  };
  disposables?.push(disposable);
  return disposable;
}

function normalizePath(fsPath: string): string {
  const parts = fsPath.replace(/\\/g, "/").split("/");
  const out: string[] = [];
  const absolute = fsPath.startsWith("/") || /^[a-zA-Z]:/.test(fsPath);
  for (const part of parts) {
    if (part === "" || part === ".") {
      continue;
    }
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  const prefix = absolute ? (fsPath.startsWith("/") ? "/" : "") : "";
  return prefix + out.join("/");
}

function joinPath(base: string, ...parts: string[]): string {
  return normalizePath([base, ...parts].join("/"));
}

function braceExpand(pattern: string): string[] {
  const start = pattern.indexOf("{");
  if (start === -1) {
    return [pattern];
  }
  const end = pattern.indexOf("}", start);
  if (end === -1) {
    return [pattern];
  }
  const prefix = pattern.slice(0, start);
  const suffix = pattern.slice(end + 1);
  return pattern
    .slice(start + 1, end)
    .split(",")
    .flatMap((alt) => braceExpand(prefix + alt + suffix));
}

function globToRegExp(glob: string): RegExp {
  let source = "^";
  for (let i = 0; i < glob.length; i++) {
    if (glob[i] === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") {
        source += "(?:.*/)?";
        i += 2;
        continue;
      }
      source += ".*";
      i += 1;
      continue;
    }
    if (glob[i] === "*") {
      source += "[^/]*";
      continue;
    }
    if ("\\^$+?.()|[]{}".includes(glob[i])) {
      source += "\\" + glob[i];
    } else {
      source += glob[i];
    }
  }
  source += "$";
  return new RegExp(source);
}

function matchGlob(pattern: string, posixRel: string): boolean {
  return braceExpand(pattern).some((glob) => globToRegExp(glob).test(posixRel));
}

const EXCLUDE_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".nuxt",
  ".output",
  ".cache",
  ".turbo",
  ".yarn",
  ".pnpm-store",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  ".venv",
  "venv",
  "__pycache__",
  ".vscode",
  ".idea",
  "target",
  ".svelte-kit",
  ".parcel-cache",
]);

function excludedByScannerGlob(posixRel: string): boolean {
  const parts = posixRel.split("/");
  if (parts.length < 2) {
    return false;
  }
  return parts.slice(0, -1).some((segment) => segment.startsWith(".") || EXCLUDE_DIR_NAMES.has(segment));
}

function createChild(): FakeChild {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const child: FakeChild = {
    on(event, cb) {
      handlers.set(event, cb);
      return child;
    },
    unref() {},
    emit(event, ...args) {
      handlers.get(event)?.(...args);
    },
  };
  return child;
}

function createWebview(): FakeWebview {
  const listeners: Array<(message: unknown) => unknown> = [];
  return {
    html: "",
    options: {},
    asWebviewUri(uri: Uri) {
      return { toString: () => `vscode-webview:${uri.fsPath}` };
    },
    onDidReceiveMessage(listener) {
      listeners.push(listener);
      return { dispose: () => {} };
    },
    async fire(message: unknown) {
      for (const listener of listeners) {
        await listener(message);
      }
    },
  };
}

export interface VsCodeDouble {
  Uri: typeof Uri;
  RelativePattern: typeof RelativePattern;
  ViewColumn: { One: number; Two: number };
  FileType: { Unknown: number; File: number; Directory: number; SymbolicLink: number };
  ConfigurationTarget: { Global: number; Workspace: number; WorkspaceFolder: number };
  config: Record<string, unknown>;
  files: Map<string, MemEntry>;
  failReads: Set<string>;
  failNextConfigUpdate: boolean;
  infos: string[];
  errors: string[];
  warnings: string[];
  warningChoice: string | undefined;
  quickPickQueue: unknown[];
  lastQuickPickItems: unknown[] | undefined;
  executed: { command: string; args: unknown[] }[];
  commandHandlers: Map<string, (...args: unknown[]) => unknown>;
  commands: {
    registerCommand(command: string, callback: (...args: unknown[]) => unknown): Disposable;
    executeCommand(command: string, ...args: unknown[]): Thenable<unknown>;
  };
  providers: Map<string, { resolveWebviewView(view: FakeWebviewView): void }>;
  panels: FakeWebviewPanel[];
  watchers: Watcher[];
  spawned: SpawnCall[];
  opened: Uri[];
  shown: Uri[];
  updates: { key: string; value: unknown; target: unknown }[];
  readCount: number;
  window: {
    activeTerminal: FakeTerminal | undefined;
    terminals: FakeTerminal[];
    createTerminal(options?: { name?: string; cwd?: string }): FakeTerminal;
    registerWebviewViewProvider(id: string, provider: { resolveWebviewView(view: FakeWebviewView): void }): Disposable;
    createWebviewPanel(
      viewType: string,
      title: string,
      column: number,
      options: FakeWebviewPanel["options"],
    ): FakeWebviewPanel;
    showInformationMessage(message: string): Thenable<undefined>;
    showErrorMessage(message: string): Thenable<undefined>;
    showWarningMessage(message: string, ...rest: unknown[]): Thenable<string | undefined>;
    showQuickPick(items: unknown[]): Thenable<unknown>;
    showTextDocument(document: { uri: Uri }): Thenable<{ uri: Uri }>;
    onDidCloseTerminal(listener: (terminal: FakeTerminal) => void): Disposable;
    onDidEndTerminalShellExecution(listener: (event: { terminal: FakeTerminal }) => void): Disposable;
  };
  workspace: {
    workspaceFolders: { uri: Uri; name: string; index: number }[] | undefined;
    fs: {
      readFile(uri: Uri): Thenable<Uint8Array>;
      writeFile(uri: Uri, data: Uint8Array): Thenable<void>;
      stat(uri: Uri): Thenable<{ type: number; size: number; ctime: number; mtime: number }>;
    };
    findFiles(include: RelativePattern, exclude?: string, maxResults?: number): Thenable<Uri[]>;
    createFileSystemWatcher(pattern: string | RelativePattern): Watcher;
    getConfiguration(section?: string, _resource?: Uri): {
      get(key: string, defaultValue?: unknown): unknown;
      update(key: string, value: unknown, target?: unknown): Thenable<void>;
    };
    onDidChangeConfiguration(listener: (event: { affectsConfiguration(section: string): boolean }) => void): Disposable;
    onDidChangeWorkspaceFolders(listener: () => void): Disposable;
    openTextDocument(uri: Uri): Thenable<{ uri: Uri }>;
    fireConfiguration(changedKey: string): void;
  };
  env: {
    clipboard: {
      text: string;
      fail: boolean;
      writeText(text: string): Promise<void>;
    };
  };
  setWorkspace(fsPath: string): void;
  writeFile(fsPath: string, text: string): void;
  setDir(fsPath: string): void;
  readText(fsPath: string): string | undefined;
  setConfig(key: string, value: unknown): void;
  reset(): void;
  fireCloseTerminal(terminal: FakeTerminal): void;
  fireEndShell(terminal: FakeTerminal): void;
  createView(): FakeWebviewView;
}

function createDouble(): VsCodeDouble {
  const files = new Map<string, MemEntry>();
  const failReads = new Set<string>();
  const config: Record<string, unknown> = {};
  const commandHandlers = new Map<string, (...args: unknown[]) => unknown>();
  const providers = new Map<string, { resolveWebviewView(view: FakeWebviewView): void }>();
  const panels: FakeWebviewPanel[] = [];
  const watchers: Watcher[] = [];
  const spawned: SpawnCall[] = [];
  const infos: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const executed: { command: string; args: unknown[] }[] = [];
  const opened: Uri[] = [];
  const shown: Uri[] = [];
  const updates: { key: string; value: unknown; target: unknown }[] = [];
  const quickPickQueue: unknown[] = [];
  const closeListeners: Array<(terminal: FakeTerminal) => void> = [];
  const endListeners: Array<(event: { terminal: FakeTerminal }) => void> = [];
  const configListeners: Array<(event: { affectsConfiguration(section: string): boolean }) => void> = [];
  const terminals: FakeTerminal[] = [];

  const clipboard = {
    text: "",
    fail: false,
    async writeText(text: string) {
      if (clipboard.fail) {
        throw new Error("clipboard unavailable");
      }
      clipboard.text = text;
    },
  };

  const api: VsCodeDouble = {
    Uri,
    RelativePattern,
    ViewColumn: { One: 1, Two: 2 },
    FileType: { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 },
    ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
    config,
    files,
    failReads,
    failNextConfigUpdate: false,
    infos,
    errors,
    warnings,
    warningChoice: undefined,
    quickPickQueue,
    lastQuickPickItems: undefined,
    executed,
    commandHandlers,
    commands: {
      registerCommand(command, callback) {
        commandHandlers.set(command, callback);
        return {
          dispose: () => {
            if (commandHandlers.get(command) === callback) {
              commandHandlers.delete(command);
            }
          },
        };
      },
      async executeCommand(command, ...args) {
        executed.push({ command, args });
        const handler = commandHandlers.get(command);
        if (handler) {
          return handler(...args);
        }
        return undefined;
      },
    },
    providers,
    panels,
    watchers,
    spawned,
    opened,
    shown,
    updates,
    readCount: 0,
    window: {
      activeTerminal: undefined,
      terminals,
      createTerminal(options) {
        const terminal: FakeTerminal = {
          name: options?.name ?? "",
          cwd: options?.cwd,
          shown: false,
          sent: [],
          sendText(text, execute = true) {
            terminal.sent.push({ text, execute });
          },
          show(preserveFocus) {
            terminal.shown = true;
            terminal.preserveFocus = preserveFocus;
          },
          dispose() {},
        };
        terminals.push(terminal);
        return terminal;
      },
      registerWebviewViewProvider(id, provider) {
        providers.set(id, provider);
        return { dispose: () => providers.delete(id) };
      },
      createWebviewPanel(viewType, title, _column, options) {
        const panelDispose: Array<() => void> = [];
        const panel: FakeWebviewPanel = {
          viewType,
          title,
          options,
          revealed: 0,
          webview: createWebview(),
          reveal() {
            panel.revealed += 1;
          },
          onDidDispose(listener) {
            return listen(panelDispose, listener);
          },
          dispose() {
            for (const listener of panelDispose.splice(0)) {
              listener();
            }
          },
        };
        panels.push(panel);
        return panel;
      },
      showInformationMessage(message) {
        infos.push(message);
        return Promise.resolve(undefined);
      },
      showErrorMessage(message) {
        errors.push(message);
        return Promise.resolve(undefined);
      },
      showWarningMessage(message) {
        warnings.push(message);
        return Promise.resolve(api.warningChoice);
      },
      showQuickPick(items) {
        api.lastQuickPickItems = items;
        return Promise.resolve(quickPickQueue.length > 0 ? quickPickQueue.shift() : undefined);
      },
      showTextDocument(document) {
        shown.push(document.uri);
        return Promise.resolve(document);
      },
      onDidCloseTerminal(listener) {
        return listen(closeListeners, listener);
      },
      onDidEndTerminalShellExecution(listener) {
        return listen(endListeners, listener);
      },
    },
    workspace: {
      workspaceFolders: undefined,
      fs: {
        async readFile(uri) {
          api.readCount += 1;
          const key = normalizePath(uri.fsPath);
          if (failReads.has(key)) {
            throw new Error(`unreadable ${key}`);
          }
          const entry = files.get(key);
          if (!entry || entry.kind !== "file" || !entry.data) {
            throw new Error(`ENOENT ${key}`);
          }
          return entry.data;
        },
        async writeFile(uri, data) {
          const key = normalizePath(uri.fsPath);
          files.set(key, { kind: "file", data: Uint8Array.from(data) });
        },
        async stat(uri) {
          const key = normalizePath(uri.fsPath);
          const entry = files.get(key);
          if (entry?.kind === "file") {
            return { type: 1, size: entry.data?.byteLength ?? 0, ctime: 0, mtime: 0 };
          }
          if (entry?.kind === "dir" || [...files.keys()].some((file) => file.startsWith(key + "/"))) {
            return { type: 2, size: 0, ctime: 0, mtime: 0 };
          }
          throw new Error(`ENOENT ${key}`);
        },
      },
      async findFiles(include, exclude, maxResults) {
        const base = include.base.fsPath;
        const out: Uri[] = [];
        for (const filePath of files.keys()) {
          const entry = files.get(filePath);
          if (!entry || entry.kind !== "file") {
            continue;
          }
          if (filePath !== base && !filePath.startsWith(base.endsWith("/") ? base : base + "/")) {
            continue;
          }
          const posix = filePath.slice(base.length).replace(/^\//, "");
          if (!posix || !matchGlob(include.pattern, posix)) {
            continue;
          }
          if (exclude && excludedByScannerGlob(posix)) {
            continue;
          }
          out.push(Uri.file(filePath));
          if (maxResults && out.length >= maxResults) {
            break;
          }
        }
        return out;
      },
      createFileSystemWatcher(pattern) {
        const watcher = new Watcher(pattern);
        watchers.push(watcher);
        return watcher;
      },
      getConfiguration(section) {
        return {
          get(key: string, defaultValue?: unknown) {
            const full = section ? `${section}.${key}` : key;
            return Object.prototype.hasOwnProperty.call(config, full) ? config[full] : defaultValue;
          },
          async update(key: string, value: unknown, target?: unknown) {
            if (api.failNextConfigUpdate) {
              api.failNextConfigUpdate = false;
              throw new Error("settings write failed");
            }
            const full = section ? `${section}.${key}` : key;
            config[full] = value;
            updates.push({ key: full, value, target });
            api.workspace.fireConfiguration(full);
          },
        };
      },
      onDidChangeConfiguration(listener) {
        return listen(configListeners, listener);
      },
      onDidChangeWorkspaceFolders(listener) {
        return { dispose: () => { void listener; } };
      },
      async openTextDocument(uri) {
        opened.push(uri);
        return { uri };
      },
      fireConfiguration(changedKey: string) {
        const event = {
          affectsConfiguration(section: string) {
            return changedKey === section || changedKey.startsWith(section + ".");
          },
        };
        for (const listener of configListeners) {
          listener(event);
        }
      },
    },
    env: { clipboard },
    setWorkspace(fsPath: string) {
      const uri = Uri.file(fsPath);
      files.set(uri.fsPath, { kind: "dir" });
      api.workspace.workspaceFolders = [{ uri, name: "fixture", index: 0 }];
    },
    writeFile(fsPath: string, text: string) {
      files.set(normalizePath(fsPath), { kind: "file", data: Buffer.from(text, "utf8") });
    },
    setDir(fsPath: string) {
      files.set(normalizePath(fsPath), { kind: "dir" });
    },
    readText(fsPath: string) {
      const entry = files.get(normalizePath(fsPath));
      if (!entry?.data) {
        return undefined;
      }
      return Buffer.from(entry.data).toString("utf8");
    },
    setConfig(key, value) {
      config[key] = value;
    },
    reset() {
      files.clear();
      failReads.clear();
      for (const key of Object.keys(config)) {
        delete config[key];
      }
      commandHandlers.clear();
      providers.clear();
      panels.splice(0);
      watchers.splice(0);
      spawned.splice(0);
      infos.splice(0);
      errors.splice(0);
      warnings.splice(0);
      executed.splice(0);
      opened.splice(0);
      shown.splice(0);
      updates.splice(0);
      quickPickQueue.splice(0);
      closeListeners.splice(0);
      endListeners.splice(0);
      configListeners.splice(0);
      terminals.splice(0);
      api.window.activeTerminal = undefined;
      api.workspace.workspaceFolders = undefined;
      api.readCount = 0;
      api.failNextConfigUpdate = false;
      api.warningChoice = undefined;
      api.lastQuickPickItems = undefined;
      clipboard.text = "";
      clipboard.fail = false;
    },
    fireCloseTerminal(terminal) {
      for (const listener of closeListeners) {
        listener(terminal);
      }
    },
    fireEndShell(terminal) {
      for (const listener of endListeners) {
        listener({ terminal });
      }
    },
    createView() {
      const disposeListeners: Array<() => void> = [];
      return {
        webview: createWebview(),
        onDidDispose(listener) {
          return listen(disposeListeners, listener);
        },
        dispose() {
          for (const listener of disposeListeners.splice(0)) {
            listener();
          }
        },
      };
    },
  };

  return api;
}

export const vscode = createDouble();

const spawned = vscode.spawned;
const childProcessFake = {
  spawn(cmd: string, args: string[], options: SpawnCall["options"]) {
    const child = createChild();
    spawned.push({ cmd, args: [...args], options, child });
    return child;
  },
};

const moduleWithLoad = moduleNamespace as unknown as {
  _load: (this: unknown, request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = moduleWithLoad._load;
moduleWithLoad._load = function (this: unknown, request: string, parent: unknown, isMain: boolean) {
  if (request === "vscode") {
    return vscode;
  }
  if (request === "child_process") {
    return childProcessFake;
  }
  return originalLoad.call(this, request, parent, isMain);
};
