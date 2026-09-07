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
    const children = parseChildren(entry.children, label);
    if (!children.ok) {
      return children;
    }
    if (children.children) {
      script.children = children.children;
    }
    return { ok: true, entry: script };
  }

  if (entry.type === "command") {
    if (typeof entry.command !== "string" || entry.command.trim() === "") {
      return { ok: false, error: `${label} command entry requires a non-empty "command".` };
    }
    const command: CommandButton = { type: "command", command: entry.command, ...note, ...id, ...args };
    const children = parseChildren(entry.children, label);
    if (!children.ok) {
      return children;
    }
    if (children.children) {
      command.children = children.children;
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

/** Build or refresh a project file with every root-level script. Existing custom commands, notes, variants, and extra scripts are kept. */
export function generateButtonsFile(discovered: DiscoveredScript[], existing?: ButtonsFile): ButtonsFile {
  return addScriptFile(existing ?? emptyButtonsFile(), discovered.filter((s) => s.packageDir === ""));
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
  if (path.length === 0) {
    return undefined;
  }
  let current: ButtonChild | undefined = file.buttons[path[0]];
  for (let i = 1; i < path.length; i++) {
    if (!current || isArgsButton(current)) {
      return undefined;
    }
    current = current.children?.[path[i]];
  }
  return current;
}

function setChildren(parent: ButtonEntry, children: ButtonChild[]): ButtonEntry {
  const next: ButtonEntry = { ...parent };
  if (children.length === 0) {
    delete next.children;
  } else {
    next.children = children;
  }
  return next;
}

/** Apply `fn` to the sibling array that contains `path`. */
function mapSiblings(
  buttons: ButtonEntry[],
  path: number[],
  fn: (siblings: ButtonChild[], index: number) => ButtonChild[] | undefined,
): ButtonEntry[] | undefined {
  if (path.length === 0) {
    return undefined;
  }

  const walk = (siblings: ButtonChild[], rest: number[]): ButtonChild[] | undefined => {
    const [head, ...tail] = rest;
    if (head === undefined || head < 0 || head >= siblings.length) {
      return undefined;
    }
    if (tail.length === 0) {
      return fn(siblings, head);
    }
    const entry = siblings[head];
    if (isArgsButton(entry) || !entry.children) {
      return undefined;
    }
    const nextKids = walk(entry.children, tail);
    if (!nextKids) {
      return undefined;
    }
    const copy = siblings.slice();
    copy[head] = setChildren(entry, nextKids);
    return copy;
  };

  const walked = walk(buttons, path);
  if (!walked || walked.some(isArgsButton)) {
    return undefined;
  }
  return walked as ButtonEntry[];
}

function commit(
  file: ButtonsFile,
  path: number[],
  fn: (siblings: ButtonChild[], index: number) => ButtonChild[] | undefined,
): ButtonsFile {
  const buttons = mapSiblings(file.buttons, path, fn);
  return buttons ? { ...file, buttons } : file;
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
  if (path.length === 1 && isArgsButton(next)) {
    return file;
  }
  return commit(file, path, (siblings, index) => {
    if (index < 0 || index >= siblings.length) {
      return undefined;
    }
    const copy = siblings.slice();
    copy[index] = next;
    return copy;
  });
}

export function removeButton(file: ButtonsFile, path: number[]): ButtonsFile {
  return commit(file, path, (siblings, index) => {
    if (index < 0 || index >= siblings.length) {
      return undefined;
    }
    const copy = siblings.slice();
    copy.splice(index, 1);
    return copy;
  });
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

  if (path.length === 1 && isArgsButton(clone)) {
    return file;
  }

  return commit(next, path, (siblings, index) => {
    if (index < 0 || index >= siblings.length) {
      return undefined;
    }
    const copy = siblings.slice();
    copy.splice(index + 1, 0, clone);
    return copy;
  });
}

export function addArgsChild(file: ButtonsFile, parentPath: number[], args: string, note?: string, id?: string): ButtonsFile {
  const parent = getAtPath(file, parentPath);
  if (!parent || isArgsButton(parent)) {
    return file;
  }
  const trimmed = args.trim();
  if (trimmed === "") {
    return file;
  }
  const child: ArgsButton = { args: trimmed, ...(note !== undefined && note !== "" ? { note } : {}), ...(id !== undefined ? { id } : {}) };
  return replaceAtPath(file, parentPath, { ...parent, children: [...(parent.children ?? []), child] });
}

export function reorderButtons(file: ButtonsFile, fromPath: number[], toPath: number[]): ButtonsFile {
  if (fromPath.length !== toPath.length || fromPath.length === 0) {
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

  const parentPath = fromPath.slice(0, -1);
  const parent = getAtPath(file, parentPath);
  if (!parent || isArgsButton(parent) || !parent.children || from >= parent.children.length || to >= parent.children.length) {
    return file;
  }
  const children = parent.children.slice();
  const [item] = children.splice(from, 1);
  children.splice(to, 0, item);
  return replaceAtPath(file, parentPath, { ...parent, children });
}

/** File paths of every script entry, including nested children. */
export function scriptEntryFiles(file: ButtonsFile): string[] {
  const files: string[] = [];
  const visit = (entry: ButtonChild): void => {
    if (isScriptButton(entry)) {
      files.push(entry.file);
    }
    if (!isArgsButton(entry)) {
      for (const child of entry.children ?? []) {
        visit(child);
      }
    }
  };
  for (const entry of file.buttons) {
    visit(entry);
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
    return {
      index,
      path,
      id,
      kind: "command",
      command,
      note: entry.note,
      entry,
      children: (entry.children ?? []).map((child, i) => resolveOne(child, [...path, i], byKey, command)),
    };
  }

  const found = byKey.get(scriptKey(entry));
  const command = appendArgs(found ? found.command : scriptCommand(entry.packageManager, entry.script), entry.args);
  const missing = !found;
  const packageDir = entry.packageDir;
  return {
    index,
    path,
    id,
    kind: "script",
    command,
    note: entry.note,
    entry,
    packageDir,
    missing,
    children: (entry.children ?? []).map((child, i) =>
      resolveOne(child, [...path, i], byKey, command, packageDir, missing),
    ),
  };
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
  let current: ResolvedButton | undefined = list[path[0]];
  for (let i = 1; i < path.length; i++) {
    if (!current) {
      return undefined;
    }
    current = current.children[path[i]];
  }
  return current;
}
