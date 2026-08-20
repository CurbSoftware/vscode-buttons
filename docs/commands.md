# Command reference

Buttons contributes these commands to the Command Palette (**Ctrl/Cmd+Shift+P**).

| Command | ID | What it does |
| --- | --- | --- |
| `Buttons: Open Panel` | `buttons.openPanel` | Focuses the Buttons sidebar in the Activity Bar. |
| `Buttons: Open in Editor` | `buttons.openMainPanel` | Opens the full-width Buttons editor panel. Also available from the editor title-bar icon. |
| `Buttons: Rescan Scripts` | `buttons.rescan` | Re-runs the scan (project root plus scan directories) and reconciles the project scripts. |
| `Buttons: Open Project Buttons File` | `buttons.openProjectButtons` | Opens (and creates if needed) `<workspace root>/.buttons.json`. |
| `Buttons: Open Global Buttons File` | `buttons.openGlobalButtons` | Opens (and creates if needed) `~/.buttons.json`. |
| `Buttons: Add to Buttons` | `buttons.addFileButton` | Adds the selected file as a project button. On `.sh` and Python entry files it creates a standalone button; on manifests it adds the file's folder as a scan directory. |

## Where they appear

- The **Activity Bar** icon (Buttons) opens the sidebar.
- The **editor title bar** icon opens the editor panel.
- The **Explorer context menu** (right-click a script file or manifest) offers **Add to Buttons**.
- The **gear icon** inside the panel header opens the settings page (`Preferences: Open Settings` for `buttons.textSize`), which is a built-in VS Code command, not a Buttons command.

## Related shortcuts

There are no default keybindings for Buttons commands. You can assign your own under **Preferences → Keyboard Shortcuts** by searching for the command titles above.

[Back to index](index.md)
