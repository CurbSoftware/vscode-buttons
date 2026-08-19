import type { ScanDirectory } from "../scanner/scanScope";
import type { DiscoveredScript, PackageManager } from "../scanner/types";

export type ButtonsSource = "project" | "global";

export type ButtonsTab = "buttons" | "scripts";

/** Live reference to a script discovered by the scanner. The command is recomputed on every rescan. */
export interface ScriptButton {
  type: "script";
  /** Posix-separated path of the script file relative to the workspace root. */
  file: string;
  /** Script/target name. */
  script: string;
  /** Posix-separated directory of the script file relative to the workspace root; "" means root. */
  packageDir: string;
  packageManager: PackageManager;
  note?: string;
}

/** Literal custom command, not tied to any file. */
export interface CommandButton {
  type: "command";
  command: string;
  note?: string;
}

export type ButtonEntry = ScriptButton | CommandButton;

export interface ButtonsFile {
  version: 1;
  buttons: ButtonEntry[];
}

/** A button resolved to its executable form, plus UI bookkeeping. */
export interface ResolvedButton {
  /** Index into the source file's `buttons` array. */
  index: number;
  /** Stable identity, independent of array position (script key or command content). */
  id: string;
  kind: "script" | "command";
  command: string;
  note?: string;
  entry: ButtonEntry;
  /** True when a script reference points at a script no longer present in the scan. */
  missing?: boolean;
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
  editing?: { source: ButtonsSource; id: string };
  addingSource?: ButtonsSource;
  /** Base font-size delta in px (0, 2, or 4) applied on top of VS Code's font size. */
  textSizePx: number;
  /** True when the project `.buttons.json` exists on disk. */
  projectFileExists: boolean;
  /** Which tab this panel is currently showing. */
  activeTab: ButtonsTab;
  /** Normalized `buttons.scanDirectories` setting (root is implicit and not listed). */
  scanDirectories: ScanDirectory[];
}

export type PanelActionMessage =
  | { type: "rescan" }
  | { type: "toggle-script"; file: string; script: string; checked: boolean }
  | { type: "toggle-file"; file: string; checked: boolean }
  | { type: "toggle-all"; checked: boolean }
  | { type: "run-current"; source: ButtonsSource; index: number }
  | { type: "run-new"; source: ButtonsSource; index: number }
  | { type: "copy"; source: ButtonsSource; index: number }
  | { type: "start-edit"; source: ButtonsSource; index: number }
  | { type: "cancel-edit" }
  | { type: "save-edit"; source: ButtonsSource; id: string; command?: string; note: string }
  | { type: "remove"; source: ButtonsSource; index: number }
  | { type: "start-add"; source: ButtonsSource }
  | { type: "cancel-add" }
  | { type: "save-add"; source: ButtonsSource; command: string; note: string }
  | { type: "open-project-file" }
  | { type: "open-global-file" }
  | { type: "open-settings" }
  | { type: "generate" }
  | { type: "add-scan-dir" }
  | { type: "remove-scan-dir"; path: string }
  | { type: "toggle-scan-dir-recursive"; path: string; recursive: boolean }
  | { type: "set-tab"; tab: ButtonsTab };
