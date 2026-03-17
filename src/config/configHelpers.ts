import {
  ButtonsButtonConfig,
  ButtonsDiagnostic,
  ButtonsDisplayConfig,
  ButtonsDocument,
  ButtonsGenerateConfig,
  ButtonsGroupConfig,
  LayoutMode,
  ResolvedButtonsButton,
  ResolvedButtonsConfig,
  ResolvedButtonsGroup,
  ResolvedGroupDisplay,
  TerminalMode,
} from "../models/types";

export const DANGER_PATTERNS = [" rm ", " drop ", " prune ", " reset ", " delete ", " deploy "];
export const MAX_GENERATED_BUTTONS = 1000;
export const CODICON_PATTERN = /^[a-z][a-z0-9-]*$/;
export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;
export const VALID_LAYOUTS: LayoutMode[] = ["grid", "rows", "columns", "table", "flow"];

export interface TemplateContext {
  base?: string;
  variables: Record<string, string>;
  macros: Record<string, string>;
  args: string[];
}

export function validateDocument(document: ButtonsDocument): ButtonsDiagnostic[] {
  const diagnostics: ButtonsDiagnostic[] = [];

  if (document.version !== 1) {
    diagnostics.push({ message: "The .buttons file must declare version = 1.", severity: "error" });
  }

  if (document.layout && !VALID_LAYOUTS.includes(document.layout)) {
    diagnostics.push({ message: `Invalid layout: ${document.layout}.`, severity: "error" });
  }

  if (document.terminal && !["current", "new"].includes(document.terminal)) {
    diagnostics.push({ message: `Invalid terminal mode: ${document.terminal}.`, severity: "error" });
  }

  if (!document.groups || Object.keys(document.groups).length === 0) {
    diagnostics.push({ message: "The .buttons file must define at least one group.", severity: "warning" });
  }

  if (document.display) {
    validateDisplayConfig(document.display, "Display", diagnostics);
  }

  for (const [groupId, group] of Object.entries(document.groups ?? {})) {
    validateCodicon(group.icon, `Group '${groupId}'`, diagnostics);
    validateColor(group.color, `Group '${groupId}'`, diagnostics);
    validatePorts(group.ports, `Group '${groupId}'`, diagnostics);
    validateLinks(group.links, `Group '${groupId}'`, diagnostics);

    if (group.display) {
      validateDisplayConfig(group.display, `Group '${groupId}' display`, diagnostics);
    }

    for (const button of group.buttons ?? []) {
      validateButton(button, `Group '${groupId}'`, diagnostics);
    }

    if (group.generate) {
      validateGenerate(group.generate, `Group '${groupId}'`, diagnostics);
    }
  }

  return diagnostics;
}

export function resolveDocument(
  document: ButtonsDocument,
  showCommandPreviewFallback: boolean,
  defaultLayout: LayoutMode,
  defaultTerminal: TerminalMode,
  diagnostics: ButtonsDiagnostic[],
): ResolvedButtonsConfig {
  const variables = document.variables ?? {};
  const macros = expandMacros(document.macros ?? {}, diagnostics);
  const groups: ResolvedButtonsGroup[] = [];
  const seenIds = new Set<string>();

  const documentDisplay: ResolvedGroupDisplay = {
    layout: document.layout ?? defaultLayout,
    showCommandPreview: document.display?.show_command ?? showCommandPreviewFallback,
    showLabels: document.display?.show_labels ?? true,
    showIcons: document.display?.show_icons ?? true,
    compact: document.display?.compact ?? false,
    buttonColor: document.display?.button_color,
    groupBgColor: document.display?.group_bg_color,
    showRun: document.display?.show_run ?? true,
    showNewTerminal: document.display?.show_new_terminal ?? true,
    showCopyToTerminal: document.display?.show_copy_to_terminal ?? true,
    showCopyToNewTerminal: document.display?.show_copy_to_new_terminal ?? true,
    showCopyToClipboard: document.display?.show_copy_to_clipboard ?? true,
    runColor: document.display?.run_color,
    newTerminalColor: document.display?.new_terminal_color,
    copyToTerminalColor: document.display?.copy_to_terminal_color,
    copyToNewTerminalColor: document.display?.copy_to_new_terminal_color,
    copyToClipboardColor: document.display?.copy_to_clipboard_color,
    runLabel: document.display?.run_label ?? "Run",
    newTerminalLabel: document.display?.new_terminal_label ?? "New Terminal",
    copyToTerminalLabel: document.display?.copy_to_terminal_label ?? "Copy to Terminal",
    copyToNewTerminalLabel: document.display?.copy_to_new_terminal_label ?? "Copy to New Terminal",
    copyToClipboardLabel: document.display?.copy_to_clipboard_label ?? "Copy",
    runIcon: document.display?.run_icon,
    newTerminalIcon: document.display?.new_terminal_icon,
    copyToTerminalIcon: document.display?.copy_to_terminal_icon,
    copyToNewTerminalIcon: document.display?.copy_to_new_terminal_icon,
    copyToClipboardIcon: document.display?.copy_to_clipboard_icon,
    commandClickToCopy: document.display?.command_click_to_copy ?? false,
    labelSize: document.display?.label_size,
    actionSize: document.display?.action_size,
    actionBorderRadius: document.display?.action_border_radius,
  };

  for (const [groupId, group] of Object.entries(document.groups ?? {})) {
    if (group.enabled === false) {
      continue;
    }

    const groupButtons = [
      ...resolveStaticButtons(groupId, group, document, variables, macros, diagnostics),
      ...resolveGeneratedButtons(groupId, group, document, variables, macros, diagnostics),
    ].filter((button) => button.enabled !== false);

    const deduplicatedButtons: ResolvedButtonsButton[] = [];
    for (const button of groupButtons) {
      if (seenIds.has(button.id)) {
        diagnostics.push({ message: `Duplicate resolved button id '${button.id}'.`, severity: "error" });
        continue;
      }
      seenIds.add(button.id);
      deduplicatedButtons.push(button);
    }

    const groupDisplay = resolveGroupDisplay(documentDisplay, group.display, group.layout);

    groups.push({
      id: groupId,
      name: group.name ?? toTitleCase(groupId),
      description: group.description,
      icon: group.icon,
      color: group.color,
      links: group.links ?? [],
      ports: group.ports ?? [],
      buttons: deduplicatedButtons,
      ...groupDisplay,
    });
  }

  return {
    title: document.title ?? "Buttons",
    description: document.description,
    ...documentDisplay,
    groups,
  };
}

function resolveStaticButtons(
  groupId: string,
  group: ButtonsGroupConfig,
  document: ButtonsDocument,
  variables: Record<string, string>,
  macros: Record<string, string>,
  diagnostics: ButtonsDiagnostic[],
): ResolvedButtonsButton[] {
  return (group.buttons ?? []).flatMap((button, index) => {
    const command = buildCommand(button, group, { base: group.base, variables, macros, args: [] });
    if (!command) {
      diagnostics.push({ message: `Button ${index + 1} in group '${groupId}' does not resolve to a command.`, severity: "error" });
      return [];
    }

    return [resolveButton(groupId, group, document, button, command)];
  });
}

function resolveGeneratedButtons(
  groupId: string,
  group: ButtonsGroupConfig,
  document: ButtonsDocument,
  variables: Record<string, string>,
  macros: Record<string, string>,
  diagnostics: ButtonsDiagnostic[],
): ResolvedButtonsButton[] {
  const generate = group.generate;
  if (!generate) {
    return [];
  }

  const combinations = cartesian(generate.params);
  if (combinations.length > MAX_GENERATED_BUTTONS) {
    diagnostics.push({
      message: `Group '${groupId}' generate block produces ${combinations.length} buttons, exceeding the limit of ${MAX_GENERATED_BUTTONS}.`,
      severity: "error",
    });
    return [];
  }

  return combinations.flatMap((args, index) => {
    const context: TemplateContext = { base: group.base, variables, macros, args };
    const command = applyTemplate(generate.template, context);
    if (!command.trim()) {
      diagnostics.push({ message: `Generated command ${index + 1} in group '${groupId}' is empty.`, severity: "error" });
      return [];
    }

    const generatedButton: ButtonsButtonConfig = {
      ...generate.defaults,
      label: generate.label_template ? applyTemplate(generate.label_template, context) : args.join(" "),
      description: generate.description_template ? applyTemplate(generate.description_template, context) : undefined,
      command,
    };

    return [resolveButton(groupId, group, document, generatedButton, command)];
  });
}

function resolveButton(
  groupId: string,
  group: ButtonsGroupConfig,
  document: ButtonsDocument,
  button: ButtonsButtonConfig,
  command: string,
): ResolvedButtonsButton {
  const defaults = document.defaults ?? {};
  const label = button.label?.trim() || button.id || deriveLabelFromCommand(command);
  const id = button.id?.trim() || slugify(`${groupId}-${label}`);
  const terminalMode = resolveTerminalMode(defaults, group, button, document.terminal ?? "current");

  return {
    id,
    label,
    description: button.description,
    command,
    icon: button.icon ?? group.icon,
    color: button.color ?? group.color,
    enabled: button.enabled ?? group.enabled ?? defaults.enabled ?? true,
    copy_to_clipboard: button.copy_to_clipboard ?? group.copy_to_clipboard ?? defaults.copy_to_clipboard ?? true,
    run_in_current_terminal: terminalMode === "current",
    run_in_new_terminal: terminalMode === "new",
    confirm: button.confirm ?? group.confirm ?? defaults.confirm ?? false,
    danger: button.danger ?? group.danger ?? defaults.danger ?? isDangerousCommand(command),
    reveal_terminal: button.reveal_terminal ?? group.reveal_terminal ?? defaults.reveal_terminal ?? true,
    cwd: button.cwd ?? group.cwd ?? defaults.cwd,
    env: button.env ?? group.env ?? defaults.env,
    open_ports: button.open_ports ?? [],
    open_urls: button.open_urls ?? [],
    source: {
      groupId,
      buttonId: id,
    },
  };
}

function resolveTerminalMode(
  defaults: ButtonsDocument["defaults"],
  group: ButtonsGroupConfig,
  button: ButtonsButtonConfig,
  fallback: TerminalMode,
): TerminalMode {
  if (button.run_in_new_terminal === true) {
    return "new";
  }

  if (button.run_in_current_terminal === true) {
    return "current";
  }

  const preferNewTerminal = (button.run_in_new_terminal ?? false) || group.terminal === "new" || defaults?.run_in_new_terminal === true;
  return preferNewTerminal ? "new" : fallback;
}

export function buildCommand(button: ButtonsButtonConfig, group: ButtonsGroupConfig, context: TemplateContext): string {
  const source = button.command ?? [group.base, ...(button.args ?? [])].filter(Boolean).join(group.delimiter ?? " ");
  return applyTemplate(source, context).trim();
}

export function applyTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, rawToken: string) => {
    const token = rawToken.trim();
    if (token === "base") {
      return context.base ?? "";
    }

    if (token.startsWith("arg")) {
      const argIndex = Number(token.slice(3)) - 1;
      return Number.isInteger(argIndex) && argIndex >= 0 ? context.args[argIndex] ?? "" : "";
    }

    if (token in context.variables) {
      return context.variables[token] ?? "";
    }

    if (token in context.macros) {
      return context.macros[token] ?? "";
    }

    return "";
  });
}

export function expandMacros(input: Record<string, string>, diagnostics: ButtonsDiagnostic[]): Record<string, string> {
  const resolved: Record<string, string> = {};
  const visiting = new Set<string>();

  const visit = (name: string): string => {
    if (name in resolved) {
      return resolved[name];
    }

    if (visiting.has(name)) {
      diagnostics.push({ message: `Circular macro reference detected for '${name}'.`, severity: "error" });
      return "";
    }

    visiting.add(name);
    const value = input[name] ?? "";
    const expanded = value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, token: string) => {
      const trimmed = token.trim();
      return trimmed in input ? visit(trimmed) : "";
    });
    visiting.delete(name);
    resolved[name] = expanded;
    return expanded;
  };

  for (const key of Object.keys(input)) {
    visit(key);
  }

  return resolved;
}

export function cartesian(params: string[][]): string[][] {
  if (params.length === 0) {
    return [[]];
  }

  return params.reduce<string[][]>((accumulator, values) => {
    const next: string[][] = [];
    for (const partial of accumulator) {
      for (const value of values) {
        next.push([...partial, value]);
      }
    }
    return next;
  }, [[]]);
}

export function validateButton(button: ButtonsButtonConfig, scope: string, diagnostics: ButtonsDiagnostic[]): void {
  validateCodicon(button.icon, `${scope} button`, diagnostics);
  validateColor(button.color, `${scope} button`, diagnostics);
  validatePorts(button.open_ports, `${scope} button`, diagnostics);
  validateUrls(button.open_urls, `${scope} button`, diagnostics);

  if (!button.command && (!button.args || button.args.length === 0)) {
    diagnostics.push({ message: `${scope} has a button without command or args.`, severity: "warning" });
  }
}

export function validateGenerate(generate: ButtonsGenerateConfig, scope: string, diagnostics: ButtonsDiagnostic[]): void {
  if (generate.mode && generate.mode !== "cartesian") {
    diagnostics.push({ message: `${scope} uses unsupported generate mode '${generate.mode}'.`, severity: "error" });
  }

  if (!Array.isArray(generate.params) || generate.params.length === 0) {
    diagnostics.push({ message: `${scope} generate block must define params.`, severity: "error" });
  }
}

export function validateLinks(links: ButtonsGroupConfig["links"], scope: string, diagnostics: ButtonsDiagnostic[]): void {
  for (const link of links ?? []) {
    try {
      new URL(link.url);
    } catch {
      diagnostics.push({ message: `${scope} link '${link.label}' has an invalid URL.`, severity: "error" });
    }
    validateCodicon(link.icon, `${scope} link '${link.label}'`, diagnostics);
  }
}

export function validateUrls(urls: string[] | undefined, scope: string, diagnostics: ButtonsDiagnostic[]): void {
  for (const url of urls ?? []) {
    try {
      new URL(url);
    } catch {
      diagnostics.push({ message: `${scope} has an invalid URL '${url}'.`, severity: "error" });
    }
  }
}

export function validatePorts(ports: number[] | undefined, scope: string, diagnostics: ButtonsDiagnostic[]): void {
  for (const port of ports ?? []) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      diagnostics.push({ message: `${scope} has an invalid port '${port}'.`, severity: "error" });
    }
  }
}

export function validateColor(value: string | undefined, scope: string, diagnostics: ButtonsDiagnostic[]): void {
  if (value && !HEX_COLOR_PATTERN.test(value)) {
    diagnostics.push({ message: `${scope} has an invalid color '${value}'.`, severity: "warning" });
  }
}

export function validateCodicon(value: string | undefined, scope: string, diagnostics: ButtonsDiagnostic[]): void {
  if (value && !CODICON_PATTERN.test(value)) {
    diagnostics.push({ message: `${scope} has an invalid codicon '${value}'.`, severity: "warning" });
  }
}

export function deriveLabelFromCommand(command: string): string {
  return toTitleCase(command.split(/\s+/).slice(0, 3).join(" "));
}

export function toTitleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isDangerousCommand(command: string): boolean {
  const padded = ` ${command.toLowerCase()} `;
  return DANGER_PATTERNS.some((pattern) => padded.includes(pattern));
}

export function validateDisplayConfig(display: ButtonsDisplayConfig, scope: string, diagnostics: ButtonsDiagnostic[]): void {
  validateColor(display.button_color, scope, diagnostics);
  validateColor(display.group_bg_color, scope, diagnostics);
  validateColor(display.run_color, scope, diagnostics);
  validateColor(display.new_terminal_color, scope, diagnostics);
  validateColor(display.copy_to_terminal_color, scope, diagnostics);
  validateColor(display.copy_to_new_terminal_color, scope, diagnostics);
  validateColor(display.copy_to_clipboard_color, scope, diagnostics);
  validateCodicon(display.run_icon, `${scope} run_icon`, diagnostics);
  validateCodicon(display.new_terminal_icon, `${scope} new_terminal_icon`, diagnostics);
  validateCodicon(display.copy_to_terminal_icon, `${scope} copy_to_terminal_icon`, diagnostics);
  validateCodicon(display.copy_to_new_terminal_icon, `${scope} copy_to_new_terminal_icon`, diagnostics);
  validateCodicon(display.copy_to_clipboard_icon, `${scope} copy_to_clipboard_icon`, diagnostics);
}

export function resolveGroupDisplay(
  base: ResolvedGroupDisplay,
  groupDisplay: ButtonsDisplayConfig | undefined,
  groupLayout: LayoutMode | undefined,
): ResolvedGroupDisplay {
  const result = { ...base };
  if (groupLayout) {
    result.layout = groupLayout;
  }
  if (!groupDisplay) {
    return result;
  }
  if (groupDisplay.show_command !== undefined) result.showCommandPreview = groupDisplay.show_command;
  if (groupDisplay.show_labels !== undefined) result.showLabels = groupDisplay.show_labels;
  if (groupDisplay.show_icons !== undefined) result.showIcons = groupDisplay.show_icons;
  if (groupDisplay.compact !== undefined) result.compact = groupDisplay.compact;
  if (groupDisplay.button_color !== undefined) result.buttonColor = groupDisplay.button_color;
  if (groupDisplay.group_bg_color !== undefined) result.groupBgColor = groupDisplay.group_bg_color;
  if (groupDisplay.show_run !== undefined) result.showRun = groupDisplay.show_run;
  if (groupDisplay.show_new_terminal !== undefined) result.showNewTerminal = groupDisplay.show_new_terminal;
  if (groupDisplay.show_copy_to_terminal !== undefined) result.showCopyToTerminal = groupDisplay.show_copy_to_terminal;
  if (groupDisplay.show_copy_to_new_terminal !== undefined) result.showCopyToNewTerminal = groupDisplay.show_copy_to_new_terminal;
  if (groupDisplay.show_copy_to_clipboard !== undefined) result.showCopyToClipboard = groupDisplay.show_copy_to_clipboard;
  if (groupDisplay.run_color !== undefined) result.runColor = groupDisplay.run_color;
  if (groupDisplay.new_terminal_color !== undefined) result.newTerminalColor = groupDisplay.new_terminal_color;
  if (groupDisplay.copy_to_terminal_color !== undefined) result.copyToTerminalColor = groupDisplay.copy_to_terminal_color;
  if (groupDisplay.copy_to_new_terminal_color !== undefined) result.copyToNewTerminalColor = groupDisplay.copy_to_new_terminal_color;
  if (groupDisplay.copy_to_clipboard_color !== undefined) result.copyToClipboardColor = groupDisplay.copy_to_clipboard_color;
  if (groupDisplay.run_label !== undefined) result.runLabel = groupDisplay.run_label;
  if (groupDisplay.new_terminal_label !== undefined) result.newTerminalLabel = groupDisplay.new_terminal_label;
  if (groupDisplay.copy_to_terminal_label !== undefined) result.copyToTerminalLabel = groupDisplay.copy_to_terminal_label;
  if (groupDisplay.copy_to_new_terminal_label !== undefined) result.copyToNewTerminalLabel = groupDisplay.copy_to_new_terminal_label;
  if (groupDisplay.copy_to_clipboard_label !== undefined) result.copyToClipboardLabel = groupDisplay.copy_to_clipboard_label;
  if (groupDisplay.run_icon !== undefined) result.runIcon = groupDisplay.run_icon;
  if (groupDisplay.new_terminal_icon !== undefined) result.newTerminalIcon = groupDisplay.new_terminal_icon;
  if (groupDisplay.copy_to_terminal_icon !== undefined) result.copyToTerminalIcon = groupDisplay.copy_to_terminal_icon;
  if (groupDisplay.copy_to_new_terminal_icon !== undefined) result.copyToNewTerminalIcon = groupDisplay.copy_to_new_terminal_icon;
  if (groupDisplay.copy_to_clipboard_icon !== undefined) result.copyToClipboardIcon = groupDisplay.copy_to_clipboard_icon;
  if (groupDisplay.command_click_to_copy !== undefined) result.commandClickToCopy = groupDisplay.command_click_to_copy;
  if (groupDisplay.label_size !== undefined) result.labelSize = groupDisplay.label_size;
  if (groupDisplay.action_size !== undefined) result.actionSize = groupDisplay.action_size;
  if (groupDisplay.action_border_radius !== undefined) result.actionBorderRadius = groupDisplay.action_border_radius;
  return result;
}

export function mergeDocuments(root: ButtonsDocument, included: ButtonsDocument, sourcePath: string, diagnostics: ButtonsDiagnostic[]): void {
  // Merge groups: included groups are added; root groups win on ID collision
  if (included.groups) {
    if (!root.groups) {
      root.groups = {};
    }
    for (const [groupId, groupConfig] of Object.entries(included.groups)) {
      if (groupId in root.groups) {
        diagnostics.push({
          message: `Included file '${sourcePath}' defines group '${groupId}' which already exists. Skipping duplicate.`,
          severity: "warning",
        });
      } else {
        root.groups[groupId] = groupConfig;
      }
    }
  }

  // Merge variables: root values win on collision
  if (included.variables) {
    if (!root.variables) {
      root.variables = {};
    }
    for (const [key, value] of Object.entries(included.variables)) {
      if (!(key in root.variables)) {
        root.variables[key] = value;
      }
    }
  }

  // Merge macros: root values win on collision
  if (included.macros) {
    if (!root.macros) {
      root.macros = {};
    }
    for (const [key, value] of Object.entries(included.macros)) {
      if (!(key in root.macros)) {
        root.macros[key] = value;
      }
    }
  }

  // Included file's top-level settings (title, description, layout, terminal, display, defaults) are ignored.
  // Only groups, variables, and macros are merged.
}
