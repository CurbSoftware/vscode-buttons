import * as path from "path";
import * as vscode from "vscode";
import {
  EXCLUDE_DIRS,
  SCRIPT_FILE_TYPES,
  parseJustfileText,
  parseMakefileText,
  parsePackageJsonText,
  scriptKey,
  type DiscoveredScript,
  type PackageManager,
} from "./types";

const MAX_SCRIPT_FILES = 5000;

/** Convert an absolute fs path to a posix path relative to the workspace root. */
function toPosixRelative(workspaceFsPath: string, fileFsPath: string): string {
  return path.relative(workspaceFsPath, fileFsPath).split(path.sep).join("/");
}

function dirOf(posixPath: string): string {
  const idx = posixPath.lastIndexOf("/");
  return idx === -1 ? "" : posixPath.slice(0, idx);
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

/**
 * Recursively scan the workspace for scripts in all supported script files
 * (package.json, Makefile, composer.json, justfile), excluding installed
 * packages, VCS, and build/cache directories.
 */
export async function scanWorkspaceScripts(workspaceUri: vscode.Uri): Promise<DiscoveredScript[]> {
  const excludeGlob = `**/{${EXCLUDE_DIRS.join(",")}}/**`;
  const pattern = new vscode.RelativePattern(workspaceUri, `**/{${SCRIPT_FILE_TYPES.join(",")}}`);
  const uris = await vscode.workspace.findFiles(pattern, excludeGlob, MAX_SCRIPT_FILES);

  const packageManager = await detectPackageManager(workspaceUri);
  const workspaceFsPath = workspaceUri.fsPath;

  const result: DiscoveredScript[] = [];
  const seen = new Set<string>();

  for (const uri of uris) {
    const relative = toPosixRelative(workspaceFsPath, uri.fsPath);
    const packageDir = dirOf(relative);
    const base = path.basename(uri.fsPath);

    let scripts: DiscoveredScript[];
    try {
      const rawBytes = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(rawBytes).toString("utf8");
      scripts = parseScriptFile(base, text, relative, packageDir, packageManager);
    } catch {
      continue;
    }

    for (const s of scripts) {
      const key = scriptKey(s);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(s);
    }
  }

  return result;
}
