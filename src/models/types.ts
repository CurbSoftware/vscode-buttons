import type { ScanDirectory } from "../scanner/scanScope";
import type { DiscoveredScript, PackageManager } from "../scanner/types";

export type ButtonsSource = "project" | "global";

export type ButtonsTab = "buttons" | "scripts";

/** Extra flags appended to a parent's resolved command. Only valid as a child. */
export interface ArgsButton {
  args: string;
  note?: string;
  id?: string;
  children?: ButtonChild[];
}

/** Live reference to a script discovered by the scanner. The command is recomputed on every rescan. */
export interface ScriptButton {
  type: "script";
  /** Posix-separated path of the script file: workspace-relative, or absolute for files outside the workspace. */
  file: string;
  /** Script/target name. */
  script: string;
  /** Posix-separated directory of the script file: workspace-relative ("" means root) or absolute. */
  packageDir: string;
  packageManager: PackageManager;
  note?: string;
  id?: string;
  /** Extra flags appended after the recomputed script command. */
  args?: string;
  children?: ButtonChild[];
}

/** Literal custom command, not tied to any file. */
export interface CommandButton {
  type: "command";
  command: string;
  note?: string;
  id?: string;
  args?: string;
  children?: ButtonChild[];
}

export type ButtonEntry = ScriptButton | CommandButton;
export type ButtonChild = ButtonEntry | ArgsButton;

export interface ButtonsFile {
  version: 1;
  buttons: ButtonEntry[];
}

export interface ButtonColors {
  background: string;
  foreground: string;
  hoverBackground: string;
  actionBackground: string;
  actionForeground: string;
  runBackground: string;
  runForeground: string;
  newTerminalBackground: string;
  newTerminalForeground: string;
  appendBackground: string;
  appendForeground: string;
  newlineBackground: string;
  newlineForeground: string;
  copyBackground: string;
  copyForeground: string;
  duplicateBackground: string;
  duplicateForeground: string;
  editBackground: string;
  editForeground: string;
  removeBackground: string;
  removeForeground: string;
  commandForeground: string;
  commandBackground: string;
  variantCommandForeground: string;
  variantCommandBackground: string;
  rowBackground: string;
  rowOddBackground: string;
  rowEvenBackground: string;
  variantRowBackground: string;
  variantRowOddBackground: string;
  variantRowEvenBackground: string;
}

export const BUTTON_COLOR_KEYS = [
  "background",
  "foreground",
  "hoverBackground",
  "actionBackground",
  "actionForeground",
  "runBackground",
  "runForeground",
  "newTerminalBackground",
  "newTerminalForeground",
  "appendBackground",
  "appendForeground",
  "newlineBackground",
  "newlineForeground",
  "copyBackground",
  "copyForeground",
  "duplicateBackground",
  "duplicateForeground",
  "editBackground",
  "editForeground",
  "removeBackground",
  "removeForeground",
  "commandForeground",
  "commandBackground",
  "variantCommandForeground",
  "variantCommandBackground",
  "rowBackground",
  "rowOddBackground",
  "rowEvenBackground",
  "variantRowBackground",
  "variantRowOddBackground",
  "variantRowEvenBackground",
] as const satisfies readonly (keyof ButtonColors)[];

export function emptyButtonColors(): ButtonColors {
  const colors = {} as ButtonColors;
  for (const key of BUTTON_COLOR_KEYS) {
    colors[key] = "";
  }
  return colors;
}

/** A button resolved to its executable form, plus UI bookkeeping. */
export interface ResolvedButton {
  /** Index into the parent array (top-level `buttons` or a parent's `children`). */
  index: number;
  /** Path from the file root: `[2]` is the third top-level button, `[2, 0]` is its first child. */
  path: number[];
  /** Stable identity, independent of array position (explicit id, script key, or command content). */
  id: string;
  kind: "script" | "command" | "args";
  command: string;
  note?: string;
  entry: ButtonChild;
  /** Working directory inherited from a script entry (or a script parent, for args children). */
  packageDir?: string;
  /** True when a script reference points at a script no longer present in the scan. */
  missing?: boolean;
  children: ResolvedButton[];
}

export interface RuntimeState {
  projectFile: ButtonsFile;
  globalFile: ButtonsFile;
  projectButtons: ResolvedButton[];
  globalButtons: ResolvedButton[];
  discovered: DiscoveredScript[];
  /** True when the project `.buttons.json` exists on disk (distinct from an empty-but-present file). */
  projectFileExists: boolean;
  /** Error text if a JSON file failed to parse. */
  parseError?: string;
}

export interface WebviewState {
  projectButtons: ResolvedButton[];
  globalButtons: ResolvedButton[];
  discovered: DiscoveredScript[];
  /** Keys ("file:script") of scripts currently selected in the project file. */
  selectedKeys: string[];
  hasWorkspace: boolean;
  /** Error text if a JSON file failed to parse. */
  parseError?: string;
  editing?: { source: ButtonsSource; path: number[] };
  addingSource?: ButtonsSource;
  /** When set, the add-variant form is open under this parent path. */
  addingChildPath?: number[];
  /** Base font-size delta in px (0, 2, or 4) applied on top of VS Code's font size. */
  textSizePx: number;
  /** True when the project `.buttons.json` exists on disk. */
  projectFileExists: boolean;
  /** Which tab this panel is currently showing. */
  activeTab: ButtonsTab;
  /** Normalized `buttons.scanDirectories` setting (root is implicit and not listed). */
  scanDirectories: ScanDirectory[];
  /** Empty strings mean inherit the VS Code button theme tokens. */
  buttonColors: ButtonColors;
}

export type PanelActionMessage =
  | { type: "rescan" }
  | { type: "toggle-script"; file: string; script: string; checked: boolean }
  | { type: "toggle-file"; file: string; checked: boolean }
  | { type: "toggle-all"; checked: boolean }
  | { type: "run-current"; source: ButtonsSource; path: number[] }
  | { type: "run-new"; source: ButtonsSource; path: number[] }
  | { type: "copy"; source: ButtonsSource; path: number[] }
  | { type: "append"; source: ButtonsSource; path: number[]; sep: "space" | "newline" }
  | { type: "start-edit"; source: ButtonsSource; path: number[] }
  | { type: "cancel-edit" }
  | { type: "save-edit"; source: ButtonsSource; path: number[]; command?: string; args?: string; note: string }
  | { type: "remove"; source: ButtonsSource; path: number[] }
  | { type: "duplicate"; source: ButtonsSource; path: number[] }
  | { type: "reorder"; source: ButtonsSource; from: number[]; to: number[] }
  | { type: "start-add"; source: ButtonsSource }
  | { type: "cancel-add" }
  | { type: "save-add"; source: ButtonsSource; command: string; note: string }
  | { type: "start-add-child"; source: ButtonsSource; path: number[] }
  | { type: "save-add-child"; source: ButtonsSource; path: number[]; args: string; note: string }
  | { type: "open-project-file" }
  | { type: "open-global-file" }
  | { type: "open-settings" }
  | { type: "open-main-panel" }
  | { type: "export-skill" }
  | { type: "generate" }
  | { type: "add-scan-dir"; path: string }
  | { type: "remove-scan-dir"; path: string }
  | { type: "toggle-scan-dir-recursive"; path: string; recursive: boolean }
  | { type: "set-tab"; tab: ButtonsTab };

export function isArgsButton(entry: ButtonChild): entry is ArgsButton {
  return !("type" in entry);
}

export function isScriptButton(entry: ButtonChild): entry is ScriptButton {
  return "type" in entry && entry.type === "script";
}

export function isCommandButton(entry: ButtonChild): entry is CommandButton {
  return "type" in entry && entry.type === "command";
}
