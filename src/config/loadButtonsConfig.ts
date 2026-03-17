import * as TOML from "@iarna/toml";
import * as vscode from "vscode";
import {
  ButtonsButtonConfig,
  ButtonsDiagnostic,
  ButtonsDocument,
  ButtonsGenerateConfig,
  ButtonsGroupConfig,
  LoadedButtonsState,
  ResolvedButtonsButton,
  ResolvedButtonsConfig,
  ResolvedButtonsGroup,
  TerminalMode,
} from "../models/types";
import { getButtonsFileUri } from "./findButtonsFile";

const DANGER_PATTERNS = [" rm ", " drop ", " prune ", " reset ", " delete ", " deploy "];
const CODICON_PATTERN = /^[a-z][a-z0-9-]*$/;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

interface TemplateContext {
  base?: string;
  variables: Record<string, string>;
  macros: Record<string, string>;
  args: string[];
}

export async function loadButtonsState(showCommandPreviewFallback: boolean, defaultLayout: "grid" | "rows", defaultTerminal: TerminalMode): Promise<LoadedButtonsState> {
  const fileUri = getButtonsFileUri();
  if (!fileUri) {
    return {
      filePath: undefined,
      document: undefined,
      resolved: undefined,
      diagnostics: [
        {
          message: "No workspace folder is open.",
          severity: "error",
        },
      ],
    };
  }

  try {
    const rawBytes = await vscode.workspace.fs.readFile(fileUri);
    const rawText = Buffer.from(rawBytes).toString("utf8");
    const parsed = TOML.parse(rawText) as unknown as ButtonsDocument;
    const diagnostics = validateDocument(parsed);
    const resolved = diagnostics.some((diagnostic) => diagnostic.severity === "error")
      ? undefined
      : resolveDocument(parsed, showCommandPreviewFallback, defaultLayout, defaultTerminal, diagnostics);

    return {
      filePath: fileUri.fsPath,
      document: parsed,
      resolved,
      diagnostics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    return {
      filePath: fileUri.fsPath,
      document: undefined,
      resolved: undefined,
      diagnostics: [
        {
          message,
          severity: "error",
        },
      ],
    };
  }
}

function validateDocument(document: ButtonsDocument): ButtonsDiagnostic[] {
  const diagnostics: ButtonsDiagnostic[] = [];

  if (document.version !== 1) {
    diagnostics.push({ message: "The .buttons file must declare version = 1.", severity: "error" });
  }

  if (document.layout && !["grid", "rows"].includes(document.layout)) {
    diagnostics.push({ message: `Invalid layout: ${document.layout}.`, severity: "error" });
  }

  if (document.terminal && !["current", "new"].includes(document.terminal)) {
    diagnostics.push({ message: `Invalid terminal mode: ${document.terminal}.`, severity: "error" });
  }

  if (!document.groups || Object.keys(document.groups).length === 0) {
    diagnostics.push({ message: "The .buttons file must define at least one group.", severity: "warning" });
  }

  for (const [groupId, group] of Object.entries(document.groups ?? {})) {
    validateCodicon(group.icon, `Group '${groupId}'`, diagnostics);
    validateColor(group.color, `Group '${groupId}'`, diagnostics);
    validatePorts(group.ports, `Group '${groupId}'`, diagnostics);
    validateLinks(group.links, `Group '${groupId}'`, diagnostics);

    for (const button of group.buttons ?? []) {
      validateButton(button, `Group '${groupId}'`, diagnostics);
    }

    if (group.generate) {
      validateGenerate(group.generate, `Group '${groupId}'`, diagnostics);
    }
  }

  return diagnostics;
}

function resolveDocument(
  document: ButtonsDocument,
  showCommandPreviewFallback: boolean,
  defaultLayout: "grid" | "rows",
  defaultTerminal: TerminalMode,
  diagnostics: ButtonsDiagnostic[],
): ResolvedButtonsConfig {
  const variables = document.variables ?? {};
  const macros = expandMacros(document.macros ?? {}, diagnostics);
  const groups: ResolvedButtonsGroup[] = [];
  const seenIds = new Set<string>();

  for (const [groupId, group] of Object.entries(document.groups ?? {})) {
    if (group.enabled === false) {
      continue;
    }

    const groupButtons = [
      ...resolveStaticButtons(groupId, group, document, variables, macros, diagnostics),
      ...resolveGeneratedButtons(groupId, group, document, variables, macros, diagnostics),
    ].filter((button) => button.enabled !== false);

    for (const button of groupButtons) {
      if (seenIds.has(button.id)) {
        diagnostics.push({ message: `Duplicate resolved button id '${button.id}'.`, severity: "error" });
        continue;
      }
      seenIds.add(button.id);
    }

    groups.push({
      id: groupId,
      name: group.name ?? toTitleCase(groupId),
      description: group.description,
      icon: group.icon,
      color: group.color,
      links: group.links ?? [],
      ports: group.ports ?? [],
      buttons: groupButtons,
    });
  }

  return {
    title: document.title ?? "Buttons",
    description: document.description,
    layout: document.layout ?? defaultLayout,
    showCommandPreview: document.display?.show_command ?? showCommandPreviewFallback,
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

function buildCommand(button: ButtonsButtonConfig, group: ButtonsGroupConfig, context: TemplateContext): string {
  const source = button.command ?? [group.base, ...(button.args ?? [])].filter(Boolean).join(group.delimiter ?? " ");
  return applyTemplate(source, context).trim();
}

function applyTemplate(template: string, context: TemplateContext): string {
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

function expandMacros(input: Record<string, string>, diagnostics: ButtonsDiagnostic[]): Record<string, string> {
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

function cartesian(params: string[][]): string[][] {
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

function validateButton(button: ButtonsButtonConfig, scope: string, diagnostics: ButtonsDiagnostic[]): void {
  validateCodicon(button.icon, `${scope} button`, diagnostics);
  validateColor(button.color, `${scope} button`, diagnostics);
  validatePorts(button.open_ports, `${scope} button`, diagnostics);
  validateUrls(button.open_urls, `${scope} button`, diagnostics);

  if (!button.command && (!button.args || button.args.length === 0)) {
    diagnostics.push({ message: `${scope} has a button without command or args.`, severity: "warning" });
  }
}

function validateGenerate(generate: ButtonsGenerateConfig, scope: string, diagnostics: ButtonsDiagnostic[]): void {
  if (generate.mode && generate.mode !== "cartesian") {
    diagnostics.push({ message: `${scope} uses unsupported generate mode '${generate.mode}'.`, severity: "error" });
  }

  if (!Array.isArray(generate.params) || generate.params.length === 0) {
    diagnostics.push({ message: `${scope} generate block must define params.`, severity: "error" });
  }
}

function validateLinks(links: ButtonsGroupConfig["links"], scope: string, diagnostics: ButtonsDiagnostic[]): void {
  for (const link of links ?? []) {
    try {
      new URL(link.url);
    } catch {
      diagnostics.push({ message: `${scope} link '${link.label}' has an invalid URL.`, severity: "error" });
    }
    validateCodicon(link.icon, `${scope} link '${link.label}'`, diagnostics);
  }
}

function validateUrls(urls: string[] | undefined, scope: string, diagnostics: ButtonsDiagnostic[]): void {
  for (const url of urls ?? []) {
    try {
      new URL(url);
    } catch {
      diagnostics.push({ message: `${scope} has an invalid URL '${url}'.`, severity: "error" });
    }
  }
}

function validatePorts(ports: number[] | undefined, scope: string, diagnostics: ButtonsDiagnostic[]): void {
  for (const port of ports ?? []) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      diagnostics.push({ message: `${scope} has an invalid port '${port}'.`, severity: "error" });
    }
  }
}

function validateColor(value: string | undefined, scope: string, diagnostics: ButtonsDiagnostic[]): void {
  if (value && !HEX_COLOR_PATTERN.test(value)) {
    diagnostics.push({ message: `${scope} has an invalid color '${value}'.`, severity: "warning" });
  }
}

function validateCodicon(value: string | undefined, scope: string, diagnostics: ButtonsDiagnostic[]): void {
  if (value && !CODICON_PATTERN.test(value)) {
    diagnostics.push({ message: `${scope} has an invalid codicon '${value}'.`, severity: "warning" });
  }
}

function deriveLabelFromCommand(command: string): string {
  return toTitleCase(command.split(/\s+/).slice(0, 3).join(" "));
}

function toTitleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isDangerousCommand(command: string): boolean {
  const padded = ` ${command.toLowerCase()} `;
  return DANGER_PATTERNS.some((pattern) => padded.includes(pattern));
}