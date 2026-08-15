/**
 * Pure read/mutate logic for `.buttons.json` files. No `vscode` import, so this
 * module is directly unit-testable with the Node.js built-in test runner.
 */

import type { ButtonsFile, ButtonsSource, ButtonEntry, CommandButton, ResolvedButton, ScriptButton } from "../models/types";
import { scriptCommand, scriptKey, type DiscoveredScript, type PackageManager } from "../scanner/types";

export function emptyButtonsFile(): ButtonsFile {
  return { version: 1, buttons: [] };
}

/** Build an initial project file that includes every discovered script. */
export function generateButtonsFile(discovered: DiscoveredScript[]): ButtonsFile {
  return { version: 1, buttons: discovered.map((s) => toScriptButton(s)) };
}

function toScriptButton(s: DiscoveredScript, note?: string): ScriptButton {
  return {
    type: "script",
    file: s.file,
    script: s.script,
    packageDir: s.packageDir,
    packageManager: s.packageManager,
    ...(note !== undefined ? { note } : {}),
  };
}

const PACKAGE_MANAGERS: ReadonlySet<string> = new Set(["npm", "pnpm", "yarn", "bun", "make", "composer", "just"]);

function normalizePackageManager(value: unknown): PackageManager {
  return typeof value === "string" && PACKAGE_MANAGERS.has(value) ? (value as PackageManager) : "npm";
}

export type ParseResult = { ok: true; file: ButtonsFile } | { ok: false; error: string };

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
      const raw = buttonsRaw[i];
      if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        return { ok: false, error: `buttons[${i}] must be an object.` };
      }
      const entry = raw as Record<string, unknown>;
      const note = typeof entry.note === "string" ? entry.note : undefined;

      if (entry.type === "script") {
        if (typeof entry.file !== "string" || typeof entry.script !== "string") {
          return { ok: false, error: `buttons[${i}] script entry requires string "file" and "script".` };
        }
        buttons.push({
          type: "script",
          file: entry.file,
          script: entry.script,
          packageDir: typeof entry.packageDir === "string" ? entry.packageDir : "",
          packageManager: normalizePackageManager(entry.packageManager),
          ...(note !== undefined ? { note } : {}),
        });
      } else if (entry.type === "command") {
        if (typeof entry.command !== "string" || entry.command.trim() === "") {
          return { ok: false, error: `buttons[${i}] command entry requires a non-empty "command".` };
        }
        buttons.push({ type: "command", command: entry.command, ...(note !== undefined ? { note } : {}) });
      } else {
        return { ok: false, error: `buttons[${i}] has unknown type: ${JSON.stringify(entry.type)}. Expected "script" or "command".` };
      }
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

export function addScriptButton(file: ButtonsFile, s: DiscoveredScript, note?: string): ButtonsFile {
  if (hasScriptButton(file, scriptKey(s))) {
    return file;
  }
  return { ...file, buttons: [...file.buttons, toScriptButton(s, note)] };
}

export function removeScriptButton(file: ButtonsFile, key: string): ButtonsFile {
  return { ...file, buttons: file.buttons.filter((b) => !(b.type === "script" && scriptKey(b) === key)) };
}

export function addCommandButton(file: ButtonsFile, command: string, note?: string): ButtonsFile {
  return { ...file, buttons: [...file.buttons, { type: "command", command, ...(note !== undefined ? { note } : {}) }] };
}

export function updateCommandButton(
  file: ButtonsFile,
  index: number,
  patch: { command?: string; note?: string },
): ButtonsFile {
  const entry = file.buttons[index];
  if (!entry || entry.type !== "command") {
    return file;
  }
  const buttons = file.buttons.slice();
  const next: CommandButton = {
    type: "command",
    command: patch.command ?? entry.command,
    ...(patch.note !== undefined ? { note: patch.note } : entry.note !== undefined ? { note: entry.note } : {}),
  };
  buttons[index] = next;
  return { ...file, buttons };
}

export function setButtonNote(file: ButtonsFile, index: number, note: string): ButtonsFile {
  const entry = file.buttons[index];
  if (!entry) {
    return file;
  }
  const buttons = file.buttons.slice();
  buttons[index] = { ...entry, note };
  return { ...file, buttons };
}

export function removeButton(file: ButtonsFile, index: number): ButtonsFile {
  if (index < 0 || index >= file.buttons.length) {
    return file;
  }
  const buttons = file.buttons.slice();
  buttons.splice(index, 1);
  return { ...file, buttons };
}

/** Stable identity for a button entry, independent of its position in the buttons array. */
export function buttonId(entry: ButtonEntry): string {
  if (entry.type === "script") {
    return `script:${scriptKey(entry)}`;
  }
  return `command:${JSON.stringify([entry.command, entry.note ?? null])}`;
}

/** Resolve a file's entries into executable rows, recomputing script commands from the current scan. */
export function resolveButtons(file: ButtonsFile, discovered: DiscoveredScript[], source: ButtonsSource): ResolvedButton[] {
  const byKey = new Map<string, DiscoveredScript>();
  for (const d of discovered) {
    byKey.set(scriptKey(d), d);
  }

  return file.buttons.map((entry, index): ResolvedButton => {
    const id = buttonId(entry);
    if (entry.type === "command") {
      return { source, index, id, kind: "command", command: entry.command, note: entry.note, entry };
    }

    const found = byKey.get(scriptKey(entry));
    if (found) {
      return { source, index, id, kind: "script", command: found.command, note: entry.note, entry, missing: false };
    }

    return {
      source,
      index,
      id,
      kind: "script",
      command: scriptCommand(entry.packageManager, entry.script),
      note: entry.note,
      entry,
      missing: true,
    };
  });
}
