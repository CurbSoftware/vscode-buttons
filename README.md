# Buttons

Buttons is a VS Code extension that turns `.buttons` TOML files into a visual command panel inside the editor. Teams define common workflows once and expose them as clickable actions to run in the terminal, copy to the clipboard, or open related URLs and local ports. Individual developers can also keep a personal `~/.buttons` file with commands available across all projects.

![Basic panel and sidebar](docs/screenshots/buttons-screenshot-basic-panel-and-sidebar.webp)

## What It Solves

Projects usually keep important commands scattered across `package.json`, Docker docs, onboarding guides, shell history, and README snippets. Buttons gives those commands one shared surface inside VS Code so developers can discover and run them without hunting.

### Run commands from a visual panel

![Running buttons to terminal](docs/screenshots/buttons-screen-record-buttons-to-terminal.webp)

### Customize with a simple TOML file

![Changing settings file](docs/screenshots/buttons-screen-record-buttons-change-settings-file.webp)

## Features

- **Project buttons** — parse a `.buttons` file from the workspace root
- **User buttons** — personal `~/.buttons` file available in every project
- **Source tabs** — toggle between project and user buttons in the panel
- **5 layout modes** — grid, rows, columns, table, and flow

![Layout modes](docs/screenshots/buttons-screenshot-layouts-screens-panel.webp)

- **Accordion groups** — collapse and expand groups with persistent state
- **Eye toggle** — hide individual buttons from the panel
- **Custom colors** — per-button, per-group, and global color theming
- **Run commands** in the current or a new terminal
- **Copy** resolved commands to the clipboard
- **Open** related URLs and localhost ports
- **Static and generated buttons** — cartesian product expansion
- **Variables and macros** — simple string substitution with cycle detection
- **Danger detection** — automatic flagging and confirmation for destructive commands
- **Activity Bar icon** — sidebar panel for quick access
- **Toolbar icon** — quick-access button in the editor title bar
- **Compact mode** — dense layout option for large configs

![Kitchen sink example](docs/screenshots/buttons-screenshot-kitchen-sink-example-panel-and-sidebar.webp)

## Quick Start

1. Install the extension or run it locally in an Extension Development Host.
2. Create a `.buttons` file at the root of your project.
3. Run `Buttons: Open Panel` from the Command Palette.
4. Click `Run`, `New Terminal`, or `Copy` on any button.

The extension only loads the root `.buttons` file in v1. Sample files under `examples/` are meant to be copied into the root when you want to try them.

## Documentation

- [Getting Started](docs/GETTING-STARTED.md) — first-use walkthrough
- [.buttons File Reference](docs/BUTTONS-FILE.md) — complete TOML schema
- [Layouts](docs/LAYOUTS.md) — grid, rows, columns, table, and flow
- [UI Features](docs/UI-FEATURES.md) — accordion, eye toggle, colors, and more
- [User Profile](docs/USER-PROFILE.md) — personal `~/.buttons` file
- [Settings & Commands](docs/SETTINGS.md) — VS Code settings and commands
- [Examples](docs/EXAMPLES.md) — 29 example packs for every stack
- [Troubleshooting](docs/TROUBLESHOOTING.md) — common issues and fixes

## Example Root Config

This repository includes a working root config in [.buttons](.buttons) that targets the actual commands available in this project.

```toml
version = 1
title = "Buttons Extension Workspace"
description = "Real commands for working on the Buttons VS Code extension"
layout = "grid"
terminal = "current"

[display]
show_command = true
show_labels = true
show_icons = true
compact = false

[defaults]
enabled = true
copy_to_clipboard = true
run_in_current_terminal = true
run_in_new_terminal = false
confirm = false
danger = false
reveal_terminal = true

[groups.workspace]
name = "Workspace"
description = "Install and inspect the project"
icon = "rocket"

[[groups.workspace.buttons]]
id = "install"
label = "Install Dependencies"
command = "npm install"
icon = "package"

[[groups.workspace.buttons]]
id = "typescript-version"
label = "TypeScript Version"
command = "./node_modules/.bin/tsc --version"
icon = "symbol-number"
```

## Example Packs

Reusable sample `.buttons` files live under `examples/`:

- [examples/node/.buttons](examples/node/.buttons)
- [examples/docker/.buttons](examples/docker/.buttons)
- [examples/python/.buttons](examples/python/.buttons)
- [examples/git/.buttons](examples/git/.buttons)

## Development Notes

This project currently uses TypeScript plus the VS Code extension API. The local workflow is:

1. `npm install`
2. `npm run compile`
3. Start the `Run Buttons Extension` launch configuration in VS Code

## License

MIT. See [LICENSE](LICENSE).
