import * as path from "path";
import * as vscode from "vscode";
import {
  isAbsolutePosix,
  SCAN_FILE_GLOB,
  scanScopePatterns,
  venvActivateCandidates,
  venvButtons,
  type ScanDirectory,
  type VenvActivateKind,
} from "./scanScope";
import {
  dirOf,
  EXCLUDE_DIRS,
  parseJustfileText,
  parseMakefileText,
  parsePackageJsonText,
  fileEntryScript,
  scriptKey,
  VENV_DIR_NAMES,
  type DiscoveredScript,
  type PackageManager,
} from "./types";

const MAX_SCRIPT_FILES = 5000;

/** Convert an absolute fs path to a posix path relative to the workspace root. */
function toPosixRelative(workspaceFsPath: string, fileFsPath: string): string {
  return path.relative(workspaceFsPath, fileFsPath).split(path.sep).join("/");
}

/** Parse a script file's contents based on its basename. */
function parseScriptFile(
  base: string,
  text: string,
  relative: string,
  packageDir: string,
  packageManager: PackageManager,
): DiscoveredScript[] {
  switch (base) {
    case "Makefile":
      return parseMakefileText(text, relative, packageDir);
    case "justfile":
      return parseJustfileText(text, relative, packageDir);
    case "composer.json":
      return parsePackageJsonText(text, relative, packageDir, "composer");
    default:
      return parsePackageJsonText(text, relative, packageDir, packageManager);
  }
}

/** Detect the package manager from root lockfiles. */
async function detectPackageManager(workspaceUri: vscode.Uri): Promise<PackageManager> {
  const lockfiles: [string, PackageManager][] = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
  ];

  for (const [file, manager] of lockfiles) {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.joinPath(workspaceUri, file));
      return manager;
    } catch {
      // not found; try the next lockfile
    }
  }

  return "npm";
}

/** Stat-based probe for a virtual environment at `venvRel` and its requirements.txt. */
async function detectVenv(
  workspaceUri: vscode.Uri,
  venvRel: string,
): Promise<{ activateKind: VenvActivateKind; hasRequirements: boolean } | undefined> {
  const venvUri = vscode.Uri.joinPath(workspaceUri, ...venvRel.split("/"));
  for (const [candidate, kind] of venvActivateCandidates()) {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.joinPath(venvUri, ...candidate.split("/")));
    } catch {
      continue;
    }
    let hasRequirements = false;
    const reqUri = vscode.Uri.joinPath(workspaceUri, dirOf(venvRel) === "" ? "requirements.txt" : `${dirOf(venvRel)}/requirements.txt`);
    try {
      await vscode.workspace.fs.stat(reqUri);
      hasRequirements = true;
    } catch {
      // no requirements.txt next to the venv
    }
    return { activateKind: kind, hasRequirements };
  }
  return undefined;
}

/**
 * Scan the project for scripts: the workspace root (top level only, always)
 * plus each configured scan directory (top level or recursive; absolute
 * entries point outside the workspace and are scanned with their own base).
 * Standalone file entries from `.buttons.json` resolve here too, so they work
 * even when their directory is not a scan scope. Manifest files are parsed
 * for named scripts; standalone .sh and Python entry files become one-click
 * entries; detected virtual environments offer activate/deactivate/
 * install-requirements buttons. Installed packages, VCS, and build/cache
 * directories are always excluded.
 */
export async function scanWorkspaceScripts(
  workspaceUri: vscode.Uri,
  scanDirectories: readonly ScanDirectory[] = [],
  entryFilePaths: readonly string[] = [],
): Promise<DiscoveredScript[]> {
  // `.*` in the brace list also excludes every hidden directory, matching the
  // documented contract and the watcher-side shouldIgnoreDir rule.
  const excludeGlob = `**/{${[...EXCLUDE_DIRS, ".*"].join(",")}}/**`;
  const packageManager = await detectPackageManager(workspaceUri);
  const workspaceFsPath = workspaceUri.fsPath;

  const result: DiscoveredScript[] = [];
  const seen = new Set<string>();
  const add = (scripts: Iterable<DiscoveredScript>): void => {
    for (const s of scripts) {
      const key = scriptKey(s);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(s);
    }
  };

  // Turn one discovered file uri into scripts. `file` is the stable path
  // identity: workspace-relative for workspace scopes, absolute for external ones.
  const discoverFile = async (uri: vscode.Uri, file: string): Promise<void> => {
    const packageDir = dirOf(file);
    const base = path.basename(uri.fsPath);

    const entry = fileEntryScript(base, file);
    if (entry) {
      add([entry]);
      return;
    }

    let scripts: DiscoveredScript[];
    try {
      const rawBytes = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(rawBytes).toString("utf8");
      scripts = parseScriptFile(base, text, file, packageDir, packageManager);
    } catch {
      return;
    }
    add(scripts);
  };

  for (const relPattern of scanScopePatterns(scanDirectories)) {
    const pattern = new vscode.RelativePattern(workspaceUri, relPattern);
    const uris = await vscode.workspace.findFiles(pattern, excludeGlob, MAX_SCRIPT_FILES);
    for (const uri of uris) {
      await discoverFile(uri, toPosixRelative(workspaceFsPath, uri.fsPath));
    }
  }

  for (const dir of scanDirectories) {
    if (!isAbsolutePosix(dir.path)) {
      continue;
    }
    const pattern = new vscode.RelativePattern(
      vscode.Uri.file(dir.path),
      dir.recursive ? `**/{${SCAN_FILE_GLOB}}` : `{${SCAN_FILE_GLOB}}`,
    );
    const uris = await vscode.workspace.findFiles(pattern, excludeGlob, MAX_SCRIPT_FILES);
    for (const uri of uris) {
      await discoverFile(uri, uri.fsPath.split(path.sep).join("/"));
    }
  }

  // Standalone file entries from `.buttons.json` are self-discovering: stat each
  // one so entries keep working outside every scan scope (including outside the
  // workspace), while vanished files degrade to `missing` via resolveButtons.
  for (const entryFile of entryFilePaths) {
    const base = entryFile.split("/").pop() ?? entryFile;
    const entry = fileEntryScript(base, entryFile);
    if (!entry) {
      continue;
    }
    const uri = isAbsolutePosix(entryFile)
      ? vscode.Uri.file(entryFile)
      : vscode.Uri.joinPath(workspaceUri, ...entryFile.split("/"));
    try {
      await vscode.workspace.fs.stat(uri);
    } catch {
      continue;
    }
    add([entry]);
  }

  // Venv buttons for the root and the top level of each workspace scan directory.
  // ponytail: external (absolute) scan dirs get no venv buttons; give detectVenv a baseUri if that matters.
  const venvBases = ["", ...scanDirectories.filter((d) => !isAbsolutePosix(d.path)).map((d) => d.path)];
  for (const baseRel of venvBases) {
    for (const venvName of VENV_DIR_NAMES) {
      const venvRel = baseRel === "" ? venvName : `${baseRel}/${venvName}`;
      const detected = await detectVenv(workspaceUri, venvRel);
      if (detected) {
        add(venvButtons(venvRel, detected.activateKind, detected.hasRequirements));
      }
    }
  }

  return result;
}
