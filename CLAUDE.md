# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Do NOT use em-dashes ever.  Do not use "—" symbol anywhere, change and code or text copy found during tasks to remove them.  Write in a humanistic way.


## Commands

```bash
npm run lint      # type-check only (tsc --noEmit)
npm test          # clean + compile + node --test dist/test/**/*.test.js
npm run watch     # continuous compile; then F5 for the Extension Development Host
npm run package   # vsce package into release/ (gitignored)
```

Run a single test file after `npm run compile`: `node --test dist/test/scanner.test.js`. Requires Node >= 22. Only `vscode`-free modules are unit-tested (see architecture below) — code that imports `vscode` is exercised via the F5 host.

## Architecture

VS Code extension ("Buttons", publisher CurbSoftware) that scans a project for scripts and turns them into clickable terminal-launcher buttons. Sidebar webview view + editor webview panel, both rendered by one shared renderer.

**The load-bearing rule: pure-vscode-free core, thin vscode adapter.** These modules must never import `vscode` and are directly unit-tested with the Node built-in runner:

- `src/scanner/types.ts` — `DiscoveredScript`, `PackageManager`/`ScriptFileType` unions, parsers for package.json/Makefile/justfile, `scriptCommand`, `fileEntryScript` (standalone .sh / Python entry files)
- `src/scanner/scanScope.ts` — scan-scope model: `normalizeScanDirectories` (setting validation), `scanScopePatterns` (per-directory globs), `venvButtons`
- `src/config/buttonsFile.ts` — `.buttons.json` parse/serialize/immutable mutations, `resolveButtons` (recomputes script commands from the live scan), `generateButtonsFile`
- `src/panel/scanGrouping.ts` — groups discovered scripts by file for the Scripts tab

The vscode layer: `src/scanner/scriptScanner.ts` (findFiles per scope + venv stat detection), `src/config/buttonsStore.ts` (`loadRuntimeState`, settings reads), `src/extension.ts` (command registration, watcher wiring, `handlePanelMessage` routing), `src/panel/ButtonsRenderer.ts` (single `renderHtml(state, codiconUri, variant)` producing the full webview HTML/CSS/JS string).

**Scanning model (2.0+):** the project root is always scanned at its top level only; extra scopes come from the `buttons.scanDirectories` setting (`{path, recursive}[]`, workspace/resource scope). Discovered kinds: the four manifests plus `.sh` files, Python entry files (`app.py`, `main.py`, `manage.py`, `run.py`, `server.py`), and synthetic venv buttons (`Activate`/`Deactivate`/`Install requirements`, grouped under the venv dir path). Hidden dirs and `EXCLUDE_DIRS` names are excluded everywhere and cannot be scan targets.

**Command semantics:** every discovered command runs with the terminal cwd set to the script file's directory (`packageDir`), and paths inside commands are written relative to that directory (`scripts/migrate.sh` → `bash migrate.sh`). `runInCurrentTerminal` sends a `cd "<dir>"` line before the command when reusing a terminal — as two `sendText` calls, never `&&` (PowerShell 5.1 has no `&&`).

**Identity and persistence:** script identity is `scriptKey` = `file:script`; `.buttons.json` stays schema v1 (`script` | `command` entries) — for standalone file entries `script` holds the file's relative path so commands recompute everywhere. Entries for vanished files degrade to `missing` (Run/Copy disabled) rather than being deleted.

**State flow:** watchers (`.buttons.json`, script-file globs, global file fs.watch, config changes) all funnel into the module-level debounced `sharedRefreshAll` — overlapping triggers coalesce into one full re-render (webview HTML is reassigned wholesale). The webview preserves focus target, group-collapse state, and edit-form drafts across those reloads via `vscode.setState`. Panel→host messages are the `PanelActionMessage` union in `src/models/types.ts`; every mutation = pure function → `writeButtonsFile` → refresh.

**Settings:** `buttons.textSize`, `buttons.scriptFiles` (enum incl. `shell`/`python`, default `["package.json","shell","python"]`), `buttons.scanDirectories`. Schema lives in `package.json` `contributes.configuration`.

## Docs are maintained in two places

This repo's `docs/*.md` and the website repo at `../buttons-website` (Astro + Starlight, `src/content/docs/docs/*.md`, deployed manually via `npm run deploy` = build + wrangler to Cloudflare at buttons.curbsoftware.com). Feature changes must update both. Both sides intentionally contain near-identical "2.0 change" callouts describing the old whole-workspace scan behavior.

## Release

Automated by `.github/workflows/publish.yml`, triggered by a **GitHub Release** (tag `vX.Y.Z` must equal `package.json` version; workflow lint → test → vsce → ovsx). Ritual: bump version → `npm install` (sync lockfile) → date the CHANGELOG entry → commit + push main → create the GitHub Release → verify both marketplaces. Marketplace versions are immutable — a failed publish means a new patch version. Full runbook: `RELEASING.md`.
