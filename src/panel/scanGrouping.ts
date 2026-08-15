/**
 * Pure grouping of discovered scripts by their source file, with tri-state
 * (none / some / all selected) derivation. No `vscode` import, so this module
 * is directly unit-testable with the Node.js built-in test runner.
 */

import { scriptKey, type DiscoveredScript } from "../scanner/types";

export interface ScriptGroup {
  /** Posix path of the source file (grouping key), e.g. "packages/app/package.json". */
  file: string;
  /** Scripts from this file, in original scan order. */
  scripts: DiscoveredScript[];
  /** Number of scripts in this group currently selected. */
  selectedCount: number;
  /** True when every script in the group is selected. */
  fileChecked: boolean;
  /** True when at least one but not all scripts are selected. */
  fileIndeterminate: boolean;
}

/** Group discovered scripts by `file` (first-seen order) and derive each group's selection state. */
export function groupScriptsByFile(
  discovered: readonly DiscoveredScript[],
  selectedKeys: readonly string[],
): ScriptGroup[] {
  const selected = new Set(selectedKeys);
  const groups: ScriptGroup[] = [];
  const indexByFile = new Map<string, number>();

  for (const s of discovered) {
    let index = indexByFile.get(s.file);
    if (index === undefined) {
      index = groups.length;
      indexByFile.set(s.file, index);
      groups.push({ file: s.file, scripts: [], selectedCount: 0, fileChecked: false, fileIndeterminate: false });
    }
    const group = groups[index];
    group.scripts.push(s);
    if (selected.has(scriptKey(s))) {
      group.selectedCount += 1;
    }
  }

  for (const group of groups) {
    group.fileChecked = group.scripts.length > 0 && group.selectedCount === group.scripts.length;
    group.fileIndeterminate = group.selectedCount > 0 && group.selectedCount < group.scripts.length;
  }

  return groups;
}
