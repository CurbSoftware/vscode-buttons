# Layouts

Buttons supports five layout modes that control how button cards are arranged within each group. Set the layout at the document level or override it per group.

```toml
layout = "grid"    # document-level default
```

```toml
[groups.tools]
layout = "table"   # per-group override
```

> The sidebar view always uses **rows** layout regardless of the configured layout.

## Grid

```toml
layout = "grid"
```

Responsive auto-fit columns with a minimum width of 280px. Cards expand to fill available space. This is the default layout and works well for most configurations.

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Button Card │ │  Button Card │ │  Button Card │
│  label       │ │  label       │ │  label       │
│  command     │ │  command     │ │  command     │
│  [Run] [Copy]│ │  [Run] [Copy]│ │  [Run] [Copy]│
└──────────────┘ └──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐
│  Button Card │ │  Button Card │
└──────────────┘ └──────────────┘
```

**Best for:** General use, mixed button sizes, responsive panels.

See: [examples/node/.buttons](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/node/.buttons)

## Rows

```toml
layout = "rows"
```

Single-column layout where each button takes the full width. Simple and scannable.

```
┌──────────────────────────────────────────────────┐
│  Button Card — full width                        │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│  Button Card — full width                        │
└──────────────────────────────────────────────────┘
```

**Best for:** Small configs, sequential workflows, sidebar view.

See: [examples/terraform/.buttons](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/terraform/.buttons)

## Columns

```toml
layout = "columns"
```

Fixed 3-column grid. Cards are evenly distributed regardless of screen width.

```
┌──────────┐ ┌──────────┐ ┌──────────┐
│  Card 1  │ │  Card 2  │ │  Card 3  │
└──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│  Card 4  │ │  Card 5  │ │  Card 6  │
└──────────┘ └──────────┘ └──────────┘
```

**Best for:** Dashboard-style layouts with organized categories, multi-service projects.

See: [examples/columns-layout/.buttons](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/columns-layout/.buttons)

## Table

```toml
layout = "table"
```

Compact tabular layout with one row per button. Each row shows icon, label, command preview, and action buttons. No card borders — clean and dense.

```
┌──────┬────────────────┬──────────────────┬───────────────┐
│  ▶   │ Start Nginx    │ systemctl start  │ [Run] [Copy]  │
│  ■   │ Stop Nginx     │ systemctl stop   │ [Run] [Copy]  │
│  ↻   │ Restart Nginx  │ systemctl restart│ [Run] [Copy]  │
└──────┴────────────────┴──────────────────┴───────────────┘
```

**Best for:** Long lists of commands, service management, system administration.

See: [examples/compact-table/.buttons](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/compact-table/.buttons)

## Flow

```toml
layout = "flow"
```

Horizontal flex-wrap layout with smaller cards (min 180px, max 320px). Cards wrap to the next line as space runs out.

```
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Status │ │ Add    │ │ Commit │ │ Push   │ │ Pull   │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
┌────────┐ ┌────────┐
│ Stash  │ │ Log    │
└────────┘ └────────┘
```

**Best for:** Quick-action toolbars, many small commands, icon-focused layouts with `show_command = false`.

See: [examples/flow-layout/.buttons](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/flow-layout/.buttons)

## Combining Layouts

Use per-group layout overrides to mix layouts in a single file:

```toml
version = 1
layout = "grid"    # default for most groups

[groups.services]
layout = "table"   # compact list for services

[groups.actions]
layout = "flow"    # quick-action toolbar
```

## Compact Mode

Any layout can be combined with `compact = true` for tighter spacing:

```toml
[display]
compact = true
```

This reduces card padding and gaps, making the UI more dense.

## Related Pages

- [.buttons File Reference](BUTTONS-FILE.md)
- [UI Features](UI-FEATURES.md)
- [Examples](EXAMPLES.md)
