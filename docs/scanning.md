# Script scanning

Buttons discovers runnable scripts by scanning the directories you choose, then renders them as buttons.

## Scan directories

The **project root is always scanned** at its top level. To scan elsewhere, add directories in the **Project scripts** tab - each row in the **Scan directories** card has a **recursive** toggle:

- **Off** (default) - only the directory's top level is scanned.
- **On** - the directory's whole tree is scanned.

```text
project/
├── package.json        <- always found (root)
├── deploy.sh           <- always found (root)
├── scripts/
│   ├── migrate.sh      <- found when "scripts" is a scan directory
│   └── jobs/seed.sh    <- found when "scripts" is recursive
└── services/api/
    ├── package.json    <- found when "services/api" is a scan directory
    └── main.py         <- same
```

The list is stored in the [`buttons.scanDirectories`](configuration.md#buttonsscandirectories) workspace setting, so it is shared with the project. Type or paste a path into the Add field: **relative paths** (like `scripts`) resolve inside the project, **full paths** (like `/opt/tools`) reach outside it. Removing a directory stops scanning it. Hidden directories and ignore-listed names (like `build` or `node_modules`) cannot be relative scan targets - they are excluded from every scan and from the file watcher.

> **2.0 change:** earlier versions scanned the whole workspace recursively. Nested packages are now found only when their parent directory is added as a (recursive) scan directory. Existing buttons for files outside the scan scope are kept and marked **not found** until you add the directory.

## Outside the project

Scan directories can live outside the workspace: paste a full path (`/opt/tools` or `C:\tools`). Those directories are scanned and watched like in-project ones, and their buttons run with the terminal set to the script's own directory. Inside the project, relative paths are the rule; outside it, full paths are required.

You can also add a single file without scanning its folder:

- right-click a `.sh` or Python entry file in the Explorer and choose **Add to Buttons**, or
- paste the file's path into the Add field (full path when it lives outside the project).

Standalone file entries are stored in `.buttons.json`, so they travel with the project file, and they keep working even when their directory is not a scan scope. Right-clicking a manifest (`package.json`, `Makefile`, `justfile`, `composer.json`) adds its folder as a scan directory instead, since its scripts come from scanning.

## What is discovered

| Kind | Found where | Run as |
| --- | --- | --- |
| `package.json` scripts | any scan scope | `npm run dev` / `pnpm dev` / `yarn test` / `bun dev` |
| `Makefile` targets | any scan scope | `make build` |
| `composer.json` scripts | any scan scope | `composer test` |
| `justfile` recipes | any scan scope | `just build` |
| `.sh` files | any scan scope | `bash deploy.sh` |
| Python entry files (`app.py`, `main.py`, `manage.py`, `run.py`, `server.py`) | any scan scope | `python main.py` |

Every command runs with the terminal's working directory set to the script file's directory, and file paths in the command are relative to that directory - so `scripts/migrate.sh` runs as `bash migrate.sh` inside `scripts/`, exactly like a `pnpm dev` button for a nested package runs inside that package.

The file formats above are controlled by the [`buttons.scriptFiles`](configuration.md#buttonsscriptfiles) setting; `package.json`, `shell`, and `python` are enabled by default, `Makefile` / `composer.json` / `justfile` are opt-in.

For `package.json`, the script body (and for `Makefile`/`justfile`, a preceding `#` comment) is captured as a description shown with the button. Other ecosystems (Python `pyproject.toml`, Rust `Cargo.toml`, .NET, etc.) are not auto-detected - add their commands with **+ Add command** instead (see [Using the panel](usage.md#adding-a-custom-command)).

## Virtual environments

When a `venv/` or `.venv/` directory exists in the project root or the top level of a scan directory, Buttons offers three buttons for it (grouped under the venv's path):

| Button | Command |
| --- | --- |
| **Activate venv** | `source venv/bin/activate` (or `& .venv\Scripts\Activate.ps1` / `.venv\Scripts\activate.bat` on Windows, whichever exists) |
| **Deactivate** | `deactivate` - works in a terminal where the venv was activated |
| **Install requirements** | `venv/bin/pip install -r requirements.txt` (`venv\Scripts\pip.exe` on Windows) - uses the venv's own pip, so it installs into the venv even before activation. Only offered when a `requirements.txt` sits next to the venv. |

The commands run from the venv's parent directory (the terminal's working directory), so a venv at `packages/api/.venv` activates with `source .venv/bin/activate` from `packages/api/`.

The venv's internals are never scanned. Creating a venv is picked up on the next **Rescan** (or file change). On Windows, running `Activate.ps1` may require a permissive PowerShell execution policy.

## Package-manager detection

The runner used for `package.json` scripts is detected from the **root lockfiles**, in this order:

| Lockfile | Package manager |
| --- | --- |
| `pnpm-lock.yaml` | `pnpm` |
| `yarn.lock` | `yarn` |
| `bun.lockb` | `bun` |
| `package-lock.json` | `npm` |

If none is found, it defaults to `npm`. The detected manager applies to **all** `package.json` files in the workspace (monorepos are assumed to use one manager). Because script entries are references, switching lockfiles and rescanning updates every command automatically - `npm run dev` becomes `pnpm dev`, etc.

`Makefile`, `composer.json`, and `justfile` targets always use their fixed runner (`make`, `composer`, `just`) regardless of the detected package manager.

## Monorepos

Add your package roots as recursive scan directories:

```jsonc
// .vscode/settings.json
{
  "buttons.scanDirectories": [{ "path": "packages", "recursive": true }]
}
```

Each script's `packageDir` is its file's directory, and running it opens a terminal with the working directory set there - so `pnpm dev` in `packages/web` runs in the right place.

## Ignored directories

Inside recursive scan directories, these directories are never entered (installed packages, VCS, and build/cache output):

`node_modules`, `.git`, `.hg`, `.svn`, `.next`, `.nuxt`, `.output`, `.cache`, `.turbo`, `.yarn`, `.pnpm-store`, `dist`, `build`, `out`, `coverage`, `vendor`, `.venv`, `venv`, `__pycache__`, `.vscode`, `.idea`, `target`, `.svelte-kit`, `.parcel-cache`

In addition, any **hidden (dot-prefixed) directory** is skipped (which is why `.venv` must be detected explicitly rather than scanned). Directories with these names cannot be used as scan targets.

The scan is capped at **5000** matching files per scope. Overlapping scopes are fine - a file found twice is listed once.

## Generate vs Rescan

Two related but distinct actions:

- **Generate** - creates the project's `.buttons.json` from scratch with every **root-level** discovered script. It only appears when no project file exists yet. Use it the first time you open a project.
- **Rescan** - re-runs the scanner against the **existing** file. It:
  - keeps your included scripts and notes,
  - recomputes their commands (e.g. after a package-manager change),
  - marks scripts that no longer exist as **not found**,
  - leaves newly-discovered scripts unchecked for you to opt in,
  - never touches custom command entries.

In short: **Generate** seeds the file; **Rescan** updates it in place without overriding your custom commands or selections.

[Back to index](index.md)
