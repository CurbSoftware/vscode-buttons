# `.buttons.json` file format

Buttons stores its configuration in JSON files:

| Scope | Path | Applies to |
| --- | --- | --- |
| Project | `<workspace root>/.buttons.json` | The current workspace. |
| Global | `~/.buttons.json` | Every project you open. |

Both files use the same format: a `version` field and a flat `buttons` array.

```json
{
  "version": 1,
  "buttons": [
    { "type": "script", "file": "package.json", "script": "dev", "packageDir": "", "packageManager": "pnpm", "note": "Vite dev server" },
    { "type": "script", "file": "packages/api/package.json", "script": "start", "packageDir": "packages/api", "packageManager": "pnpm" },
    { "type": "script", "file": "Makefile", "script": "build", "packageDir": "", "packageManager": "make" },
    { "type": "script", "file": "composer.json", "script": "test", "packageDir": "", "packageManager": "composer" },
    { "type": "script", "file": "justfile", "script": "deploy", "packageDir": "", "packageManager": "just" },
    { "type": "script", "file": "deploy.sh", "script": "deploy.sh", "packageDir": "", "packageManager": "shell" },
    { "type": "script", "file": "scripts/migrate.sh", "script": "scripts/migrate.sh", "packageDir": "scripts", "packageManager": "shell" },
    { "type": "script", "file": "app.py", "script": "app.py", "packageDir": "", "packageManager": "python" },
    { "type": "script", "file": "venv", "script": "Activate venv", "packageDir": "", "packageManager": "python" },
    { "type": "command", "command": "docker ps", "note": "List running containers" }
  ]
}
```

## Entry types

Every entry has a `type` field that is either `"script"` or `"command"`.

### Script entries (`type: "script"`)

A live reference to a script the scanner found. The command is **recomputed on every scan**, so it updates automatically when you switch package managers.

| Field | Required | Meaning |
| --- | --- | --- |
| `type` | yes | Always `"script"`. |
| `file` | yes | The script file, relative to the workspace root (e.g. `package.json`, `packages/api/package.json`, `scripts/deploy.sh`); for venv buttons, the venv directory (e.g. `venv`). |
| `script` | yes | The script/target name (e.g. `dev`, `build`). For standalone `.sh` and Python entry files this is the file's relative path - that path is what the command is rebuilt from. |
| `packageDir` | no | The script file's directory relative to the workspace root (`""` = root). This is the terminal working directory when the script runs. |
| `packageManager` | no | One of `npm`, `pnpm`, `yarn`, `bun`, `make`, `composer`, `just`, `shell`, `python`. Invalid values are normalized to `npm`. |
| `note` | no | An optional note shown next to the button. |

### Command entries (`type: "command"`)

A literal custom command, not tied to any file. Stored verbatim and never rewritten.

| Field | Required | Meaning |
| --- | --- | --- |
| `type` | yes | Always `"command"`. |
| `command` | yes | The literal command to run. Must be a non-empty string. |
| `note` | no | An optional note shown next to the button. |

## Validation

When a buttons file is read, it is parsed and validated. If it fails, Buttons shows an error message and treats the file as empty until it is fixed. The possible errors are:

| Condition | Message |
| --- | --- |
| Malformed JSON | `Invalid JSON.` |
| Top-level value isn't an object | `Top-level value must be an object.` |
| Unsupported `version` | `Unsupported version: <v>. Only version 1 is supported.` |
| `buttons` isn't an array | `"buttons" must be an array.` |
| A `buttons[i]` element isn't an object | `buttons[i] must be an object.` |
| Script entry missing string `file`/`script` | `buttons[i] script entry requires string "file" and "script".` |
| Command entry with empty/non-string `command` | `buttons[i] command entry requires a non-empty "command".` |
| Unknown entry `type` | `buttons[i] has unknown type: <v>. Expected "script" or "command".` |

The `version` field is optional when absent (it defaults to `1`), and `note` is only kept when it is a string.

## Editing by hand

You can edit these files directly - via the `Buttons: Open Project Buttons File` / `Buttons: Open Global Buttons File` commands, or in any editor. Buttons watches the files and picks up changes automatically.

[Back to index](index.md)
