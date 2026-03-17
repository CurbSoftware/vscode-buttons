# `.buttons` File Reference

This document describes the TOML format used by **Buttons**.

The `.buttons` file is stored at the project root and defines the command groups and buttons rendered by the extension.

## Overview

A `.buttons` file contains:

- top-level document settings
- display options
- default button behavior
- command groups
- static button definitions
- optional generated button definitions

## Minimal example

```toml
version = 1
title = "Project Commands"
layout = "grid"

[groups.main]
name = "Main"

[[groups.main.buttons]]
label = "Dev"
command = "pnpm run dev"
```

## Full example

```toml
version = 1
title = "Project Commands"
description = "Shared commands for local development"
layout = "grid"
shell = "auto"
terminal = "current"
delimiter = " "

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
reveal_terminal = true

[groups.pnpm]
name = "PNPM"
description = "Package manager commands"
enabled = true
base = "pnpm"
icon = "package"
color = "#F54927"
layout = "grid"
terminal = "current"
ports = [3000, 6006]
tags = ["frontend", "dev"]

[[groups.pnpm.buttons]]
id = "dev"
label = "Dev"
command = "pnpm run dev"
description = "Start development server"
icon = "play"
open_ports = [3000]

[[groups.pnpm.buttons]]
id = "build"
label = "Build"
command = "pnpm run build"
icon = "package"

[groups.pnpm.generate]
mode = "cartesian"
template = "{{base}} {{arg1}} {{arg2}}"
label_template = "{{arg2}}"
params = [
  ["run"],
  ["lint", "typecheck", "test"]
]

[[groups.pnpm.links]]
label = "App"
url = "http://localhost:3000"

[[groups.pnpm.links]]
label = "Storybook"
url = "http://localhost:6006"
```

## Top-level keys

### `version`
Required integer version of the `.buttons` schema.

```toml
version = 1
```

### `title`
Optional title shown in the Buttons UI.

```toml
title = "Project Commands"
```

### `description`
Optional document description.

```toml
description = "Shared commands for local development"
```

### `layout`
Optional UI layout mode.

Allowed values:

- `"grid"`
- `"rows"`

```toml
layout = "grid"
```

### `shell`
Optional shell hint.

Allowed values:

- `"auto"`
- `"bash"`
- `"sh"`
- `"zsh"`
- `"pwsh"`
- `"cmd"`

```toml
shell = "auto"
```

### `terminal`
Default terminal behavior.

Allowed values:

- `"current"`
- `"new"`

```toml
terminal = "current"
```

### `delimiter`
Optional delimiter used by generated commands if relevant.

```toml
delimiter = " && "
```

## `[display]`

Controls UI rendering defaults.

### Keys

- `show_command` — show resolved command preview
- `show_labels` — show button labels
- `show_icons` — show icons
- `compact` — compact layout mode

Example:

```toml
[display]
show_command = true
show_labels = true
show_icons = true
compact = false
```

## `[defaults]`

Default button behavior inherited by groups and buttons unless overridden.

### Keys

- `enabled`
- `copy_to_clipboard`
- `run_in_current_terminal`
- `run_in_new_terminal`
- `confirm`
- `reveal_terminal`

Example:

```toml
[defaults]
enabled = true
copy_to_clipboard = true
run_in_current_terminal = true
run_in_new_terminal = false
confirm = false
reveal_terminal = true
```

## Groups

Groups are defined under `[groups.<name>]`.

Example:

```toml
[groups.pnpm]
name = "PNPM"
icon = "package"
color = "#F54927"
```

### Group keys

- `name` — display name
- `description` — optional description
- `enabled` — whether group is visible
- `base` — base command used by generated templates
- `icon` — icon identifier
- `color` — optional hex color
- `layout` — optional group layout override
- `terminal` — optional terminal default override
- `delimiter` — optional delimiter override
- `ports` — related local ports
- `tags` — optional tags

## Static buttons

Static buttons are defined with `[[groups.<name>.buttons]]`.

Example:

```toml
[[groups.pnpm.buttons]]
id = "dev"
label = "Dev"
command = "pnpm run dev"
icon = "play"
```

### Button keys

- `id`
- `label`
- `command`
- `args`
- `description`
- `icon`
- `color`
- `enabled`
- `copy_to_clipboard`
- `run_in_current_terminal`
- `run_in_new_terminal`
- `confirm`
- `reveal_terminal`
- `cwd`
- `env`
- `open_ports`
- `open_urls`

## Generated buttons

Generated buttons are useful when multiple commands follow the same pattern.

Example:

```toml
[groups.pnpm.generate]
mode = "cartesian"
template = "{{base}} {{arg1}} {{arg2}}"
label_template = "{{arg2}}"
params = [
  ["run"],
  ["dev", "build", "test"]
]
```

This produces:

- `pnpm run dev`
- `pnpm run build`
- `pnpm run test`

### Generate keys

- `mode` — generation mode, initially `"cartesian"`
- `template` — command template
- `label_template` — optional label template
- `params` — array of string arrays

## Links

Links can be attached to groups for quick access to local apps or external URLs.

Example:

```toml
[[groups.pnpm.links]]
label = "App"
url = "http://localhost:3000"
```

## Inheritance model

Buttons resolves configuration in this order:

1. top-level defaults
2. group-level overrides
3. button-level overrides

Button-level values always win.

## Validation rules

Recommended validation behavior:

- valid TOML is required
- `version` is required
- `layout` must be a known value
- `terminal` must be a known value
- group names must be unique
- button IDs should be unique
- colors should be valid hex values
- ports must be valid integers between `1` and `65535`
- URLs should be valid absolute URLs

## Best practices

### Keep commands explicit
Use static buttons for important, frequently used workflows.

### Use generated buttons for repetitive command matrices
Good example:

```toml
[groups.test.generate]
mode = "cartesian"
template = "pnpm run test:{{arg1}}"
label_template = "{{arg1}}"
params = [
  ["unit", "integration", "e2e"]
]
```

### Group by workflow, not by implementation detail
Prefer groups like:

- `pnpm`
- `docker`
- `database`
- `tests`
- `devops`

instead of over-segmenting too early.

### Use confirmation for dangerous actions
For destructive commands, set:

```toml
confirm = true
```

## Example patterns

### Docker group

```toml
[groups.docker]
name = "Docker"
icon = "server"

[[groups.docker.buttons]]
label = "Up"
command = "docker compose up -d"

[[groups.docker.buttons]]
label = "Down"
command = "docker compose down"

[[groups.docker.buttons]]
label = "Logs"
command = "docker compose logs -f"
run_in_new_terminal = true
```

### Database group

```toml
[groups.database]
name = "Database"
icon = "database"

[[groups.database.buttons]]
label = "Migrate"
command = "pnpm db:migrate"

[[groups.database.buttons]]
label = "Seed"
command = "pnpm db:seed"

[[groups.database.buttons]]
label = "Reset"
command = "pnpm db:reset"
confirm = true
```

### Monorepo workspace commands

```toml
[groups.web]
name = "Web"

[[groups.web.buttons]]
label = "Web Dev"
command = "pnpm --filter web dev"

[groups.api]
name = "API"

[[groups.api.buttons]]
label = "API Dev"
command = "pnpm --filter api dev"
```

## Notes on portability

Buttons sends commands to the VS Code terminal. Shell syntax behavior may vary across operating systems and shells.

For best portability:

- prefer simple command strings where possible
- avoid shell-specific syntax unless your team standardizes on a shell
- document platform-specific differences if needed

## Suggested file layout in your repo

```text
.buttons
docs/
  buttons-file.md
```

## Summary

The `.buttons` file is intended to be a declarative, team-friendly command catalog for your project. Keep it readable, version-controlled, and focused on practical workflows.
