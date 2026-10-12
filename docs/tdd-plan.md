# TDD plan

Buttons already has a test runner. This plan is how to extend it, and the suite in `src/test/` is the current pass of that plan. `npm test` is the gate: clean, `tsc`, then `node --test dist/test/**/*.test.js`. Node 22 or newer. One file after a compile:

```bash
npm run compile && node --test dist/test/backend.extension.test.js
```

Stay on that stack. TypeScript, `node:test`, and `node:assert/strict`. Do not add Mocha, Jest, Playwright, or `@vscode/test-electron` for these cases. The suite is headless. It does not open the Extension Development Host, a browser, or a real terminal window.

## How a change goes

1. Name the behavior in the test file that already owns that seam. A new behavior gets a new `it` before the production edit.
2. Run that file. The new case should fail for the reason you expect.
3. Change the production module the test imports. Keep `vscode` out of the pure modules.
4. Re-run the file, then `npm test`.
5. Stop when the new case and the rest of the suite are green.

Host tests share one in-memory VS Code stand-in and, for the extension file, one module of activation state. Those `describe` blocks set `concurrency: false`. A debounced refresh from an earlier test can otherwise reload the previous `.buttons.json` into the next case.

## Where each layer lives

| Layer | What it proves | Where |
| --- | --- | --- |
| Logic | Parse, mutate, and resolve `.buttons.json`. Scan rules, grouping, compose text. | Existing `src/test/*.test.ts` plus `buttonsFile.contract.test.ts` |
| UI | The HTML the sidebar and editor webviews are given. | `view.render.test.ts` and the older `renderer.test.ts` |
| Frontend | The script inside that HTML: clicks, drafts, drag, column resize. | `view.client.test.ts` |
| Backend | Reading and writing the file, scanning through the VS Code file API, activation, panel messages, terminal calls. | `backend.*.test.ts`, `execution.actions.test.ts` |
| Package | The shipped `release/buttons-vscode-2.3.0.vsix`. | `package.vsix.test.ts` |

The stand-in is `src/test/support/vscodeDouble.ts`. It installs itself as the `vscode` module and records `child_process.spawn`, so a system-terminal case cannot open a window. The webview harness is `src/test/support/miniDom.ts`. It parses `renderHtml` and runs the inline script under `node:vm`. Messages created in that realm are cloned with `JSON.parse(JSON.stringify(...))` before a deep equality check.

F5 is still the right check for theme pixels and a live pty. This plan does not replace that.

## The `.buttons` file

Project file: `<workspace>/.buttons.json`. Global file: `~/.buttons.json`. Both are schema version 1. The pure API is `src/config/buttonsFile.ts`. The host read/write path is `src/config/buttonsStore.ts`.

Lock these rules in `buttonsFile.contract.test.ts` and `backend.store.test.ts`:

- `{}` is an empty version 1 file. A top-level array, `null`, or string is rejected with `Top-level value must be an object.`
- A button must be an object. A script needs string `file` and `script`. A command needs a non-empty `command`. `children` must be an array. An args child needs non-empty `args`, and an args-only object is invalid at the top level.
- Unknown `packageManager` values become `npm`. Args are trimmed. An empty `id` is dropped. A note is kept even when it is an empty string.
- Resolve appends `args` to the live command. A missing script stays in the file, is marked missing, and its args children inherit that flag and the fallback command.
- `updateButton` can clear script args with a blank patch. A blank args patch on an args row keeps the previous args. A blank command patch keeps the previous command. A missing path returns the same file.
- `removeButton` drops one nested child. `duplicateButton` inserts a copy with new ids on the copy and on its children. `reorderButtons` moves siblings only.
- `scriptEntryFiles` walks nested script entries. `findResolved` walks the same path shape the panel sends.
- Generate keeps custom commands and the children already stored on a root script. It does not add scripts whose `packageDir` is not the workspace root.
- `setAllScripts(file, discovered, false)` removes script rows and leaves command rows.
- Serialize pretty-prints and ends with a newline. Parse accepts that text again.

On the host:

- `writeButtonsFile` then `loadRuntimeState` round-trips project buttons, including an args child.
- A missing project file is `projectFileExists: false` and an empty button list, with no parse error. A broken project file and a broken global file both surface, joined by a newline, and both lists are treated as empty until the JSON is fixed.
- With no workspace folder, discovered scripts are empty and a global command still resolves.
- Default `buttons.scriptFiles` shows `package.json` on the scripts tab and hides Makefile targets. A Makefile row that is already in the file still resolves to `make <target>`. Unknown entries in `buttons.scriptFiles` are dropped.
- `buttons.scanDirectories` is normalized: `./packages/api/` becomes `packages/api`, a non-boolean `recursive` becomes false, and `node_modules` is dropped.
- Button colors accept `#rgb`, `#rrggbbaa`, `rgb()`, and `rgba()` after trim. Names, `expression(...)`, and non-strings become empty so the webview inherits the theme.

## The Buttons view

One renderer, two shells. Sidebar is cards (`button-card`) plus an "Open in editor" control. The editor is a `buttons-table` with column resize handles and no open-editor button. The stylesheet always mentions `.buttons-table`; assert on the `<table` tag when you mean the editor layout.

`view.render.test.ts` and `view.client.test.ts` cover:

- Empty workspace copy, and no Generate control when there is no folder.
- Parse errors are escaped. A payload like `bad <script>` is text, not a tag.
- Scripts tab: locked project root ("always on", "non-recursive"), scan directory rows, recursive checkbox, Select all / Unselect all, and a partial group whose file checkbox is indeterminate.
- When the project file is missing, script checkboxes are disabled and Generate appears once, as the scripts-tab call to action.
- A missing script shows `not found`. Run, New Terminal, System, append, and Copy are `action-hidden` and have no `data-path`. Duplicate and Remove stay available.
- Text size 0, 2, and 4 land in `font-size: calc(var(--vscode-font-size, 13px) + Npx)`.
- Edit and add forms: command rows get `edit-command`, script rows do not, variant add uses `add-args`. Nest depth is `data-nest` cycling 0 through 4, and the accent rules for those levels are in the CSS.
- Command text, notes, and scan paths are escaped.
- Sidebar and editor tabs are independent. Setting the sidebar to Project scripts does not put the scan field on the editor, and the reverse is true.

The frontend script posts `PanelActionMessage` values. Drive it by clicking, changing inputs, and dispatching key, pointer, and drag events:

- Header actions, including a click that starts on the codicon inside Rescan.
- Run, New Terminal, System, Copy, Duplicate, and the tab switch.
- Remove adds `confirming` on the first click and posts `remove` on the second. Another click clears the prompt.
- Append posts `sep: "space"` or `sep: "newline"`.
- A missing Run button posts `run-current` without a source or path. The host drops that.
- Script, file, and recursive checkboxes post `toggle-script`, `toggle-file`, and `toggle-scan-dir-recursive`. Select all posts `toggle-all`. Opening a scan group records `expandedFiles`.
- Enter or Add on the scan field posts `add-scan-dir` with the raw field text. A blank field posts nothing.
- Save reads the visible inputs for add, edit, and add-variant.
- Drafts and expanded variant blocks come back after the HTML is rendered again from `vscode.getState()`.
- Dragging a column handle stores three widths that sum to 100.
- A drop on another row in the same list posts `reorder`. A drop on the other source posts nothing.

`backend.webviewHost.test.ts` checks the thin hosts. The sidebar provider sets `enableScripts`, points local resources at the extension, renders cards, forwards a message, and ignores `refresh` before resolve and after dispose. The editor panel uses view type `buttons.mainPanel`, retains context, sets the icon, renders the table, reveals the same panel on a second `createOrShow`, and creates a new panel after dispose.

## Command execution

Integrated terminals go through `src/execution/actions.ts`. The extension routes `run-current`, `run-new`, `append`, `copy`, and `open-system` to those functions after it resolves the button.

`execution.actions.test.ts` and the host file lock this:

- A fresh integrated terminal is named `Buttons`, gets the button cwd, is shown with preserve focus, and receives one `sendText(command, true)`. There is no `cd` line, because the cwd was set at creation.
- A reused terminal (the active one, or an existing terminal named `Buttons`) sends `cd "<cwd>"` and the command as two executed lines. Never join them with `&&`.
- New Terminal names itself `Buttons: <note>` for a command with a note, otherwise `Buttons: <script name>` or `Buttons: <first token>`.
- Append does not execute. The first chunk is the token alone, even when the separator is newline. The next chunk is prefixed with a space or a newline. A newline is wrapped in bracketed paste (`ESC [ 200 ~` ... `ESC [ 201 ~`).
- Closing the terminal, ending the shell, switching terminals, or running a command clears the composed line so the next append is not prefixed.
- Copy writes the clipboard and shows `Copied command to clipboard.` A clipboard failure shows `Failed to copy command to clipboard.` and leaves the previous clipboard text.
- The host runs a script button with cwd `packageDir` under the workspace. With an active terminal that is `cd "/ws/packages/api"` then `pnpm start` when the lockfile is pnpm. A missing script does not create a terminal and does not spawn.
- System terminal is different: `open-system` passes the workspace root, not `packageDir`. The spawned command is the configured `terminal.external` executable. On Linux, gnome-terminal gets `--working-directory <workspace> -- bash <script>`. An empty `linuxExec` falls back to `x-terminal-emulator`. Kitty gets `--directory`. The temp script matches `unixPrefillScript`, mode `0700`, and a spawn error is shown as `Could not open the system terminal: ...`. With no workspace folder, System shows `No workspace folder is open.` and does not spawn.
- `child_process.spawn` in these tests is the recorder from the stand-in. Do not point it back at a real emulator.

Activation and file commands, in `backend.extension.test.ts`:

- Commands: `buttons.openPanel`, `buttons.openMainPanel`, `buttons.rescan`, `buttons.openProjectButtons`, `buttons.openGlobalButtons`, `buttons.addFileButton`. The sidebar view id is `buttons.sidebarView`. Open Panel runs `buttons.sidebarView.focus`.
- Open Project Buttons creates an empty version 1 file when it is missing, and does not rewrite a file that already has commands. Open Global Buttons does the same for `~/.buttons.json` in the stand-in, not on the real disk.
- No workspace: open project file, generate, the project-file message, and Add to Buttons each show `No workspace folder is open.`
- Save add ignores a blank command. A global save writes only the global file. Edit, cancel, duplicate, reorder, remove, and add-variant go through the project file. Remove while editing closes the form. Rescan also closes it.
- Generate adds missing root scripts, keeps an existing script's children, and skips nested package scripts.
- Toggles do nothing until the project file exists. After it exists, script, file, and all-toggle match `addScriptButton` / `removeScriptButton` / `setAllScripts`.
- Adding `.` stores the workspace absolute path (`/ws` in the fixture). `toEntryPath` rewrites that root to an absolute path before the empty-string guard, so the "always scanned" message does not run for `.`. Hidden or ignored names warn and are not stored. A missing path warns. A quoted relative directory is stored once. A second add says it is already a scan directory. An absolute directory outside the workspace is stored as that absolute path. A `.sh` path becomes a script button, and a second add says it is already a button. Remove and the recursive toggle rewrite `buttons.scanDirectories`. A failed settings write shows `Could not save scan directories to workspace settings.` and leaves the setting as it was.
- Explorer multi-select adds each `.sh` as a button. A `package.json` from the explorer adds its parent folder as a scan directory.
- `buttons.textSize` of `plus2` / `plus4` and a safe run color show up on the next render.
- A script watcher event under `node_modules` or a hidden directory does not rescan. A change to `package.json` does.
- Absolute scan directories get their own watcher. `deactivate` disposes it. A relative scan directory does not get that watcher.
- Export skill: dismiss does nothing; copy puts the packaged skill on the clipboard (the three headings from `SKILL.md`, `schema.md`, and `examples.md`); a clipboard failure is reported; Add to project writes `BUTTONS-SKILL.md` and opens it; an existing file asks before replace. A missing extension root shows `Could not load the Buttons AI skill.`

Scanner cases in `backend.scanner.test.ts` go through `scanWorkspaceScripts` and the stand-in file system:

- Root manifests, with pnpm preferred over `package-lock.json`, and yarn preferred over npm when pnpm is absent.
- Makefile skips `.PHONY` and keeps a comment. justfile skips `_private`. composer scripts stay `composer`, even when the Node lockfile is pnpm. Cargo is `cargo build|test|run`. Go run is `go run .`.
- A broken or unreadable manifest is skipped. Other files in the same scan still return.
- A non-recursive directory sees only its own top level. A recursive directory sees nested manifests and still skips `node_modules` and hidden directories inside that tree.
- An absolute scan directory is keyed by its absolute path and uses the workspace lockfile for package.json scripts.
- A `.buttons.json` file entry is stat'd even when its folder is not a scan directory. A missing entry is omitted. A root `.sh` that is both discovered and listed is returned once.
- `venv/bin/activate` plus `requirements.txt` yields Activate, Deactivate, and Install requirements.

## The vsix `buttons-vscode-2.3.0.vsix`

The file is `release/buttons-vscode-2.3.0.vsix`. `release/` and `*.vsix` are gitignored. The test reads the local zip. It does not build a new one, and the file must not be committed.

`package.vsix.test.ts` checks:

- The file exists. `package.json` in the repo is version `2.3.0`. `git ls-files --error-unmatch` does not track the vsix. `git check-ignore --no-index` does.
- The zip contains `extension/package.json`, readme, changelog, license, `dist/extension.js`, the actions, renderer, and buttons-file bundles, the three icons, the create-buttons-file skill parts, and `codicon.css`.
- It does not contain `extension/src/`, `extension/docs/`, `extension/dist/test/`, `.env`, `.pem`, or another vsix.
- Packaged `package.json` is `buttons-vscode` `2.3.0` from `CurbSoftware`, main `./dist/extension.js`, activation `workspaceContains:.buttons.json` and `onStartupFinished`, the six contributed commands, and view `buttons.sidebarView` of type `webview`.
- `dist/extension.js` still has `function activate` and `buttons.sidebarView`.
- Packaged text does not contain a private key block, an `AKIA` key id, a `gh*_` token, or a Slack `xox` token.

When the version moves, update this filename, the assertion, and the packaged vsix together. Do not loosen the test to skip a missing file.

## Adding the next case

Pick the file from the table. If the behavior is a pure function, import it directly. If it needs the editor, import `./support/vscodeDouble` before any module that imports `vscode`. If it is a click in the webview, render HTML and `bootWebview`. If it is about the shipped bits, extend `package.vsix.test.ts` and leave the zip untracked.
