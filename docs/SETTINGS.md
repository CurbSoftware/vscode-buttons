# Settings & Commands

## VS Code Settings

Configure Buttons via VS Code settings (`Ctrl+,` / `Cmd+,`). These serve as fallback values when the `.buttons` file does not specify them.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `buttons.defaultLayout` | `string` | `"grid"` | Fallback layout when the `.buttons` file does not specify one. Options: `grid`, `rows`, `columns`, `table`, `flow`. |
| `buttons.defaultTerminalMode` | `string` | `"current"` | Fallback terminal mode. Options: `current`, `new`. |
| `buttons.showCommandPreview` | `boolean` | `true` | Show command preview text in the panel. Overridden by `[display] show_command` in the `.buttons` file. |
| `buttons.watchConfigChanges` | `boolean` | `true` | Watch `.buttons` files for changes and auto-refresh the panel. Changes are debounced by 300ms. |
| `buttons.confirmDangerousCommands` | `boolean` | `true` | Show a confirmation dialog before running buttons marked as `danger = true` or `confirm = true`. |
| `buttons.autoOpen` | `string` | `"firstTime"` | Control sidebar auto-open behavior. Options: `never`, `firstTime` (once per workspace), `always`. |
| `buttons.showToolbarIcon` | `boolean` | `true` | Show the Buttons icon in the editor toolbar (top right). |

### Settings vs `.buttons` Display

The VS Code settings act as fallbacks. The `.buttons` file's `[display]` block takes precedence:

| `.buttons` display field | VS Code setting fallback |
|--------------------------|--------------------------|
| `show_command` | `buttons.showCommandPreview` |
| — | `buttons.defaultLayout` |
| — | `buttons.defaultTerminalMode` |

Fields like `show_labels`, `show_icons`, `compact`, `button_color`, and `group_bg_color` are configured only in the `.buttons` file.

## Commands

All commands are available via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).

| Command | Title | Description |
|---------|-------|-------------|
| `buttons.openPanel` | Buttons: Open Panel | Open the full Buttons panel in an editor tab. |
| `buttons.reloadConfig` | Buttons: Reload Config | Force-reload both project and user `.buttons` files and refresh all views. |
| `buttons.openButtonsFile` | Buttons: Open .buttons File | Open the project `.buttons` file in the editor. Offers to create one if it doesn't exist. |
| `buttons.openUserButtonsFile` | Buttons: Open User .buttons File | Open `~/.buttons` in the editor. Offers to create an example if it doesn't exist. |
| `buttons.createExampleButtons` | Buttons: Create Example .buttons | Generate an example `.buttons` file at the workspace root. |
| `buttons.runButton` | Buttons: Run Button | Run a button in the current terminal. Shows a quick-pick if no button is specified. |
| `buttons.runButtonInNewTerminal` | Buttons: Run Button In New Terminal | Run a button in a new terminal. Shows a quick-pick if no button is specified. |
| `buttons.copyToTerminal` | Buttons: Copy to Terminal | Copy a button's resolved command to the current terminal without executing. |
| `buttons.copyToNewTerminal` | Buttons: Copy to New Terminal | Copy a button's resolved command to a new terminal without executing. |
| `buttons.copyButtonCommand` | Buttons: Copy Button Command | Copy a button's resolved command to the clipboard. |
| `buttons.openButtonUrl` | Buttons: Open Button URL | Open a URL via the system browser. |
| `buttons.openButtonPort` | Buttons: Open Button Port | Open `http://localhost:PORT` via the system browser. |

## Activation

The extension activates in two scenarios:

1. **`workspaceContains:.buttons`** — when a `.buttons` file exists in the workspace root
2. **`onStartupFinished`** — on every VS Code startup, to detect the user `~/.buttons` file

If neither file exists, the extension stays dormant (no status bar item, no sidebar auto-open).

## Toolbar Icon

When `buttons.showToolbarIcon` is `true` (default), a Buttons icon appears in the editor title bar (top right). Clicking it opens the Buttons panel. Disable this via the setting if you prefer to use only the Activity Bar sidebar or Command Palette.

## File Watching

When `buttons.watchConfigChanges` is `true` (default):

- **Project `.buttons`** — watched via VS Code's workspace file system watcher
- **User `~/.buttons`** — watched via Node.js `fs.watch()` (since workspace watchers are workspace-scoped)
- Changes trigger a 300ms debounced refresh of all views
- If the user file doesn't exist yet, the extension polls every 5 seconds to detect creation

## Terminal Behavior

- **Run** uses the active terminal if one exists, then looks for an existing "Buttons" named terminal, then creates a new one
- **New Terminal** always creates a terminal named "Buttons: {label}"
- Commands are sent via `terminal.sendText(command)`
- The terminal is revealed unless `reveal_terminal = false`
- Working directory and environment variables are set from button/group/document configuration

## Related Pages

- [.buttons File Reference](BUTTONS-FILE.md)
- [User Profile](USER-PROFILE.md)
- [Troubleshooting](TROUBLESHOOTING.md)
