# Script scanning

Buttons discovers runnable scripts by scanning the workspace, then renders them as buttons.

## Script file types

Four formats are parsed, controlled by the [`buttons.scriptFiles`](configuration.md#buttonsscriptfiles) setting:

| File | Ecosystem | Parsed as |
| --- | --- | --- |
| `package.json` | Node.js / TypeScript | The `scripts` object. |
| `Makefile` | C/C++, Go, generic | Top-level targets (`name:`). |
| `composer.json` | PHP | The `scripts` object, run with `composer <name>`. |
| `justfile` | Universal task runner | Recipes (`name:`), excluding private `_`-prefixed recipes. |

For `package.json`, the script body (and for `Makefile`/`justfile`, a preceding `#` comment) is captured as a description shown with the button.

Only these formats are parsed. Other ecosystems (Python `pyproject.toml`, Rust `Cargo.toml`, .NET, etc.) are not auto-detected - add their commands with **+ Add command** instead (see [Using the panel](usage.md#adding-a-custom-command)).

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

Buttons scans for `package.json` and `composer.json` files in **nested directories**, so a monorepo is handled naturally:

```text
project/
├── package.json
├── apps/
│   └── web/package.json
├── packages/
│   └── api/package.json
└── plugin/composer.json
```

Each script's `packageDir` is its file's directory, and running it opens a terminal with the working directory set there - so `pnpm dev` in `apps/web` runs in the right place.

## Ignored directories

These directories are never scanned (installed packages, VCS, and build/cache output):

`node_modules`, `.git`, `.hg`, `.svn`, `.next`, `.nuxt`, `.output`, `.cache`, `.turbo`, `.yarn`, `.pnpm-store`, `dist`, `build`, `out`, `coverage`, `vendor`, `.venv`, `venv`, `__pycache__`, `.vscode`, `.idea`, `target`, `.svelte-kit`, `.parcel-cache`

In addition, any **hidden (dot-prefixed) directory** is skipped.

The scan is capped at **5000** matching files.

## Generate vs Rescan

Two related but distinct actions:

- **Generate** - creates the project's `.buttons.json` from scratch with **every** discovered script. It only appears when no project file exists yet. Use it the first time you open a project.
- **Rescan** - re-runs the scanner against the **existing** file. It:
  - keeps your included scripts and notes,
  - recomputes their commands (e.g. after a package-manager change),
  - marks scripts that no longer exist as **not found**,
  - leaves newly-discovered scripts unchecked for you to opt in,
  - never touches custom command entries.

In short: **Generate** seeds the file; **Rescan** updates it in place without overriding your custom commands or selections.

[Back to index](index.md)
