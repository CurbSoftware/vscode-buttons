# Configuration & settings

Buttons contributes two settings. Both are `window`-scoped, meaning you can set them at **User** level (apply everywhere) or **Workspace** level (apply to the current project).

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

Controls which script files are scanned for commands.

| Value | Format |
| --- | --- |
| `package.json` | Node.js / TypeScript package scripts (included by default). |
| `Makefile` | Make targets. |
| `composer.json` | PHP Composer scripts. |
| `justfile` | `just` recipes. |

- **Type:** array (rendered as a checkbox list)
- **Default:** `["package.json"]`
- **`uniqueItems`:** `true`

`package.json` is enabled by default; the others are opt-in. Only these formats can be parsed — anything else is added as a custom command instead.

> Disabling a file type here stops *offering* its scripts in the **Project scripts** tab, but it never removes buttons already present in your `.buttons.json`. See [Script scanning](scanning.md#script-file-types) for details.

## Where settings live

Changes are stored in VS Code's own settings (`settings.json`), not in `.buttons.json`. You can also edit them directly:

```jsonc
{
  "buttons.textSize": "plus2",
  "buttons.scriptFiles": ["package.json", "Makefile", "justfile"]
}
```

[Back to index](index.md)
