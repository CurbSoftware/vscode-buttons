# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run compile      # Compile TypeScript to dist/
npm run watch        # Watch mode (continuous compilation)
npm run lint         # Type-check only (tsc --noEmit)
npm test             # Compile + run all tests (Node.js built-in test runner)
npm run package      # Package as .vsix via vsce
```

**Development workflow:** Run `npm run watch` in a terminal, then press F5 in VSCode to launch the Extension Development Host. Reload with Ctrl+Shift+F5 after changes.

**Running a single test file:** `npm run compile && node --test dist/test/configHelpers.test.js`

## Architecture

The extension activates when a workspace contains a `.buttons` file (`workspaceContains:.buttons`) or on startup (for user `~/.buttons`). Main entry: `dist/extension.js` (compiled from `src/extension.ts`).

### Data flow

```
.buttons (TOML file)
  → config/findButtonsFile.ts      finds the file in workspace root or ~/
  → config/loadButtonsConfig.ts    reads file via vscode.workspace.fs, parses TOML
  → config/configHelpers.ts        validates, resolves templates/macros/generation (all pure functions)
  → config/displaySettings.ts      reads VS Code settings for display/styling config
  → models/types.ts                ButtonsDocument → ResolvedButtonsConfig (with diagnostics)
  → extension.ts                   caches as LoadedButtonsState, passes to panel
  → panel/ButtonsRenderer.ts       server-side renders HTML webview with buttons
  → execution/actions.ts           runs commands in terminal, opens URLs/ports, copies to clipboard

Script scanning (optional):
  → scanner/scriptScanner.ts       scans package.json, Makefile for scripts
  → scanner/types.ts               DiscoveredScript interface (pure, no vscode dep)
  → generator/tomlGenerator.ts     generates .buttons TOML from discovered scripts (pure)
  → generator/buttonsGenerator.ts  VS Code UI: QuickPick, file creation, import flow
```

### Key modules

- **extension.ts** — Registers commands (including `buttons.importScripts`), manages global `currentState: CombinedButtonsState`, sets up debounced file watcher for `.buttons` changes, listens for VS Code settings changes, wires panel callbacks
- **config/configHelpers.ts** — All pure functions: TOML validation, macro expansion (with cycle detection), cartesian product button generation (with 1000-button explosion guard), danger detection, defaults cascade, template application, slug/title utilities
- **config/displaySettings.ts** — `buildDisplayFromSettings()` reads `buttons.*`, `buttons.appearance.*`, `buttons.actions.*` VS Code settings and constructs a `ResolvedGroupDisplay` object
- **config/loadButtonsConfig.ts** — Thin wrapper: reads `.buttons` file via vscode API, parses TOML via `@iarna/toml`, delegates to configHelpers for validation and resolution
- **panel/ButtonsRenderer.ts** — Webview with inline HTML/CSS/JS (no frontend framework). Communicates with extension host via `PanelActionMessage` discriminated union. Uses VSCode theme CSS variables for styling. Renders action buttons (Run, New Terminal, Copy to Terminal, Copy to New Terminal, Copy to Clipboard). All display/styling comes from VS Code settings, not from `.buttons` files
- **execution/actions.ts** — Terminal creation/reuse (named "Buttons"), `sendText()` for command execution, copy-to-terminal (current and new), `vscode.env.openExternal()` for URLs/ports
- **scanner/scriptScanner.ts** — Scans workspace for package.json scripts and Makefile targets, detects package manager from lockfiles
- **generator/tomlGenerator.ts** — Pure function that generates `.buttons` TOML from `DiscoveredScript[]` (testable without vscode)
- **generator/buttonsGenerator.ts** — VS Code UI command for importing scripts: QuickPick multi-select, file creation/replacement
- **models/types.ts** — All interfaces. Key hierarchy: `ButtonsDocument` (raw TOML) → `ResolvedButtonsConfig` (processed, extends `ResolvedGroupDisplay`) wrapped in `LoadedButtonsState` (with file path and diagnostics)

### Display/styling architecture

All display and styling configuration lives in VS Code settings (not in `.buttons` files):
- `buttons.appearance.*` — showLabels, showIcons, compact, buttonColor, groupBackgroundColor, labelSize, commandClickToCopy
- `buttons.actions.*` — showRun, showNewTerminal, etc., runLabel, newTerminalLabel, etc., actionSize, actionBorderRadius

The `.buttons` file's `[display]` block is deprecated and ignored (a warning diagnostic is emitted). Group-level `layout` overrides are still supported.

### Config resolution pipeline (configHelpers.ts)

1. Parse TOML into `ButtonsDocument`
2. Validate version, field types, icons (codicon format), colors (hex), ports
3. Emit deprecation warnings for any `[display]` blocks
4. Expand macros recursively with circular reference detection
5. Apply templates — substitute `{{base}}`, `{{arg1}}`, `{{arg2}}`, variables
6. Generate buttons from `[generate]` blocks (cartesian product, capped at 1000)
7. Cascade defaults from document → group → button level
8. Detect dangerous commands by keyword matching
9. Deduplicate button IDs (first wins, duplicates emit error diagnostic)
10. Apply display defaults from VS Code settings (passed in as `ResolvedGroupDisplay`)
11. Return `ResolvedButtonsConfig` + diagnostics array

### Testing

Tests live in `src/test/` and use Node.js built-in test runner (`node:test` + `node:assert/strict`). Zero test dependencies. Tests cover:
- `configHelpers.test.ts` — cartesian, template expansion, macro resolution, validation, document resolution, danger detection, utility functions, deprecation warnings
- `buttonsGenerator.test.ts` — TOML generation from discovered scripts
- `includesMerge.test.ts` — file include merging

### Releasing

```bash
npm run package              # Creates .vsix file via vsce
npm run publish:marketplace  # Publish to VS Code Marketplace (vsce publish)
npm run publish:ovsx         # Publish to Open VSX Registry (VS Codium)
```

The same `.vsix` file works for both marketplaces. Pre-release: bump `version` in `package.json`, update `CHANGELOG.md`, run `npm test` and `npm run lint`, then `vsce package` and test the `.vsix` locally before publishing.
