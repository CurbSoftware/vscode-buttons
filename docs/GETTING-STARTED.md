# Getting Started

Buttons reads a `.buttons` TOML file from the root of your workspace and turns it into a visual command panel inside VS Code.

## Basic Flow

1. Create a `.buttons` file at your project root.
2. Open the Command Palette.
3. Run `Buttons: Open Panel`.
4. Click a button to run it, copy it, or open related URLs and ports.

## Minimal Example

```toml
version = 1
title = "Project Commands"
layout = "grid"

[groups.main]
name = "Main"
icon = "rocket"

[[groups.main.buttons]]
id = "dev"
label = "Dev"
command = "npm run dev"
icon = "play"
```

## What The Actions Do

- `Run` sends the command to the current terminal.
- `New Terminal` creates a new terminal and runs the command there.
- `Copy` copies the fully resolved command string.
- `Open URL` opens a configured external URL.
- `Open :PORT` opens `http://localhost:PORT`.

## Good First Groups

- package manager commands
- dev server commands
- build and test commands
- Docker or container commands
- Git helpers

## Real Example In This Repo

The repository already ships with a valid root config in [.buttons](../.buttons). It includes real commands for this project such as dependency install, compile, lint, and watch mode.

## More Docs

- [BUTTONS-FILE.md](BUTTONS-FILE.md)
- [EXAMPLES.md](EXAMPLES.md)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)