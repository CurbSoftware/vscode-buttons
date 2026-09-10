import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface ExternalTerminalExec {
  linuxExec: string;
  osxExec: string;
  windowsExec: string;
}

export interface SystemTerminalSpec {
  cmd: string;
  args: string[];
  cwd?: string;
}

/** POSIX single quotes, including the wrapping quotes. */
export function shSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function unixPrefillScript(cwd: string, command: string): string {
  return `#!/usr/bin/env bash
cd ${shSingleQuote(cwd)} || exit 1
read -e -i ${shSingleQuote(command)} __buttons_cmd || exit 1
eval "$__buttons_cmd"
exec "\${SHELL:-bash}"
`;
}

export function linuxSpawnArgs(exec: string, scriptPath: string, cwd: string): SystemTerminalSpec {
  const base = path.basename(exec).toLowerCase();
  if (base === "gnome-terminal" || base === "kgx") {
    return { cmd: exec, args: ["--working-directory", cwd, "--", "bash", scriptPath] };
  }
  if (base === "konsole") {
    return { cmd: exec, args: ["--workdir", cwd, "-e", "bash", scriptPath] };
  }
  if (base === "xfce4-terminal") {
    return { cmd: exec, args: ["--working-directory", cwd, "-e", `bash ${scriptPath}`] };
  }
  if (base === "kitty") {
    return { cmd: exec, args: ["--directory", cwd, "bash", scriptPath] };
  }
  if (base === "alacritty") {
    return { cmd: exec, args: ["--working-directory", cwd, "-e", "bash", scriptPath] };
  }
  if (base === "wezterm" || base === "wezterm-gui") {
    return { cmd: exec, args: ["start", "--cwd", cwd, "--", "bash", scriptPath] };
  }
  return { cmd: exec, args: ["-e", "bash", scriptPath], cwd };
}

export function darwinSpawnArgs(exec: string, scriptPath: string): SystemTerminalSpec {
  const app = exec.replace(/\.app$/i, "").trim() || "Terminal";
  return { cmd: "open", args: ["-a", app, scriptPath] };
}

function psSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function powershellInsertScript(cwd: string, command: string): string {
  return `Set-Location -LiteralPath ${psSingleQuote(cwd)}; [Microsoft.PowerShell.PSConsoleReadLine]::Insert(${psSingleQuote(command)})`;
}

export function windowsSpawnArgs(exec: string, cwd: string, command: string): SystemTerminalSpec {
  const base = path.basename(exec).toLowerCase();
  const ps = powershellInsertScript(cwd, command);
  if (base === "wt" || base === "wt.exe") {
    return { cmd: exec, args: ["-d", cwd, "powershell", "-NoExit", "-Command", ps] };
  }
  if (base === "powershell" || base === "powershell.exe" || base === "pwsh" || base === "pwsh.exe") {
    return { cmd: exec, args: ["-NoExit", "-Command", ps], cwd };
  }
  const quotedCwd = `"${cwd.replace(/"/g, "")}"`;
  const quotedCmd = `"${command.replace(/"/g, "")}"`;
  return { cmd: exec, args: ["/K", `cd /d ${quotedCwd} && echo ${quotedCmd} && pause >nul && ${command}`], cwd };
}

export function defaultExec(platform: NodeJS.Platform, exec: ExternalTerminalExec): string {
  if (platform === "darwin") {
    return exec.osxExec.trim() || "Terminal";
  }
  if (platform === "win32") {
    return exec.windowsExec.trim() || "wt";
  }
  return exec.linuxExec.trim() || "x-terminal-emulator";
}

export function buildSystemTerminalSpec(
  platform: NodeJS.Platform,
  exec: ExternalTerminalExec,
  cwd: string,
  command: string,
  scriptPath: string,
): SystemTerminalSpec {
  const resolved = defaultExec(platform, exec);
  if (platform === "win32") {
    return windowsSpawnArgs(resolved, cwd, command);
  }
  if (platform === "darwin") {
    return darwinSpawnArgs(resolved, scriptPath);
  }
  return linuxSpawnArgs(resolved, scriptPath, cwd);
}

export function launchSystemTerminal(
  platform: NodeJS.Platform,
  exec: ExternalTerminalExec,
  cwd: string,
  command: string,
  onError: (err: Error) => void,
): void {
  const tmp = os.tmpdir();
  const scriptName = platform === "darwin" ? `buttons-term-${process.pid}.command` : `buttons-term-${process.pid}.sh`;
  const scriptPath = path.join(tmp, scriptName);
  if (platform !== "win32") {
    fs.writeFileSync(scriptPath, unixPrefillScript(cwd, command), { encoding: "utf8" });
    fs.chmodSync(scriptPath, 0o700);
  }
  const spec = buildSystemTerminalSpec(platform, exec, cwd, command, scriptPath);
  const child = spawn(spec.cmd, spec.args, { cwd: spec.cwd, detached: true, stdio: "ignore" });
  child.on("error", (err) => {
    onError(err instanceof Error ? err : new Error(String(err)));
  });
  child.unref();
}
