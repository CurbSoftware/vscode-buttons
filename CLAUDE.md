# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run compile      # Compile TypeScript to dist/
npm run watch        # Watch mode (continuous compilation)
npm run lint         # Type-check only (tsc --noEmit)
npm run package      # Package as .vsix via vsce
```

**Development workflow:** Run `npm run watch` in a terminal, then press F5 in VSCode to launch the Extension Development Host. Reload with Ctrl+Shift+F5 after changes.

**No test suite is configured.** There are no test files, test runner, or test scripts.

## Architecture

The extension activates when a workspace contains a `.buttons` file (`workspaceContains:.buttons`). Main entry: `dist/extension.js` (compiled from `src/extension.ts`).

### Data flow

```
.buttons (TOML file)
  → config/findButtonsFile.ts    finds the file in workspace root
  → config/loadButtonsConfig.ts  parses TOML, validates, resolves templates/macros/generation
  → models/types.ts              ButtonsDocument → ResolvedButtonsConfig (with diagnostics)
  → extension.ts                 caches as LoadedButtonsState, passes to panel
  → panel/ButtonsPanel.ts        server-side renders HTML webview with buttons
  → execution/actions.ts         runs commands in terminal, opens URLs/ports, copies to clipboard
```

### Key modules

- **extension.ts** — Registers 9 commands, manages global `currentState: LoadedButtonsState`, sets up file watcher for `.buttons` changes, wires panel callbacks
- **config/loadButtonsConfig.ts** — Core logic: TOML parsing via `@iarna/toml`, schema validation, macro expansion (with cycle detection), cartesian product button generation, danger detection (pattern-matches `rm`, `drop`, `deploy`, etc.), defaults cascade (button → group → document)
- **panel/ButtonsPanel.ts** — Webview with inline HTML/CSS/JS (no frontend framework). Communicates with extension host via `PanelActionMessage` discriminated union. Uses VSCode theme CSS variables for styling
- **execution/actions.ts** — Terminal creation/reuse (named "Buttons"), `sendText()` for command execution, `vscode.env.openExternal()` for URLs/ports
- **models/types.ts** — All interfaces. Key hierarchy: `ButtonsDocument` (raw TOML) → `ResolvedButtonsConfig` (processed) wrapped in `LoadedButtonsState` (with file path and diagnostics)

### Config resolution pipeline (loadButtonsConfig.ts)

1. Parse TOML into `ButtonsDocument`
2. Validate version, field types, icons (codicon format), colors (hex), ports
3. Expand macros recursively with circular reference detection
4. Apply templates — substitute `{{base}}`, `{{arg1}}`, `{{arg2}}`, variables
5. Generate buttons from `[generate]` blocks (cartesian product of params)
6. Cascade defaults from document → group → button level
7. Detect dangerous commands by keyword matching
8. Return `ResolvedButtonsConfig` + diagnostics array

### Webview communication

The panel uses message passing with `PanelActionMessage` types: `reload`, `run`, `copy`, `open-url`, `open-port`. The webview posts messages with `data-action` attributes routed through a single click handler.
