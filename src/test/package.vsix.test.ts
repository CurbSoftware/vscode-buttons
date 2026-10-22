import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import * as fs from "fs";
import * as path from "path";

const repoRoot = path.resolve(__dirname, "../..");
const repoVersion = (JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")) as { version: string }).version;
const vsixName = `buttons-vscode-${repoVersion}.vsix`;
const vsixPath = path.join(repoRoot, "release", vsixName);

interface ZipEntry {
  name: string;
  size: number;
  text?: string;
}

function readZip(): ZipEntry[] {
  const script = `
import json, sys, zipfile
z = zipfile.ZipFile(sys.argv[1])
rows = []
for info in z.infolist():
    row = {"name": info.filename, "size": info.file_size}
    if info.filename.endswith((".json", ".js", ".md", ".svg", ".txt")) and "node_modules" not in info.filename:
        row["text"] = z.read(info).decode("utf-8", "replace")
    rows.append(row)
json.dump(rows, sys.stdout)
`;
  const raw = execFileSync("python3", ["-c", script, vsixPath], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(raw) as ZipEntry[];
}

function git(args: string[]): number {
  return spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" }).status ?? 1;
}

describe(`buttons-vscode-${repoVersion}.vsix`, () => {
  it("matches the repo version and is not a git commit", () => {
    assert.equal(fs.existsSync(vsixPath), true);
    assert.notEqual(git(["ls-files", "--error-unmatch", `release/${vsixName}`]), 0);
    assert.equal(git(["check-ignore", "--no-index", "-q", `release/${vsixName}`]), 0);
  });

  it("packages the extension entry, commands, icons, and skill without source or secrets", () => {
    const entries = readZip();
    const names = new Set(entries.map((entry) => entry.name));
    for (const required of [
      "extension/package.json",
      "extension/readme.md",
      "extension/changelog.md",
      "extension/LICENSE.txt",
      "extension/dist/extension.js",
      "extension/dist/execution/actions.js",
      "extension/dist/panel/ButtonsRenderer.js",
      "extension/dist/config/buttonsFile.js",
      "extension/media/buttons-icon.svg",
      "extension/media/buttons-icon-color.svg",
      "extension/media/buttons-icon-128.png",
      "extension/resources/create-buttons-file/SKILL.md",
      "extension/resources/create-buttons-file/schema.md",
      "extension/resources/create-buttons-file/examples.md",
      "extension/node_modules/@vscode/codicons/dist/codicon.css",
    ]) {
      assert.equal(names.has(required), true, required);
    }
    assert.equal([...names].some((name) => name.startsWith("extension/src/")), false);
    assert.equal([...names].some((name) => name.startsWith("extension/docs/")), false);
    assert.equal([...names].some((name) => name.startsWith("extension/dist/test/")), false);
    assert.equal([...names].some((name) => name.includes(".env") || name.endsWith(".pem") || name.endsWith(".vsix")), false);

    const pkg = JSON.parse(entries.find((entry) => entry.name === "extension/package.json")?.text ?? "{}") as {
      name: string;
      version: string;
      publisher: string;
      main: string;
      activationEvents: string[];
      contributes: {
        commands: { command: string }[];
        views: { buttons: { id: string; type: string }[] };
      };
    };
    assert.equal(pkg.name, "buttons-vscode");
    assert.equal(pkg.version, repoVersion);
    assert.equal(pkg.publisher, "CurbSoftware");
    assert.equal(pkg.main, "./dist/extension.js");
    assert.deepEqual(pkg.activationEvents, ["workspaceContains:.buttons.json", "onStartupFinished"]);
    assert.deepEqual(
      pkg.contributes.commands.map((command) => command.command),
      [
        "buttons.openPanel",
        "buttons.rescan",
        "buttons.openProjectButtons",
        "buttons.openGlobalButtons",
        "buttons.openMainPanel",
        "buttons.addFileButton",
      ],
    );
    assert.equal(pkg.contributes.views.buttons[0].id, "buttons.sidebarView");
    assert.equal(pkg.contributes.views.buttons[0].type, "webview");

    const main = entries.find((entry) => entry.name === "extension/dist/extension.js")?.text ?? "";
    assert.match(main, /function activate/);
    assert.match(main, /buttons\.sidebarView/);
    const forbidden = [
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      /\bAKIA[0-9A-Z]{16}\b/,
      /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
      /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
    ];
    for (const entry of entries) {
      if (!entry.text) {
        continue;
      }
      for (const pattern of forbidden) {
        assert.equal(pattern.test(entry.text), false, `${entry.name} matched ${pattern}`);
      }
    }
  });
});
