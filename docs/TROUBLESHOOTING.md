# Troubleshooting

## The Panel Shows Parse Errors

Buttons expects a valid TOML file named `.buttons` at the workspace root. Common issues are:

- missing quotes around strings
- malformed arrays or tables
- duplicate keys
- invalid URLs, colors, or ports

Start with the examples in [EXAMPLES.md](EXAMPLES.md) or the real config in [.buttons](https://github.com/CurbSoftware/vscode-buttons/blob/main/.buttons).

## No Buttons Are Visible

Check these conditions:

- the workspace has a root `.buttons` file
- `version = 1` is present
- at least one group is enabled
- the group contains buttons or a valid `generate` block

## A Command Does Nothing

The extension sends command strings directly to the VS Code terminal. If the command itself fails in a normal terminal, it will fail here too.

Check:

- the command exists on the machine
- the project dependencies are installed
- the command expects the current workspace directory
- the command requires a new terminal for long-running work

## The Wrong Terminal Is Used

- `Run` prefers the active terminal, then a reusable Buttons terminal, then creates one.
- `New Terminal` always creates a fresh terminal.
- For long-running commands such as watchers or servers, prefer `run_in_new_terminal = true`.

## URLs Or Ports Do Not Open

- `open_urls` must contain absolute URLs like `http://localhost:3000`
- `open_ports` should contain integers between `1` and `65535`

## Example Files Are Not Loaded Automatically

This is expected in v1. Buttons only reads `.buttons` from the workspace root. Files under `examples/` are documentation assets and copyable templates.