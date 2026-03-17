# LLM Instructions for Generating `.buttons` Files

This document is a complete, self-contained reference for LLMs and AI agents to generate `.buttons` configuration files for the Buttons VS Code extension. Reading this single document should provide everything needed to write any `.buttons` file.

---

## 1. What Is a `.buttons` File?

A `.buttons` file is a [TOML](https://toml.io/) configuration file that defines clickable command buttons in VS Code. Place it at a project's workspace root for project-scoped buttons, or at `~/.buttons` for user-scoped buttons available across all projects.

The extension parses the file and renders groups of buttons in a visual panel. Each button card has 5 action buttons: run in current terminal, run in new terminal, copy to terminal (without executing), copy to new terminal (without executing), and copy to clipboard. Buttons can also open related URLs and ports.

---

## 2. File Structure Overview

```toml
version = 1                    # REQUIRED: must be 1
title = "Project Name"         # panel header title
description = "Description"    # subtitle below title
layout = "grid"                # grid | rows | columns | table | flow
terminal = "current"           # current | new

[display]                      # UI display settings
show_command = true
show_labels = true
show_icons = true
compact = false
button_color = "#6B8AFF"       # hex color for button accents
group_bg_color = "#1E2333"     # hex color for group backgrounds
show_run = true                # show/hide each of the 5 action buttons
show_new_terminal = true
show_copy_to_terminal = true
show_copy_to_new_terminal = true
show_copy_to_clipboard = true
run_color = "#48B57A"          # per-action-button colors (hex)
new_terminal_color = "#6B8AFF"
copy_to_terminal_color = "#D4A843"
copy_to_new_terminal_color = "#C77DBA"
copy_to_clipboard_color = "#8B8B8B"

[defaults]                     # behavior defaults (cascade to all buttons)
enabled = true
copy_to_clipboard = true
run_in_current_terminal = true
run_in_new_terminal = false
confirm = false
danger = false
reveal_terminal = true
cwd = "."
# env = { KEY = "value" }

[variables]                    # simple {{key}} string substitution
service = "api"
port = "3000"

[macros]                       # recursive {{key}} expansion
npm_run = "npm run"
dev = "{{npm_run}} dev"

includes = [                   # optional: include other .buttons files
  "packages/api/.buttons",
  "packages/web/.buttons",
]

[groups.GROUP_ID]              # one or more named groups
name = "Group Name"
icon = "rocket"
# ... group config ...

[[groups.GROUP_ID.buttons]]    # static buttons (array of tables)
id = "button-id"
label = "Button Label"
command = "shell command here"
icon = "play"

[groups.GROUP_ID.generate]     # dynamic button generation
mode = "cartesian"
template = "{{npm_run}} {{arg1}}"
params = [["build", "test", "lint"]]

[[groups.GROUP_ID.links]]      # quick links in group header
label = "App"
url = "http://localhost:3000"
icon = "link-external"
```

---

## 3. Complete Field Reference

### 3.1 Document-Level Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `version` | `integer` | **Yes** | — | Must be `1`. |
| `title` | `string` | No | `"Buttons"` | Panel header title. |
| `description` | `string` | No | — | Subtitle below title. |
| `layout` | `string` | No | `"grid"` | Layout mode: `grid`, `rows`, `columns`, `table`, `flow`. |
| `terminal` | `string` | No | `"current"` | Terminal mode: `current`, `new`. |
| `display` | `table` | No | — | Display settings (see 3.2). |
| `defaults` | `table` | No | — | Behavior defaults (see 3.3). |
| `variables` | `table` | No | — | `{{key}}` substitution values. |
| `macros` | `table` | No | — | `{{key}}` recursive expansion values. |
| `includes` | `string[]` | No | — | Relative paths to other `.buttons` files to include (see section 5a). |
| `groups` | `table` | **Yes** | — | Named button groups. Must have at least one. |

### 3.2 Display Fields (`[display]`)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `show_command` | `boolean` | `true` | Show command preview text. |
| `show_labels` | `boolean` | `true` | Show text labels on buttons. |
| `show_icons` | `boolean` | `true` | Show codicon icons. |
| `compact` | `boolean` | `false` | Reduce padding for denser UI. |
| `button_color` | `string` | — | Hex color (`#RGB` or `#RRGGBB`) for button border accent. |
| `group_bg_color` | `string` | — | Hex color for group section background. |
| `show_run` | `boolean` | `true` | Show the Run action button (execute in current terminal). |
| `show_new_terminal` | `boolean` | `true` | Show the New Terminal action button (execute in new terminal). |
| `show_copy_to_terminal` | `boolean` | `true` | Show the Copy to Terminal action button (paste without executing). |
| `show_copy_to_new_terminal` | `boolean` | `true` | Show the Copy to New Terminal action button (paste into new terminal without executing). |
| `show_copy_to_clipboard` | `boolean` | `true` | Show the Copy to Clipboard action button. |
| `run_color` | `string` | — | Hex color for the Run action button. |
| `new_terminal_color` | `string` | — | Hex color for the New Terminal action button. |
| `copy_to_terminal_color` | `string` | — | Hex color for the Copy to Terminal action button. |
| `copy_to_new_terminal_color` | `string` | — | Hex color for the Copy to New Terminal action button. |
| `copy_to_clipboard_color` | `string` | — | Hex color for the Copy to Clipboard action button. |

Display fields can also be set at the group level via `[groups.ID.display]` (see section 3.4a).

### 3.3 Defaults Fields (`[defaults]`)

These cascade: document → group → button. Lower levels override higher.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable. Disabled items are hidden. |
| `copy_to_clipboard` | `boolean` | `true` | Copy command to clipboard on run. |
| `run_in_current_terminal` | `boolean` | `true` | Reuse current terminal. |
| `run_in_new_terminal` | `boolean` | `false` | Create new terminal per run. |
| `confirm` | `boolean` | `false` | Show confirmation dialog before running. |
| `danger` | `boolean` | auto | Flag as dangerous (auto-detected if not set). |
| `reveal_terminal` | `boolean` | `true` | Show terminal after running. |
| `cwd` | `string` | — | Working directory for commands. |
| `env` | `table` | — | Environment variables `{ KEY = "value" }`. |

### 3.4 Group Fields (`[groups.ID]`)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | Title-cased ID | Display name. |
| `description` | `string` | — | Description below name. |
| `enabled` | `boolean` | `true` | Hide group when `false`. |
| `base` | `string` | — | Base command for `args` joining. |
| `icon` | `string` | — | Codicon name (e.g. `rocket`). |
| `color` | `string` | — | Hex color for group icon. |
| `layout` | `string` | Document layout | Override layout for this group. |
| `terminal` | `string` | Document terminal | Override terminal mode. |
| `cwd` | `string` | — | Working directory for group. |
| `env` | `table` | — | Environment variables for group. |
| `delimiter` | `string` | `" "` | Separator for `base` + `args`. |
| `ports` | `integer[]` | — | Clickable port badges in header. |
| `tags` | `string[]` | — | Tags (reserved). |
| `buttons` | `array` | — | Static button array. |
| `generate` | `table` | — | Dynamic generation config. |
| `links` | `array` | — | Quick links in header. |
| `display` | `table` | — | Per-group display overrides (see 3.4a). |

### 3.4a Per-Group Display (`[groups.ID.display]`)

Groups can override document-level display settings with their own display block. All fields from section 3.2 are supported at the group level.

```toml
[groups.dev.display]
compact = true
show_copy_to_terminal = false
run_color = "#48B57A"
```

The full display settings cascade is:

```
VS Code settings (fallbacks)
    → User ~/.buttons [display]
        → Project .buttons [display]
            → Group [groups.ID.display] (highest priority)
```

### 3.5 Button Fields (`[[groups.ID.buttons]]`)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `string` | Auto-slugified | Unique ID. |
| `label` | `string` | From ID/command | Display text. |
| `command` | `string` | — | Shell command (supports `{{templates}}`). |
| `args` | `string[]` | — | Arguments joined with `delimiter` after `base`. |
| `description` | `string` | — | Subtitle text. |
| `icon` | `string` | Group icon | Codicon name. |
| `color` | `string` | Group color | Hex color. |
| `enabled` | `boolean` | `true` | Hide when `false`. |
| `copy_to_clipboard` | `boolean` | `true` | Copy on run. |
| `run_in_current_terminal` | `boolean` | `true` | Use current terminal. |
| `run_in_new_terminal` | `boolean` | `false` | New terminal per run. |
| `confirm` | `boolean` | `false` | Confirmation dialog. |
| `danger` | `boolean` | Auto | Mark dangerous. |
| `reveal_terminal` | `boolean` | `true` | Show terminal. |
| `cwd` | `string` | — | Working directory. |
| `env` | `table` | — | Environment variables. |
| `open_ports` | `integer[]` | — | Ports to offer opening. |
| `open_urls` | `string[]` | — | URLs to offer opening. |

### 3.6 Generate Fields (`[groups.ID.generate]`)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | `string` | `"cartesian"` | Only `cartesian` supported. |
| `template` | `string` | **Required** | Command template with `{{arg1}}`, `{{arg2}}`. |
| `label_template` | `string` | Space-joined args | Label template. |
| `description_template` | `string` | — | Description template. |
| `params` | `string[][]` | **Required** | Arrays for cartesian product. |
| `defaults` | `table` | — | Defaults for generated buttons. |

### 3.7 Link Fields (`[[groups.ID.links]]`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | `string` | Yes | Badge text. |
| `url` | `string` | Yes | Absolute URL. |
| `icon` | `string` | No | Codicon name. |

---

## 4. Template System

Templates use `{{token}}` syntax within `command`, `template`, `label_template`, and `description_template` fields.

### Token Resolution Order

1. `{{base}}` → group's `base` field
2. `{{arg1}}`, `{{arg2}}`, ... → cartesian product arguments (1-indexed, generate blocks only)
3. `{{variableName}}` → value from `[variables]`
4. `{{macroName}}` → expanded value from `[macros]`
5. Unknown tokens → empty string

Whitespace inside braces is trimmed: `{{ base }}` equals `{{base}}`.

### Macro Expansion

Macros expand **recursively** — a macro can reference other macros:

```toml
[macros]
base = "docker"
compose = "{{base}} compose"
up = "{{compose}} up -d"
```

`{{up}}` resolves to `docker compose up -d`.

**Circular references are detected and produce an error.** Do not create cycles:

```toml
# BAD — circular reference
[macros]
a = "{{b}}"
b = "{{a}}"
```

---

## 5. Button Generation (Cartesian Product)

The `generate` block creates buttons from every combination of parameter arrays:

```toml
[groups.matrix.generate]
mode = "cartesian"
template = "deploy {{arg1}} --env {{arg2}}"
label_template = "{{arg1}} ({{arg2}})"
params = [["frontend", "backend"], ["staging", "prod"]]
```

This produces 4 buttons:
- `deploy frontend --env staging`
- `deploy frontend --env prod`
- `deploy backend --env staging`
- `deploy backend --env prod`

**Rules:**
- Maximum **1,000 generated buttons** per group (safety limit)
- `{{arg1}}` is the first params array, `{{arg2}}` is the second, etc.
- Generated buttons can have shared defaults via the `defaults` field
- Generated and static buttons can coexist in the same group

---

## 5a. Includes

Split button definitions across multiple files using `includes`. Useful for monorepos.

```toml
version = 1
title = "Monorepo"
includes = [
  "packages/api/.buttons",
  "packages/web/.buttons",
]

[groups.root]
buttons = [{ id = "install", command = "pnpm install" }]
```

**Rules:**
- Paths are **relative to the file containing the include**
- Included files are standard `.buttons` files (same format, `version = 1` required)
- **Groups merge**: included groups append after root groups; root wins on ID collision
- **Variables and macros merge**: root values win on collision; included values fill gaps
- **Top-level settings ignored**: included file's `title`, `layout`, `display`, `defaults` are discarded
- **Nested includes supported**: included files can themselves have `includes` (relative to their own path)
- **Circular includes detected**: if file A includes B which includes A, an error is emitted
- All `.buttons` files in the workspace are watched — changes to included files trigger auto-refresh

When generating `.buttons` files for monorepos, prefer `includes` over putting everything in one large root file. Each package should define its own groups, macros, and variables.

---

## 6. Defaults Cascade

**Behavior settings** cascade from document level → group level → button level. Each lower level can override fields from above.

```
[defaults]               ← document level (broadest)
  └─ [groups.ID]         ← group level (narrows scope)
      └─ [[...buttons]]  ← button level (most specific, wins)
```

**Display settings** cascade with additional layers for VS Code settings and per-group overrides:

```
VS Code settings (fallbacks)
  └─ User ~/.buttons [display]
      └─ Project .buttons [display]
          └─ Group [groups.ID.display]  ← most specific, wins
```

Example: Set all buttons to non-dangerous at the document level, override for a specific group, then override again for a specific button:

```toml
[defaults]
danger = false

[groups.ops]
danger = true              # all ops buttons are dangerous by default

[[groups.ops.buttons]]
id = "status"
command = "kubectl get pods"
danger = false             # but this one is safe
```

---

## 7. Validation Rules

When generating a `.buttons` file, ensure these rules are met:

| Rule | Severity |
|------|----------|
| `version` must be `1` | Error |
| `layout` must be one of: `grid`, `rows`, `columns`, `table`, `flow` | Error |
| `terminal` must be `current` or `new` | Error |
| At least one group must exist in `[groups]` | Warning |
| Icon names must match `[a-z][a-z0-9-]*` (lowercase, letters/digits/dashes) | Warning |
| Colors must be `#RGB` or `#RRGGBB` hex format | Warning |
| Ports must be integers from `1` to `65535` | Error |
| URLs must be valid absolute URLs | Error |
| No circular macro references | Error |
| Cartesian generation must not exceed 1,000 buttons | Error |
| Button IDs must be unique across all groups | Error |
| Buttons should have either `command` or `args` | Warning |

---

## 8. Layout Modes

| Mode | CSS Behavior | Best For |
|------|-------------|----------|
| `grid` | Responsive auto-fit columns, min 280px | General use, default |
| `rows` | Single column, full width | Small configs, sequential steps |
| `columns` | Fixed 3-column grid | Dashboards, organized categories |
| `table` | One compact row per button (icon, label, command, actions) | Long command lists, service management |
| `flow` | Horizontal flex-wrap, min 180px per card | Quick-action toolbars, icon-focused |

Each group can override the document layout:

```toml
layout = "grid"          # default

[groups.services]
layout = "table"         # compact list for this group

[groups.shortcuts]
layout = "flow"          # small cards for quick actions
```

---

## 9. Danger Detection

Commands are **auto-flagged as dangerous** if they contain these patterns (with surrounding spaces):

- ` rm ` — remove files
- ` drop ` — drop databases/tables
- ` prune ` — prune containers/branches
- ` reset ` — git reset, etc.
- ` delete ` — delete resources
- ` deploy ` — deployment commands

Override with explicit `danger = true` or `danger = false` on any button.

Dangerous buttons show a red "Danger" badge. Combined with `confirm = true`, a modal dialog appears before execution.

---

## 10. ID Generation Rules

If a button omits `id`, one is auto-generated:

1. Combine `{groupId}-{label}`
2. Lowercase everything
3. Replace any non-`[a-z0-9]` character with `-`
4. Strip leading and trailing `-`

IDs must be unique across all groups. If duplicates are found, the **first** wins.

---

## 11. Terminal Mode Resolution

The terminal mode for each button is resolved with this priority:

1. `button.run_in_new_terminal = true` → new terminal
2. `button.run_in_current_terminal = true` → current terminal
3. `group.terminal = "new"` or `defaults.run_in_new_terminal = true` → new terminal
4. Document `terminal` field → fallback
5. Default: `"current"`

**Guideline:** Use `run_in_new_terminal = true` for long-running commands (dev servers, watchers, log followers).

---

## 12. User Profile vs Project File

| Aspect | Project `.buttons` | User `~/.buttons` |
|--------|-------------------|-------------------|
| Location | Workspace root | Home directory |
| Scope | Single project | All projects |
| Version control | Yes (committed) | No (personal) |
| Display settings | Override user | Base layer |
| Shown via | "Project" tab | "User" tab |

When both exist, the panel shows tabs to switch between them. Display settings are merged (project overrides user).

---

## 13. Common Codicon Names

Use these icon names in `icon` fields. Full list at the [VS Code Codicons gallery](https://microsoft.github.io/vscode-codicons/dist/codicon.html).

**Actions:** `play`, `debug-start`, `stop`, `refresh`, `sync`, `add`, `trash`, `save`, `copy`, `discard`

**Development:** `tools`, `package`, `beaker`, `bug`, `gear`, `wand`, `rocket`, `zap`

**Files:** `file-code`, `folder`, `folder-opened`, `file-media`, `file-pdf`, `notebook`

**Source Control:** `git-branch`, `git-pull-request`, `diff`, `compare-changes`, `source-control`, `history`

**Views:** `eye`, `eye-closed`, `search`, `filter`, `list-flat`, `list-tree`, `list-ordered`, `table`

**Communication:** `globe`, `link-external`, `cloud-upload`, `cloud-download`, `radio-tower`, `plug`

**Status:** `verified`, `warning`, `error`, `info`, `check`, `check-all`, `shield`, `lock`, `heart`

**Data:** `database`, `graph`, `pie-chart`, `dashboard`, `output`, `terminal`, `server`, `layers`

**UI:** `chevron-down`, `chevron-right`, `arrow-up`, `arrow-down`, `arrow-swap`, `flame`, `sparkle`

---

## 14. Best Practices

### Use macros for tool prefixes

```toml
[macros]
npm_run = "npm run"
docker = "docker compose"

[[groups.dev.buttons]]
command = "{{npm_run}} dev"
```

### Use variables for project-specific values

```toml
[variables]
service = "api"
port = "3000"
env = "staging"
```

### Use generate for repetitive commands

```toml
[groups.scripts.generate]
template = "npm run {{arg1}}"
label_template = "{{arg1}}"
params = [["build", "test", "lint", "format", "typecheck"]]
```

### Use links for development URLs

```toml
[[groups.dev.links]]
label = "App"
url = "http://localhost:3000"
icon = "globe"

[[groups.dev.links]]
label = "API Docs"
url = "http://localhost:4000/docs"
icon = "book"
```

### Mark destructive commands

```toml
[[groups.danger.buttons]]
id = "reset-db"
label = "Reset Database"
command = "npx prisma migrate reset"
icon = "trash"
danger = true
confirm = true
```

### Use `run_in_new_terminal` for long-running processes

```toml
[[groups.dev.buttons]]
id = "dev-server"
label = "Dev Server"
command = "npm run dev"
icon = "play"
run_in_new_terminal = true
open_ports = [3000]
```

### Group related commands logically

Organize by workflow stage (setup → develop → test → deploy) or by service (frontend, backend, database, infrastructure).

### Choose the right layout

- Small config (< 10 buttons): `rows`
- Medium config with mixed groups: `grid` (default)
- Dashboard with categories: `columns`
- Long list of similar commands: `table`
- Quick shortcuts: `flow` with `compact = true` and `show_command = false`

---

## 15. Anti-Patterns and Common Mistakes

### Wrong: Missing version

```toml
# BAD — will fail validation
title = "My Project"
[groups.main]
buttons = [{ command = "echo hi" }]
```

```toml
# GOOD
version = 1
title = "My Project"
[groups.main]
buttons = [{ command = "echo hi" }]
```

### Wrong: Invalid layout value

```toml
layout = "horizontal"   # BAD — not a valid layout
layout = "grid"          # GOOD
```

### Wrong: Color without hash

```toml
color = "FF0000"    # BAD — must start with #
color = "#FF0000"   # GOOD
```

### Wrong: Relative URLs

```toml
open_urls = ["/dashboard"]           # BAD — must be absolute
open_urls = ["http://localhost:3000/dashboard"]  # GOOD
```

### Wrong: Circular macros

```toml
[macros]
a = "{{b}} run"
b = "{{a}} exec"   # BAD — circular reference
```

### Wrong: Port as string

```toml
open_ports = ["3000"]   # BAD — must be integers
open_ports = [3000]     # GOOD
```

### Wrong: Buttons without command or args

```toml
[[groups.main.buttons]]
id = "empty"
label = "Does Nothing"
# BAD — no command or args specified
```

### Wrong: Duplicate button IDs

```toml
[[groups.a.buttons]]
id = "test"
command = "npm test"

[[groups.b.buttons]]
id = "test"              # BAD — duplicate ID across groups
command = "cargo test"
```

---

## 16. Complete Annotated Example

This example demonstrates every feature:

```toml
# === REQUIRED ===
version = 1

# === DOCUMENT METADATA ===
title = "Full-Stack App"
description = "All development commands in one place"
layout = "grid"           # grid | rows | columns | table | flow
terminal = "current"      # current | new

# === DISPLAY SETTINGS ===
[display]
show_command = true       # show resolved command below label
show_labels = true        # show text labels
show_icons = true         # show codicon icons
compact = false           # tighter spacing when true
button_color = "#6B8AFF"  # default accent color for button borders
group_bg_color = "#1A1D2E" # background color for group sections

# Action button visibility (all default to true)
show_run = true
show_new_terminal = true
show_copy_to_terminal = true
show_copy_to_new_terminal = true
show_copy_to_clipboard = true

# Action button colors (hex, all optional)
run_color = "#48B57A"
new_terminal_color = "#6B8AFF"
copy_to_terminal_color = "#D4A843"
copy_to_new_terminal_color = "#C77DBA"
copy_to_clipboard_color = "#8B8B8B"

# === BEHAVIOR DEFAULTS (cascade: document → group → button) ===
[defaults]
enabled = true
copy_to_clipboard = true
run_in_current_terminal = true
run_in_new_terminal = false
confirm = false
danger = false
reveal_terminal = true

# === VARIABLES (simple string substitution) ===
[variables]
app_port = "3000"
api_port = "4000"
db_name = "myapp_dev"

# === MACROS (recursive expansion) ===
[macros]
npm = "npm"
npm_run = "{{npm}} run"
docker = "docker compose"

# === GROUP: Development Server ===
[groups.dev]
name = "Development"
description = "Start the frontend and backend"
icon = "rocket"
color = "#0070F3"
ports = [3000, 4000]

# Static button with explicit command
[[groups.dev.buttons]]
id = "frontend"
label = "Frontend"
command = "{{npm_run}} dev"
description = "Starts Next.js on port {{app_port}}"
icon = "play"
run_in_new_terminal = true
open_ports = [3000]

# Static button with args + base
[[groups.dev.buttons]]
id = "api"
label = "API Server"
command = "{{npm_run}} api:dev"
icon = "server"
run_in_new_terminal = true
open_ports = [4000]

# Quick links in group header
[[groups.dev.links]]
label = "App"
url = "http://localhost:3000"
icon = "globe"

[[groups.dev.links]]
label = "API Docs"
url = "http://localhost:4000/docs"
icon = "book"

# === GROUP: Quality (with generated buttons) ===
[groups.quality]
name = "Quality"
description = "Lint, test, and type-check"
icon = "checklist"
color = "#48B57A"

# Generated buttons via cartesian product
[groups.quality.generate]
mode = "cartesian"
template = "{{npm_run}} {{arg1}}"
label_template = "{{arg1}}"
params = [["lint", "test", "typecheck", "format"]]
# Produces 4 buttons: lint, test, typecheck, format

# === GROUP: Database ===
[groups.database]
name = "Database"
icon = "database"
color = "#336791"

[[groups.database.buttons]]
id = "migrate"
label = "Migrate"
command = "npx prisma migrate dev"
icon = "arrow-swap"

[[groups.database.buttons]]
id = "seed"
label = "Seed"
command = "npx prisma db seed"
icon = "sparkle"

[[groups.database.buttons]]
id = "studio"
label = "Prisma Studio"
command = "npx prisma studio"
icon = "browser"
run_in_new_terminal = true
open_ports = [5555]

[[groups.database.buttons]]
id = "reset"
label = "Reset DB"
command = "npx prisma migrate reset"
icon = "trash"
danger = true         # shows danger badge
confirm = true        # requires confirmation dialog

# === GROUP: Docker ===
[groups.docker]
name = "Docker"
icon = "server"
color = "#2496ED"

[[groups.docker.buttons]]
id = "up"
label = "Up"
command = "{{docker}} up -d"
icon = "play"

[[groups.docker.buttons]]
id = "down"
label = "Down"
command = "{{docker}} down"
icon = "stop"

[[groups.docker.buttons]]
id = "logs"
label = "Logs"
command = "{{docker}} logs -f"
icon = "output"
run_in_new_terminal = true

[[groups.docker.buttons]]
id = "prune"
label = "System Prune"
command = "docker system prune -f"
icon = "trash"
danger = true
confirm = true

# === GROUP: Deploy (disabled by default) ===
[groups.deploy]
name = "Deploy"
icon = "cloud-upload"
color = "#FF6B35"
enabled = true           # set to false to hide this group entirely

[[groups.deploy.buttons]]
id = "deploy-staging"
label = "Deploy Staging"
command = "{{npm_run}} deploy:staging"
icon = "cloud-upload"
confirm = true

[[groups.deploy.buttons]]
id = "deploy-prod"
label = "Deploy Production"
command = "{{npm_run}} deploy:production"
icon = "rocket"
danger = true
confirm = true
```

---

## 17. Targeted Examples

### Minimal (3 buttons, no extras)

```toml
version = 1
title = "Quick Commands"

[groups.run]
buttons = [
  { id = "build", command = "npm run build" },
  { id = "test", command = "npm test" },
  { id = "start", command = "npm start" },
]
```

### Table Layout for Services

```toml
version = 1
title = "Services"
layout = "table"

[display]
compact = true

[groups.services]
name = "Services"
icon = "server"

[[groups.services.buttons]]
id = "nginx-start"
label = "Start Nginx"
command = "sudo systemctl start nginx"
icon = "play"

[[groups.services.buttons]]
id = "nginx-stop"
label = "Stop Nginx"
command = "sudo systemctl stop nginx"
icon = "stop"

[[groups.services.buttons]]
id = "nginx-status"
label = "Status Nginx"
command = "sudo systemctl status nginx"
icon = "info"
```

### Flow Layout Quick Actions

```toml
version = 1
title = "Quick Actions"
layout = "flow"

[display]
show_command = false
compact = true

[groups.git]
name = "Git"
icon = "git-branch"

[[groups.git.buttons]]
id = "status"
label = "Status"
command = "git status -sb"
icon = "diff"

[[groups.git.buttons]]
id = "push"
label = "Push"
command = "git push"
icon = "cloud-upload"

[[groups.git.buttons]]
id = "pull"
label = "Pull"
command = "git pull --rebase"
icon = "cloud-download"

[[groups.git.buttons]]
id = "log"
label = "Log"
command = "git log --oneline -15"
icon = "history"
```

### Multi-Dimensional Generation

```toml
version = 1
title = "Deployment Matrix"

[groups.deploy]
name = "Deploy"
icon = "rocket"

[groups.deploy.generate]
mode = "cartesian"
template = "deploy-tool {{arg1}} --env {{arg2}} --region {{arg3}}"
label_template = "{{arg1}} → {{arg2}} ({{arg3}})"
description_template = "Deploy {{arg1}} to {{arg2}} in {{arg3}}"
params = [
  ["frontend", "backend"],
  ["staging", "production"],
  ["us-east-1", "eu-west-1"]
]
# Produces 2×2×2 = 8 buttons

[groups.deploy.generate.defaults]
confirm = true
danger = true
```

### User Profile (Personal Buttons)

```toml
version = 1
title = "My Tools"
layout = "flow"

[display]
show_command = false
compact = true

[groups.git]
name = "Git"
icon = "git-branch"

[[groups.git.buttons]]
id = "gs"
label = "Status"
command = "git status -sb"
icon = "diff"

[[groups.git.buttons]]
id = "gp"
label = "Push"
command = "git push"
icon = "cloud-upload"

[[groups.git.buttons]]
id = "gl"
label = "Pull"
command = "git pull --rebase"
icon = "cloud-download"

[groups.system]
name = "System"
icon = "terminal"

[[groups.system.buttons]]
id = "ip"
label = "My IP"
command = "curl -s ifconfig.me && echo"
icon = "globe"

[[groups.system.buttons]]
id = "ports"
label = "Listening Ports"
command = "ss -tulpn"
icon = "plug"
```

---

## 18. Generation Instructions for LLMs

When asked to generate a `.buttons` file:

1. **Always start with `version = 1`.**
2. **Set a descriptive `title`** that reflects the project or toolset.
3. **Choose the right layout** for the number and type of buttons.
4. **Group buttons logically** by workflow stage or service.
5. **Use macros** for repeated tool prefixes (e.g., `npm_run`, `docker`, `kubectl`).
6. **Use variables** for project-specific values that appear in multiple commands.
7. **Use `generate`** for repetitive commands with parameter variations.
8. **Add `run_in_new_terminal = true`** on long-running commands (servers, watchers, log followers).
9. **Add `danger = true` and `confirm = true`** on destructive commands.
10. **Add `open_ports`** on buttons that start servers, and **`ports`** on their groups.
11. **Add `links`** for development URLs (localhost apps, API docs, dashboards).
12. **Set icons** on every group and button using VS Code codicon names.
13. **Give every button an `id`** for clarity (auto-generation works but explicit is better).
14. **Validate** that all colors are hex, ports are integers 1-65535, URLs are absolute, and no macro cycles exist.
15. **Keep it DRY** — use macros and defaults cascade instead of repeating values.

---

## 19. Quick Reference Card

```
File:       .buttons (workspace root) or ~/.buttons (home directory)
Format:     TOML
Required:   version = 1, at least one group with buttons
Layouts:    grid | rows | columns | table | flow
Terminals:  current | new
Actions:    run | new-terminal | copy-to-terminal | copy-to-new-terminal | copy-to-clipboard
Templates:  {{base}}, {{arg1}}, {{variableName}}, {{macroName}}
Colors:     #RGB or #RRGGBB
Icons:      VS Code codicons (lowercase, letters/digits/dashes)
Ports:      integers 1-65535
URLs:       absolute (http://... or https://...)
Max gen:    1000 buttons per generate block
Danger:     auto-detected for rm, drop, prune, reset, delete, deploy
Cascade:    document [defaults] → group → button (behavior)
Display:    VS Code settings → user [display] → project [display] → group [display]
Includes:   relative paths to other .buttons files; groups/vars/macros merge, root wins
Merging:    project display settings override user display settings
```
