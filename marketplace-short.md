# Buttons

**Buttons** adds a visual command workspace to VS Code.

Define project commands in a `.buttons` file at your project root, then open them in a dedicated Buttons view with one-click actions to:

- run in the current terminal
- run in a new terminal
- copy to clipboard
- open local ports or URLs

Buttons is built for projects with recurring commands such as `pnpm run dev`, `docker compose up -d`, `npm test`, migrations, seed scripts, or service startup workflows.

Instead of searching through README files, `package.json`, shell history, or onboarding notes, your team gets a clean, repo-local command surface directly inside the editor.

## Features

- Visual Buttons editor tab inside VS Code
- `.buttons` TOML configuration stored in the project root
- One-click run and copy actions
- Command groups for workflows like PNPM, Docker, Database, and Testing
- Generated buttons from shared command patterns
- Optional links and local port shortcuts
- Team-friendly, version-controlled workflow sharing

## Example

```toml
version = 1
title = "Project Commands"
layout = "grid"
terminal = "current"

[groups.pnpm]
name = "PNPM"
icon = "package"

[[groups.pnpm.buttons]]
label = "Dev"
command = "pnpm run dev"

[[groups.pnpm.buttons]]
label = "Build"
command = "pnpm run build"
```

## Why Buttons?

Projects usually have a set of important commands, but they are often scattered across:

- `package.json`
- docs and onboarding guides
- wiki pages
- team messages
- terminal history

Buttons gives those workflows a dedicated place in the project itself.

## Good fit for

- frontend and full-stack repos
- monorepos
- Docker-based development
- shared team workflows
- onboarding and local setup

Buttons is intentionally focused on being a practical command catalog and launcher, not a replacement for a full task runner.
