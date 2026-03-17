# `.buttons` File Reference

Buttons uses a single TOML file named `.buttons` at the root of the workspace.

## Supported Top-Level Keys

- `version`
- `title`
- `description`
- `layout`
- `shell`
- `terminal`
- `display`
- `defaults`
- `variables`
- `macros`
- `groups`

## Minimal File

```toml
version = 1
title = "Project Commands"
layout = "grid"

[groups.main]
name = "Main"

[[groups.main.buttons]]
label = "Dev"
command = "npm run dev"
```

## Full Example

```toml
version = 1
title = "Example Project"
description = "Shared commands for local development"
layout = "grid"
shell = "auto"
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

## Display Block

```toml
[display]
show_command = true
show_labels = true
show_icons = true
compact = false
```

- `show_command` controls the command preview.
- `show_labels` controls button labels.
- `show_icons` controls icon display.
- `compact` is reserved for a denser layout mode.

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

These values cascade from document to group to button.

## Groups

Groups are declared as `[groups.<name>]`.

### Common Group Keys

- `name`
- `description`
- `enabled`
- `base`
- `icon`
- `color`
- `layout`
- `terminal`
- `cwd`
- `env`
- `delimiter`
- `ports`
- `tags`
- `buttons`
- `generate`
- `links`

## Static Buttons

Static buttons are declared as `[[groups.<name>.buttons]]`.

### Common Button Keys

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
- `danger`
- `reveal_terminal`
- `cwd`
- `env`
- `open_ports`
- `open_urls`

## Generated Buttons

Generated buttons live under `[groups.<name>.generate]`.

```toml
[groups.scripts.generate]
mode = "cartesian"
template = "npm run {{arg1}}"
label_template = "{{arg1}}"
params = [["build", "test", "lint"]]
```

Buttons expands the cartesian product of `params` into a flat list of buttons.

## Variables And Macros

Variables and macros are simple string substitutions.

```toml
[variables]
service = "api"

[macros]
docker_logs = "docker compose logs -f"
```

They can be used inside commands and templates.

```toml
command = "{{docker_logs}} {{service}}"
```

## Validation Rules

- `version` must be `1`
- `layout` must be `grid` or `rows`
- `terminal` must be `current` or `new`
- ports must be integers between `1` and `65535`
- colors must be valid hex values
- URLs must be absolute URLs
- button ids must be unique after resolution
- circular macros are rejected

## Scope Limits In v1

- one `.buttons` file at workspace root
- no nested groups
- no platform-specific command branches
- no arbitrary scripting or conditionals
- no personal per-user config file

## Related Pages

- [GETTING-STARTED.md](GETTING-STARTED.md)
- [EXAMPLES.md](EXAMPLES.md)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)