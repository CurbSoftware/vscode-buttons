# Buttons

**Buttons** is a VS Code and VSCodium extension that scans your project for scripts - `package.json` scripts, `Makefile` targets, PHP `composer.json` scripts, `justfile` recipes, shell `.sh` files, and Python entry files - and turns them into a clickable command launcher. You choose the directories to scan (the project root is always included); virtual environments get activate / deactivate / install-requirements buttons.

Run any command in the current or a new integrated terminal, copy it to the clipboard, add your own custom commands, and manage everything from a single panel - no more digging through `package.json` or remembering the exact flags.

- **VS Code:** [Install from the Marketplace](https://marketplace.visualstudio.com/items?itemName=CurbSoftware.buttons-vscode)
- **VSCodium:** [Install from Open VSX](https://open-vsx.org/extension/CurbSoftware/buttons-vscode)
- **Source / issues:** [github.com/CurbSoftware/vscode-buttons](https://github.com/CurbSoftware/vscode-buttons)

## Screenshots

![Buttons scanning scripts into a clickable launcher](https://raw.githubusercontent.com/CurbSoftware/vscode-buttons/main/media/screenshots/btn-btns-animate.webp)

---

## Documentation

Detailed guides live in the [`docs/`](docs/index.md) directory:

- [Getting started](docs/getting-started.md)
- [Using the panel](docs/usage.md)
- [Configuration & settings](docs/configuration.md)
- [`.buttons.json` file format](docs/file-format.md)
- [Script scanning](docs/scanning.md)
- [Command reference](docs/commands.md)
- [FAQ](docs/faq.md)
- [Troubleshooting](docs/troubleshooting.md)

---

## Features

### Two ways to open it

- **Activity Bar** - click the Buttons icon in the left Activity Bar for a compact sidebar.
- **Editor panel** - click the Buttons icon in the editor title bar (top-right, near "split editor") for a full-width editor tab. Both stay in sync and can be used at the same time.

### Two tabs

- **Buttons** (default) - your project buttons and global buttons.
- **Project scripts** - the scanner, where you pick which discovered scripts become buttons.

### Generate, don't assume

Opening a project **never** writes a file. Click **Generate** to scan the project and create the initial `.buttons.json` with the root-level discovered scripts. After that, **Rescan** keeps it current without losing your choices (see [Generate vs Rescan](#generate-vs-rescan)).

### Scan directories

The **project root is always scanned** at its top level. Add more directories in the **Project scripts** tab - each with its own **recursive** toggle - via the **Scan directories** card and your OS folder picker. The list lives in the `buttons.scanDirectories` workspace setting, so it is shared with the project (see [Script file types](#script-file-types) and [docs/scanning.md](docs/scanning.md)).

### Script scanning

- Scans `package.json`, `Makefile`, `composer.json`, and `justfile`, plus standalone `.sh` files and common Python entry files (`app.py`, `main.py`, `manage.py`, `run.py`, `server.py`) - see [Script file types](#script-file-types).
- Offers **venv buttons** - `Activate venv`, `Deactivate`, and `Install requirements` - when a `venv/` or `.venv/` directory is detected.
- Supports **monorepos** - add `packages/` (or `apps/`, …) as a recursive scan directory and nested manifests are found and scoped to their own directory.
- Skips installed packages, VCS, and build output (`node_modules`, `dist`, `build`, `coverage`, `.git`, `vendor`, and more).

### Package-manager aware

Scripts render with the right runner automatically, detected from your lockfiles:

| Lockfile | Rendered command |
| --- | --- |
| `pnpm-lock.yaml` | `pnpm dev` |
| `yarn.lock` | `yarn test` |
| `bun.lockb` | `bun dev` |
| `package-lock.json` (default) | `npm run dev` |

### Checkbox selection

In the **Project scripts** tab, check or uncheck scripts to include or remove them as buttons. Changes are saved immediately once the file exists.

### Custom commands

Add any command that isn't in a script file - `docker ps`, `git pull`, `curl …` - with **+ Add command**, and attach an optional note.

### Run, copy, and manage

Every button gives you:

- **Run** - run in the current integrated terminal (reusing it, or a dedicated `Buttons` terminal).
- **New Terminal** - run in a fresh terminal named `Buttons: <label>`.
- **Copy** - copy the exact command to the clipboard.
- **Note / Edit** - inline-edit the note (for script buttons) or the command and note (for custom commands).
- **✕** - remove the button.

### Layouts that fit

- **Sidebar** renders each button as a compact card (command/note on one row, actions on the next).
- **Editor panel** renders the full table (Command | Note | Actions).

### Configurable text size

Set the UI text size to VS Code default, +2px, or +4px via `buttons.textSize` - or click the gear icon in the panel header to jump straight to the setting (see [Settings](#settings)).

### Global profile

A `~/.buttons.json` file holds commands that apply to **every** project, so your go-to commands follow you across workspaces.

### Auto-update

A **Rescan** button plus automatic file watchers keep commands current when `package.json`, `Makefile`, `composer.json`, `justfile`, `.sh` or Python entry files, `requirements.txt`, or your buttons files change.

---

## Getting started

1. Install from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=CurbSoftware.buttons-vscode) or [Open VSX](https://open-vsx.org/extension/CurbSoftware/buttons-vscode).
2. Open a folder/project in VS Code.
3. Click the **Buttons** icon in the Activity Bar (or the editor title-bar icon).
4. Click **Generate** to scan the project and create `.buttons.json` with the root-level discovered scripts.
5. Fine-tune in the **Project scripts** tab, then use **Run**, **New Terminal**, or **Copy** on any row - or **+ Add command** for a custom command.

---

## Using the panel

### The **Buttons** tab

The default tab shows two sections:

- **Project buttons** - commands from the current workspace's `<workspace root>/.buttons.json`.
- **Global buttons** - commands from your personal `~/.buttons.json`, shown in every project.

Each row (or card, in the sidebar) shows the command, an optional note, a file badge for script buttons, and the action buttons described above.

### The **Project scripts** tab

A **Scan directories** card (the always-on project root plus the directories you've added, each with a recursive toggle), and a list of every discovered script grouped by file. Checking a box adds it as a project button; unchecking removes it. Before you **Generate** a file, the boxes are disabled (there's nothing to edit yet) and a **Generate buttons file** call-to-action is shown.

### Adding a custom command

1. Click **+ Add command** in the Project or Global section.
2. Type the command (e.g. `docker ps`) and an optional note.
3. Click **Save**.

Custom commands are stored verbatim and are never rewritten by scanning.

---

## Generate vs Rescan

Buttons distinguishes two scan actions so you never lose work:

- **Generate** - creates the project's `.buttons.json` from scratch, including **every root-level** discovered script. Use it the first time you open a project (it only appears when no file exists yet).
- **Rescan** - re-runs the scanner against the *existing* file. It keeps your included scripts and notes, recomputes their commands, marks scripts that no longer exist as "not found", and leaves newly-discovered scripts unchecked for you to opt in.

In other words: **Generate** seeds the file; **Rescan** updates it in place without overriding your custom commands or selections.

---

## Script file types

The **Buttons: Script Files** setting controls which file types are scanned. `package.json`, `shell`, and `python` are included by default; the others are opt-in checkboxes:

| Type | Ecosystem | Run as |
| --- | --- | --- |
| `package.json` | Node.js / TypeScript | `pnpm dev`, `npm run dev`, `yarn test`, `bun dev` |
| `Makefile` | C/C++, Go, generic | `make build` |
| `composer.json` | PHP | `composer test` |
| `justfile` | Universal task runner | `just build` |
| `shell` | `.sh` files | `bash deploy.sh` |
| `python` | `app.py`, `main.py`, `manage.py`, `run.py`, `server.py` + venv buttons | `python app.py`, `source venv/bin/activate` |

Commands run with the terminal's working directory set to the script file's directory, and their paths are relative to that directory - `scripts/migrate.sh` becomes `bash migrate.sh` inside `scripts/`.

Only these formats are parsed. Other ecosystems (Python `pyproject.toml`, Rust `Cargo.toml`, .NET, etc.) aren't auto-parsed - add their commands with **+ Add command** instead.

Disabling a file type stops *offering* its scripts in the **Project scripts** tab, but never removes buttons already in your `.buttons.json` - Rescan preserves your custom commands and scripts.

---

## Settings

Buttons contributes three settings, configurable at **User** and **Workspace** scope:

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `buttons.textSize` | `string` (`default` / `plus2` / `plus4`) | `default` | Text size in the Buttons UI, relative to VS Code's font size. |
| `buttons.scriptFiles` | `string[]` (checkbox list) | `["package.json", "shell", "python"]` | Which script file types to scan for commands. |
| `buttons.scanDirectories` | `{ path, recursive }[]` | `[]` | Extra directories to scan; the project root is always scanned at its top level. |

You can open the settings page from the gear icon in the panel header, or via **Command Palette → Preferences: Open Settings** and searching "Buttons".

---

## Storage & file format

Buttons stores its configuration as JSON:

- **Project** - `<workspace root>/.buttons.json`
- **Global** - `~/.buttons.json`

The file has a flat `buttons` array. Each entry is either a **script reference** (a live link to a scanned script) or a **custom command**:

```json
{
  "version": 1,
  "buttons": [
    { "type": "script", "file": "package.json", "script": "dev", "packageDir": "", "packageManager": "pnpm", "note": "Vite dev server" },
    { "type": "script", "file": "packages/api/package.json", "script": "start", "packageDir": "packages/api", "packageManager": "pnpm" },
    { "type": "script", "file": "deploy.sh", "script": "deploy.sh", "packageDir": "", "packageManager": "shell" },
    { "type": "script", "file": "app.py", "script": "app.py", "packageDir": "", "packageManager": "python" },
    { "type": "script", "file": "venv", "script": "Activate venv", "packageDir": "", "packageManager": "python" },
    { "type": "command", "command": "docker ps", "note": "List running containers" }
  ]
}
```

### Script entry fields

| Field | Meaning |
| --- | --- |
| `type` | Always `"script"`. |
| `file` | The script file, relative to the workspace root (e.g. `package.json`, `packages/api/package.json`). |
| `script` | The script/target name (e.g. `dev`, `build`). For standalone `.sh` and Python entry files this is the file's relative path. |
| `packageDir` | The directory of the script file relative to the workspace root (empty string = root). This is where the terminal's working directory is set when you run it. |
| `packageManager` | One of `npm`, `pnpm`, `yarn`, `bun`, `make`, `composer`, `just`, `shell`, `python`. |
| `note` | Optional human-readable note. |

### Command entry fields

| Field | Meaning |
| --- | --- |
| `type` | Always `"command"`. |
| `command` | The literal command to run. |
| `note` | Optional human-readable note. |

Because a script entry is a *reference*, its command is recomputed on every scan - so if you switch from `pnpm` to `bun`, the button updates to `bun dev` automatically. Custom command entries are stored verbatim.

---

## Commands

These commands are available in the Command Palette (Ctrl/Cmd+Shift+P):

| Command | Purpose |
| --- | --- |
| `Buttons: Open Panel` | Focus the Buttons sidebar. |
| `Buttons: Open in Editor` | Open the full-width Buttons editor panel. |
| `Buttons: Rescan Scripts` | Re-scan and reconcile the project scripts. |
| `Buttons: Open Project Buttons File` | Open (and create if needed) `<workspace root>/.buttons.json`. |
| `Buttons: Open Global Buttons File` | Open (and create if needed) `~/.buttons.json`. |

---

## Monorepo & ignore behavior

Buttons scans the **project root (top level) plus the directories you add** in the **Scan directories** card. For a monorepo, add the package roots as recursive scan directories - e.g. `apps` and `packages`:

```text
project/
├── package.json            <- always found (root)
├── apps/                   <- add as recursive scan directory
│   └── web/package.json
├── packages/               <- add as recursive scan directory
│   └── api/package.json
└── plugin/composer.json    <- found when "plugin" is a scan directory
```

```jsonc
// .vscode/settings.json
{
  "buttons.scanDirectories": [
    { "path": "apps", "recursive": true },
    { "path": "packages", "recursive": true }
  ]
}
```

Each script's terminal is opened with its working directory set to the script's `packageDir`, so `pnpm dev` in `apps/web` runs in the right place.

Inside recursive scan directories, these directories are never entered: `node_modules`, `.git`, `.hg`, `.svn`, `.next`, `.nuxt`, `.output`, `.cache`, `.turbo`, `.yarn`, `.pnpm-store`, `dist`, `build`, `out`, `coverage`, `vendor`, `.venv`, `venv`, `__pycache__`, `.vscode`, `.idea`, `target`, `.svelte-kit`, `.parcel-cache`, and any hidden (dot-prefixed) directory.

---

## Safety

Buttons runs the commands exactly as they are written. Review a shared project's `.buttons.json` before running its commands - treat it like a `Makefile` or a `package.json` script. Your `~/.buttons.json` is personal and is never shared with a project.

---

## Local installation

Build and install the extension from source:

```bash
# Install dependencies and compile
npm install && npm run compile

# Package as a .vsix
npm run package

# Install the .vsix into VS Code
code --install-extension buttons-vscode-*.vsix
```

Reload VS Code (Ctrl+Shift+P → **Developer: Reload Window**) to pick up the new version. To test without packaging, press **F5** in this project to launch the Extension Development Host with the latest code.

---

## Development

```bash
npm install          # install dependencies
npm run compile      # clean + compile TypeScript to dist/
npm run watch        # continuous compilation
npm run lint         # type-check only (tsc --noEmit)
npm test             # compile + run the test suite
npm run package      # package as release/<name>-<version>.vsix
```

See [CHANGELOG.md](CHANGELOG.md) for version history.

### Requirements

- Node.js `>= 22`
- VS Code `^1.97.0`

---

## License

MIT. See [LICENSE](LICENSE).
