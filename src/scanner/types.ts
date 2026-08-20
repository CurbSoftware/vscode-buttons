/**
 * Pure script-discovery types and helpers. This module must stay free of any
 * `vscode` import so it can be unit-tested with the Node.js built-in test runner.
 */

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "make" | "composer" | "just" | "shell" | "python";

/** Manifest file basenames the scanner parses for named scripts. */
export const MANIFEST_FILE_NAMES = ["package.json", "Makefile", "composer.json", "justfile"] as const;

/** Python entry files offered as one-click buttons when discovered. */
export const PYTHON_ENTRY_FILES = ["app.py", "main.py", "manage.py", "run.py", "server.py"] as const;

/** Directory names treated as virtual environments for venv buttons. */
export const VENV_DIR_NAMES = ["venv", ".venv"] as const;

/** Script discovery kinds: the four manifests plus the file-entry types shell and python. */
export type ScriptFileType = (typeof MANIFEST_FILE_NAMES)[number] | "shell" | "python";

export const SCRIPT_FILE_TYPES: ScriptFileType[] = [...MANIFEST_FILE_NAMES, "shell", "python"];

export function isScriptFileType(value: string): value is ScriptFileType {
  return (SCRIPT_FILE_TYPES as string[]).includes(value);
}

/** Directory portion of a posix relative path; "" for the workspace root. */
export function dirOf(posixPath: string): string {
  const idx = posixPath.lastIndexOf("/");
  return idx === -1 ? "" : posixPath.slice(0, idx);
}

/** The discovery kind a discovered script came from, derived from its path. */
export function scriptFileTypeOf(script: { file: string }): ScriptFileType {
  const base = script.file.split("/").pop() ?? script.file;
  if (isScriptFileType(base)) {
    return base;
  }
  if ((VENV_DIR_NAMES as readonly string[]).includes(base)) {
    return "python";
  }
  if (base.endsWith(".sh")) {
    return "shell";
  }
  if ((PYTHON_ENTRY_FILES as readonly string[]).includes(base)) {
    return "python";
  }
  return "package.json";
}

/**
 * Build a discovered entry for a standalone script file (.sh or a Python entry
 * file). `script` is the relative path (the stable identity); the *command* uses
 * the basename because the terminal's working directory is set to the file's
 * directory (`packageDir`) when it runs - same contract as manifest scripts.
 */
export function fileEntryScript(base: string, relpath: string): DiscoveredScript | null {
  const pm: PackageManager | undefined = base.endsWith(".sh")
    ? "shell"
    : (PYTHON_ENTRY_FILES as readonly string[]).includes(base)
      ? "python"
      : undefined;
  if (!pm) {
    return null;
  }
  return {
    file: relpath,
    script: relpath,
    command: scriptCommand(pm, base),
    packageManager: pm,
    packageDir: dirOf(relpath),
    icon: pm === "shell" ? "terminal-bash" : "rocket",
  };
}

export interface DiscoveredScript {
  /** Posix-separated path of the script file: workspace-relative (e.g. "packages/app/package.json") or absolute for external scopes. */
  file: string;
  /** Script/target name, e.g. "dev", "build", "test". */
  script: string;
  /** The executable command, recomputed on every scan, e.g. "pnpm dev". */
  command: string;
  packageManager: PackageManager;
  /** Posix-separated directory of the script file: workspace-relative ("" means root) or absolute. */
  packageDir: string;
  /** package.json script body, or the preceding Makefile "#" comment. */
  description?: string;
  icon?: string;
}

/** Stable identity for a discovered script; also used to key checkbox/live-reference state. */
export function scriptKey(s: { file: string; script: string }): string {
  return `${s.file}:${s.script}`;
}

/** Quote a command argument only when whitespace would split it. */
export function shellArg(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

/** Build the runnable command string for a package manager + script name. */
export function scriptCommand(pm: PackageManager, name: string): string {
  switch (pm) {
    case "npm":
      return `npm run ${name}`;
    case "pnpm":
      return `pnpm ${name}`;
    case "yarn":
      return `yarn ${name}`;
    case "bun":
      return `bun ${name}`;
    case "make":
      return `make ${name}`;
    case "composer":
      return `composer ${name}`;
    case "just":
      return `just ${name}`;
    case "shell":
      return `bash ${shellArg(name)}`;
    case "python":
      return `python ${shellArg(name)}`;
  }
}

/** Directories that must never be scanned - installed packages, VCS, build/cache output. */
export const EXCLUDE_DIRS = [
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".nuxt",
  ".output",
  ".cache",
  ".turbo",
  ".yarn",
  ".pnpm-store",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  ".venv",
  "venv",
  "__pycache__",
  ".vscode",
  ".idea",
  "target",
  ".svelte-kit",
  ".parcel-cache",
];

/** Returns true for hidden directories and any directory in EXCLUDE_DIRS. */
export function shouldIgnoreDir(name: string): boolean {
  if (name.startsWith(".")) {
    return true;
  }
  return EXCLUDE_DIRS.includes(name);
}

const SCRIPT_ICON_MAP: Record<string, string> = {
  build: "package",
  test: "beaker",
  dev: "play",
  start: "play",
  serve: "play",
  lint: "verified",
  watch: "sync",
  clean: "trash",
  format: "code",
  deploy: "cloud-upload",
  preview: "eye",
};

/** Map a script/target name to a codicon name, or undefined. */
function iconForScript(name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(SCRIPT_ICON_MAP)) {
    if (lower === key || lower.startsWith(`${key}:`) || lower.startsWith(`${key}-`)) {
      return icon;
    }
  }
  return undefined;
}

/** Parse a package.json file's contents into discovered scripts. */
export function parsePackageJsonText(
  text: string,
  file: string,
  packageDir: string,
  pm: PackageManager,
): DiscoveredScript[] {
  let pkg: unknown;
  try {
    pkg = JSON.parse(text);
  } catch {
    return [];
  }

  if (pkg === null || typeof pkg !== "object" || Array.isArray(pkg)) {
    return [];
  }

  const scripts = (pkg as Record<string, unknown>).scripts;
  if (scripts === null || typeof scripts !== "object" || Array.isArray(scripts)) {
    return [];
  }

  const result: DiscoveredScript[] = [];
  for (const [name, value] of Object.entries(scripts as Record<string, unknown>)) {
    if (typeof value !== "string") {
      continue;
    }
    result.push({
      file,
      script: name,
      command: scriptCommand(pm, name),
      packageManager: pm,
      packageDir,
      description: value,
      icon: iconForScript(name),
    });
  }
  return result;
}

/** Parse a Makefile's contents into discovered targets. */
export function parseMakefileText(text: string, file: string, packageDir: string): DiscoveredScript[] {
  const lines = text.split("\n");
  const result: DiscoveredScript[] = [];
  const targetPattern = /^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/;

  for (let i = 0; i < lines.length; i++) {
    const match = targetPattern.exec(lines[i]);
    if (!match) {
      continue;
    }

    const name = match[1];
    if (name.startsWith(".")) {
      continue;
    }

    let description: string | undefined;
    if (i > 0 && lines[i - 1].startsWith("#")) {
      description = lines[i - 1].replace(/^#\s*/, "").trim();
    }

    result.push({
      file,
      script: name,
      command: scriptCommand("make", name),
      packageManager: "make",
      packageDir,
      description,
      icon: iconForScript(name),
    });
  }

  return result;
}

/** Parse a `justfile`'s recipes into discovered scripts. */
export function parseJustfileText(text: string, file: string, packageDir: string): DiscoveredScript[] {
  const lines = text.split("\n");
  const result: DiscoveredScript[] = [];
  const recipePattern = /^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/;

  for (let i = 0; i < lines.length; i++) {
    const match = recipePattern.exec(lines[i]);
    if (!match) {
      continue;
    }

    const name = match[1];
    if (name.startsWith("_")) {
      continue; // private recipe
    }

    let description: string | undefined;
    if (i > 0 && lines[i - 1].trim().startsWith("#")) {
      description = lines[i - 1].trim().replace(/^#\s*/, "");
    }

    result.push({
      file,
      script: name,
      command: scriptCommand("just", name),
      packageManager: "just",
      packageDir,
      description,
      icon: iconForScript(name),
    });
  }

  return result;
}
