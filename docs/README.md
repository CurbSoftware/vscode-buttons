# Buttons

Buttons is a VS Code extension that turns a repo-root `.buttons` TOML file into a visual command panel inside the editor.

Teams can define common workflows once and expose them as clickable actions to **run in the terminal**, **copy to the clipboard**, or **open related URLs and local ports**.

## Why Buttons?

Projects usually keep important commands scattered across `package.json`, Docker docs, onboarding guides, shell history, and README snippets. Buttons gives those commands one shared surface inside VS Code so developers can discover and run them without hunting.

## Features

- Parse a single `.buttons` file from the workspace root
- Render groups and buttons in a sidebar panel and editor webview
- Run commands in the current or a new terminal
- Copy resolved commands to the clipboard
- Open related URLs and localhost ports
- Static buttons and cartesian-generated buttons
- Simple variables and reusable macros
- Prompt before running dangerous commands
- Activity Bar icon for quick access

## Quick Start

1. Install the extension from the VS Code Marketplace.
2. Create a `.buttons` file at the root of your project.
3. The Buttons sidebar appears automatically.
4. Click **Run**, **New Terminal**, or **Copy** on any button.

```toml
version = 1
title = "My Project"
layout = "grid"

[groups.dev]
name = "Development"
icon = "rocket"

[[groups.dev.buttons]]
id = "start"
label = "Start Dev Server"
command = "npm run dev"
icon = "play"

[[groups.dev.buttons]]
id = "build"
label = "Build"
command = "npm run build"
icon = "package"
```

## Next Steps

- [Getting Started](GETTING-STARTED.md) — first-use walkthrough
- [.buttons File Reference](BUTTONS-FILE.md) — full config schema
- [Examples](EXAMPLES.md) — Node, Docker, Python, and Git example packs
- [Troubleshooting](TROUBLESHOOTING.md) — common issues and fixes
