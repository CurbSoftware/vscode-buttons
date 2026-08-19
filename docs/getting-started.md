# Getting started

Follow these steps to go from installing Buttons to running your first command.

## Prerequisites

- **VS Code** `^1.97.0` (or VSCodium) - see [installation](#1-install).
- **Node.js** `>= 24` is only needed if you build the extension from source, not to use it.

## 1. Install

- **VS Code** - [install from the Marketplace](https://marketplace.visualstudio.com/items?itemName=CurbSoftware.buttons-vscode).
- **VSCodium** - [install from Open VSX](https://open-vsx.org/extension/CurbSoftware/buttons-vscode).

If you'd rather build it yourself, see [Local installation](../README.md#local-installation).

## 2. Open a project

Open a folder or workspace in VS Code (`File → Open Folder`). Buttons works with any project that has scripts - it does not need to be a Node.js project.

## 3. Open the Buttons panel

- Click the **Buttons** icon in the Activity Bar (the left sidebar), or
- Click the **Buttons** icon in the editor title bar (top-right, next to "split editor").

Both open the same panel - the Activity Bar version is a compact sidebar, and the title-bar version is a full-width editor tab. You can use both at once.

## 4. Generate your buttons file

On a fresh project, the **Project scripts** tab shows every script discovered in the scan scope (the project root's top level, plus any scan directories), with its checkboxes disabled, plus a **Generate buttons file** button.

Click **Generate**. Buttons writes `<workspace root>/.buttons.json` containing every root-level script. Scripts found in scan directories are left unchecked for you to opt in.

> Opening a project never writes a file on its own - **Generate** is the only thing that creates the initial file. See [Script scanning](scanning.md#generate-vs-rescan) for the difference between Generate and Rescan.

## 5. Fine-tune

- In the **Project scripts** tab, uncheck scripts you don't want, or check newly-discovered ones.
- If your scripts live in nested directories (e.g. a monorepo's `packages`), add them in the **Scan directories** card.
- In the **Buttons** tab, add custom commands with **+ Add command**, or add notes to any row.

See [Using the panel](usage.md) for details.

## 6. Run a command

On any button, click:

- **Run** - execute in the current integrated terminal.
- **New Terminal** - execute in a fresh terminal.
- **Copy** - copy the command to the clipboard.

The working directory is set to the script's folder, so a script in a monorepo package runs in the right place.

[Back to index](index.md)
