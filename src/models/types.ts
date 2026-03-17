export type LayoutMode = "grid" | "rows";
export type TerminalMode = "current" | "new";

export interface ButtonsDisplayConfig {
  show_command?: boolean;
  show_labels?: boolean;
  show_icons?: boolean;
  compact?: boolean;
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

export interface ResolvedButtonsGroup {
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
  groups: ResolvedButtonsGroup[];
}

export interface LoadedButtonsState {
  filePath: string | undefined;
  document: ButtonsDocument | undefined;
  resolved: ResolvedButtonsConfig | undefined;
  diagnostics: ButtonsDiagnostic[];
}

export interface PanelActionMessage {
  type: "ready" | "reload" | "open-file" | "run-current" | "run-new" | "copy" | "open-url" | "open-port";
  groupId?: string;
  buttonId?: string;
  url?: string;
  port?: number;
}