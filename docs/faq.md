# FAQ

## Will switching package managers break my buttons?

No. Script buttons are *references*, not copies. If you switch from `npm` to `pnpm` (e.g. add a `pnpm-lock.yaml`), the next scan recomputes every command - `npm run dev` becomes `pnpm dev` automatically. See [Package-manager detection](scanning.md#package-manager-detection).

## Why does a button show "not found"?

A script button becomes "not found" when its script can no longer be found in the scan - usually because the script was renamed or deleted, or its file type was disabled. Run **Rescan** to refresh. See [Troubleshooting](troubleshooting.md#a-script-shows-not-found).

## I disabled a file type in settings - why are its buttons still there?

Disabling a file type in [`buttons.scriptFiles`](configuration.md#buttonsscriptfiles) stops *offering* its scripts in the **Project scripts** tab, but it does **not** remove buttons already in your `.buttons.json`. Uncheck or remove those buttons manually if you no longer want them. This is intentional so a Rescan never wipes out your custom commands or selections.

## Where are my buttons stored?

In two JSON files:

- `<workspace root>/.buttons.json` - project buttons.
- `~/.buttons.json` - global buttons (applies to every project).

See [`.buttons.json` file format](file-format.md).

## What are global buttons?

`~/.buttons.json` holds commands you want available in **every** project, so your go-to commands follow you across workspaces. The file is personal and is never shared with a project.

## Do I have to create the buttons file myself?

No. Click **Generate** in the **Project scripts** tab and Buttons creates `<workspace root>/.buttons.json` for you, including every discovered script. Opening a project never writes a file on its own.

## Can I add a command that isn't in a script file?

Yes - use **+ Add command** to add any literal command (e.g. `docker ps`). This is also how you run things from ecosystems Buttons doesn't parse. See [Using the panel](usage.md#adding-a-custom-command).

## How is the package manager detected?

From the root lockfiles, in order: `pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, `bun.lockb` → `bun`, `package-lock.json` → `npm`, defaulting to `npm`. See [Package-manager detection](scanning.md#package-manager-detection).

## Why does my command open in a subfolder?

For monorepo scripts, the terminal's working directory is set to the script's `packageDir`, so the command runs in the right place (e.g. `packages/api`). See [Monorepos](scanning.md#monorepos).

## What's the difference between Generate and Rescan?

**Generate** creates the file from scratch with every script (first use). **Rescan** updates the existing file in place, preserving your inclusions and notes, marking missing scripts, and leaving new scripts unchecked. See [Generate vs Rescan](scanning.md#generate-vs-rescan).

[Back to index](index.md)
