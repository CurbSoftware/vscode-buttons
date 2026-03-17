# Buttons

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/YOUR_PUBLISHER.buttons)](https://marketplace.visualstudio.com/)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/YOUR_PUBLISHER.buttons)](https://marketplace.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**Buttons** adds a visual command workspace to VS Code.

Define project commands in a `.buttons` file at your project root, then open them in a dedicated Buttons view with one-click actions to run, copy, and organize the commands your project uses every day.

## What Buttons does

Buttons gives your project a repo-local command surface for recurring workflows such as:

- development servers
- build and test commands
- Docker workflows
- database operations
- monorepo utilities
- onboarding commands

Instead of relying on shell history, README files, and scattered notes, your team gets a structured command catalog directly inside the editor.

## Features

- Visual Buttons editor tab in VS Code
- `.buttons` configuration file using TOML
- Run in current terminal
- Run in new terminal
- Copy to clipboard
- Grouped commands by workflow
- Generated buttons from command patterns
- Optional links, URLs, and local port shortcuts
- Team-friendly, version-controlled configuration

## Screenshots

> Replace these with actual screenshots before publishing.

### Buttons view

![Buttons view](./docs/images/buttons-view.png)

### Grouped commands

![Grouped commands](./docs/images/buttons-groups.png)

### Running commands

![Running commands](./docs/images/buttons-run.png)

## Installation

Install **Buttons** from the Visual Studio Code Marketplace.

Or search for `Buttons` in the Extensions view inside VS Code.

## Quick start

1. Install the extension.
2. Create a `.buttons` file in your project root.
3. Add one or more command groups.
4. Open the Buttons view or open the `.buttons` file with Buttons.
5. Click a button to run or copy a command.

## Example `.buttons`

```toml
version = 1
title = "Project Commands"
description = "Shared commands for local development"
layout = "grid"
terminal = "current"

[display]
show_command = true
show_labels = true
show_icons = true

[defaults]
enabled = true
copy_to_clipboard = true
run_in_current_terminal = true
run_in_new_terminal = false
confirm = false

[groups.pnpm]
name = "PNPM"
enabled = true
base = "pnpm"
icon = "package"
color = "#F54927"
ports = [3000]

[[groups.pnpm.buttons]]
id = "dev"
label = "Dev"
command = "pnpm run dev"
icon = "play"
open_ports = [3000]

[[groups.pnpm.buttons]]
id = "build"
label = "Build"
command = "pnpm run build"
icon = "package"

[groups.docker]
name = "Docker"
enabled = true
icon = "server"

[[groups.docker.buttons]]
id = "up"
label = "Compose Up"
command = "docker compose up -d"
```

## Why use Buttons?

Most projects already have important commands, but they are usually spread across multiple places:

- `package.json`
- `Makefile`
- documentation
- onboarding notes
- internal wiki pages
- terminal history

Buttons gives those commands a dedicated interface inside the project itself.

That makes it especially useful for:

- teams sharing common workflows
- developers working across multiple services
- monorepo environments
- projects with repetitive operational commands
- faster onboarding for new contributors

## Configuration model

Buttons uses a `.buttons` TOML file stored at the project root.

The configuration is designed around three levels:

1. document-level settings
2. group-level settings
3. button-level definitions or generated button rules

This keeps the file readable while allowing shared defaults and clean organization.

## Command actions

A button can support actions such as:

- run in current terminal
- run in new terminal
- copy to clipboard
- open related local ports
- open related URLs

## Typical groups

Common group patterns include:

- `pnpm`
- `npm`
- `docker`
- `database`
- `tests`
- `devops`
- `scripts`

## Schema and docs

See the documentation pages for:

- TOML schema
- syntax reference
- examples
- generation patterns
- validation rules

Suggested docs location:

- [`docs/buttons-file.md`](./docs/buttons-file.md)

## Roadmap ideas

Planned or possible future enhancements may include:

- multi-root workspace support
- variables such as `${workspaceFolder}`
- danger confirmation styling
- favorites and pinned buttons
- search and filtering
- workspace-local personal overrides
- richer templates

## Development

Suggested project structure:

```text
src/
  extension.ts
  commands/
  config/
  execution/
  editor/
  models/
  utils/
docs/
  buttons-file.md
  images/
```

## License

MIT
