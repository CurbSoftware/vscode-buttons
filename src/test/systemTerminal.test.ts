import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSystemTerminalSpec,
  darwinSpawnArgs,
  linuxSpawnArgs,
  powershellInsertScript,
  shSingleQuote,
  unixPrefillScript,
  windowsSpawnArgs,
} from "../execution/systemTerminal";

const exec = { linuxExec: "x-terminal-emulator", osxExec: "Terminal.app", windowsExec: "wt" };

describe("unixPrefillScript", () => {
  it("cds to the workspace, prefills with read -e -i, and does not run until Enter", () => {
    const script = unixPrefillScript("/home/user/proj", "pnpm test --filter 'web'");
    assert.match(script, /^#!\/usr\/bin\/env bash/m);
    assert.match(script, /cd '\/home\/user\/proj'/);
    assert.match(script, /read -e -i .* __buttons_cmd/);
    assert.match(script, /eval "\$__buttons_cmd"/);
    assert.doesNotMatch(script, /eval "\$__buttons_cmd" &&/);
    assert.match(script, /exec "\$\{SHELL:-bash\}"/);
    assert.equal(shSingleQuote("pnpm test --filter 'web'"), `'pnpm test --filter '\\''web'\\'''`);
    assert.match(script, /read -e -i 'pnpm test --filter '\\''web'\\'''/);
  });
});

describe("linuxSpawnArgs", () => {
  it("uses gnome-terminal --working-directory and --", () => {
    const spec = linuxSpawnArgs("gnome-terminal", "/tmp/run.sh", "/home/me/app");
    assert.deepEqual(spec, {
      cmd: "gnome-terminal",
      args: ["--working-directory", "/home/me/app", "--", "bash", "/tmp/run.sh"],
    });
  });

  it("defaults to -e bash script at cwd", () => {
    const spec = linuxSpawnArgs("x-terminal-emulator", "/tmp/run.sh", "/home/me/app");
    assert.deepEqual(spec, { cmd: "x-terminal-emulator", args: ["-e", "bash", "/tmp/run.sh"], cwd: "/home/me/app" });
  });
});

describe("darwinSpawnArgs", () => {
  it("opens the configured app with the script", () => {
    assert.deepEqual(darwinSpawnArgs("Terminal.app", "/tmp/run.command"), {
      cmd: "open",
      args: ["-a", "Terminal", "/tmp/run.command"],
    });
  });
});

describe("windowsSpawnArgs", () => {
  it("asks Windows Terminal to insert the command without running it", () => {
    const spec = windowsSpawnArgs("wt.exe", "C:\\proj", "pnpm test");
    assert.equal(spec.cmd, "wt.exe");
    assert.equal(spec.args[0], "-d");
    assert.equal(spec.args[1], "C:\\proj");
    assert.ok(spec.args.includes("powershell"));
    assert.ok(spec.args.includes("-NoExit"));
    const ps = powershellInsertScript("C:\\proj", "pnpm test");
    assert.match(ps, /Set-Location -LiteralPath 'C:\\proj'/);
    assert.match(ps, /PSConsoleReadLine]::Insert\('pnpm test'\)/);
    assert.ok(spec.args.includes(ps));
  });
});

describe("buildSystemTerminalSpec", () => {
  it("picks the linux emulator and keeps the workspace cwd in the script path", () => {
    const spec = buildSystemTerminalSpec("linux", exec, "/ws", "echo hi", "/tmp/run.sh");
    assert.equal(spec.cmd, "x-terminal-emulator");
    assert.deepEqual(spec.args, ["-e", "bash", "/tmp/run.sh"]);
    assert.equal(spec.cwd, "/ws");
  });
});
