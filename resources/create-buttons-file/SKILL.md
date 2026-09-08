---
name: create-buttons-file
description: >-
  Creates and edits CurbSoftware Buttons `.buttons.json` and `~/.buttons.json`
  files using the full v1 schema: script, command, and nested args variants.
  Use when generating a buttons file, writing `.buttons.json`, adding Buttons
  commands or variants, setting packageManager, packageDir, children, or args,
  or working with the Buttons VS Code extension.
---

# Create Buttons files

Write a complete, valid Buttons v1 JSON file. Do not invent fields, entry types, or auto-discovered ecosystems that this schema does not support.

## Output files

| Scope | Path | When |
| --- | --- | --- |
| Project | `<workspace>/.buttons.json` | Default. Current workspace only. |
| Global | `~/.buttons.json` | Only when the user asks for global buttons. |

Same schema in both. Prefer editing the existing file in place. Do not overwrite notes, `id`s, custom commands, children, or button order unless asked.

## Workflow

1. Read the existing project file (and global file if relevant). Merge; do not wipe.
2. Detect the Node package manager from **root** lockfiles, first match wins: `pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, `bun.lockb` → `bun`, `package-lock.json` → `npm`. Else `npm`.
3. Scan the repo (skip `node_modules`, VCS, build/cache dirs, hidden dirs). Collect:
   - `package.json` `scripts` (string values only)
   - `Makefile` targets (`^[A-Za-z_][A-Za-z0-9_-]*:`, skip `.` names)
   - `composer.json` `scripts` (string values only)
   - `justfile` recipes (skip `_` private names)
   - `Cargo.toml` → synthetic `build` / `test` / `run`
   - `go.mod` → synthetic `build` / `test` / `run`
   - `*.sh`
   - Python entry files: `app.py`, `main.py`, `manage.py`, `run.py`, `server.py` only
   - `venv/` or `.venv/` → venv buttons
4. Prefer `type: "script"` for anything the scanner understands. Use `type: "command"` for everything else (docker, pytest, poetry, uv, clippy, .NET, `pyproject.toml`, etc.).
5. Add `children` args variants where flags obviously branch (filters, watch, verbose, env).
6. Write pretty JSON (2-space indent) plus a trailing newline. POSIX paths only (`/`, never `\`).

## File schema

```ts
type ButtonsFile = { version: 1; buttons: ButtonEntry[] };
type ButtonEntry = ScriptButton | CommandButton; // top-level: never args-only
type ButtonChild = ScriptButton | CommandButton | ArgsButton;
```

`version` is optional on read (defaults to `1`). Always write `version: 1`. Only version `1` is valid. Extra JSON keys are dropped on parse; do not write them.

`buttons` may be omitted or `[]` (empty file). If present it must be an array.

### ScriptButton (`type: "script"`)

Live reference. The runnable command is **recomputed on every scan**, not stored.

| Field | Required | Type | Rules |
| --- | --- | --- | --- |
| `type` | yes | `"script"` | Exact. |
| `file` | yes | string | POSIX path of the manifest, script file, or venv dir. Workspace-relative, or absolute if outside the workspace. |
| `script` | yes | string | Script/target name, or the file's relative path for `.sh` / Python entry files. Exact venv names below. |
| `packageDir` | no | string | Directory of `file` (`""` = workspace root). Terminal cwd when the button runs. Default `""`. Always write it. |
| `packageManager` | no | enum | See table below. Invalid values become `npm`. |
| `note` | no | string | Shown next to the button. Kept even if `""`. Omit when unused. |
| `id` | no | string | Stable UI identity. Keep existing ids. Omit on new entries (empty string is dropped). |
| `args` | no | string | Extra flags appended to **this** row's resolved command. Trimmed; empty/whitespace omitted. |
| `children` | no | `ButtonChild[]` | Nested variants. Empty array omitted. |

Do **not** write `command` on a script entry.

### CommandButton (`type: "command"`)

Literal command, stored verbatim, never rewritten. No `file`, `script`, `packageDir`, or `packageManager`.

| Field | Required | Type | Rules |
| --- | --- | --- | --- |
| `type` | yes | `"command"` | Exact. |
| `command` | yes | string | Non-empty (whitespace-only rejected). Write trimmed. |
| `note` | no | string | Same as script. |
| `id` | no | string | Same as script. |
| `args` | no | string | Appended to `command`. |
| `children` | no | `ButtonChild[]` | Nested variants. |

Command entries have no cwd field. Need a subdirectory? Use a script entry, or `cd dir && ...` inside `command`. Nested command children do **not** inherit a script parent's `packageDir`.

### ArgsButton (child only)

No `type` key. Invalid at top level (`buttons[i]` must be script or command).

| Field | Required | Type | Rules |
| --- | --- | --- | --- |
| `args` | yes | string | Non-empty after trim. Appended to the **parent's resolved command**. |
| `note` | no | string | Same as script. |
| `id` | no | string | Same as script. |
| `children` | no | `ButtonChild[]` | Nested variants; nested args append to **this** variant's resolved command. |

Do **not** write `type`, `command`, `file`, `script`, `packageDir`, or `packageManager` on an args child.

## packageManager and resolved commands

| `packageManager` | Typical `file` | `script` | Resolved command |
| --- | --- | --- | --- |
| `npm` | `package.json` | name in `scripts` | `npm run <script>` |
| `pnpm` | `package.json` | name in `scripts` | `pnpm <script>` |
| `yarn` | `package.json` | name in `scripts` | `yarn <script>` |
| `bun` | `package.json` | name in `scripts` | `bun <script>` |
| `make` | `Makefile` | target name | `make <script>` |
| `composer` | `composer.json` | name in `scripts` | `composer <script>` |
| `just` | `justfile` | recipe name | `just <script>` |
| `shell` | `*.sh` | **same as `file`** (relative path) | `bash <basename>` with cwd `packageDir` |
| `python` | entry `.py` | **same as `file`** | `python <basename>` with cwd `packageDir` |
| `python` | `venv` / `.venv` | see venv scripts | discovered activate/deactivate/pip; **not** `python "Activate venv"` |
| `cargo` | `Cargo.toml` | `build` \| `test` \| `run` | `cargo <script>` |
| `go` | `go.mod` | `build` \| `test` \| `run` | `go build` / `go test` / `go run .` |

If the script is not found on disk, Buttons falls back to `scriptCommand(packageManager, script)` and marks the row missing. Match `file` + `script` to real paths so commands stay live.

Exact basenames the scanner looks for: `package.json`, `Makefile` (capital M), `composer.json`, `justfile` (lowercase), `Cargo.toml`, `go.mod`. Not `makefile`, `GNUmakefile`, `Justfile`, `bun.lock` (only `bun.lockb` auto-detects bun).

## Script identity by kind

Identity key is `file:script`.

**Node / Composer.** `file` is the posix path to the json file. `script` is the key in `scripts`. `packageDir` is that file's directory. One lockfile at the **workspace root** picks npm/pnpm/yarn/bun for every `package.json` in the repo.

**Make / Just.** `file` is `Makefile` or `justfile` (or nested `pkg/Makefile`). `script` is the target/recipe. Skip Makefile names starting with `.` and just recipes starting with `_`.

**Cargo / Go.** `file` is `Cargo.toml` or `go.mod`. `script` is exactly `build`, `test`, or `run`. Do not parse every cargo target or go package.

**Shell.** `file` and `script` are both the workspace-relative path (`scripts/migrate.sh`). `packageDir` is the file's directory (`scripts`). Runtime command uses the basename (`bash migrate.sh`) because cwd is `packageDir`. Quote is added only when the path has whitespace.

**Python entry.** Same as shell, but only those five filenames. `packageManager`: `"python"`. Arbitrary `.py` files are **not** auto scripts; use `type: "command"`.

**Venv.** `file` is the venv directory path (`venv`, `.venv`, `packages/api/.venv`). `packageDir` is the **parent** of that directory (`""` or `packages/api`). `packageManager`: `"python"`. Exact `script` values:

| `script` | Typical discovered command (cwd = `packageDir`) |
| --- | --- |
| `Activate venv` | `source venv/bin/activate` (or Windows `Activate.ps1` / `activate.bat`) |
| `Deactivate` | `deactivate` |
| `Install requirements` | `venv/bin/pip install -r requirements.txt` (only if `requirements.txt` sits next to the venv) |

Use the venv directory **name** in the discovered command (`source .venv/bin/activate` from `packages/api`), not the full `file` path.

## Children and variants

Any script, command, or args entry may have `children` at any depth.

| Child shape | Resolves to |
| --- | --- |
| `{ "args": "<flags>", "note?": "..." }` | Parent resolved command + space + flags. Nested args append to that variant, not the original parent. Inherits script parent's `packageDir`. |
| `{ "type": "command", "command": "..." }` | Independent literal. Does not inherit parent command or `packageDir`. |
| `{ "type": "script", "file": "...", "script": "..." }` | Independent script, resolved from the scan on its own. |

`args` on a **parent** (script/command) always applies to that parent row, then children append on top of the already-appended parent command.

```text
{ type, command/script, args: "--watch", children: [
    { args: "--verbose" },                          // parentResolved --verbose
    { args: "--filter web", children: [
        { args: "--debug" }                         // parentResolved --filter web --debug
      ]},
    { type: "command", command: "pnpm --filter api dev" },
    { type: "script", file: "apps/web/package.json", script: "dev", packageDir: "apps/web", packageManager: "pnpm" }
]}
```

UI **+ Add variant** creates an args child of that row (args are appended to that row's resolved command). Command/script children are JSON-only.

Buttons 2.0.1 and earlier drop `children`, `args`, and `id` on write. Need Buttons 2.1+.

## Write conventions

- Always `"version": 1` and a `buttons` array.
- Omit unused optional fields (`note`, `id`, `args`, `children`).
- Always set `packageDir` on scripts, including `""` for root.
- Trim `command` and `args`. Do not emit empty `args`.
- Do not emit args-only objects in `buttons`.
- Do not emit `command` on scripts, or script fields on commands.
- Preserve existing `id` values when editing.
- 2-space JSON + trailing newline (same as `JSON.stringify(file, null, 2) + "\n"`).
- Do not auto-parse `pyproject.toml`, Poetry, uv, pipenv, .NET, Gradle, or similar. Those are `type: "command"` entries.

## Validation errors (parser)

| Condition | Message |
| --- | --- |
| Bad JSON | `Invalid JSON.` |
| Top-level not an object | `Top-level value must be an object.` |
| `version` present and not `1` | `Unsupported version: <v>. Only version 1 is supported.` |
| `buttons` not an array | `"buttons" must be an array.` |
| Entry not an object | `<path> must be an object.` |
| Script missing string `file`/`script` | `<path> script entry requires string "file" and "script".` |
| Command empty/non-string | `<path> command entry requires a non-empty "command".` |
| Args child empty/non-string `args` | `<path> args entry requires a non-empty "args".` |
| `children` present but not an array | `<path> "children" must be an array.` |
| Unknown `type` (including args at top level) | `<path> has unknown type: <v>. Expected "script" or "command".` |

A failed parse makes Buttons treat the file as empty until it is fixed.

## What a "full" file includes

When asked for a full `.buttons.json`:

- One script button per discovered script you intend to expose (match Generate for root-level scripts: every root `packageDir === ""` script).
- Nested packages, shell scripts, and Python entries you actually found, even if they would need a scan directory in the UI.
- Venv buttons when `venv` / `.venv` exists.
- Command buttons for useful tasks the scanner cannot see.
- Args `children` for real flag variants, not speculative ones.

Do not dump every noisy `test:*` / `*:watch` script unless the user wants all of them. Prefer the named scripts people actually run (`dev`, `start`, `build`, `test`, `lint`, `format`).

## Additional resources

- Formal JSON Schema: [schema.md](schema.md)
- Copy-paste examples for every kind and variant: [examples.md](examples.md)
