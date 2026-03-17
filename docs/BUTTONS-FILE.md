# `.buttons` File Reference

The `.buttons` file uses [TOML](https://toml.io/) format. Place it at the workspace root for project-scoped buttons, or at `~/.buttons` for user-scoped buttons available across all projects.

## Minimal File

```toml
version = 1
title = "Quick Commands"

[groups.run]
buttons = [
  { id = "build", command = "npm run build" },
  { id = "test", command = "npm test" },
]
```

## Full Example

```toml
version = 1
title = "Example Project"
description = "Shared commands for local development"
layout = "grid"
terminal = "current"

[display]
show_command = true
show_labels = true
show_icons = true
compact = false
button_color = "#6B8AFF"
group_bg_color = "#1E2333"
show_run = true
show_new_terminal = true
show_copy_to_terminal = true
show_copy_to_new_terminal = true
show_copy_to_clipboard = true

[defaults]
enabled = true
copy_to_clipboard = true
run_in_current_terminal = true
run_in_new_terminal = false
confirm = false
danger = false
reveal_terminal = true

[variables]
service = "api"

[macros]
pnpm_run = "pnpm run"

[groups.pnpm]
name = "PNPM"
description = "Package scripts"
base = "pnpm"
icon = "package"
color = "#F54927"
ports = [3000, 6006]

[[groups.pnpm.buttons]]
id = "dev"
label = "Dev"
command = "{{pnpm_run}} dev"
icon = "play"
open_ports = [3000]

[[groups.pnpm.buttons]]
id = "build"
label = "Build"
command = "{{pnpm_run}} build"
icon = "package"

[groups.pnpm.generate]
mode = "cartesian"
template = "{{pnpm_run}} {{arg1}}"
label_template = "{{arg1}}"
params = [["lint", "test"]]

[[groups.pnpm.links]]
label = "Storybook"
url = "http://localhost:6006"
icon = "link-external"
```

---

## Document-Level Keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `version` | `integer` | *(required)* | Must be `1`. |
| `title` | `string` | `"Buttons"` | Title shown in the panel header. |
| `description` | `string` | — | Subtitle shown below the title. |
| `layout` | `string` | `"grid"` | Default layout: `grid`, `rows`, `columns`, `table`, or `flow`. |
| `terminal` | `string` | `"current"` | Default terminal mode: `current` or `new`. |
| `display` | `table` | — | Display settings block. See below. |
| `defaults` | `table` | — | Default behavior settings. See below. |
| `variables` | `table` | — | Key-value pairs for `{{variable}}` substitution. |
| `macros` | `table` | — | Key-value pairs for `{{macro}}` expansion (recursive). |
| `includes` | `string[]` | — | Relative paths to other `.buttons` files to include. See [Includes](#includes). |
| `groups` | `table` | *(required)* | Named groups of buttons. At least one group required. |

---

## Display Block

```toml
[display]
show_command = true
show_labels = true
show_icons = true
compact = false
button_color = "#6B8AFF"
group_bg_color = "#1E2333"

# Action button visibility
show_run = true
show_new_terminal = true
show_copy_to_terminal = true
show_copy_to_new_terminal = true
show_copy_to_clipboard = true

# Action button colors
run_color = "#48B57A"
new_terminal_color = "#6B8AFF"
copy_to_terminal_color = "#D4A843"
copy_to_new_terminal_color = "#C77DBA"
copy_to_clipboard_color = "#8B8B8B"

# Action button custom labels
run_label = "Run"
new_terminal_label = "New Terminal"
copy_to_terminal_label = "Copy to Terminal"
copy_to_new_terminal_label = "Copy to New Terminal"
copy_to_clipboard_label = "Copy"

# Action button icons (codicon name; replaces text label, label becomes tooltip)
run_icon = "play"
new_terminal_icon = "terminal"
copy_to_terminal_icon = "arrow-right"
copy_to_new_terminal_icon = "split-horizontal"
copy_to_clipboard_icon = "copy"

# Click-to-copy on command preview
command_click_to_copy = false

# Size and style
label_size = "14px"
action_size = "12px"
action_border_radius = "6px"
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `show_command` | `boolean` | `true` | Show the command preview text below the button label. |
| `show_labels` | `boolean` | `true` | Show text labels on buttons. |
| `show_icons` | `boolean` | `true` | Show codicon icons on buttons. |
| `compact` | `boolean` | `false` | Use tighter padding and spacing. |
| `button_color` | `string` | — | Hex color (`#RGB` or `#RRGGBB`) for default button border accent. |
| `group_bg_color` | `string` | — | Hex color for group background. |
| `show_run` | `boolean` | `true` | Show the "Run" action button (execute in current terminal). |
| `show_new_terminal` | `boolean` | `true` | Show the "New Terminal" action button (execute in new terminal). |
| `show_copy_to_terminal` | `boolean` | `true` | Show the "Copy to Terminal" action button (paste without executing). |
| `show_copy_to_new_terminal` | `boolean` | `true` | Show the "Copy to New Terminal" action button (paste into new terminal without executing). |
| `show_copy_to_clipboard` | `boolean` | `true` | Show the "Copy to Clipboard" action button. |
| `run_color` | `string` | — | Hex color for the Run action button. |
| `new_terminal_color` | `string` | — | Hex color for the New Terminal action button. |
| `copy_to_terminal_color` | `string` | — | Hex color for the Copy to Terminal action button. |
| `copy_to_new_terminal_color` | `string` | — | Hex color for the Copy to New Terminal action button. |
| `copy_to_clipboard_color` | `string` | — | Hex color for the Copy to Clipboard action button. |
| `run_label` | `string` | `"Run"` | Custom text label for the Run action button. |
| `new_terminal_label` | `string` | `"New Terminal"` | Custom text label for the New Terminal action button. |
| `copy_to_terminal_label` | `string` | `"Copy to Terminal"` | Custom text label for the Copy to Terminal action button. |
| `copy_to_new_terminal_label` | `string` | `"Copy to New Terminal"` | Custom text label for the Copy to New Terminal action button. |
| `copy_to_clipboard_label` | `string` | `"Copy"` | Custom text label for the Copy to Clipboard action button. |
| `run_icon` | `string` | — | Codicon name for the Run action button (e.g. `play`). Replaces text; label becomes tooltip. |
| `new_terminal_icon` | `string` | — | Codicon name for the New Terminal action button (e.g. `terminal`). |
| `copy_to_terminal_icon` | `string` | — | Codicon name for the Copy to Terminal action button (e.g. `arrow-right`). |
| `copy_to_new_terminal_icon` | `string` | — | Codicon name for the Copy to New Terminal action button (e.g. `split-horizontal`). |
| `copy_to_clipboard_icon` | `string` | — | Codicon name for the Copy to Clipboard action button (e.g. `copy`). |
| `command_click_to_copy` | `boolean` | `false` | When enabled, clicking the command preview copies it to clipboard. Shows hover hint and feedback. |
| `label_size` | `string` | — | CSS font-size for button labels (e.g. `"14px"`, `"1.1em"`). |
| `action_size` | `string` | — | CSS font-size for action buttons (e.g. `"12px"`). |
| `action_border_radius` | `string` | — | CSS border-radius for action buttons (e.g. `"6px"`, `"999px"`). |

When both user and project files define display settings, **project settings take precedence**. Undefined project fields fall through from the user file.

---

## Defaults Block

```toml
[defaults]
enabled = true
copy_to_clipboard = true
run_in_current_terminal = true
run_in_new_terminal = false
confirm = false
danger = false
reveal_terminal = true
cwd = "."
```

These values **cascade**: document → group → button. A button-level value overrides a group-level value, which overrides the document default.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | `boolean` | `true` | Whether the button/group is active. Disabled items are hidden. |
| `copy_to_clipboard` | `boolean` | `true` | Copy the command to clipboard when run. |
| `run_in_current_terminal` | `boolean` | `true` | Use the current/reusable "Buttons" terminal. |
| `run_in_new_terminal` | `boolean` | `false` | Create a new terminal for each run. |
| `confirm` | `boolean` | `false` | Show a confirmation dialog before running. |
| `danger` | `boolean` | auto | Mark as dangerous. Auto-detected if not set (see [Danger Detection](#danger-detection)). |
| `reveal_terminal` | `boolean` | `true` | Show the terminal panel after running. |
| `cwd` | `string` | — | Working directory for the command. |
| `env` | `table` | — | Environment variables as key-value pairs. |

---

## Groups

Groups are declared as `[groups.<id>]` where `<id>` becomes the group identifier.

```toml
[groups.dev]
name = "Development"
description = "Start and build the app"
icon = "rocket"
color = "#0070F3"
layout = "grid"
terminal = "current"
ports = [3000]
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `name` | `string` | Title-cased `id` | Display name in the group header. |
| `description` | `string` | — | Subtitle below the group name. |
| `enabled` | `boolean` | `true` | Hide entire group when `false`. |
| `base` | `string` | — | Base command prepended to `args` on buttons. |
| `icon` | `string` | — | Codicon name (e.g. `rocket`, `package`, `beaker`). |
| `color` | `string` | — | Hex color for the group title icon. |
| `layout` | `string` | Document layout | Override layout for this group only. |
| `terminal` | `string` | Document terminal | Override terminal mode for this group. |
| `cwd` | `string` | — | Working directory for all buttons in this group. |
| `env` | `table` | — | Environment variables for all buttons in this group. |
| `delimiter` | `string` | `" "` | Separator when joining `base` + `args`. |
| `ports` | `integer[]` | — | Port numbers shown as clickable badges in the group header. |
| `tags` | `string[]` | — | Arbitrary tags (reserved for future use). |
| `buttons` | `array` | — | Static button definitions. |
| `generate` | `table` | — | Dynamic button generation config. |
| `links` | `array` | — | Quick-access links shown as badges. |
| `display` | `table` | — | Per-group display overrides (see [Per-Group Display](#per-group-display)). |

### Group Links

```toml
[[groups.dev.links]]
label = "App"
url = "http://localhost:3000"
icon = "link-external"
```

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `label` | `string` | Yes | Link display text. |
| `url` | `string` | Yes | Absolute URL (must be valid). |
| `icon` | `string` | No | Codicon name for the badge. |

---

## Per-Group Display

Groups can override document-level display settings with their own `[groups.ID.display]` block. All display fields (visibility toggles, colors, action button settings) are supported at the group level.

```toml
[display]
show_command = true
show_copy_to_clipboard = false   # hidden globally

[groups.dev]
name = "Development"

[groups.dev.display]
compact = true                   # override: compact for this group only
show_copy_to_clipboard = true    # override: re-enable clipboard for this group
run_color = "#48B57A"            # custom Run button color for this group
```

Group display settings override document display settings. Undefined fields fall through from the document `[display]` block (or the user `~/.buttons` display, if applicable).

---

## Static Buttons

Buttons are declared as `[[groups.<id>.buttons]]` array items.

```toml
[[groups.dev.buttons]]
id = "start"
label = "Start Dev Server"
command = "npm run dev"
description = "Starts the Vite dev server on port 3000"
icon = "play"
color = "#48B57A"
run_in_new_terminal = true
open_ports = [3000]
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `id` | `string` | Auto-slugified | Unique identifier. Auto-generated from `groupId-label` if omitted. |
| `label` | `string` | From `id` or command | Display text. Derived from first 3 words of command if omitted. |
| `command` | `string` | — | Shell command to execute. Supports `{{template}}` substitution. |
| `args` | `string[]` | — | Arguments joined with `group.delimiter` after `group.base`. |
| `description` | `string` | — | Tooltip/subtitle text shown below the label. |
| `icon` | `string` | Group icon | Codicon name. Falls back to group icon. |
| `color` | `string` | Group color | Hex color override. Falls back to group color. |
| `enabled` | `boolean` | `true` | Hide this button when `false`. |
| `copy_to_clipboard` | `boolean` | `true` | Copy command on run. |
| `run_in_current_terminal` | `boolean` | `true` | Use current terminal. |
| `run_in_new_terminal` | `boolean` | `false` | Create new terminal. |
| `confirm` | `boolean` | `false` | Show confirmation dialog. |
| `danger` | `boolean` | Auto-detected | Mark as dangerous. |
| `reveal_terminal` | `boolean` | `true` | Show terminal after run. |
| `cwd` | `string` | — | Working directory override. |
| `env` | `table` | — | Environment variable overrides. |
| `open_ports` | `integer[]` | — | Ports to offer opening (renders "Open :PORT" actions). |
| `open_urls` | `string[]` | — | URLs to offer opening (renders "Open URL" actions). |

### Button Command Resolution

A button's command is resolved from one of two sources:

1. **`command` field** — used directly (with template substitution)
2. **`base` + `args`** — group `base` joined with button `args` using `delimiter`

```toml
# Option 1: explicit command
[[groups.dev.buttons]]
command = "npm run dev"

# Option 2: base + args
[groups.docker]
base = "docker compose"
delimiter = " "

[[groups.docker.buttons]]
args = ["up", "-d"]
# resolves to: docker compose up -d
```

### Inline Button Syntax

For simple configs, buttons can be defined inline:

```toml
[groups.run]
buttons = [
  { id = "build", command = "npm run build" },
  { id = "test", command = "npm test" },
]
```

---

## Generated Buttons

The `generate` block creates buttons from a cartesian product of parameters.

```toml
[groups.scripts.generate]
mode = "cartesian"
template = "npm run {{arg1}}"
label_template = "{{arg1}}"
description_template = "Run {{arg1}} script"
params = [["build", "test", "lint"]]
```

This produces 3 buttons: `npm run build`, `npm run test`, `npm run lint`.

Multi-dimensional generation:

```toml
params = [["dev", "staging", "prod"], ["deploy", "status"]]
# Produces 6 buttons: dev-deploy, dev-status, staging-deploy, ...
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `mode` | `string` | `"cartesian"` | Generation mode (only `cartesian` supported). |
| `template` | `string` | *(required)* | Command template with `{{arg1}}`, `{{arg2}}`, etc. |
| `label_template` | `string` | Space-joined args | Label template. |
| `description_template` | `string` | — | Description template. |
| `params` | `string[][]` | *(required)* | Arrays to cartesian-product. |
| `defaults` | `table` | — | Default values applied to all generated buttons. |

> **Limit:** Generation is capped at **1,000 buttons** to prevent accidental explosion. An error diagnostic is emitted if exceeded.

---

## Variables and Macros

### Variables

Simple key-value string substitution:

```toml
[variables]
service = "api"
port = "3000"

[[groups.main.buttons]]
command = "docker logs {{service}} --port {{port}}"
# resolves to: docker logs api --port 3000
```

### Macros

Macros are like variables but support **recursive expansion** — a macro can reference other macros:

```toml
[macros]
npm = "npm"
npm_run = "{{npm}} run"
dev = "{{npm_run}} dev"

[[groups.main.buttons]]
command = "{{dev}}"
# resolves to: npm run dev
```

**Circular references** are detected and produce an error diagnostic:

```toml
[macros]
a = "{{b}}"
b = "{{a}}"
# ERROR: Circular macro reference detected for 'a'
```

### Template Tokens

Templates use `{{token}}` syntax. Recognized tokens:

| Token | Source | Description |
|-------|--------|-------------|
| `{{base}}` | `group.base` | The group's base command. |
| `{{arg1}}`, `{{arg2}}`, ... | `generate.params` | Cartesian product arguments (1-indexed). |
| `{{variableName}}` | `[variables]` | Document-level variable value. |
| `{{macroName}}` | `[macros]` | Expanded macro value. |

Unknown tokens resolve to an empty string. Whitespace inside braces is trimmed: `{{ base }}` works the same as `{{base}}`.

---

## Includes

Split button definitions across multiple files using `includes`. This is especially useful for monorepos where each package maintains its own `.buttons` file.

```toml
version = 1
title = "Monorepo"
includes = [
  "packages/api/.buttons",
  "packages/web/.buttons",
  "packages/shared/.buttons",
]

[groups.root]
name = "Root"
buttons = [{ id = "install", command = "pnpm install" }]
```

### Path Resolution

Paths are **relative to the file containing the include**. Included files are full `.buttons` files (same format, `version = 1` required).

### Merge Rules

- **Groups**: Included groups are appended after root groups. If group IDs collide, the root file wins (first-seen wins; a warning is emitted for duplicates).
- **Variables and macros**: Root values take precedence on collision; included values fill gaps.
- **Top-level settings**: `title`, `description`, `layout`, `terminal`, `display`, and `defaults` from included files are **ignored** — only their groups, variables, and macros are imported.

### Nested Includes

Included files can themselves have `includes` — paths resolve relative to their own location. **Circular includes** are detected and produce an error diagnostic.

### File Watching

All `.buttons` files in the workspace are watched for changes. When any included file changes, the panel refreshes automatically.

### Example

See [examples/monorepo-includes/](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/monorepo-includes/) for a complete monorepo setup with per-package includes.

---

## Defaults Cascade

**Behavior settings** cascade from document → group → button level. Lower levels override higher levels.

```
Document [defaults]
    └─► Group settings
         └─► Button settings (highest priority)
```

**Display settings** cascade with an additional layer for VS Code settings and per-group overrides:

```
VS Code settings (fallbacks)
    └─► User ~/.buttons [display]
         └─► Project .buttons [display]
              └─► Group [groups.ID.display] (highest priority)
```

Example:

```toml
[defaults]
danger = false          # document default

[groups.ops]
danger = true           # all ops buttons default to dangerous

[[groups.ops.buttons]]
id = "status"
command = "kubectl get pods"
danger = false          # this specific button is safe
```

---

## Danger Detection

Commands are automatically flagged as dangerous if they contain any of these patterns (with surrounding spaces):

- ` rm `
- ` drop `
- ` prune `
- ` reset `
- ` delete `
- ` deploy `

For example, `git reset --hard HEAD` is auto-detected as dangerous. You can override this with `danger = false` on the button or `danger = true` to force-flag safe-looking commands.

When `confirm = true` or `danger = true`, running the button shows a modal confirmation dialog (if the VS Code setting `buttons.confirmDangerousCommands` is enabled).

---

## ID Generation

If a button omits `id`, one is auto-generated:

1. Combine: `{groupId}-{label}`
2. Lowercase
3. Replace non-alphanumeric characters with `-`
4. Strip leading/trailing `-`

Example: group `ops`, label `"Deploy App"` → id `ops-deploy-app`

**IDs must be unique** across all groups after resolution. If duplicates are found, the first wins and subsequent duplicates produce an error diagnostic.

---

## Validation Rules

| Rule | Severity |
|------|----------|
| `version` must be `1` | Error |
| `layout` must be `grid`, `rows`, `columns`, `table`, or `flow` | Error |
| `terminal` must be `current` or `new` | Error |
| At least one group must be defined | Warning |
| Icons must match pattern `[a-z][a-z0-9-]*` | Warning |
| Colors must be `#RGB` or `#RRGGBB` hex | Warning |
| Ports must be integers `1`–`65535` | Error |
| URLs must be valid absolute URLs | Error |
| Macros must not have circular references | Error |
| Cartesian generation must not exceed 1,000 buttons | Error |
| Button IDs must be unique after resolution | Error |
| Buttons must have a `command` or `args` | Warning |

---

## User Profile and Settings Merging

Both the project `.buttons` (workspace root) and user `~/.buttons` (home directory) files use the same format.

**Settings merging** applies to display settings when both files exist:

1. Start with user file's display settings as the base
2. Project file's display settings override any defined fields
3. Undefined project fields fall through from the user file

Button groups are **not** merged — the panel shows one source at a time, switchable via tabs.

---

## Related Pages

- [Getting Started](GETTING-STARTED.md)
- [Layouts](LAYOUTS.md)
- [UI Features](UI-FEATURES.md)
- [User Profile](USER-PROFILE.md)
- [Settings & Commands](SETTINGS.md)
- [Examples](EXAMPLES.md)
- [LLM Instructions](LLM-INSTRUCTIONS.md)
- [Troubleshooting](TROUBLESHOOTING.md)
