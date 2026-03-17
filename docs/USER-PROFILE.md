# User Profile

The user profile is a personal `.buttons` file in your home directory that provides buttons available across **all** projects.

## Location

| OS | Path |
|----|------|
| Linux | `~/.buttons` |
| macOS | `~/.buttons` |
| Windows | `C:\Users\<username>\.buttons` |

The extension uses `os.homedir()` internally, which resolves correctly on all platforms.

## Creating Your User File

Run the command **Buttons: Open User .buttons File** from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`). If the file doesn't exist, the extension offers to create an example.

Or create it manually:

```toml
version = 1
title = "My Buttons"
description = "Personal commands — available in every project"
layout = "flow"

[display]
show_command = false
show_labels = true
show_icons = true
compact = true

[groups.git]
name = "Git"
icon = "git-branch"

[[groups.git.buttons]]
id = "status"
label = "Status"
command = "git status -sb"
icon = "diff"

[[groups.git.buttons]]
id = "log"
label = "Log"
command = "git log --oneline --graph -20"
icon = "history"

[[groups.git.buttons]]
id = "push"
label = "Push"
command = "git push"
icon = "cloud-upload"

[[groups.git.buttons]]
id = "pull"
label = "Pull"
command = "git pull --rebase"
icon = "cloud-download"

[groups.system]
name = "System"
icon = "terminal"

[[groups.system.buttons]]
id = "ip"
label = "My IP"
command = "curl -s ifconfig.me && echo"
icon = "globe"

[[groups.system.buttons]]
id = "ports"
label = "Listening Ports"
command = "lsof -i -P -n | grep LISTEN"
icon = "plug"

[[groups.system.buttons]]
id = "disk"
label = "Disk Usage"
command = "df -h /"
icon = "pie-chart"
```

## How It Works

- The extension checks for `~/.buttons` on startup and watches it for changes
- If only a user file exists (no project `.buttons`), its buttons appear directly
- If both files exist, **tabs** appear in the panel to switch between "Project" and "User" views
- The extension activates on startup via `onStartupFinished`, so user buttons work even in workspaces without a project `.buttons` file

## Settings Merging

When both files exist, **display settings are merged** with the project file taking precedence:

1. User file display settings form the base
2. Project file display settings override any fields they define
3. Fields not defined in the project file fall through from the user file

Example:

```toml
# ~/.buttons (user)
[display]
show_icons = true
show_labels = true
button_color = "#6B8AFF"

# <project>/.buttons (project)
[display]
show_icons = false
# show_labels and button_color fall through from user file
```

Result: `show_icons = false`, `show_labels = true`, `button_color = "#6B8AFF"`.

> **Note:** Button groups are not merged. The panel shows one source at a time.

## Use Cases

- **Git shortcuts** — status, log, push, pull, stash operations
- **System tools** — disk usage, memory, network info, process monitoring
- **SSH tunnels** — frequently-used tunnel commands to remote servers
- **Docker quick commands** — list containers, prune, stop all
- **Editor tools** — format, lint, search patterns you use everywhere

## Example File

See [examples/user-profile/.buttons](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/user-profile/.buttons) for a comprehensive user profile example with git shortcuts, system commands, Docker tools, and SSH tunnels.

## Related Pages

- [Getting Started](GETTING-STARTED.md)
- [.buttons File Reference](BUTTONS-FILE.md)
- [Settings & Commands](SETTINGS.md)
