Absolutely — here is a strong **VS Code Marketplace README / extension page draft** for **Buttons**.

You can use most of this directly for:

* `README.md`
* VS Code Marketplace description
* GitHub repository landing page

---

# Buttons

**Buttons** adds a visual command workspace to VS Code.

Define project commands in a simple `.buttons` file at your project root, then open them in a dedicated Buttons editor tab with one-click actions to:

* run in the current terminal
* run in a new terminal
* copy to clipboard
* open local ports or URLs
* share common project workflows with your team

Buttons is designed for projects that have recurring commands like:

* `pnpm run dev`
* `pnpm run build`
* `docker compose up -d`
* `pytest`
* `npm run lint`
* `supabase start`

Instead of hunting through docs, scripts, package.json entries, shell history, or internal notes, your team gets a clean, visual command surface directly inside VS Code.

---

## Why Buttons?

Most projects have important commands that developers run repeatedly, but those commands are often scattered across:

* `package.json`
* shell history
* README files
* onboarding docs
* internal wiki pages
* random team messages

Buttons gives you a single, repo-local source of truth for these workflows.

It is especially useful for:

* local development commands
* build/test/lint workflows
* Docker commands
* database and migration commands
* monorepo utilities
* team onboarding
* shared operational scripts

---

## Features

### Visual command editor tab

Open your project’s `.buttons` file in a dedicated Buttons view inside VS Code.

### TOML-based project configuration

Store buttons in a clean, version-controlled `.buttons` file at the project root.

### One-click actions

Each command can be configured with actions such as:

* run in current terminal
* run in new terminal
* copy to clipboard

### Grouped commands

Organize buttons into groups like:

* PNPM
* Docker
* Database
* Testing
* DevOps

### Generated command buttons

Define command matrices and generate multiple buttons from shared patterns.

### Team-friendly workflow sharing

Commit `.buttons` to your repository so everyone gets the same command workspace.

### Optional port and URL shortcuts

Attach ports or links to buttons for quick access to local apps and services.

---

## Example Use Cases

Buttons works well for projects like:

### Frontend / Next.js

* dev server
* build
* lint
* typecheck
* test
* storybook

### Full-stack apps

* start app
* start API
* run migrations
* seed database
* reset local environment

### Docker-based development

* compose up
* compose down
* logs
* rebuild services

### Monorepos

* workspace-specific dev commands
* package-level test/build scripts
* shared tooling commands

### Team onboarding

New developers can open the project and immediately see the commands they actually need.

---

## Example `.buttons` file

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

[[groups.pnpm.buttons]]
id = "test"
label = "Test"
command = "pnpm run test"
icon = "beaker"

[groups.docker]
name = "Docker"
enabled = true
icon = "server"

[[groups.docker.buttons]]
id = "up"
label = "Compose Up"
command = "docker compose up -d"

[[groups.docker.buttons]]
id = "logs"
label = "Logs"
command = "docker compose logs -f"
run_in_new_terminal = true
```

---

## How It Works

1. Create a `.buttons` file in your project root
2. Define groups and commands using TOML
3. Open the Buttons view in VS Code
4. Click a button to run or copy the command

Buttons reads your configuration, validates it, and renders your command workspace in a structured visual layout.

---

## Designed for Real Development Workflows

Buttons is intentionally focused on practical command execution inside the editor.

It is not meant to replace a full build system or task runner. Instead, it provides a fast, visual operational layer for the commands your project already depends on.

That makes it a strong fit for teams that want:

* lower onboarding friction
* fewer repeated questions
* clearer local setup workflows
* faster access to common commands
* cleaner repo-level developer ergonomics

---

## Goals

Buttons is built around a few core principles:

* **repo-local configuration**
  Commands belong with the project.

* **simple, readable syntax**
  TOML keeps configuration easy to read and maintain.

* **visual execution surface**
  Repeated commands should be easy to discover and use.

* **team portability**
  Shared workflows should be version controlled.

* **practical scope**
  Buttons is a command catalog and launcher, not a scripting language.

---

## Planned / Future Ideas

Depending on roadmap direction, future versions may include:

* better multi-root workspace support
* variables such as `${workspaceFolder}`
* command confirmation for destructive operations
* favorites / pinned buttons
* search and filtering
* workspace-local personal overrides
* richer command templates
* codicon and UI theming improvements

---

## Who Is This For?

Buttons is a strong fit for:

* developers working in repos with many recurring commands
* teams who want consistent project workflows
* monorepo maintainers
* full-stack developers switching across multiple services
* engineers who want faster, cleaner local operations inside VS Code

---

## Feedback

If you have ideas, schema suggestions, or workflow needs, feedback is very welcome.

Buttons is especially interested in improving:

* configuration ergonomics
* command generation patterns
* terminal workflow design
* multi-root workspace support
* team-oriented repo conventions

---

## Summary

**Buttons turns project commands into a visual workspace inside VS Code.**

Instead of remembering commands or searching documentation, you define them once in `.buttons` and run them with a click.

---
a shorter polished Marketplace version, a full but clean and concise GitHub README with badges/screenshots sections (do not use excessive emojis), and a document file seperate that can be used as a documentation page(s), to allow users to view TOML schema, syntax, and examples.

