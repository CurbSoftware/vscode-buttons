/**
 * Pure read/mutate logic for `.buttons.json` files. No `vscode` import, so this
 * module is directly unit-testable with the Node.js built-in test runner.
 */

import {
  isArgsButton,
  isCommandButton,
  isScriptButton,
  type ArgsButton,
  type ButtonChild,
  type ButtonEntry,
  type ButtonsFile,
  type CommandButton,
  type ResolvedButton,
  type ScriptButton,
} from "../models/types";
import { scriptCommand, scriptKey, type DiscoveredScript, type PackageManager } from "../scanner/types";

export function emptyButtonsFile(): ButtonsFile {
  return { version: 1, buttons: [] };
}

/** Build an initial project file that includes scripts from root-level files only. */
export function generateButtonsFile(discovered: DiscoveredScript[]): ButtonsFile {
  return { version: 1, buttons: discovered.filter((s) => s.packageDir === "").map((s) => toScriptButton(s)) };
}

function toScriptButton(s: DiscoveredScript, note?: string, id?: string): ScriptButton {
  return {
    type: "script",
    file: s.file,
    script: s.script,
    packageDir: s.packageDir,
    packageManager: s.packageManager,
    ...(note !== undefined ? { note } : {}),
    ...(id !== undefined ? { id } : {}),
  };
}

const PACKAGE_MANAGERS: ReadonlySet<string> = new Set([
  "npm",
  "pnpm",
  "yarn",
  "bun",
  "make",
  "composer",
  "just",
  "shell",
  "python",
]);

function normalizePackageManager(value: unknown): PackageManager {
  return typeof value === "string" && PACKAGE_MANAGERS.has(value) ? (value as PackageManager) : "npm";
}

type ParseResult = { ok: true; file: ButtonsFile } | { ok: false; error: string };
type ParseEntryResult = { ok: true; entry: ButtonChild } | { ok: false; error: string };

function optionalId(raw: Record<string, unknown>): { id?: string } {
  return typeof raw.id === "string" && raw.id !== "" ? { id: raw.id } : {};
}

function optionalNote(raw: Record<string, unknown>): { note?: string } {
  return typeof raw.note === "string" ? { note: raw.note } : {};
}

function optionalArgs(raw: Record<string, unknown>): { args?: string } {
  return typeof raw.args === "string" && raw.args.trim() !== "" ? { args: raw.args.trim() } : {};
}

function parseChildren(raw: unknown, label: string): { ok: true; children?: ButtonChild[] } | { ok: false; error: string } {
  if (raw === undefined) {
    return { ok: true };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: `${label} "children" must be an array.` };
  }
  const children: ButtonChild[] = [];
  for (let i = 0; i < raw.length; i++) {
    const parsed = parseButtonValue(raw[i], `${label}.children[${i}]`, true);
    if (!parsed.ok) {
      return parsed;
    }
    children.push(parsed.entry);
  }
  return { ok: true, children: children.length > 0 ? children : undefined };
}

function parseButtonValue(raw: unknown, label: string, asChild: boolean): ParseEntryResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: `${label} must be an object.` };
  }
  const entry = raw as Record<string, unknown>;
  const note = optionalNote(entry);
  const id = optionalId(entry);
  const args = optionalArgs(entry);

  if (asChild && entry.type === undefined) {
    if (typeof entry.args !== "string" || entry.args.trim() === "") {
      return { ok: false, error: `${label} args entry requires a non-empty "args".` };
    }
    return { ok: true, entry: { args: entry.args.trim(), ...note, ...id } };
  }

  if (entry.type === "script") {
    if (typeof entry.file !== "string" || typeof entry.script !== "string") {
      return { ok: false, error: `${label} script entry requires string "file" and "script".` };
    }
    const script: ScriptButton = {
      type: "script",
      file: entry.file,
      script: entry.script,
      packageDir: typeof entry.packageDir === "string" ? entry.packageDir : "",
      packageManager: normalizePackageManager(entry.packageManager),
      ...note,
      ...id,
      ...args,
    };
    if (!asChild) {
      const children = parseChildren(entry.children, label);
      if (!children.ok) {
        return children;
      }
      if (children.children) {
        script.children = children.children;
      }
    }
    return { ok: true, entry: script };
  }

  if (entry.type === "command") {
    if (typeof entry.command !== "string" || entry.command.trim() === "") {
      return { ok: false, error: `${label} command entry requires a non-empty "command".` };
    }
    const command: CommandButton = { type: "command", command: entry.command, ...note, ...id, ...args };
    if (!asChild) {
      const children = parseChildren(entry.children, label);
      if (!children.ok) {
        return children;
      }
      if (children.children) {
        command.children = children.children;
      }
    }
    return { ok: true, entry: command };
  }

  return { ok: false, error: `${label} has unknown type: ${JSON.stringify(entry.type)}. Expected "script" or "command".` };
}

/** Parse `.buttons.json` text into a ButtonsFile, with clear validation errors. */
export function parseButtonsFile(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "Top-level value must be an object." };
  }

  const obj = data as Record<string, unknown>;

  if (obj.version !== undefined && obj.version !== 1) {
    return { ok: false, error: `Unsupported version: ${JSON.stringify(obj.version)}. Only version 1 is supported.` };
  }

  const buttonsRaw = obj.buttons;
  if (buttonsRaw !== undefined && !Array.isArray(buttonsRaw)) {
    return { ok: false, error: '"buttons" must be an array.' };
  }

  const buttons: ButtonEntry[] = [];
  if (Array.isArray(buttonsRaw)) {
    for (let i = 0; i < buttonsRaw.length; i++) {
      const parsed = parseButtonValue(buttonsRaw[i], `buttons[${i}]`, false);
      if (!parsed.ok) {
        return parsed;
      }
      if (isArgsButton(parsed.entry)) {
        return { ok: false, error: `buttons[${i}] has unknown type: undefined. Expected "script" or "command".` };
      }
      buttons.push(parsed.entry);
    }
  }

  return { ok: true, file: { version: 1, buttons } };
}

export function serializeButtonsFile(file: ButtonsFile): string {
  return JSON.stringify(file, null, 2) + "\n";
}

export function hasScriptButton(file: ButtonsFile, key: string): boolean {
  return file.buttons.some((b) => b.type === "script" && scriptKey(b) === key);
}

export function addScriptButton(file: ButtonsFile, s: DiscoveredScript, note?: string, id?: string): ButtonsFile {
  if (hasScriptButton(file, scriptKey(s))) {
    return file;
  }
  return { ...file, buttons: [...file.buttons, toScriptButton(s, note, id)] };
}

export function removeScriptButton(file: ButtonsFile, key: string): ButtonsFile {
  return { ...file, buttons: file.buttons.filter((b) => !(b.type === "script" && scriptKey(b) === key)) };
}

/** Add every script in `scripts` as individual script entries, skipping keys already present. */
export function addScriptFile(file: ButtonsFile, scripts: readonly DiscoveredScript[]): ButtonsFile {
  const existing = new Set(file.buttons.filter((b) => b.type === "script").map((b) => scriptKey(b)));
  const additions: ButtonEntry[] = [];
  for (const s of scripts) {
    const key = scriptKey(s);
    if (!existing.has(key)) {
      existing.add(key);
      additions.push(toScriptButton(s));
    }
  }
  return additions.length === 0 ? file : { ...file, buttons: [...file.buttons, ...additions] };
}

/** Remove every script entry whose `file` equals `filePath`. */
export function removeScriptFile(file: ButtonsFile, filePath: string): ButtonsFile {
  const buttons = file.buttons.filter((b) => !(b.type === "script" && b.file === filePath));
  return buttons.length === file.buttons.length ? file : { ...file, buttons };
}

/** Add every discovered script, or remove all script entries, in one step. */
export function setAllScripts(file: ButtonsFile, discovered: readonly DiscoveredScript[], checked: boolean): ButtonsFile {
  return checked ? addScriptFile(file, discovered) : { ...file, buttons: file.buttons.filter((b) => b.type !== "script") };
}

export function addCommandButton(file: ButtonsFile, command: string, note?: string, id?: string): ButtonsFile {
  return {
    ...file,
    buttons: [...file.buttons, { type: "command", command, ...(note !== undefined ? { note } : {}), ...(id !== undefined ? { id } : {}) }],
  };
}

export function getAtPath(file: ButtonsFile, path: number[]): ButtonChild | undefined {
  if (path.length === 0 || path.length > 2) {
    return undefined;
  }
  const top = file.buttons[path[0]];
  if (!top) {
    return undefined;
  }
  if (path.length === 1) {
    return top;
  }
  return top.children?.[path[1]];
}

function mapButtons(file: ButtonsFile, fn: (entry: ButtonEntry, index: number) => ButtonEntry): ButtonsFile {
  return { ...file, buttons: file.buttons.map(fn) };
}

export function updateCommandButton(
  file: ButtonsFile,
  path: number[],
  patch: { command?: string; note?: string; args?: string },
): ButtonsFile {
  const entry = getAtPath(file, path);
  if (!entry || !isCommandButton(entry)) {
    return file;
  }
  const next: CommandButton = {
    ...entry,
    command: patch.command ?? entry.command,
    ...(patch.note !== undefined ? { note: patch.note } : {}),
    ...(patch.args !== undefined ? (patch.args.trim() !== "" ? { args: patch.args.trim() } : { args: undefined }) : {}),
  };
  if (next.args === undefined) {
    delete next.args;
  }
  return replaceAtPath(file, path, next);
}

export function setButtonNote(file: ButtonsFile, path: number[], note: string): ButtonsFile {
  const entry = getAtPath(file, path);
  if (!entry) {
    return file;
  }
  return replaceAtPath(file, path, { ...entry, note });
}

export function updateButton(
  file: ButtonsFile,
  path: number[],
  patch: { command?: string; args?: string; note: string },
): ButtonsFile {
  const entry = getAtPath(file, path);
  if (!entry) {
    return file;
  }
  if (isArgsButton(entry)) {
    const args = patch.args?.trim() || entry.args;
    if (args.trim() === "") {
      return file;
    }
    return replaceAtPath(file, path, { ...entry, args, note: patch.note });
  }
  if (isCommandButton(entry)) {
    return updateCommandButton(file, path, {
      command: patch.command?.trim() || entry.command,
      note: patch.note,
      args: patch.args,
    });
  }
  const next: ScriptButton = { ...entry, note: patch.note };
  if (patch.args !== undefined) {
    if (patch.args.trim() !== "") {
      next.args = patch.args.trim();
    } else {
      delete next.args;
    }
  }
  return replaceAtPath(file, path, next);
}

function replaceAtPath(file: ButtonsFile, path: number[], next: ButtonChild): ButtonsFile {
  if (path.length === 1) {
    if (isArgsButton(next)) {
      return file;
    }
    const buttons = file.buttons.slice();
    buttons[path[0]] = next;
    return { ...file, buttons };
  }
  if (path.length !== 2) {
    return file;
  }
  const parent = file.buttons[path[0]];
  if (!parent?.children) {
    return file;
  }
  const children = parent.children.slice();
  children[path[1]] = next;
  return mapButtons(file, (entry, i) => (i === path[0] ? { ...parent, children } : entry));
}

export function removeButton(file: ButtonsFile, path: number[]): ButtonsFile {
  if (path.length === 1) {
    if (path[0] < 0 || path[0] >= file.buttons.length) {
      return file;
    }
    const buttons = file.buttons.slice();
    buttons.splice(path[0], 1);
    return { ...file, buttons };
  }
  if (path.length !== 2) {
    return file;
  }
  const parent = file.buttons[path[0]];
  if (!parent?.children || path[1] < 0 || path[1] >= parent.children.length) {
    return file;
  }
  const children = parent.children.slice();
  children.splice(path[1], 1);
  const nextParent: ButtonEntry = { ...parent };
  if (children.length === 0) {
    delete nextParent.children;
  } else {
    nextParent.children = children;
  }
  return mapButtons(file, (entry, i) => (i === path[0] ? nextParent : entry));
}

function newId(): string {
  return crypto.randomUUID();
}

function cloneWithNewIds(entry: ButtonChild): ButtonChild {
  if (isArgsButton(entry)) {
    return { ...entry, id: newId() };
  }
  const clone: ButtonEntry = { ...entry, id: newId() };
  if (clone.children) {
    clone.children = clone.children.map((child) => cloneWithNewIds(child));
  }
  return clone;
}

function ensureId(entry: ButtonChild): ButtonChild {
  return entry.id ? entry : { ...entry, id: newId() };
}

export function duplicateButton(file: ButtonsFile, path: number[]): ButtonsFile {
  const entry = getAtPath(file, path);
  if (!entry) {
    return file;
  }
  const original = ensureId(entry);
  const clone = cloneWithNewIds(original);
  let next = original === entry ? file : replaceAtPath(file, path, original);

  if (path.length === 1) {
    if (isArgsButton(clone)) {
      return file;
    }
    const buttons = next.buttons.slice();
    buttons.splice(path[0] + 1, 0, clone);
    return { ...next, buttons };
  }

  const parent = next.buttons[path[0]];
  if (!parent?.children) {
    return file;
  }
  const children = parent.children.slice();
  children.splice(path[1] + 1, 0, clone);
  return mapButtons(next, (e, i) => (i === path[0] ? { ...parent, children } : e));
}

export function addArgsChild(file: ButtonsFile, parentPath: number[], args: string, note?: string, id?: string): ButtonsFile {
  if (parentPath.length !== 1) {
    return file;
  }
  const trimmed = args.trim();
  if (trimmed === "") {
    return file;
  }
  const parent = file.buttons[parentPath[0]];
  if (!parent) {
    return file;
  }
  const child: ArgsButton = { args: trimmed, ...(note !== undefined && note !== "" ? { note } : {}), ...(id !== undefined ? { id } : {}) };
  const children = [...(parent.children ?? []), child];
  return mapButtons(file, (entry, i) => (i === parentPath[0] ? { ...parent, children } : entry));
}

export function reorderButtons(file: ButtonsFile, fromPath: number[], toPath: number[]): ButtonsFile {
  if (fromPath.length !== toPath.length || fromPath.length === 0 || fromPath.length > 2) {
    return file;
  }
  for (let i = 0; i < fromPath.length - 1; i++) {
    if (fromPath[i] !== toPath[i]) {
      return file;
    }
  }
  const from = fromPath[fromPath.length - 1];
  const to = toPath[toPath.length - 1];
  if (from === to || from < 0 || to < 0) {
    return file;
  }

  if (fromPath.length === 1) {
    if (from >= file.buttons.length || to >= file.buttons.length) {
      return file;
    }
    const buttons = file.buttons.slice();
    const [item] = buttons.splice(from, 1);
    buttons.splice(to, 0, item);
    return { ...file, buttons };
  }

  const parent = file.buttons[fromPath[0]];
  if (!parent?.children || from >= parent.children.length || to >= parent.children.length) {
    return file;
  }
  const children = parent.children.slice();
  const [item] = children.splice(from, 1);
  children.splice(to, 0, item);
  return mapButtons(file, (entry, i) => (i === fromPath[0] ? { ...parent, children } : entry));
}

/** File paths of every script entry, including one level of children. */
export function scriptEntryFiles(file: ButtonsFile): string[] {
  const files: string[] = [];
  for (const entry of file.buttons) {
    if (entry.type === "script") {
      files.push(entry.file);
    }
    for (const child of entry.children ?? []) {
      if (isScriptButton(child)) {
        files.push(child.file);
      }
    }
  }
  return files;
}

function appendArgs(command: string, args?: string): string {
  const extra = args?.trim();
  return extra ? `${command} ${extra}` : command;
}

/** Stable identity for a button entry, independent of its position in the buttons array. */
export function buttonId(entry: ButtonChild): string {
  if (entry.id) {
    return entry.id;
  }
  if (isArgsButton(entry)) {
    return `args:${JSON.stringify([entry.args, entry.note ?? null])}`;
  }
  if (entry.type === "script") {
    return `script:${scriptKey(entry)}`;
  }
  return `command:${JSON.stringify([entry.command, entry.note ?? null])}`;
}

function resolveOne(
  entry: ButtonChild,
  path: number[],
  byKey: Map<string, DiscoveredScript>,
  parentCommand?: string,
  parentPackageDir?: string,
  parentMissing?: boolean,
): ResolvedButton {
  const index = path[path.length - 1];
  const id = buttonId(entry);

  if (isArgsButton(entry)) {
    const base = parentCommand ?? "";
    return {
      index,
      path,
      id,
      kind: "args",
      command: appendArgs(base, entry.args),
      note: entry.note,
      entry,
      packageDir: parentPackageDir,
      missing: parentMissing,
      children: [],
    };
  }

  if (entry.type === "command") {
    const command = appendArgs(entry.command, entry.args);
    const resolved: ResolvedButton = {
      index,
      path,
      id,
      kind: "command",
      command,
      note: entry.note,
      entry,
      children: [],
    };
    if (path.length === 1) {
      resolved.children = (entry.children ?? []).map((child, i) => resolveOne(child, [...path, i], byKey, command));
    }
    return resolved;
  }

  const found = byKey.get(scriptKey(entry));
  const command = appendArgs(found ? found.command : scriptCommand(entry.packageManager, entry.script), entry.args);
  const missing = !found;
  const packageDir = entry.packageDir;
  const resolved: ResolvedButton = {
    index,
    path,
    id,
    kind: "script",
    command,
    note: entry.note,
    entry,
    packageDir,
    missing,
    children: [],
  };
  if (path.length === 1) {
    resolved.children = (entry.children ?? []).map((child, i) =>
      resolveOne(child, [...path, i], byKey, command, packageDir, missing),
    );
  }
  return resolved;
}

/** Resolve a file's entries into executable rows, recomputing script commands from the current scan. */
export function resolveButtons(file: ButtonsFile, discovered: DiscoveredScript[]): ResolvedButton[] {
  const byKey = new Map<string, DiscoveredScript>();
  for (const d of discovered) {
    byKey.set(scriptKey(d), d);
  }
  return file.buttons.map((entry, index) => resolveOne(entry, [index], byKey));
}

export function findResolved(list: ResolvedButton[], path: number[]): ResolvedButton | undefined {
  if (path.length === 0) {
    return undefined;
  }
  const top = list[path[0]];
  if (!top) {
    return undefined;
  }
  if (path.length === 1) {
    return top;
  }
  if (path.length === 2) {
    return top.children[path[1]];
  }
  return undefined;
}
