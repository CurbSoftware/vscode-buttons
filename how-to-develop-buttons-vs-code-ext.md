The fastest way to test a VS Code extension while you build it is to run it in an **Extension Development Host** window. VS Code’s extension docs describe this as the standard way to run and debug an extension locally, and integration tests also run in that special VS Code instance. ([Visual Studio Code][1])

## Recommended local workflow

### 1. Scaffold or open your extension project

Inside your extension folder, you should have at minimum:

* `package.json`
* `src/extension.ts` or `src/extension.js`
* a build setup if you are using TypeScript

If you are using TypeScript, a common setup is:

```bash
npm install
npm run compile
```

### 2. Open the extension folder in VS Code

Open the folder that contains your extension source and `package.json`.

### 3. Start the extension in a development host

Press:

```text
F5
```

This launches a second VS Code window called the **Extension Development Host**, where your extension is installed only for that dev session. That is the main “host it locally while I build it” workflow. ([Visual Studio Code][1])

### 4. Test your extension there

In the Extension Development Host window:

* open a test workspace
* run your commands from the Command Palette
* open files and trigger your contributions
* inspect your custom editor, webview, commands, menus, etc.

### 5. Make changes and rerun

Typical cycle:

* edit code in your source window
* rebuild if needed
* press `Ctrl+Shift+F5` / `Cmd+Shift+F5` to restart debugging
* or reload the Extension Development Host window

---

# Good setup for Buttons specifically

For **Buttons**, I recommend this repo structure:

```text
buttons/
  .vscode/
    launch.json
    tasks.json
  src/
    extension.ts
    ...
  package.json
  tsconfig.json
  README.md
```

## package.json scripts

A good minimal set:

```json
{
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "package": "vsce package"
  },
  "devDependencies": {
    "@types/vscode": "^1.x",
    "@vscode/vsce": "^latest",
    "typescript": "^5.x"
  }
}
```

VS Code’s docs note that the extension packaging tool is now installed from `@vscode/vsce`, while the CLI command remains `vsce`. ([Visual Studio Code][2])

---

# Best development pattern

## Terminal 1

Run TypeScript watch mode:

```bash
npm run watch
```

## VS Code

Press `F5` to launch the Extension Development Host.

That gives you near-live iteration:

* save code
* TypeScript rebuilds
* restart/reload the dev host
* retest

---

# launch.json example

This is the standard kind of launch config you want for extension development:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Buttons Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "npm: compile"
    }
  ]
}
```

If you use `esbuild` or another bundler, adjust `outFiles` accordingly.

---

# tasks.json example

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "compile",
      "problemMatcher": "$tsc",
      "group": "build",
      "label": "npm: compile"
    },
    {
      "type": "npm",
      "script": "watch",
      "problemMatcher": "$tsc-watch",
      "isBackground": true,
      "label": "npm: watch"
    }
  ]
}
```

---

# How to “install” it for manual testing

When you want to test it more like a real installed extension, package it as a **VSIX** and install that into VS Code. The official docs say you can package an extension with `vsce package`, then install the `.vsix` either from the UI or from the CLI. ([Visual Studio Code][3])

## Package it

```bash
npx vsce package
```

This creates something like:

```text
buttons-0.0.1.vsix
```

## Install into VS Code

From terminal:

```bash
code --install-extension buttons-0.0.1.vsix
```

Or in VS Code:

* open Extensions
* open the `...` menu
* choose **Install from VSIX**

That install flow is documented in the VS Code Marketplace docs. ([Visual Studio Code][4])

---

# When to use each approach

## Use F5 / Extension Development Host for day-to-day coding

Best for:

* debugging
* breakpoints
* rapid iteration
* testing commands and UI contributions

## Use VSIX installs for realistic manual testing

Best for:

* checking install behavior
* verifying activation events
* testing on another machine/profile
* sending pre-release builds to others

---

# Very useful for Buttons: use a separate test workspace

Create a sample repo just for testing Buttons:

```text
buttons-test-workspace/
  .buttons
  package.json
  apps/
  README.md
```

Then in the Extension Development Host:

* open that workspace
* verify `.buttons` detection
* verify your custom editor opens
* verify buttons run in current/new terminal
* verify clipboard actions
* verify parse/validation errors render well

This will save you a lot of time versus testing inside the extension repo itself.

---

# Debugging tips

## Log extension activation

In `activate()`:

```ts
console.log("Buttons extension activated");
```

Then inspect:

* **Debug Console**
* **Developer Tools** for webviews if needed

## Add activation events carefully

If your extension does not seem to load, the most common problem is activation not firing when expected.

For Buttons, likely activation triggers may include:

* opening `.buttons`
* running a `buttons.*` command
* opening your custom editor view

## Reload often

Useful commands during development:

* **Developer: Reload Window**
* restart debug session
* reopen Extension Development Host

---

# Remote / SSH / container testing

If you later test Buttons in Remote SSH, Containers, or Codespaces, VS Code supports installing an unpublished extension into a remote environment by packaging it as a VSIX and manually installing it there. The remote extension docs explicitly describe this approach. ([Visual Studio Code][5])

---

# Recommended setup for your project now

For your Buttons extension, I would do this immediately:

1. Build the extension in TypeScript.
2. Add `.vscode/launch.json` and `.vscode/tasks.json`.
3. Run `npm run watch`.
4. Press `F5` to launch the Extension Development Host.
5. Use a separate `buttons-test-workspace` with a real `.buttons` file.
6. Periodically run `npx vsce package` and install the VSIX for realistic testing. ([Visual Studio Code][6])

## Minimal command sequence

```bash
npm install
npm run watch
```

Then in VS Code:

* press `F5`
* test in the Extension Development Host

When you want a packaged build:

```bash
npx vsce package
code --install-extension buttons-0.0.1.vsix
```

([Visual Studio Code][3])

If you want, I can draft a complete **starter `package.json` + `launch.json` + `tasks.json` + `src/extension.ts`** for Buttons so you can open the repo and press F5 immediately.

[1]: https://code.visualstudio.com/api?utm_source=chatgpt.com "Visual Studio Code Extension API"
[2]: https://code.visualstudio.com/updates/v1_74?utm_source=chatgpt.com "November 2022 (version 1.74)"
[3]: https://code.visualstudio.com/api/working-with-extensions/publishing-extension?utm_source=chatgpt.com "Publishing Extensions"
[4]: https://code.visualstudio.com/docs/configure/extensions/extension-marketplace?utm_source=chatgpt.com "Extension Marketplace"
[5]: https://code.visualstudio.com/api/advanced-topics/remote-extensions?utm_source=chatgpt.com "Supporting Remote Development and GitHub Codespaces"
[6]: https://code.visualstudio.com/api/working-with-extensions/testing-extension?utm_source=chatgpt.com "Testing Extensions"
