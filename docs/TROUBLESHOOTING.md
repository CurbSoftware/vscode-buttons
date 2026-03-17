# Troubleshooting

## The Panel Shows Parse Errors

Buttons expects a valid TOML file named `.buttons` at the workspace root or `~/.buttons` in the home directory. Common issues:

- Missing quotes around strings
- Malformed arrays or tables
- Duplicate keys
- Invalid URLs, colors, or ports
- Wrong TOML array syntax (`[[groups.name.buttons]]` for arrays of tables)

Start with one of the [examples](EXAMPLES.md) or the real config in the repo's [.buttons](https://github.com/CurbSoftware/vscode-buttons/blob/main/.buttons) file.

## No Buttons Are Visible

Check these conditions:

- A `.buttons` file exists at the workspace root **or** at `~/.buttons`
- `version = 1` is present in the file
- At least one group is defined
- The group has `enabled = true` (or omitted, which defaults to true)
- The group contains `buttons` or a valid `generate` block
- Individual buttons don't have `enabled = false`

## Source Tabs Not Appearing

Tabs only appear when **both** the project `.buttons` and user `~/.buttons` files exist and parse successfully. If only one file exists, its buttons are shown directly without tabs.

## A Command Does Nothing

The extension sends command strings directly to the VS Code terminal. If the command fails in a normal terminal, it will fail here too.

Check:

- The command exists on the machine (correct PATH)
- Project dependencies are installed
- The command expects the current workspace directory as `cwd`
- Long-running commands (servers, watchers) need `run_in_new_terminal = true`

## The Wrong Terminal Is Used

- **Run** prefers the active terminal, then a reusable "Buttons" terminal, then creates one
- **New Terminal** always creates a fresh terminal named "Buttons: {label}"
- For long-running commands such as watchers or servers, set `run_in_new_terminal = true`
- To prevent the terminal from stealing focus, set `reveal_terminal = false`

## URLs or Ports Don't Open

- `open_urls` must contain absolute URLs like `https://example.com` or `http://localhost:3000`
- `open_ports` must be integers between `1` and `65535`
- The system default browser is used to open URLs

## Layout Not Working as Expected

- The sidebar **always uses rows** regardless of the configured layout
- Layout changes only apply in the **panel view** (open via `Buttons: Open Panel`)
- Valid layout values: `grid`, `rows`, `columns`, `table`, `flow`
- Check that the layout value is a string: `layout = "table"` (not `layout = table`)

## Custom Colors Not Showing

- Colors must be valid hex values: `#RGB` or `#RRGGBB`
- `button_color` and `group_bg_color` go in the `[display]` block
- Per-button and per-group `color` fields are separate from display colors
- Color warnings appear as diagnostics in the panel

## User Buttons File Issues

- The user file must be at exactly `~/.buttons` (the home directory root)
- On Windows, this is `C:\Users\<username>\.buttons`
- The file must be valid TOML with `version = 1`
- The extension watches for creation — if you create the file while VS Code is open, it should be detected within a few seconds
- Run `Buttons: Reload Config` to force a refresh

## Accordion/Eye State Lost

- Collapse and visibility states are stored in the webview's internal state
- State persists across panel refreshes **within the same session**
- State is lost when VS Code is restarted or the webview is destroyed
- This is expected behavior — the states are view preferences, not config

## Extension Not Activating

The extension activates when:

1. The workspace contains a `.buttons` file, **or**
2. VS Code has finished starting up (to detect `~/.buttons`)

If neither condition is met, the extension stays dormant. Check:

- The file is named exactly `.buttons` (not `buttons.toml` or `.buttons.toml`)
- The file is at the workspace root (not in a subdirectory)
- For user file: it's in the home directory root

## Dangerous Command Confirmation

If dangerous commands run without prompting:

- Check that `buttons.confirmDangerousCommands` is `true` in VS Code settings
- Check that the button has `danger = true` or `confirm = true`
- Auto-detection triggers on commands containing ` rm `, ` drop `, ` prune `, ` reset `, ` delete `, or ` deploy ` (with surrounding spaces)

## Related Pages

- [.buttons File Reference](BUTTONS-FILE.md)
- [Settings & Commands](SETTINGS.md)
- [Examples](EXAMPLES.md)
