import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { vscode } from "./support/vscodeDouble";
import {
  appendToCurrentTerminal,
  copyToClipboard,
  openInSystemTerminal,
  registerTerminalComposeHooks,
  resetCompose,
  runInCurrentTerminal,
  runInNewTerminal,
} from "../execution/actions";
import { unixPrefillScript } from "../execution/systemTerminal";

const scriptPath = path.join(os.tmpdir(), `buttons-term-${process.pid}.sh`);

beforeEach(() => {
  vscode.reset();
  resetCompose();
});

afterEach(() => {
  fs.rmSync(scriptPath, { force: true });
});

describe("command execution", { concurrency: false }, () => {
  it("starts a fresh integrated terminal without a cd line", () => {
    runInCurrentTerminal("pnpm dev", "/ws");
    assert.equal(vscode.window.terminals.length, 1);
    const terminal = vscode.window.terminals[0];
    assert.equal(terminal.name, "Buttons");
    assert.equal(terminal.cwd, "/ws");
    assert.equal(terminal.preserveFocus, true);
    assert.deepEqual(terminal.sent, [{ text: "pnpm dev", execute: true }]);
  });

  it("changes directory in a reused terminal as its own line", () => {
    const active = vscode.window.createTerminal({ name: "shell" });
    vscode.window.activeTerminal = active;
    runInCurrentTerminal("pnpm start", "/ws/packages/api");
    assert.deepEqual(active.sent, [
      { text: 'cd "/ws/packages/api"', execute: true },
      { text: "pnpm start", execute: true },
    ]);
    assert.equal(active.sent.some((line) => line.text.includes("&&")), false);
    assert.equal(vscode.window.terminals.length, 1);
  });

  it("reuses a named Buttons terminal when nothing is active", () => {
    const existing = vscode.window.createTerminal({ name: "Buttons", cwd: "/old" });
    runInCurrentTerminal("echo hi", "/ws");
    assert.equal(vscode.window.terminals.length, 1);
    assert.equal(existing.sent[0].text, 'cd "/ws"');
    assert.equal(existing.sent[1].text, "echo hi");
  });

  it("names a new terminal from the label, then the first token", () => {
    runInNewTerminal("echo hi", "/ws", "Greet");
    runInNewTerminal("pnpm test", "/ws/pkg");
    assert.equal(vscode.window.terminals[0].name, "Buttons: Greet");
    assert.equal(vscode.window.terminals[0].cwd, "/ws");
    assert.deepEqual(vscode.window.terminals[0].sent, [{ text: "echo hi", execute: true }]);
    assert.equal(vscode.window.terminals[1].name, "Buttons: pnpm");
    assert.equal(vscode.window.terminals[1].cwd, "/ws/pkg");
  });

  it("appends without executing, then wraps a later newline in bracketed paste", () => {
    appendToCurrentTerminal("echo", "newline");
    appendToCurrentTerminal("hi", "space");
    appendToCurrentTerminal("there", "newline");
    const terminal = vscode.window.terminals[0];
    assert.deepEqual(terminal.sent[0], { text: "echo", execute: false });
    assert.deepEqual(terminal.sent[1], { text: " hi", execute: false });
    assert.equal(terminal.sent[2].execute, false);
    assert.equal(terminal.sent[2].text, "\u001b[200~\nthere\u001b[201~");
  });

  it("resets a composed line when the terminal closes, ends, switches, or runs", () => {
    const hooks = registerTerminalComposeHooks();
    appendToCurrentTerminal("echo", "space");
    const first = vscode.window.terminals[0];
    vscode.fireCloseTerminal(first);
    appendToCurrentTerminal("next", "space");
    assert.equal(first.sent.at(-1)?.text, "next");

    vscode.fireEndShell(first);
    appendToCurrentTerminal("after-end", "space");
    assert.equal(first.sent.at(-1)?.text, "after-end");

    const other = vscode.window.createTerminal({ name: "other" });
    vscode.window.activeTerminal = other;
    appendToCurrentTerminal("switched", "space");
    assert.deepEqual(other.sent, [{ text: "switched", execute: false }]);

    runInCurrentTerminal("pnpm dev", "/ws");
    appendToCurrentTerminal("fresh", "space");
    assert.equal(other.sent.at(-1)?.text, "fresh");
    for (const hook of hooks) {
      hook.dispose();
    }
  });

  it("copies a command and reports clipboard failure", async () => {
    await copyToClipboard("echo hi");
    assert.equal(vscode.env.clipboard.text, "echo hi");
    assert.deepEqual(vscode.infos, ["Copied command to clipboard."]);
    vscode.env.clipboard.fail = true;
    await copyToClipboard("echo no");
    assert.deepEqual(vscode.errors, ["Failed to copy command to clipboard."]);
    assert.equal(vscode.env.clipboard.text, "echo hi");
  });

  it("opens the configured system terminal with the command prefilled and not running", () => {
    vscode.setConfig("terminal.external.linuxExec", "/usr/bin/gnome-terminal");
    openInSystemTerminal("echo hi", "/ws");
    assert.equal(fs.readFileSync(scriptPath, "utf8"), unixPrefillScript("/ws", "echo hi"));
    assert.equal(fs.statSync(scriptPath).mode & 0o777, 0o700);
    assert.equal(vscode.spawned.length, 1);
    assert.equal(vscode.spawned[0].cmd, "/usr/bin/gnome-terminal");
    assert.deepEqual(vscode.spawned[0].args, ["--working-directory", "/ws", "--", "bash", scriptPath]);
    assert.equal(vscode.spawned[0].options.detached, true);
    assert.equal(vscode.spawned[0].options.stdio, "ignore");
  });

  it("falls back to the default emulator and surfaces a spawn error", () => {
    vscode.setConfig("terminal.external.linuxExec", "   ");
    openInSystemTerminal("echo hi", "/tmp/project");
    assert.equal(vscode.spawned[0].cmd, "x-terminal-emulator");
    vscode.spawned[0].child.emit("error", new Error("enoent"));
    assert.deepEqual(vscode.errors, ["Could not open the system terminal: enoent"]);

    vscode.setConfig("terminal.external.linuxExec", "/usr/bin/kitty");
    openInSystemTerminal("echo hi", "/ws");
    assert.equal(vscode.spawned[1].cmd, "/usr/bin/kitty");
    assert.deepEqual(vscode.spawned[1].args.slice(0, 2), ["--directory", "/ws"]);
  });
});
