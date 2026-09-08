# Buttons file JSON Schema (v1)

Authoritative write schema for `<workspace>/.buttons.json` and `~/.buttons.json`. Matches `parseButtonsFile` in Buttons 2.2+. Extra properties are ignored on read; this schema forbids them so agents do not emit junk.

```json
{
  "$schema": "https://json-schema.org/draft/07/schema#",
  "$id": "https://curbsoftware.dev/schemas/buttons-file-v1.json",
  "title": "ButtonsFile",
  "type": "object",
  "additionalProperties": false,
  "required": ["version", "buttons"],
  "properties": {
    "version": { "const": 1 },
    "buttons": {
      "type": "array",
      "items": { "$ref": "#/$defs/buttonEntry" }
    }
  },
  "$defs": {
    "nonEmptyString": {
      "type": "string",
      "minLength": 1
    },
    "trimmedArgs": {
      "type": "string",
      "pattern": "\\S"
    },
    "packageManager": {
      "type": "string",
      "enum": [
        "npm",
        "pnpm",
        "yarn",
        "bun",
        "make",
        "composer",
        "just",
        "shell",
        "python",
        "cargo",
        "go"
      ]
    },
    "note": { "type": "string" },
    "id": { "$ref": "#/$defs/nonEmptyString" },
    "children": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/buttonChild" }
    },
    "scriptButton": {
      "type": "object",
      "additionalProperties": false,
      "required": ["type", "file", "script"],
      "properties": {
        "type": { "const": "script" },
        "file": { "type": "string" },
        "script": { "type": "string" },
        "packageDir": { "type": "string" },
        "packageManager": { "$ref": "#/$defs/packageManager" },
        "note": { "$ref": "#/$defs/note" },
        "id": { "$ref": "#/$defs/id" },
        "args": { "$ref": "#/$defs/trimmedArgs" },
        "children": { "$ref": "#/$defs/children" }
      }
    },
    "commandButton": {
      "type": "object",
      "additionalProperties": false,
      "required": ["type", "command"],
      "properties": {
        "type": { "const": "command" },
        "command": { "$ref": "#/$defs/trimmedArgs" },
        "note": { "$ref": "#/$defs/note" },
        "id": { "$ref": "#/$defs/id" },
        "args": { "$ref": "#/$defs/trimmedArgs" },
        "children": { "$ref": "#/$defs/children" }
      }
    },
    "argsButton": {
      "type": "object",
      "additionalProperties": false,
      "required": ["args"],
      "properties": {
        "args": { "$ref": "#/$defs/trimmedArgs" },
        "note": { "$ref": "#/$defs/note" },
        "id": { "$ref": "#/$defs/id" },
        "children": { "$ref": "#/$defs/children" }
      }
    },
    "buttonEntry": {
      "oneOf": [
        { "$ref": "#/$defs/scriptButton" },
        { "$ref": "#/$defs/commandButton" }
      ]
    },
    "buttonChild": {
      "oneOf": [
        { "$ref": "#/$defs/scriptButton" },
        { "$ref": "#/$defs/commandButton" },
        { "$ref": "#/$defs/argsButton" }
      ]
    }
  }
}
```

## Runtime notes the schema cannot encode

- Parser defaults missing `packageDir` to `""` and invalid `packageManager` to `"npm"`.
- Parser **trims** `args`; this schema requires a non-whitespace string so empty args are omitted.
- Parser **does not trim** `command` but rejects whitespace-only. Write trimmed commands.
- `id` is dropped when missing or `""`.
- `note` is kept for any string, including `""`.
- Empty `children` arrays are dropped.
- Args-only objects are valid only as `children` items, never as `buttons` items.
- Script `command` is not a stored field. It is derived at resolve time:
  - If a scan hit matches `file:script`, use that discovered command, then append `args`.
  - Else `scriptCommand(packageManager, script)`, then append `args`.
- Args children append to the **parent resolved** command (which already includes the parent's `args`).
- Command/script children resolve independently (they do not prepend the parent command).
- Args children inherit `packageDir` from the nearest script ancestor. Command children do not.

## Derived command helper (`scriptCommand`)

| packageManager | template |
| --- | --- |
| npm | `npm run ${script}` |
| pnpm | `pnpm ${script}` |
| yarn | `yarn ${script}` |
| bun | `bun ${script}` |
| make | `make ${script}` |
| composer | `composer ${script}` |
| just | `just ${script}` |
| shell | `bash ${script}` (quote `script` if it contains whitespace) |
| python | `python ${script}` (same quoting) |
| cargo | `cargo ${script}` |
| go | `go run .` if `script === "run"`, else `go ${script}` |

Discovered shell/python buttons pass the **basename** into that helper because cwd is `packageDir`. Discovered venv buttons do **not** use this helper; they use `source …/bin/activate`, `deactivate`, and venv pip.

## Not part of `.buttons.json`

These live in VS Code settings or scan results, not this file: button colors, `buttons.scanDirectories`, `buttons.scriptFiles`, discovered `description` / `icon`.
