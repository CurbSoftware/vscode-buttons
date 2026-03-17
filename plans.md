Below is a full product and implementation plan for **Buttons**, centered on the `.buttons` configuration format, editor UX, execution model, and phased delivery.

I do have a few clarifying questions at the end, but they are not blockers for drafting a strong initial architecture. I will make reasonable defaults now so you can move forward immediately.

---

# Buttons — VS Code Extension Plan

## 1. Product Definition

**Buttons** is a VS Code extension that provides:

1. A **custom editor tab / panel** for project-defined command buttons.
2. A project-root configuration file named **`.buttons`** using **TOML**.
3. Buttons that can:

   * copy a command to clipboard
   * run in the current terminal
   * run in a new terminal
   * optionally open links or ports
   * display command previews, labels, icons, groups, and layouts

The extension’s core value is turning repetitive project commands into a fast, visual, sharable operational layer stored inside the repository.

---

# 2. Product Goals

## Primary goals

* Make common project commands fast and discoverable.
* Keep configuration **portable**, **human-readable**, and **repo-shareable**.
* Support both simple and advanced command generation.
* Minimize ambiguity and unsafe execution surprises.
* Feel native to VS Code workflows.

## Secondary goals

* Support workspace-level and multi-root workspaces.
* Support per-button metadata like icons, colors, terminals, ports, descriptions.
* Provide validation and IntelliSense-like guidance where possible.
* Support future extensibility without breaking `.buttons` files.

## Non-goals for v1

* Full task runner replacement
* Full shell abstraction across every OS edge case
* Remote execution / SSH orchestration
* Complex secret management
* Arbitrary templating engines
* Background daemon/process supervisor

---

# 3. Core User Stories

## Basic

* As a developer, I want a `.buttons` file in project root so my team shares a standard set of commands.
* As a developer, I want one click to run `pnpm dev` in a terminal.
* As a developer, I want one click to copy the exact command instead of running it.

## Intermediate

* As a developer, I want groups like “PNPM”, “Docker”, “Database”, “Tests”.
* As a developer, I want buttons auto-generated from parameter combinations.
* As a developer, I want to choose new terminal vs current terminal per button/group/default.

## Advanced

* As a developer, I want ports linked to buttons so local services can be opened after run.
* As a developer, I want labels/icons/colors to improve usability.
* As a developer, I want workspace overrides and extension settings defaults.

---

# 4. UX Model

## Main surfaces

### A. Buttons editor tab

A custom readonly visual editor rendered from `.buttons`.

Recommended layout:

* header: title, description, file path, reload button
* group sections/cards
* buttons inside groups
* per-button actions:

  * Run in current terminal
  * Run in new terminal
  * Copy
  * Optional “Open URL / Port”
  * Optional quick preview / details

### B. Explorer / file integration

* Recognize `.buttons` file
* Open with Buttons custom editor or webview
* Fallback to normal text editor for manual editing

### C. Command palette

Commands such as:

* `Buttons: Open Project Buttons`
* `Buttons: Reload Buttons Config`
* `Buttons: Run Button`
* `Buttons: Copy Button Command`
* `Buttons: Open Buttons File`
* `Buttons: Create Example .buttons`

### D. Status / notifications

* parse errors
* invalid schema
* command execution warnings
* missing workspace root
* invalid ports / URLs

---

# 5. Architecture Overview

## Recommended extension architecture

### Extension host

Responsible for:

* locating `.buttons`
* watching file changes
* parsing TOML
* validating schema
* resolving command definitions into executable button models
* terminal execution
* clipboard actions
* command registration
* workspace awareness

### Webview / custom editor

Responsible for:

* rendering groups and buttons
* sending button-click actions back to extension host
* displaying validation errors and config info
* optional search/filter UI later

### Core modules

Suggested module structure:

```text
src/
  extension.ts
  commands/
    openButtons.ts
    reloadButtons.ts
    runButton.ts
    copyButton.ts
  config/
    findButtonsFile.ts
    parseButtonsToml.ts
    validateButtonsConfig.ts
    normalizeButtonsConfig.ts
    resolveButtons.ts
    schema.ts
    defaults.ts
  execution/
    terminalManager.ts
    commandBuilder.ts
    clipboard.ts
    portOpener.ts
    shell.ts
  editor/
    ButtonsEditorProvider.ts
    webview/
      index.ts
      uiModel.ts
      events.ts
  models/
    types.ts
  utils/
    logger.ts
    workspace.ts
    errors.ts
```

---

# 6. Configuration Strategy

Your biggest design decision is the `.buttons` file format.

The current sample has the right idea, but it needs to be made stricter and more consistent.

## Problems in the draft sample

Your example currently has several schema issues:

* `layout = grid` should be a quoted TOML string: `"grid"`
* some comments and array syntax are malformed
* `new_terminal = [ true, #F54927], ] true` is not valid TOML or a clear type
* behavior flags are mixed into parameter generation config
* `show_` is incomplete
* `[pnpm.params]` is trying to do too much: generation, rendering, and execution settings all in one place

## Recommendation

Separate configuration into **3 levels**:

1. **document-level defaults**
2. **group-level defaults**
3. **button definitions or button-generation rules**

This gives a clean inheritance model.

---

# 7. Recommended `.buttons` TOML Schema

## Top-level structure

```toml
version = 1
title = "Buttons Example File"
description = "Shared project commands"
layout = "grid" # "grid" | "rows"
shell = "auto"  # "auto" | "bash" | "sh" | "zsh" | "pwsh" | "cmd"
terminal = "current" # default terminal behavior
delimiter = " && "

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
```

## Group structure

```toml
[groups.pnpm]
name = "PNPM Commands"
description = "Package manager workflows"
enabled = true
base = "pnpm"
icon = "package"
color = "#F54927"
layout = "grid"
terminal = "current"
delimiter = " "
ports = [3000, 6006]
tags = ["frontend", "dev"]
```

## Static buttons

```toml
[[groups.pnpm.buttons]]
id = "dev"
label = "Dev"
command = "pnpm run dev"
description = "Start development server"
icon = "play"
copy_to_clipboard = true
run_in_current_terminal = true
run_in_new_terminal = false
open_ports = [3000]

[[groups.pnpm.buttons]]
id = "build"
label = "Build"
command = "pnpm run build"
icon = "package"
```

## Generated buttons from params

```toml
[groups.pnpm.generate]
mode = "cartesian"
template = "{{base}} {{arg1}} {{arg2}}"
label_template = "{{arg2 | upper}}"
params = [
  ["run"],
  ["dev", "build", "test"]
]
```

This would produce:

* `pnpm run dev`
* `pnpm run build`
* `pnpm run test`

## Group actions / quick URLs

```toml
[[groups.pnpm.links]]
label = "App"
url = "http://localhost:3000"

[[groups.pnpm.links]]
label = "Storybook"
url = "http://localhost:6006"
```

---

# 8. Stronger v1 Schema Recommendation

For v1, keep the schema intentionally narrow.

## Top-level keys

* `version`
* `title`
* `description`
* `layout`
* `shell`
* `terminal`
* `delimiter`
* `display`
* `defaults`
* `groups`

## Group keys

* `name`
* `description`
* `enabled`
* `base`
* `icon`
* `color`
* `layout`
* `terminal`
* `delimiter`
* `ports`
* `tags`
* `buttons`
* `generate`
* `links`

## Button keys

* `id`
* `label`
* `command`
* `args`
* `description`
* `icon`
* `color`
* `enabled`
* `copy_to_clipboard`
* `run_in_current_terminal`
* `run_in_new_terminal`
* `confirm`
* `reveal_terminal`
* `cwd`
* `env`
* `open_ports`
* `open_urls`

## Generate keys

* `mode`
* `template`
* `label_template`
* `params`

---

# 9. Recommended Inheritance Rules

Configuration should resolve in this order:

1. top-level defaults
2. group defaults
3. button-specific overrides

Example:

* top-level `terminal = "current"`
* group `terminal = "new"`
* button `run_in_current_terminal = true`

Button-level always wins.

---

# 10. Command Generation Model

Buttons can be created in two ways:

## A. Static buttons

Best for explicit, important commands.

```toml
[[groups.docker.buttons]]
label = "Compose Up"
command = "docker compose up -d"
```

## B. Generated buttons

Best for matrix-like command families.

```toml
[groups.pnpm.generate]
mode = "cartesian"
template = "{{base}} {{arg1}} {{arg2}}"
params = [
  ["run"],
  ["dev", "build", "test"]
]
```

## Generation rules

### `mode = "cartesian"`

Creates all combinations of `params`.

### `mode = "zip"`

Matches items by position instead of all combinations.

Example:

```toml
params = [
  ["dev", "build"],
  ["3000", "3001"]
]
```

Produces:

* dev + 3000
* build + 3001

For v1, `cartesian` is enough. `zip` can be v2.

---

# 11. Proposed Example `.buttons` File

This is a cleaner version of your concept.

```toml
version = 1
title = "Buttons Example File"
description = "Shared commands for this project"
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
name = "PNPM Commands"
enabled = true
base = "pnpm"
icon = "package"
color = "#F54927"
ports = [3000, 6006]

[[groups.pnpm.buttons]]
id = "install"
label = "Install"
command = "pnpm install"
icon = "arrow-down"

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

[groups.pnpm.generate]
mode = "cartesian"
template = "{{base}} {{arg1}} {{arg2}}"
label_template = "{{arg2}}"
params = [
  ["run"],
  ["lint", "typecheck"]
]

[[groups.pnpm.links]]
label = "App"
url = "http://localhost:3000"

[[groups.pnpm.links]]
label = "Storybook"
url = "http://localhost:6006"

[groups.docker]
name = "Docker"
enabled = true
icon = "server"
color = "#0EA5E9"

[[groups.docker.buttons]]
id = "up"
label = "Up"
command = "docker compose up -d"

[[groups.docker.buttons]]
id = "down"
label = "Down"
command = "docker compose down"

[[groups.docker.buttons]]
id = "logs"
label = "Logs"
command = "docker compose logs -f"
run_in_new_terminal = true
```

---

# 12. Validation Rules

You should validate `.buttons` aggressively and return clear errors.

## TOML parse validation

* valid TOML only
* line/column surfaced in errors when possible

## Schema validation

* required `version`
* `layout` must be `"grid"` or `"rows"`
* `terminal` must be known enum
* group names must be unique
* button `id` must be unique within group, ideally globally unique after normalization
* button must define either `command` or a generated command
* `open_ports` values must be valid integers 1–65535
* `color` must be valid hex if present
* `url` must be valid absolute URL if present

## Normalization rules

* if `label` omitted, derive from `id` or command
* if `id` omitted for static button, auto-slug from label
* if `enabled` omitted, inherit default true
* empty groups should still render if they have links, otherwise optionally hide

---

# 13. Execution Model

## Terminal modes

### Current terminal

* reuse a chosen active terminal if possible
* if none exists, create one
* send text
* optionally reveal terminal

### New terminal

* create terminal with button/group-derived name
* optionally set cwd
* send command
* reveal

## Clipboard

* copy exact resolved command string
* optional toast notification

## Future safety option

Per button or global:

* `confirm = true`

Useful for destructive commands:

* database resets
* docker prune
* production deploy

---

# 14. Cross-Platform Shell Considerations

This is important.

Commands like `pnpm run dev` are fine cross-platform.
Commands using:

* `&&`
* env var inline assignment
* bash syntax
* pipes
* subshells

can vary across shells.

## Recommendation

For v1:

* treat commands as shell strings
* send directly to VS Code terminal
* do not try to deeply parse shell syntax
* expose a top-level `shell = "auto"` setting only for future terminal/syntax hints
* document that command portability depends on project shell conventions

## Later

Support platform-specific command fields:

```toml
command = "pnpm run dev"
command_windows = "pnpm run dev"
command_unix = "pnpm run dev"
```

Not necessary for first release unless you expect heavy Windows use.

---

# 15. Editor UI Plan

## Initial UI structure

### Header

* title
* description
* config path
* reload action
* open raw file action

### Group card

* group title
* description
* icon
* button count
* optional links / ports

### Button card

* icon
* label
* command preview
* actions:

  * Run
  * New Terminal
  * Copy
  * More

### Error panel

If config invalid:

* show parse/schema errors
* link user to raw `.buttons` file
* keep UX graceful instead of blank screen

## Layout modes

### `grid`

* button cards in responsive grid

### `rows`

* list-like compact display

---

# 16. VS Code Settings Plan

In addition to `.buttons`, add extension settings for defaults.

Suggested settings:

* `buttons.autoOpenOnButtonsFile`
* `buttons.defaultLayout`
* `buttons.defaultTerminalMode`
* `buttons.showCommandPreview`
* `buttons.enablePortLinks`
* `buttons.confirmDangerousCommands`
* `buttons.watchConfigChanges`
* `buttons.preferCustomEditor`
* `buttons.debugLogging`

These should be fallback preferences, not replacements for project config.

---

# 17. File Discovery Rules

## Recommended search behavior

### Single-folder workspace

Search root for:

* `.buttons`

### Multi-root workspace

Each root may have its own `.buttons`

Options:

* open buttons for active workspace folder
* allow switching workspace folder in UI

## V1 simplification

Only load `.buttons` from the active workspace folder or first workspace folder.

---

# 18. Internal Type Model

Suggested TypeScript model:

```ts
type LayoutMode = "grid" | "rows";
type TerminalMode = "current" | "new";
type ShellMode = "auto" | "bash" | "sh" | "zsh" | "pwsh" | "cmd";

interface ButtonsDocument {
  version: number;
  title?: string;
  description?: string;
  layout?: LayoutMode;
  shell?: ShellMode;
  terminal?: TerminalMode;
  delimiter?: string;
  display?: DisplayConfig;
  defaults?: ButtonDefaults;
  groups: Record<string, ButtonGroup>;
}

interface DisplayConfig {
  show_command?: boolean;
  show_labels?: boolean;
  show_icons?: boolean;
  compact?: boolean;
}

interface ButtonDefaults {
  enabled?: boolean;
  copy_to_clipboard?: boolean;
  run_in_current_terminal?: boolean;
  run_in_new_terminal?: boolean;
  confirm?: boolean;
  reveal_terminal?: boolean;
}

interface ButtonGroup {
  name?: string;
  description?: string;
  enabled?: boolean;
  base?: string;
  icon?: string;
  color?: string;
  layout?: LayoutMode;
  terminal?: TerminalMode;
  delimiter?: string;
  ports?: number[];
  tags?: string[];
  buttons?: ButtonConfig[];
  generate?: GenerateConfig;
  links?: LinkConfig[];
}

interface ButtonConfig {
  id?: string;
  label?: string;
  command?: string;
  args?: string[];
  description?: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
  copy_to_clipboard?: boolean;
  run_in_current_terminal?: boolean;
  run_in_new_terminal?: boolean;
  confirm?: boolean;
  reveal_terminal?: boolean;
  cwd?: string;
  env?: Record<string, string>;
  open_ports?: number[];
  open_urls?: string[];
}

interface GenerateConfig {
  mode?: "cartesian";
  template: string;
  label_template?: string;
  params: string[][];
}

interface LinkConfig {
  label: string;
  url: string;
}
```

---

# 19. Phased Delivery Plan

## Phase 0 — Product Definition and Schema Lock

### Goal

Freeze the v1 behavior before coding deeply.

### Tasks

* define exact `.buttons` schema
* define inheritance rules
* define static vs generated buttons
* define button action model
* define error handling model
* define multi-root behavior
* define icon strategy
* write 3–5 example config files

### Deliverables

* v1 spec document
* sample `.buttons` files
* TypeScript interfaces
* test matrix for parsing and resolution

---

## Phase 1 — Foundation / Extension Skeleton

### Goal

Create the extension shell and core plumbing.

### Tasks

* scaffold extension
* register commands
* implement workspace detection
* implement `.buttons` root file lookup
* implement logging and error utilities
* add file watcher for `.buttons`

### Deliverables

* extension boots
* command palette actions work
* can detect and open `.buttons`

---

## Phase 2 — TOML Parsing and Validation

### Goal

Load `.buttons` robustly.

### Tasks

* add TOML parser
* parse raw document
* validate required fields and enums
* normalize missing defaults
* generate stable internal model
* surface errors cleanly

### Deliverables

* parse/validate pipeline
* normalized config object
* structured error model

### Tests

* invalid TOML
* missing version
* invalid enum values
* duplicate IDs
* empty groups
* malformed ports/colors/URLs

---

## Phase 3 — Command Resolution Engine

### Goal

Resolve static and generated buttons into final executable actions.

### Tasks

* implement inheritance resolution
* static button normalization
* cartesian param generation
* label templating
* ID generation
* final command string resolution

### Deliverables

* resolved button model ready for UI
* deterministic output from same input
* unit tests for generation logic

---

## Phase 4 — Terminal and Clipboard Actions

### Goal

Make buttons actually useful.

### Tasks

* current terminal execution
* new terminal execution
* terminal naming strategy
* clipboard copy
* optional open port / URL
* optional reveal terminal behavior
* confirm dialogs for flagged commands

### Deliverables

* end-to-end button action flow
* action result notifications

### Tests

* current terminal when none exists
* multiple terminals
* copy action
* button confirm flow

---

## Phase 5 — Custom Editor / Webview UI

### Goal

Provide the visual Buttons experience.

### Tasks

* create custom editor provider or webview panel
* render header, groups, buttons, errors
* send UI action events to extension host
* support grid and row layouts
* add command preview text
* add empty/error states

### Deliverables

* polished first working UI
* open `.buttons` visually
* click-to-run/copy workflow

---

## Phase 6 — Configuration Ergonomics

### Goal

Make `.buttons` authoring pleasant.

### Tasks

* create `Buttons: Create Example .buttons`
* add helpful error messages
* add schema docs in README
* add config snippets/examples
* maybe add completion snippets in TOML context later

### Deliverables

* good onboarding
* clean example templates
* reduced user error rate

---

## Phase 7 — Hardening and Release Preparation

### Goal

Stabilize for public release.

### Tasks

* test macOS/Linux/Windows basics
* verify shell behavior
* improve terminal selection logic
* add telemetry only if you explicitly want it
* write changelog
* package extension assets
* draft marketplace listing

### Deliverables

* release candidate
* docs
* screenshots / demo GIFs

---

# 20. Optional Later Phases

## Phase 8 — Advanced UX

* search/filter buttons
* favorites/recent commands
* pin groups
* collapsible groups
* quick-run palette

## Phase 9 — Variables and Templates

* `${workspaceFolder}`
* `${file}`
* `${relativeFile}`
* `${selectedText}`
* `${env:NAME}`

## Phase 10 — Safer Operations

* danger styling
* confirmations
* restricted commands warnings
* trust model integration

## Phase 11 — Better Multi-root Support

* per-root tabs
* root selector
* merge or isolate config views

## Phase 12 — Schema Ecosystem

* JSON schema-like support for TOML guidance
* sample generator
* migration tooling for `version = 2`

---

# 21. Recommended v1 Scope Cut

To keep this shippable, I strongly recommend this exact v1 scope:

## Include

* `.buttons` in workspace root
* TOML parsing
* top-level defaults
* groups
* static buttons
* generated buttons with simple cartesian params
* copy action
* current/new terminal action
* command preview
* custom editor UI
* ports/links
* basic validation

## Exclude initially

* nested groups
* conditional expressions
* complex templating filters
* platform-specific command branches
* secrets interpolation
* task dependency graphs
* command output capture
* process lifecycle management

This will keep the extension valuable without turning it into a mini build system.

---

# 22. Best Configuration Design Decision

If I had to give one architectural recommendation:

**Treat `.buttons` as a declarative command catalog, not as a scripting language.**

That means:

* explicit buttons
* simple generation
* controlled inheritance
* no complicated embedded logic

That will make the extension much easier to reason about, validate, document, and maintain.

---

# 23. Suggested Milestone Breakdown

## Milestone 1

Spec + parser + resolved model

## Milestone 2

Run/copy terminal actions

## Milestone 3

Custom editor UI

## Milestone 4

Validation polish + examples + docs

## Milestone 5

Marketplace release

---

# 24. Risks and Technical Concerns

## 1. TOML complexity creep

Risk: config becomes too clever and hard to validate.

Mitigation:

* narrow schema
* avoid executable logic
* version the spec

## 2. Shell portability

Risk: commands behave differently across OS/shells.

Mitigation:

* keep v1 shell-agnostic
* document clearly
* add platform overrides later if needed

## 3. Terminal reuse ambiguity

Risk: “current terminal” is ambiguous.

Mitigation:

* define deterministic rule:

  * use active terminal if exists
  * else first Buttons-owned terminal
  * else create terminal

## 4. Multi-root confusion

Risk: multiple `.buttons` files in workspace.

Mitigation:

* v1: active workspace only
* v2: root selector

## 5. Unsafe commands

Risk: destructive commands can be one-click dangerous.

Mitigation:

* per-button `confirm`
* optional danger styling later

---

# 25. Clarifying Questions

These are the most important ones:

1. Do you want `.buttons` to support **only one file at repo root**, or also support files like `.buttons.toml` or workspace-local variants later?

2. Should the main UI be a **custom editor for the `.buttons` file**, or more like a **dedicated webview/panel** opened independently from the file?

3. For command generation, do you want:

   * only simple matrix generation
   * or also reusable variables/templates/macros

4. Should buttons be able to specify:

   * `cwd`
   * environment variables
   * URLs
   * ports
     in v1, or should v1 stay narrower?

5. Do you want the extension to support **multiple project roots** from the beginning?

6. Do you want built-in **danger confirmation styling** for commands like reset, delete, prune, drop, deploy?

7. Should icons use:

   * VS Code codicons
   * emoji
   * custom icon names
   * or all of the above

8. Should `.buttons` be intended as:

   * team-shared repo config only
   * or also user-local personal command buttons

If you want, next I can draft the **final v1 `.buttons` specification** and a **complete example `package.json` + TypeScript file structure** for the extension.

Do you want .buttons to support only one file at repo root, or also support files like .buttons.toml or workspace-local variants later? only one file at repo root

Should the main UI be a custom editor for the .buttons file, or more like a dedicated webview/panel opened independently from the file? more like a dedicated webview/panel opened independently from the file

For command generation:
simple matrix generation & also reusable variables/templates/macros


Should buttons be able to specify:

cwd

environment variables

URLs

ports
in v1?

Yes

Do you want the extension to support multiple project roots from the beginning? No

Do you want built-in danger confirmation styling for commands like reset, delete, prune, drop, deploy? Yes

 icons Should use:
VS Code codicons


Should .buttons be intended as:

team-shared repo config  also user-local personal command buttons


draft the final v1 .buttons specification and a complete example package.json + TypeScript file structure for the extension.