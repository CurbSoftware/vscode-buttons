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

The extension activates when a workspace contains a `.buttons` file (`workspaceContains:.buttons`). Main entry: `dist/extension.js` (compiled from `src/extension.ts`).

### Data flow

```
.buttons (TOML file)
  → config/findButtonsFile.ts      finds the file in workspace root
  → config/loadButtonsConfig.ts    reads file via vscode.workspace.fs, parses TOML
  → config/includesHelper.ts       resolves file includes, merges into document
  → config/configHelpers.ts        validates, resolves templates/macros/generation (all pure functions)
  → models/types.ts                ButtonsDocument → ResolvedButtonsConfig (with diagnostics)
  → extension.ts                   caches as LoadedButtonsState, passes to panel
  → panel/ButtonsPanel.ts          server-side renders HTML webview with buttons
  → execution/actions.ts           runs commands in terminal, opens URLs/ports, copies to clipboard
```

### Key modules

- **extension.ts** — Registers 9 commands, manages global `currentState: LoadedButtonsState`, sets up debounced file watcher for `.buttons` changes, wires panel callbacks
- **config/configHelpers.ts** — All pure functions: TOML validation, macro expansion (with cycle detection), cartesian product button generation (with 1000-button explosion guard), danger detection, defaults cascade, template application, slug/title utilities
- **config/loadButtonsConfig.ts** — Thin wrapper: reads `.buttons` file via vscode API, parses TOML via `@iarna/toml`, delegates to configHelpers for validation and resolution
- **config/includesHelper.ts** — Resolves file includes referenced in `.buttons` files, merging included content into the document
- **panel/ButtonsPanel.ts** — Webview with inline HTML/CSS/JS (no frontend framework). Communicates with extension host via `PanelActionMessage` discriminated union. Uses VSCode theme CSS variables for styling. Renders 5 action buttons per button (Run, New Terminal, Copy to Terminal, Copy to New Terminal, Copy to Clipboard) with custom labels, icons, and sizes. Supports click-to-copy on command preview and per-group display settings via group-level `[display]` blocks. Toolbar icon appears in the editor title bar
- **execution/actions.ts** — Terminal creation/reuse (named "Buttons"), `sendText()` for command execution, copy-to-terminal (current and new), `vscode.env.openExternal()` for URLs/ports, all with try/catch error handling
- **models/types.ts** — All interfaces. Key hierarchy: `ButtonsDocument` (raw TOML) → `ResolvedButtonsConfig` (processed, extends `ResolvedGroupDisplay`) wrapped in `LoadedButtonsState` (with file path and diagnostics). `MergedDisplaySettings` was removed as dead code; `loadButtonsState` deprecated function was removed

### Config resolution pipeline (configHelpers.ts)

1. Parse TOML into `ButtonsDocument`
2. Validate version, field types, icons (codicon format), colors (hex), ports
3. Expand macros recursively with circular reference detection
4. Apply templates — substitute `{{base}}`, `{{arg1}}`, `{{arg2}}`, variables
5. Generate buttons from `[generate]` blocks (cartesian product, capped at 1000)
6. Cascade defaults from document → group → button level
7. Detect dangerous commands by keyword matching
8. Deduplicate button IDs (first wins, duplicates emit error diagnostic)
9. Return `ResolvedButtonsConfig` + diagnostics array

### Testing

Tests live in `src/test/` and use Node.js built-in test runner (`node:test` + `node:assert/strict`). Zero test dependencies. Tests cover `configHelpers.ts` pure functions: cartesian, template expansion, macro resolution, validation, document resolution, danger detection, and utility functions.
