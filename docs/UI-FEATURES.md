# UI Features

Buttons provides several interactive features in the panel and sidebar views.

## Accordion Groups

Every group section is **collapsible**. Click the group header (or the chevron icon) to toggle between expanded and collapsed states.

- The chevron rotates to indicate state: ▼ expanded, ► collapsed
- Collapse state is **persisted** across panel refreshes
- Useful for hiding groups you don't currently need

## Eye Toggle (Button Visibility)

Each button card has a small **eye icon** in the title bar. Click it to toggle visibility:

- **Visible** (eye icon): button is fully displayed
- **Hidden** (eye-closed icon): button collapses to a minimal faded bar
- Hidden buttons still show the label so you can re-enable them
- Visibility state is **persisted** across panel refreshes

This is useful for temporarily hiding buttons you rarely use without removing them from the config.

## Action Buttons

Each button card displays up to **5 action buttons** that control how the command is executed:

| Action | Data Attribute | Description |
|--------|---------------|-------------|
| **Run** | `data-action="run-current"` | Execute the command in the current (reusable "Buttons") terminal. |
| **New Terminal** | `data-action="run-new"` | Execute the command in a freshly created terminal. |
| **Copy to Terminal** | `data-action="copy-to-terminal"` | Paste the command into the current terminal **without executing** it. |
| **Copy to New Terminal** | `data-action="copy-to-new-terminal"` | Paste the command into a new terminal **without executing** it. |
| **Copy to Clipboard** | `data-action="copy"` | Copy the command text to the system clipboard. |

Each action button can be independently shown or hidden and given a custom color via the `[display]` block:

```toml
[display]
show_run = true
show_new_terminal = true
show_copy_to_terminal = false        # hide this action
show_copy_to_new_terminal = false    # hide this action
show_copy_to_clipboard = true

run_color = "#48B57A"
copy_to_clipboard_color = "#8B8B8B"
```

All five action buttons are visible by default. See the [Display Block](BUTTONS-FILE.md#display-block) reference for the full list of fields.

## Source Tabs

When both a project `.buttons` file and a user `~/.buttons` file exist, **tabs** appear at the top of the panel:

- **Project** — shows buttons from the workspace `.buttons` file
- **User** — shows buttons from `~/.buttons`

Click a tab to switch views. The active source determines which groups and buttons are displayed. Display settings are always merged (project overrides user).

If only one source exists, no tabs are shown.

## Custom Colors

### Button Colors

Set a default border accent color for all buttons:

```toml
[display]
button_color = "#6B8AFF"
```

Override per-group or per-button:

```toml
[groups.dev]
color = "#48B57A"

[[groups.dev.buttons]]
color = "#FF6B9D"    # this button only
```

### Group Background Colors

Set a background color for group sections:

```toml
[display]
group_bg_color = "#1E2333"
```

Individual groups can set their own color via the `color` field, which affects the group title icon.

### Action Button Colors

Each of the 5 action buttons can have a custom color:

```toml
[display]
run_color = "#48B57A"
new_terminal_color = "#6B8AFF"
copy_to_terminal_color = "#D4A843"
copy_to_new_terminal_color = "#C77DBA"
copy_to_clipboard_color = "#8B8B8B"
```

These can also be set at the group level via `[groups.ID.display]`.

### Color Format

Colors must be valid hex values: `#RGB` (3 digits) or `#RRGGBB` (6 digits).

```toml
color = "#FF0000"    # red
color = "#F00"       # also red (shorthand)
```

## Icons

Buttons uses [VS Code Codicons](https://microsoft.github.io/vscode-codicons/dist/codicon.html) for all icons. Set icons on groups, buttons, and links:

```toml
[groups.build]
icon = "package"

[[groups.build.buttons]]
icon = "play"

[[groups.build.links]]
icon = "link-external"
```

Icon names must be lowercase, start with a letter, and contain only letters, numbers, and dashes. Common icons:

| Icon | Name | Use case |
|------|------|----------|
| ▶ | `play` | Start / run |
| ■ | `stop` | Stop services |
| ⚙ | `gear` | Settings / config |
| 🔨 | `tools` | Build tools |
| 📦 | `package` | Package / bundle |
| 🧪 | `beaker` | Testing |
| ✓ | `verified` | Lint / check |
| 🗑 | `trash` | Clean / delete |
| ⚡ | `zap` | Fast / lightning |
| 🚀 | `rocket` | Deploy / launch |
| 🔀 | `git-branch` | Git operations |
| 🌐 | `globe` | Web / URLs |
| 💾 | `database` | Database |
| 📺 | `terminal` | Terminal / shell |
| 👁 | `eye` | Watch / monitor |
| 🔗 | `link-external` | External links |
| ⚠ | `warning` | Caution |
| 🔥 | `flame` | Destructive |
| 📖 | `book` | Documentation |
| 📊 | `graph` | Analytics / charts |

### Display Toggles

Control which parts of a button are shown:

```toml
[display]
show_icons = true     # show codicon icons
show_labels = true    # show text labels
show_command = true   # show command preview
```

When `show_icons = true` and `show_labels = false`, buttons display as icon-only with the label as a tooltip.

## Command Preview

When `show_command = true` (the default), each button card shows the resolved command in a monospace code block. This helps users verify what will run before clicking.

## Compact Mode

```toml
[display]
compact = true
```

Reduces padding and gaps on button cards for a denser UI. Works with all layout modes.

## Danger Badges

Buttons flagged as `danger = true` (or auto-detected) display a red "Danger" badge. Combined with `confirm = true`, they show a modal confirmation dialog before execution.

```toml
[[groups.ops.buttons]]
label = "Drop Database"
command = "dropdb myapp"
icon = "trash"
danger = true
confirm = true
```

## Port and Link Badges

Groups can display clickable badges for ports and links in the header:

```toml
[groups.dev]
ports = [3000, 5173]

[[groups.dev.links]]
label = "Docs"
url = "http://localhost:3001"
icon = "book"
```

Port badges display as `:3000` and open `http://localhost:3000` when clicked. Link badges display the label and open the URL.

## Per-Group Display Override

Groups can override document-level display settings using a `[groups.ID.display]` block. This applies to all display fields, including action button visibility and colors.

```toml
# Document-level: hide Copy to Terminal globally
[display]
show_copy_to_terminal = false

# But re-enable it for the dev group only
[groups.dev]
name = "Development"

[groups.dev.display]
show_copy_to_terminal = true
run_color = "#48B57A"
compact = true
```

The full cascade for display settings is:

```
VS Code settings (fallbacks)
    → User ~/.buttons [display]
        → Project .buttons [display]
            → Group [groups.ID.display] (highest priority)
```

## Status Bar

When any `.buttons` file exists (project or user), a status bar item appears:

```
$(list-selection) Buttons
```

Click it to open the panel view.

## Related Pages

- [.buttons File Reference](BUTTONS-FILE.md)
- [Layouts](LAYOUTS.md)
- [Settings & Commands](SETTINGS.md)
