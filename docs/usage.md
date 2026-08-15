# Using the panel

The Buttons panel has two tabs and renders differently depending on where you opened it.

## Where to open it

- **Activity Bar** — click the Buttons icon in the left sidebar. Renders as a compact card layout.
- **Editor title bar** — click the Buttons icon in the top-right. Renders as a full-width table.

Both panels show the same data and stay in sync; you can use both at once.

## The two tabs

### Buttons (default)

Two sections:

- **Project buttons** — from the current workspace's `<workspace root>/.buttons.json`.
- **Global buttons** — from your personal `~/.buttons.json`, shown in every project.

### Project scripts

A list of every script Buttons discovered, with a checkbox next to each:

- **Check** a script to add it as a project button.
- **Uncheck** a script to remove it.

Before you've generated a buttons file, the checkboxes are disabled and a **Generate buttons file** call-to-action is shown instead.

## Button actions

Every row (or card) offers the same actions:

| Action | What it does |
| --- | --- |
| **Run** | Runs the command in the current integrated terminal. Reuses the active terminal if one is open; otherwise reuses a terminal named `Buttons`, or creates one. |
| **New Terminal** | Runs the command in a fresh terminal named `Buttons: <label>`, where `<label>` is the script name (or the first word of the command). |
| **Copy** | Copies the exact command to the clipboard and shows a confirmation. |
| **Note / Edit** | Opens inline editing. For a **script** button you can edit only the note; for a **custom command** you can edit both the command and the note. |
| **✕** | Removes the button from its file. |

> Script buttons with a **missing** reference (the script no longer exists in the scan) are shown but cannot be run. See [Troubleshooting](troubleshooting.md#a-script-shows-not-found).

## Adding a custom command

1. Click **+ Add command** in the **Project buttons** or **Global buttons** section.
2. Enter the command (e.g. `docker ps`) and an optional note.
3. Click **Save**.

Custom commands are stored verbatim and are never rewritten by scanning. This is also how you run anything Buttons can't parse (see [Script scanning](scanning.md#script-file-types)).

## Text size

Click the gear icon in the panel header to open the settings page for `buttons.textSize`, or change it directly — see [Configuration](configuration.md#buttonstextsize).

[Back to index](index.md)
