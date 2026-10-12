import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Uri } from "vscode";
import { vscode } from "./support/vscodeDouble";
import { scanWorkspaceScripts } from "../scanner/scriptScanner";

const root = vscode.Uri.file("/ws") as unknown as Uri;

beforeEach(() => {
  vscode.reset();
  vscode.setWorkspace("/ws");
});

function names(scripts: { file: string; script: string; command: string }[]): string[] {
  return scripts.map((script) => `${script.file}:${script.script}=${script.command}`);
}

describe("workspace scanner", { concurrency: false }, () => {
  it("reads root manifests and prefers the first lockfile", async () => {
    vscode.writeFile("/ws/package.json", JSON.stringify({ scripts: { dev: "vite", build: 1 } }));
    vscode.writeFile("/ws/pnpm-lock.yaml", "");
    vscode.writeFile("/ws/package-lock.json", "");
    vscode.writeFile("/ws/Makefile", ".PHONY: all\n# release\nbuild:\n\ttrue\n");
    vscode.writeFile("/ws/justfile", "_private:\n  echo no\n# ship\ndeploy:\n  echo yes\n");
    vscode.writeFile("/ws/composer.json", JSON.stringify({ scripts: { test: "phpunit" } }));
    vscode.writeFile("/ws/Cargo.toml", "");
    vscode.writeFile("/ws/go.mod", "");
    vscode.writeFile("/ws/deploy.sh", "echo hi");
    vscode.writeFile("/ws/app.py", "print(1)");
    const found = await scanWorkspaceScripts(root);
    assert.deepEqual(names(found.filter((script) => script.file === "package.json")), [
      "package.json:dev=pnpm dev",
    ]);
    assert.equal(found.find((script) => script.file === "package.json")?.icon, "play");
    assert.deepEqual(names(found.filter((script) => script.file === "Makefile")), ["Makefile:build=make build"]);
    assert.equal(found.find((script) => script.script === "build" && script.file === "Makefile")?.description, "release");
    assert.deepEqual(names(found.filter((script) => script.file === "justfile")), ["justfile:deploy=just deploy"]);
    assert.deepEqual(names(found.filter((script) => script.file === "composer.json")), ["composer.json:test=composer test"]);
    assert.deepEqual(
      names(found.filter((script) => script.file === "Cargo.toml")),
      ["Cargo.toml:build=cargo build", "Cargo.toml:test=cargo test", "Cargo.toml:run=cargo run"],
    );
    assert.deepEqual(
      names(found.filter((script) => script.file === "go.mod")),
      ["go.mod:build=go build", "go.mod:test=go test", "go.mod:run=go run ."],
    );
    assert.deepEqual(names(found.filter((script) => script.file === "deploy.sh")), ["deploy.sh:deploy.sh=bash deploy.sh"]);
    assert.deepEqual(names(found.filter((script) => script.file === "app.py")), ["app.py:app.py=python app.py"]);
  });

  it("lets yarn win over npm when pnpm is absent", async () => {
    vscode.writeFile("/ws/package.json", JSON.stringify({ scripts: { dev: "vite" } }));
    vscode.writeFile("/ws/yarn.lock", "");
    vscode.writeFile("/ws/package-lock.json", "");
    const found = await scanWorkspaceScripts(root);
    assert.equal(found[0].command, "yarn dev");
  });

  it("skips a broken manifest and keeps going", async () => {
    vscode.writeFile("/ws/package.json", "{");
    vscode.writeFile("/ws/Makefile", "test:\n\ttrue\n");
    vscode.failReads.add("/ws/justfile");
    vscode.writeFile("/ws/justfile", "lint:\n  echo x\n");
    const found = await scanWorkspaceScripts(root);
    assert.deepEqual(names(found), ["Makefile:test=make test"]);
  });

  it("scans a relative directory at the top or recursively, and skips hidden and installed trees", async () => {
    vscode.writeFile("/ws/packages/api/package.json", JSON.stringify({ scripts: { start: "node ." } }));
    vscode.writeFile("/ws/packages/api/web/package.json", JSON.stringify({ scripts: { dev: "vite" } }));
    vscode.writeFile("/ws/packages/node_modules/leftpad/package.json", JSON.stringify({ scripts: { test: "true" } }));
    vscode.writeFile("/ws/packages/.secret/package.json", JSON.stringify({ scripts: { dev: "vite" } }));
    vscode.writeFile("/ws/packages/package.json", JSON.stringify({ scripts: { root: "true" } }));
    const top = await scanWorkspaceScripts(root, [{ path: "packages", recursive: false }]);
    assert.deepEqual(names(top), ["packages/package.json:root=npm run root"]);
    const recursive = await scanWorkspaceScripts(root, [{ path: "packages", recursive: true }]);
    assert.deepEqual(names(recursive), [
      "packages/api/package.json:start=npm run start",
      "packages/api/web/package.json:dev=npm run dev",
      "packages/package.json:root=npm run root",
    ]);
  });

  it("scans an absolute directory outside the workspace with its own base", async () => {
    vscode.writeFile("/ws/pnpm-lock.yaml", "");
    vscode.writeFile("/opt/tools/package.json", JSON.stringify({ scripts: { tool: "node tool.js" } }));
    const found = await scanWorkspaceScripts(root, [{ path: "/opt/tools", recursive: false }]);
    assert.deepEqual(names(found), ["/opt/tools/package.json:tool=pnpm tool"]);
  });

  it("resolves a standalone file entry outside the scan scope and ignores a vanished one", async () => {
    vscode.writeFile("/ws/tools/run.sh", "echo hi");
    vscode.writeFile("/opt/tool.sh", "echo out");
    const found = await scanWorkspaceScripts(root, [], ["tools/run.sh", "gone.sh", "/opt/tool.sh"]);
    assert.deepEqual(names(found), ["tools/run.sh:tools/run.sh=bash run.sh", "/opt/tool.sh:/opt/tool.sh=bash tool.sh"]);
    assert.equal(found[0].packageDir, "tools");
    assert.equal(found[1].packageDir, "/opt");
  });

  it("does not list a root shell file twice when it is also a file entry", async () => {
    vscode.writeFile("/ws/run.sh", "echo hi");
    const found = await scanWorkspaceScripts(root, [], ["run.sh"]);
    assert.deepEqual(names(found), ["run.sh:run.sh=bash run.sh"]);
  });

  it("adds venv buttons when an activate script and requirements file are present", async () => {
    vscode.writeFile("/ws/venv/bin/activate", "");
    vscode.writeFile("/ws/requirements.txt", "flask\n");
    const found = await scanWorkspaceScripts(root);
    assert.deepEqual(
      names(found),
      [
        "venv:Activate venv=source venv/bin/activate",
        "venv:Deactivate=deactivate",
        "venv:Install requirements=venv/bin/pip install -r requirements.txt",
      ],
    );
  });
});
