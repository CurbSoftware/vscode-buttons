/**
 * Pure scan-scope logic: which directories the scanner walks, the glob for
 * each scope, and the synthetic venv buttons. No `vscode` import so it stays
 * unit-testable with the Node.js built-in test runner.
 */

import { dirOf, EXCLUDE_DIRS, MANIFEST_FILE_NAMES, PYTHON_ENTRY_FILES, shellArg, type DiscoveredScript } from "./types";

export interface ScanDirectory {
  /** Posix-separated workspace-relative path, or an absolute path for a directory outside the workspace. */
  path: string;
  /** Scan the directory tree recursively instead of only its top level. */
  recursive: boolean;
}

/** True for absolute posix paths ("/opt/tools") and windows drive paths ("C:/tools"). */
export function isAbsolutePosix(p: string): boolean {
  return p.startsWith("/") || /^[a-zA-Z]:/.test(p);
}

/** Basenames the scanner looks for inside every scan scope. */
export const SCAN_FILE_GLOB = [...MANIFEST_FILE_NAMES, "*.sh", ...PYTHON_ENTRY_FILES].join(",");

/** Relative-path half of the validation: hidden, ignored, and glob-unsafe names are dropped. */
function isScannableRelativePath(normalized: string): boolean {
  const segments = normalized.split("/");
  return !(
    normalized === "" ||
    normalized === "." ||
    normalized === ".." ||
    /[{}[\]*?]/.test(normalized) ||
    segments.some((s) => s === ".." || s === "" || s.startsWith(".") || EXCLUDE_DIRS.includes(s) || s.startsWith("!"))
  );
}

/**
 * Absolute-path half of the validation. The user pointed at this directory
 * explicitly, so hidden and ignore-listed names inside the path are allowed
 * (the exclude glob still filters what is found *inside* the directory); only
 * glob metacharacters and `..` escapes are rejected.
 */
function isScannableAbsolutePath(normalized: string): boolean {
  if (/[{}[\]*?]/.test(normalized)) {
    return false;
  }
  const segments = normalized.replace(/^[a-zA-Z]:/, "").split("/");
  // A leading empty segment is the posix root ("/opt/x"); interior ones are "//".
  const checkable = segments[0] === "" ? segments.slice(1) : segments;
  return !checkable.some((s) => s === "" || s === "." || s === ".." || s.startsWith("!"));
}

/**
 * Validate and normalize a raw `buttons.scanDirectories` value: fixes slashes,
 * drops entries that are not scannable directories, and dedupes (first
 * occurrence wins). Relative entries reject `..` escapes, glob
 * metacharacters (the path is interpolated into a glob), and hidden or
 * ignore-listed directory names (they are excluded from every workspace scan
 * and from the file watcher, so they could never produce results). Absolute
 * entries point outside the workspace and only reject glob metacharacters
 * and `..` escapes.
 */
export function normalizeScanDirectories(value: unknown): ScanDirectory[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const result: ScanDirectory[] = [];
  for (const raw of value) {
    if (raw === null || typeof raw !== "object") {
      continue;
    }
    const { path, recursive } = raw as Record<string, unknown>;
    if (typeof path !== "string") {
      continue;
    }
    let normalized = path.trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
    while (normalized.endsWith("/") && normalized.length > 1) {
      normalized = normalized.slice(0, -1);
    }
    const scannable = isAbsolutePosix(normalized)
      ? isScannableAbsolutePath(normalized)
      : isScannableRelativePath(normalized);
    if (!scannable) {
      continue;
    }
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push({ path: normalized, recursive: recursive === true });
  }
  return result;
}

/**
 * Glob patterns (relative to the workspace root) for the workspace scan
 * scopes: the project root is always scanned at its top level; each relative
 * configured directory at its top level or recursively. Absolute directories
 * are skipped here and get their own base URI in the scanner.
 */
export function scanScopePatterns(scanDirectories: readonly ScanDirectory[]): string[] {
  const patterns = [`{${SCAN_FILE_GLOB}}`];
  for (const dir of scanDirectories) {
    if (isAbsolutePosix(dir.path)) {
      continue;
    }
    patterns.push(dir.recursive ? `${dir.path}/**/{${SCAN_FILE_GLOB}}` : `${dir.path}/{${SCAN_FILE_GLOB}}`);
  }
  return patterns;
}

/** How the activate script inside a detected venv must be invoked. */
export type VenvActivateKind = "posix" | "ps1" | "bat";

/** Order activate-script candidates are probed for the current platform. */
export function venvActivateCandidates(): [string, VenvActivateKind][] {
  return process.platform === "win32"
    ? [
        ["Scripts/Activate.ps1", "ps1"],
        ["Scripts/activate.bat", "bat"],
        ["bin/activate", "posix"],
      ]
    : [
        ["bin/activate", "posix"],
        ["Scripts/Activate.ps1", "ps1"],
        ["Scripts/activate.bat", "bat"],
      ];
}

export function venvActivateCommand(venvName: string, kind: VenvActivateKind): string {
  const venv = shellArg(venvName);
  switch (kind) {
    case "posix":
      return `source ${venv}/bin/activate`;
    case "ps1":
      return `& ${venv}\\Scripts\\Activate.ps1`;
    case "bat":
      return `${venv}\\Scripts\\activate.bat`;
  }
}

/**
 * Buttons offered for a detected virtual environment. `file` is the venv
 * directory, so the Scripts tab groups them under the venv path. Commands are
 * relative to the venv's parent directory (`packageDir`), which is the
 * terminal's working directory when a button runs.
 */
export function venvButtons(venvRel: string, activateKind: VenvActivateKind, hasRequirements: boolean): DiscoveredScript[] {
  const packageDir = dirOf(venvRel);
  const venvName = venvRel.split("/").pop() ?? venvRel;
  const buttons: DiscoveredScript[] = [
    {
      file: venvRel,
      script: "Activate venv",
      command: venvActivateCommand(venvName, activateKind),
      packageManager: "python",
      packageDir,
      description: "Activate this virtual environment in the current terminal.",
      icon: "terminal",
    },
    {
      file: venvRel,
      script: "Deactivate",
      command: "deactivate",
      packageManager: "python",
      packageDir,
      description: "Deactivate the venv in the current terminal (works after Activate).",
      icon: "debug-stop",
    },
  ];
  if (hasRequirements) {
    // Use the venv's own pip so the install lands in the venv even before activation.
    const venvPip = activateKind === "posix" ? `${shellArg(venvName)}/bin/pip` : `${shellArg(venvName)}\\Scripts\\pip.exe`;
    buttons.push({
      file: venvRel,
      script: "Install requirements",
      command: `${venvPip} install -r requirements.txt`,
      packageManager: "python",
      packageDir,
      description: "Install requirements.txt into this venv.",
      icon: "cloud-download",
    });
  }
  return buttons;
}
