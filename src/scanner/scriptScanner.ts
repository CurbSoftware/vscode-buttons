import * as vscode from "vscode";
import { DiscoveredScript } from "./types";

export type { DiscoveredScript } from "./types";

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

function iconForScript(name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(SCRIPT_ICON_MAP)) {
    if (lower === key || lower.startsWith(`${key}:`) || lower.startsWith(`${key}-`)) {
      return icon;
    }
  }
  return undefined;
}

async function detectPackageManager(workspaceUri: vscode.Uri): Promise<string> {
  const lockfiles: [string, string][] = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
  ];

  for (const [file, manager] of lockfiles) {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.joinPath(workspaceUri, file));
      return manager;
    } catch { /* not found */ }
  }

  return "npm";
}

async function scanPackageJson(workspaceUri: vscode.Uri): Promise<DiscoveredScript[]> {
  const fileUri = vscode.Uri.joinPath(workspaceUri, "package.json");

  try {
    await vscode.workspace.fs.stat(fileUri);
  } catch {
    return [];
  }

  const rawBytes = await vscode.workspace.fs.readFile(fileUri);
  const rawText = Buffer.from(rawBytes).toString("utf8");
  const pkg = JSON.parse(rawText);

  if (!pkg.scripts || typeof pkg.scripts !== "object") {
    return [];
  }

  const manager = await detectPackageManager(workspaceUri);
  const scripts: DiscoveredScript[] = [];

  for (const [name, value] of Object.entries(pkg.scripts)) {
    if (typeof value !== "string") continue;
    scripts.push({
      label: name,
      command: `${manager} run ${name}`,
      description: value,
      source: "package.json",
      group: manager,
      icon: iconForScript(name),
    });
  }

  return scripts;
}

async function scanMakefile(workspaceUri: vscode.Uri): Promise<DiscoveredScript[]> {
  const fileUri = vscode.Uri.joinPath(workspaceUri, "Makefile");

  try {
    await vscode.workspace.fs.stat(fileUri);
  } catch {
    return [];
  }

  const rawBytes = await vscode.workspace.fs.readFile(fileUri);
  const rawText = Buffer.from(rawBytes).toString("utf8");
  const lines = rawText.split("\n");
  const scripts: DiscoveredScript[] = [];
  const targetPattern = /^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/;

  for (let i = 0; i < lines.length; i++) {
    const match = targetPattern.exec(lines[i]);
    if (!match) continue;

    const name = match[1];
    if (name.startsWith(".")) continue;

    // Look for preceding comment as description
    let description: string | undefined;
    if (i > 0 && lines[i - 1].startsWith("#")) {
      description = lines[i - 1].replace(/^#\s*/, "").trim();
    }

    scripts.push({
      label: name,
      command: `make ${name}`,
      description,
      source: "Makefile",
      group: "make",
      icon: iconForScript(name),
    });
  }

  return scripts;
}

export async function scanWorkspaceScripts(workspaceUri: vscode.Uri): Promise<DiscoveredScript[]> {
  const results = await Promise.all([
    scanPackageJson(workspaceUri),
    scanMakefile(workspaceUri),
  ]);

  return results.flat();
}

// Exported for testing
export { scanPackageJson, scanMakefile, detectPackageManager, iconForScript };
