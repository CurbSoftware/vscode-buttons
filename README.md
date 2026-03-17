# Buttons

Buttons is a VS Code extension that turns a repo-root `.buttons` TOML file into a visual command panel inside the editor. Teams can define common workflows once and expose them as clickable actions to run in the current terminal, run in a new terminal, copy to the clipboard, or open related URLs and local ports.

## What It Solves

Projects usually keep important commands scattered across `package.json`, Docker docs, onboarding guides, shell history, and README snippets. Buttons gives those commands one shared surface inside VS Code so developers can discover and run them without hunting.

## Current Capabilities

- Parse a single `.buttons` file from the workspace root
- Render groups and buttons in an editor-area webview panel
- Run commands in the current terminal
- Run commands in a new terminal
- Copy resolved commands to the clipboard
- Open related URLs and localhost ports
- Support static buttons and cartesian-generated buttons
- Support simple variables and reusable macros
- Prompt before running dangerous commands

## Quick Start

1. Install the extension or run it locally in an Extension Development Host.
2. Create a `.buttons` file at the root of your project.
3. Run `Buttons: Open Panel` from the Command Palette.
4. Click `Run`, `New Terminal`, or `Copy` on any button.

The extension only loads the root `.buttons` file in v1. Sample files under `examples/` are meant to be copied into the root when you want to try them.

## Documentation

- [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)
- [docs/BUTTONS-FILE.md](docs/BUTTONS-FILE.md)
- [docs/EXAMPLES.md](docs/EXAMPLES.md)
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)

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
