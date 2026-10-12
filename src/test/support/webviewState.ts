import { emptyButtonColors, type ResolvedButton, type WebviewState } from "../../models/types";
import type { DiscoveredScript } from "../../scanner/types";

export function webviewState(overrides: Partial<WebviewState> = {}): WebviewState {
  return {
    projectButtons: [],
    globalButtons: [],
    discovered: [],
    selectedKeys: [],
    hasWorkspace: true,
    textSizePx: 0,
    projectFileExists: true,
    activeTab: "buttons",
    scanDirectories: [],
    buttonColors: emptyButtonColors(),
    ...overrides,
  };
}

export function commandButton(command: string, path: number[] = [0], extras: Partial<ResolvedButton> = {}): ResolvedButton {
  return {
    index: path[path.length - 1] ?? 0,
    path,
    id: extras.id ?? `cmd-${path.join("-")}`,
    kind: "command",
    command,
    note: extras.note,
    entry: extras.entry ?? { type: "command", command, ...(extras.note ? { note: extras.note } : {}) },
    packageDir: extras.packageDir,
    missing: extras.missing,
    children: extras.children ?? [],
  };
}

export function scriptRow(
  file: string,
  script: string,
  command: string,
  packageDir = "",
): DiscoveredScript {
  return {
    file,
    script,
    command,
    packageDir,
    packageManager: "pnpm",
  };
}
