# Using the panel

The Buttons panel has two tabs and renders differently depending on where you opened it.

## Where to open it

- **Activity Bar** - click the Buttons icon in the left sidebar. Renders as a compact card layout. The window icon in the header (and on the sidebar title bar) opens the full editor panel.
- **Editor title bar** - click the Buttons icon in the top-right. Renders as a full-width table. The editor tab uses the Buttons logo.

Both panels show the same data and stay in sync; you can use both at once.

## The two tabs

### Buttons (default)

Two sections:

- **Project buttons** - from the current workspace's `<workspace root>/.buttons.json`.
- **Global buttons** - from your personal `~/.buttons.json`, shown in every project.

### Project scripts

A list of every script Buttons discovered, with a checkbox next to each:

- **Check** a script to add it as a project button.
- **Uncheck** a script to remove it.

The tab also holds the **Scan directories** card, which lists the extra directories scanned on top of the always-scanned project root (top level only). Each row has a **recursive** toggle for scanning the directory's whole tree. Type or paste a path into the Add field: relative paths resolve inside the project, full paths reach outside it. The card edits the [`buttons.scanDirectories`](configuration.md#buttonsscandirectories) workspace setting - see [Scan directories](scanning.md#scan-directories).

In the Explorer, right-clicking a `.sh` or Python entry file offers **Add to Buttons**, which adds it as a standalone project button without scanning its folder. Right-clicking a manifest (`package.json`, `Makefile`, `justfile`, `composer.json`, `Cargo.toml`, `go.mod`) adds that folder as a scan directory.

Detected virtual environments (`venv/` or `.venv/`) also appear in this tab, grouped under the venv's path - see [Virtual environments](scanning.md#virtual-environments).

Before you've generated a buttons file, the checkboxes are disabled and a **Generate buttons file** call-to-action is shown instead.

## Button actions

Every row (or card) offers the same actions:

| Action | What it does |
| --- | --- |
| **Run** | Runs the command in the current integrated terminal. Reuses the active terminal if one is open; otherwise reuses a terminal named `Buttons`, or creates one. |
| **New Terminal** | Runs the command in a fresh terminal named `Buttons: <label>`, where `<label>` is the script name (or the first word of the command). |
| **System** | Opens the configured default system terminal at the project root with the command already on the prompt. Does not run. Press Enter in that terminal to run. |
| **+** | Adds the command to the current terminal line with a space (`pnpm` then `dev` → `pnpm dev`). Does not run. |
| **↵** | Adds the command on a new line. Does not run. Press Enter in the terminal when the line is ready. |
| **Copy** | Copies the exact command to the clipboard and shows a confirmation. |
| **Duplicate** | Clones the button (and its variants) as a new row you can change independently. |
| **Note / Edit** | Opens inline editing. For a **script** button you can edit only the note; for a **custom command** or **args** variant you can edit the command or args and the note. |
| **✕** | First click shows **Confirm**. Click again while that tooltip is showing to remove the button. Click anywhere else to cancel. |

Drag the gripper on a row to reorder it among its siblings. Order is saved in `.buttons.json`.

Parents with a chevron expand to show **parameter options** (children) and **+ Add variant**, which appends extra args to that row's live command. Variants can nest: a variant has its own chevron and **+ Add variant**. A badge next to the chevron shows how many variants the parent has; if those variants have children of their own, the badge is `direct:deeper` (two children that themselves hold five more rows is `2:5`). The parent's **Run** still runs the base command.

> Script buttons with a **missing** reference (the script no longer exists in the scan) are shown but cannot be run. See [Troubleshooting](troubleshooting.md#a-script-shows-not-found).

## Adding a custom command

1. Click **+ Add command** in the **Project buttons** or **Global buttons** section.
2. Enter the command (multi-line is allowed) and an optional note.
3. Click **Save**.

Custom commands are stored verbatim and are never rewritten by scanning. This is also how you run anything Buttons can't parse (see [Script scanning](scanning.md#what-is-discovered)).

## Text size and colors

Click the gear icon in the panel header to open Buttons settings. `buttons.textSize` changes the UI size. Hex color pickers tint each action button, command text and background, variant commands, and odd/even rows; leave them empty to inherit VS Code's current color theme. See [Configuration](configuration.md).

## AI skill

The markdown icon in the header (sidebar and editor) copies the Buttons AI skill to the clipboard, or writes `BUTTONS-SKILL.md` at the project root. Coding agents can use that file to create a complete `.buttons.json`. If the file already exists, Buttons asks before replacing it.

[Back to index](index.md)
