# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run clean        # Remove dist/ (stale compiled files)
npm run compile      # Clean + compile TypeScript to dist/
npm run watch        # Watch mode (continuous compilation)
npm run lint         # Type-check only (tsc --noEmit)
npm test             # Compile + run all tests (Node.js built-in test runner)
npm run package      # Package as .vsix via vsce
```

**Development workflow:** Run `npm run watch` in a terminal, then press F5 in VSCode to launch the Extension Development Host. Reload with Ctrl+Shift+F5 after changes.

**Running a single test file:** `npm run compile && node --test dist/test/scanner.test.js`

## What the extension does

Buttons scans a project for scripts (`package.json` scripts and `Makefile` targets, including nested packages in monorepos), lets the user select which to include by checkbox, add custom commands, and run them from a single sidebar table (Run / New Terminal / Copy, plus inline edit/remove). Config persists to JSON files: `<workspace root>/.buttons.json` (project) and `~/.buttons.json` (global, applies to every project).

## Architecture

The extension activates via `workspaceContains:.buttons.json` or `onStartupFinished`, and on Activity Bar icon click (`onView:buttons.sidebarView`). Main entry: `dist/extension.js` (compiled from `src/extension.ts`).

### Data flow

```
package.json / Makefile (workspace tree)
  → scanner/scriptScanner.ts      finds script files (excluding node_modules etc.), parses into DiscoveredScript[]
  → config/buttonsFile.ts         pure parse/serialize/mutate of .buttons.json + resolveButtons (recompute command from scan)
  → config/buttonsStore.ts        vscode IO: read/write files, loadRuntimeState (project + global + scan)
  → models/types.ts               ButtonsFile → RuntimeState → WebviewState
  → extension.ts                  caches RuntimeState, handles PanelActionMessage, watchers
  → panel/ButtonsRenderer.ts      server-renders the sidebar HTML (scan section + two tables)
  → execution/actions.ts          runs commands in terminals / copies to clipboard
```

### Key modules

- **extension.ts** — Registers 5 commands (`buttons.openPanel`, `buttons.openMainPanel`, `buttons.rescan`, `buttons.openProjectButtons`, `buttons.openGlobalButtons`), manages module-level `currentState: RuntimeState` plus transient `editing`/`addingSource`, sets up debounced file watchers (project `.buttons.json`, script files, global `~/.buttons.json` via `fs.watch`), and routes webview messages to file mutations.
- **config/buttonsFile.ts** — Pure (no `vscode` import), directly unit-tested. `parseButtonsFile`/`serializeButtonsFile`, immutable mutations (`addScriptButton`, `removeScriptButton`, `addCommandButton`, `updateCommandButton`, `setButtonNote`, `removeButton`), and `resolveButtons` (script refs recompute their command from the current scan; a ref with no matching script becomes `missing`).
- **config/buttonsStore.ts** — vscode layer: `readButtonsFile`/`writeButtonsFile`/`loadRuntimeState`.
- **config/findButtonsFile.ts** — URI resolution: `getProjectButtonsFileUri()` (`<root>/.buttons.json`), `getGlobalButtonsFileUri()` (`~/.buttons.json`), `getWorkspaceFolderUri()`.
- **scanner/types.ts** — Pure: `DiscoveredScript`, `PackageManager`, `scriptKey`, `scriptCommand`, `EXCLUDE_DIRS`, `shouldIgnoreDir`, `parsePackageJsonText`, `parseMakefileText`, `iconForScript`.
- **scanner/scriptScanner.ts** — vscode wrapper: `scanWorkspaceScripts` uses `vscode.workspace.findFiles` with an exclude glob, detects the package manager from root lockfiles, and parses each file.
- **panel/ButtonsRenderer.ts** — Webview with inline HTML/CSS/JS (no framework). `renderHtml(state, codiconUri)` builds the header, scan section, and two tables. Uses VS Code theme CSS variables and `@vscode/codicons`.
- **panel/ButtonsSidebarProvider.ts** — The single `WebviewViewProvider`; serves the codicon CSS and delegates messages to the extension host.
- **execution/actions.ts** — `runInCurrentTerminal` (reuse active terminal or a named "Buttons" terminal), `runInNewTerminal` (named `Buttons: <label>`), `copyToClipboard`.
- **models/types.ts** — All interfaces: `ScriptButton`/`CommandButton`/`ButtonEntry`/`ButtonsFile`, `ResolvedButton`, `RuntimeState`, `WebviewState`, `PanelActionMessage`.

### Storage model

`.buttons.json` holds a flat `buttons` array. Each entry is one of:

- `{ type: "script", file, script, packageDir, packageManager, note? }` — a live reference; the command is recomputed as `pnpm dev`/`bun dev`/etc. on every rescan.
- `{ type: "command", command, note? }` — a literal custom command.

The checkbox selection state is derived from which `script` entries exist in the project file (keyed by `file:script`). Running a script button opens a terminal with `cwd` set to the script's `packageDir`.

### Testing

Tests live in `src/test/` and use Node.js built-in test runner (`node:test` + `node:assert/strict`). Zero test dependencies. Only pure (vscode-free) modules are tested — the same convention as before:

- `scanner.test.ts` — `shouldIgnoreDir`, `parsePackageJsonText`, `parseMakefileText`, `scriptCommand`, `scriptKey`
- `buttonsFile.test.ts` — `parseButtonsFile` validation, serialization round-trip, mutations
- `references.test.ts` — `resolveButtons` (command recomputation, missing refs, command pass-through)

### Releasing

```bash
npm run package              # Creates .vsix file via vsce
npm run publish:marketplace  # Publish to VS Code Marketplace (vsce publish)
npm run publish:ovsx         # Publish to Open VSX Registry (VS Codium)
```

Pre-release: bump `version` in `package.json`, update `CHANGELOG.md`, run `npm test` and `npm run lint`, then `vsce package` and test the `.vsix` locally before publishing.
