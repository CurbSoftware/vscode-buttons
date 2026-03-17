export type LayoutMode = "grid" | "rows" | "columns" | "table" | "flow";
export type TerminalMode = "current" | "new";
export type ButtonsSource = "user" | "project";

export interface ButtonsDisplayConfig {
  show_command?: boolean;
  show_labels?: boolean;
  show_icons?: boolean;
  compact?: boolean;
  button_color?: string;
  group_bg_color?: string;
  show_run?: boolean;
  show_new_terminal?: boolean;
  show_copy_to_terminal?: boolean;
  show_copy_to_new_terminal?: boolean;
  show_copy_to_clipboard?: boolean;
  run_color?: string;
  new_terminal_color?: string;
  copy_to_terminal_color?: string;
  copy_to_new_terminal_color?: string;
  copy_to_clipboard_color?: string;
  run_label?: string;
  new_terminal_label?: string;
  copy_to_terminal_label?: string;
  copy_to_new_terminal_label?: string;
  copy_to_clipboard_label?: string;
  run_icon?: string;
  new_terminal_icon?: string;
  copy_to_terminal_icon?: string;
  copy_to_new_terminal_icon?: string;
  copy_to_clipboard_icon?: string;
  command_click_to_copy?: boolean;
  label_size?: string;
  action_size?: string;
  action_border_radius?: string;
}

export interface ButtonsDefaults {
  enabled?: boolean;
  copy_to_clipboard?: boolean;
  run_in_current_terminal?: boolean;
  run_in_new_terminal?: boolean;
  confirm?: boolean;
  danger?: boolean;
  reveal_terminal?: boolean;
  cwd?: string;
  env?: Record<string, string>;
}

export interface ButtonsLinkConfig {
  label: string;
  url: string;
  icon?: string;
}

export interface ButtonsGenerateConfig {
  mode?: "cartesian";
  template: string;
  label_template?: string;
  description_template?: string;
  params: string[][];
  defaults?: Partial<ButtonsButtonConfig>;
}

export interface ButtonsButtonConfig extends ButtonsDefaults {
  id?: string;
  label?: string;
  command?: string;
  args?: string[];
  description?: string;
  icon?: string;
  color?: string;
  open_ports?: number[];
  open_urls?: string[];
}

export interface ButtonsGroupConfig extends Partial<ButtonsDefaults> {
  name?: string;
  description?: string;
  enabled?: boolean;
  base?: string;
  icon?: string;
  color?: string;
  layout?: LayoutMode;
  terminal?: TerminalMode;
  cwd?: string;
  env?: Record<string, string>;
  delimiter?: string;
  ports?: number[];
  tags?: string[];
  buttons?: ButtonsButtonConfig[];
  generate?: ButtonsGenerateConfig;
  links?: ButtonsLinkConfig[];
  display?: ButtonsDisplayConfig;
}

export interface ButtonsDocument {
  version: number;
  title?: string;
  description?: string;
  layout?: LayoutMode;
  terminal?: TerminalMode;
  display?: ButtonsDisplayConfig;
  defaults?: ButtonsDefaults;
  variables?: Record<string, string>;
  macros?: Record<string, string>;
  includes?: string[];
  groups?: Record<string, ButtonsGroupConfig>;
}

export interface ButtonsDiagnostic {
  message: string;
  severity: "error" | "warning";
}

export interface ResolvedButtonsActionTarget {
  groupId: string;
  buttonId: string;
}

export interface ResolvedButtonsButton extends ButtonsDefaults {
  id: string;
  label: string;
  description?: string;
  command: string;
  icon?: string;
  color?: string;
  cwd?: string;
  env?: Record<string, string>;
  open_ports: number[];
  open_urls: string[];
  source: ResolvedButtonsActionTarget;
}

export interface ResolvedGroupDisplay {
  layout: LayoutMode;
  showCommandPreview: boolean;
  showLabels: boolean;
  showIcons: boolean;
  compact: boolean;
  buttonColor?: string;
  groupBgColor?: string;
  showRun: boolean;
  showNewTerminal: boolean;
  showCopyToTerminal: boolean;
  showCopyToNewTerminal: boolean;
  showCopyToClipboard: boolean;
  runColor?: string;
  newTerminalColor?: string;
  copyToTerminalColor?: string;
  copyToNewTerminalColor?: string;
  copyToClipboardColor?: string;
  runLabel: string;
  newTerminalLabel: string;
  copyToTerminalLabel: string;
  copyToNewTerminalLabel: string;
  copyToClipboardLabel: string;
  runIcon?: string;
  newTerminalIcon?: string;
  copyToTerminalIcon?: string;
  copyToNewTerminalIcon?: string;
  copyToClipboardIcon?: string;
  commandClickToCopy: boolean;
  labelSize?: string;
  actionSize?: string;
  actionBorderRadius?: string;
}

export interface ResolvedButtonsGroup extends ResolvedGroupDisplay {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  links: ButtonsLinkConfig[];
  ports: number[];
  buttons: ResolvedButtonsButton[];
}

export interface ResolvedButtonsConfig {
  title: string;
  description?: string;
  layout: LayoutMode;
  showCommandPreview: boolean;
  showLabels: boolean;
  showIcons: boolean;
  compact: boolean;
  buttonColor?: string;
  groupBgColor?: string;
  showRun: boolean;
  showNewTerminal: boolean;
  showCopyToTerminal: boolean;
  showCopyToNewTerminal: boolean;
  showCopyToClipboard: boolean;
  runColor?: string;
  newTerminalColor?: string;
  copyToTerminalColor?: string;
  copyToNewTerminalColor?: string;
  copyToClipboardColor?: string;
  groups: ResolvedButtonsGroup[];
}

export interface LoadedButtonsState {
  filePath: string | undefined;
  document: ButtonsDocument | undefined;
  resolved: ResolvedButtonsConfig | undefined;
  diagnostics: ButtonsDiagnostic[];
}

export interface MergedDisplaySettings {
  showCommandPreview: boolean;
  showLabels: boolean;
  showIcons: boolean;
  compact: boolean;
  buttonColor?: string;
  groupBgColor?: string;
  layout: LayoutMode;
  showRun: boolean;
  showNewTerminal: boolean;
  showCopyToTerminal: boolean;
  showCopyToNewTerminal: boolean;
  showCopyToClipboard: boolean;
  runColor?: string;
  newTerminalColor?: string;
  copyToTerminalColor?: string;
  copyToNewTerminalColor?: string;
  copyToClipboardColor?: string;
}

export interface CombinedButtonsState {
  user: LoadedButtonsState;
  project: LoadedButtonsState;
  activeSource: ButtonsSource;
  mergedDisplay: MergedDisplaySettings;
}

export interface PanelActionMessage {
  type: "ready" | "reload" | "open-file" | "run-current" | "run-new"
    | "copy-to-terminal" | "copy-to-new-terminal" | "copy"
    | "open-url" | "open-port"
    | "toggle-source" | "toggle-group" | "toggle-button-visibility";
  groupId?: string;
  buttonId?: string;
  url?: string;
  port?: number;
  source?: ButtonsSource;
}
