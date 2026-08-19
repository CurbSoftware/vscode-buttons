# Troubleshooting

## The panel shows an error about `.buttons.json`

A buttons file failed to parse (invalid JSON or a validation error). Buttons surfaces the message and treats the file as empty until it's fixed.

- Open the file with `Buttons: Open Project Buttons File` or `Buttons: Open Global Buttons File` and fix the syntax.
- See [`.buttons.json` file format](file-format.md#validation) for the exact validation rules.

## The panel is empty or shows no scripts

- Make sure a **workspace folder is open** (`File → Open Folder`). A single untitled file has no workspace to scan.
- Check [`buttons.scriptFiles`](configuration.md#buttonsscriptfiles) - if you disabled a file type, its scripts aren't offered.
- Check the **Project scripts** tab - scripts appear there first; you may need to **Generate** a file or check boxes.

## A script shows "not found"

The script reference points at a script that no longer exists in the scan. This happens when a script is renamed or deleted, its file type was disabled, or its directory is outside the scan scope.

- Run **Rescan** (or `Buttons: Rescan Scripts`) to refresh.
- If the script was renamed, check the newly-discovered script in the **Project scripts** tab.
- If the script lives in a directory that is no longer scanned, add it back as a scan directory.
- If you removed it deliberately, uncheck or remove the stale button.

## Nested scripts are missing

Since 2.0, only the project root's top level is scanned by default. Add the parent directory in the **Scan directories** card (or [`buttons.scanDirectories`](configuration.md#buttonsscandirectories)) - switch **recursive** on for nested packages. See [Scan directories](scanning.md#scan-directories).

## A virtual environment isn't detected

- Buttons only recognizes a venv named `venv` or `.venv`, located in the project root or the top level of a scan directory. Check the name.
- Run **Rescan** (or `Buttons: Rescan Scripts`) - a newly created venv is picked up on rescan or file change.
- Make sure `python` is enabled in [`buttons.scriptFiles`](configuration.md#buttonsscriptfiles).

## Activating a venv fails on Windows

PowerShell blocks `.ps1` scripts under a restricted execution policy. Either run the `activate.bat` variant instead, or allow local scripts once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Commands aren't updating after I edit a file

Buttons watches the script files and buttons files and re-renders automatically, but the update is debounced (≈300 ms). If it still looks stale, run **Rescan** to force a refresh.

## The Generate button is missing

**Generate** only appears when no project `.buttons.json` exists yet. If the file already exists, use **Rescan** instead. See [Generate vs Rescan](scanning.md#generate-vs-rescan).

## My global buttons aren't updating immediately

The global `~/.buttons.json` is watched with `fs.watch` because it lives outside the workspace. If the file did not exist when the extension started, Buttons polls for it (every 5 seconds) until it appears, then switches to watching. If you just created the file, give it a moment, or reload the window.

## The extension doesn't appear after install

- Reload VS Code: **Ctrl/Cmd+Shift+P → Developer: Reload Window**.
- Buttons activates when a workspace contains `.buttons.json` **or** on startup (`onStartupFinished`). If it's still missing, check that it's enabled in the Extensions view.

## I installed a `.vsix` but see the old version

Reload the window after `code --install-extension` and confirm the version in the Extensions view. See [Local installation](../README.md#local-installation).

## A terminal named "Buttons" keeps getting reused

**Run** reuses your active terminal if one is open, otherwise a terminal named `Buttons`, and only creates one if neither exists. To isolate a command, use **New Terminal** instead, which always opens a fresh terminal.

[Back to index](index.md)
