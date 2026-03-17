# Getting Started

Buttons reads `.buttons` TOML files and turns them into a visual command panel inside VS Code.

## Basic Flow

1. Create a `.buttons` file at your project root (or `~/.buttons` in your home directory).
2. The Buttons sidebar icon appears in the Activity Bar.
3. Click a button to run it, copy it, or open related URLs and ports.

## Minimal Example

```toml
version = 1
title = "Project Commands"

[groups.main]
name = "Main"
icon = "rocket"

[[groups.main.buttons]]
id = "dev"
label = "Dev"
command = "npm run dev"
icon = "play"

[[groups.main.buttons]]
id = "build"
label = "Build"
command = "npm run build"
icon = "package"
```

## What The Actions Do

| Action | Behavior |
|--------|----------|
| **Run** | Sends the command to the current terminal (or a reusable "Buttons" terminal) |
| **New Terminal** | Creates a new terminal and runs the command there |
| **Copy** | Copies the fully resolved command string to the clipboard |
| **Open URL** | Opens a configured external URL in the default browser |
| **Open :PORT** | Opens `http://localhost:PORT` in the default browser |

## Two Sources of Buttons

### Project Buttons

A `.buttons` file at the workspace root. Shared with the team via version control. Contains project-specific commands.

### User Buttons

A `~/.buttons` file in your home directory. Personal commands available across all projects. Not committed to version control.

When both exist, **tabs** appear at the top of the panel to switch between them. Display settings from both files are merged, with the project file taking precedence.

To create a user buttons file, run the command **Buttons: Open User .buttons File** from the Command Palette.

## Panel and Sidebar

Buttons provides two views:

- **Sidebar** — compact view in the Activity Bar (always uses rows layout)
- **Panel** — full editor tab opened via `Buttons: Open Panel` or the status bar item

Both views show the same buttons and support all interactive features.

## Accordion Groups

Click any group header to **collapse** or **expand** it. The chevron icon rotates to indicate the state. Collapsed state is remembered across panel refreshes.

## Eye Toggle

Each button has a small **eye icon**. Click it to hide the button from view. Hidden buttons appear as faded bars. Click the eye again to restore. Visibility state is remembered across refreshes.

## Layout Modes

Set the layout at the document level or per group:

| Layout | Description |
|--------|-------------|
| `grid` | Responsive auto-fit columns (default) |
| `rows` | Single column, full width |
| `columns` | Fixed 3-column grid |
| `table` | Compact tabular, one row per button |
| `flow` | Horizontal flex-wrap with smaller cards |

```toml
layout = "grid"      # document-level default
```

See [Layouts](LAYOUTS.md) for visual descriptions and guidance.

## Display Settings

Control what appears on each button card:

```toml
[display]
show_command = true       # command preview below the label
show_labels = true        # text labels on buttons
show_icons = true         # codicon icons on buttons
compact = false           # tighter spacing
button_color = "#6B8AFF"  # default border accent for buttons
group_bg_color = "#1E2333" # background color for groups
```

## Good First Groups

- Package manager commands (npm, pnpm, pip, cargo)
- Dev server and build commands
- Test and lint commands
- Docker or container commands
- Git helpers
- Database migrations

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type "Buttons" to see all available commands:

- **Buttons: Open Panel** — open the full panel view
- **Buttons: Reload Config** — force-refresh after manual edits
- **Buttons: Open .buttons File** — open the project config
- **Buttons: Open User .buttons File** — open the user config
- **Buttons: Create Example .buttons** — generate a starter file

## Next Steps

- [.buttons File Reference](BUTTONS-FILE.md) — complete TOML schema
- [Examples](EXAMPLES.md) — 29 example packs for every stack
- [User Profile](USER-PROFILE.md) — set up your personal `~/.buttons`
- [Troubleshooting](TROUBLESHOOTING.md) — common issues and fixes
