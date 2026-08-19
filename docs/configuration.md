# Configuration & settings

Buttons contributes three settings. `buttons.textSize` and `buttons.scriptFiles` are `window`-scoped (User or Workspace level); `buttons.scanDirectories` is `resource`-scoped (per workspace folder, saved at Workspace level when you use the panel).

To open the settings page: click the **gear icon** in the panel header, or use **Command Palette → Preferences: Open Settings** and search "Buttons".

## `buttons.textSize`

Controls the text size used in the Buttons UI, relative to VS Code's font size.

| Value | Effect |
| --- | --- |
| `default` | VS Code's default text size (no change). |
| `plus2` | Default + 2px. |
| `plus4` | Default + 4px. |

- **Type:** string (enum)
- **Default:** `default`

## `buttons.scriptFiles`

Controls which script file types are scanned for commands.

| Value | Format |
| --- | --- |
| `package.json` | Node.js / TypeScript package scripts. |
| `Makefile` | Make targets. |
| `composer.json` | PHP Composer scripts. |
| `justfile` | `just` recipes. |
| `shell` | `.sh` files in scan directories. |
| `python` | Python entry files (`app.py`, `main.py`, `manage.py`, `run.py`, `server.py`) and venv buttons. |

- **Type:** array (rendered as a checkbox list)
- **Default:** `["package.json", "shell", "python"]`
- **`uniqueItems`:** `true`

`Makefile`, `composer.json`, and `justfile` are opt-in. Only these types can be parsed - anything else is added as a custom command instead.

> Disabling a type here stops *offering* its scripts in the **Project scripts** tab, but it never removes buttons already present in your `.buttons.json`. See [Script scanning](scanning.md#what-is-discovered) for details.

## `buttons.scanDirectories`

Extra directories to scan, on top of the always-scanned project root (top level only).

```jsonc
// .vscode/settings.json
{
  "buttons.scanDirectories": [
    { "path": "scripts", "recursive": true },
    { "path": "services/api", "recursive": false }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `path` | Workspace-relative directory path (posix or windows separators). |
| `recursive` | Scan the directory's whole tree instead of only its top level. Default `false`. |

- **Type:** array of objects
- **Default:** `[]`

Paths are normalized (backslashes fixed, trailing slashes dropped) and invalid entries - absolute paths, `..` escapes, glob metacharacters, hidden directories, ignore-listed names (e.g. `build`, `dist`), duplicates - are ignored. The **Scan directories** card in the **Project scripts** tab edits this setting for you via the OS folder picker. See [Script scanning](scanning.md#scan-directories) for the scope model.

## Where settings live

Changes are stored in VS Code's own settings (`settings.json`), not in `.buttons.json`. You can also edit them directly:

```jsonc
{
  "buttons.textSize": "plus2",
  "buttons.scriptFiles": ["package.json", "shell", "python", "Makefile", "justfile"],
  "buttons.scanDirectories": [{ "path": "packages", "recursive": true }]
}
```

[Back to index](index.md)
