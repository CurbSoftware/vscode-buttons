import type { ButtonColors, ButtonsSource, ResolvedButton, WebviewState } from "../models/types";
import { isArgsButton, isCommandButton, isScriptButton } from "../models/types";
import { scriptKey, type DiscoveredScript } from "../scanner/types";
import { groupScriptsByFile, type ScriptGroup } from "./scanGrouping";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pathAttr(path: number[]): string {
  return escapeHtml(JSON.stringify(path));
}

function pathsEqual(a?: number[], b?: number[]): boolean {
  return Boolean(a && b && a.length === b.length && a.every((n, i) => n === b[i]));
}

function sourcePathAttrs(source: ButtonsSource, path: number[]): string {
  return `data-source="${source}" data-path="${pathAttr(path)}"`;
}

type RenderVariant = "sidebar" | "editor";

export function renderHtml(state: WebviewState, codiconUri: string, variant: RenderVariant = "sidebar"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link href="${codiconUri}" rel="stylesheet" />
<style>${css(variant, state.textSizePx, state.buttonColors)}</style>
</head>
<body>
  ${renderHeader(state)}
  ${renderTabs(state)}
  ${state.parseError ? renderError(state.parseError) : ""}
  ${state.activeTab === "scripts" ? renderScanSection(state) : renderButtonsPage(state, variant)}
  <script>${js()}</script>
</body>
</html>`;
}

function renderHeader(state: WebviewState): string {
  // The Scripts tab shows its own Generate CTA; keep the header button off it
  // so the no-file state doesn't stack two primary buttons.
  const generateButton = state.activeTab === "buttons" && state.hasWorkspace && !state.projectFileExists
    ? `<button class="btn primary" data-action="generate" title="Scan and create the project .buttons.json"><span class="codicon codicon-wand" aria-hidden="true"></span> Generate</button>`
    : "";
  return `<header class="header">
  <div class="header-title">Buttons</div>
  <div class="header-actions">
    ${generateButton}
    <button class="btn" data-action="rescan" title="Rescan project scripts"><span class="codicon codicon-refresh" aria-hidden="true"></span> Rescan</button>
    <button class="btn" data-action="open-project-file" title="Open the project .buttons.json file" aria-label="Open the project .buttons.json file"><span class="codicon codicon-file-code" aria-hidden="true"></span></button>
    <button class="btn" data-action="open-global-file" title="Open the global ~/.buttons.json file" aria-label="Open the global ~/.buttons.json file"><span class="codicon codicon-home" aria-hidden="true"></span></button>
    <button class="btn" data-action="open-settings" title="Open Buttons settings" aria-label="Open Buttons settings"><span class="codicon codicon-settings-gear" aria-hidden="true"></span></button>
  </div>
</header>`;
}

function renderTabs(state: WebviewState): string {
  const buttonsActive = state.activeTab === "buttons" ? " active" : "";
  const scriptsActive = state.activeTab === "scripts" ? " active" : "";
  return `<nav class="tabs">
  <button class="tab${buttonsActive}" data-action="set-tab" data-tab="buttons">Buttons</button>
  <button class="tab${scriptsActive}" data-action="set-tab" data-tab="scripts">Project scripts</button>
</nav>`;
}

function renderError(message: string): string {
  return `<div class="error">${escapeHtml(message)}</div>`;
}

function renderScanSection(state: WebviewState): string {
  const title = `<div class="section-title">Project scripts</div>`;
  if (!state.hasWorkspace) {
    return `<section class="scan">${title}<div class="muted">Open a folder to scan for scripts.</div></section>`;
  }

  const scanDirsCard = renderScanDirectoriesCard(state);

  if (state.discovered.length === 0) {
    return `<section class="scan">${title}${scanDirsCard}<div class="muted">No scripts found. Add a scan directory or enable more script file types in settings.</div></section>`;
  }

  const rootCount = state.discovered.filter((d) => d.packageDir === "").length;
  const generateCta = !state.projectFileExists
    ? `<div class="generate-cta"><button class="btn primary" data-action="generate"><span class="codicon codicon-wand" aria-hidden="true"></span> Generate buttons file</button><span class="muted">Include ${rootCount} root-level scripts as project buttons.</span></div>`
    : "";

  const selectedKeys = new Set(state.selectedKeys);
  const groups = groupScriptsByFile(state.discovered, state.selectedKeys);
  const rows = groups
    .map((group) => renderScanGroup(group, selectedKeys, !state.projectFileExists))
    .join("");

  const allSelected = groups.length > 0 && groups.every((g) => g.fileChecked);
  const bulkToggle = state.projectFileExists
    ? `<button class="btn" data-action="toggle-all" data-checked="${!allSelected}">${allSelected ? "Unselect all" : "Select all"}</button>`
    : "";
  const titleWithBulk = `<div class="section-title">Project scripts ${bulkToggle}</div>`;

  return `<section class="scan">${titleWithBulk}${scanDirsCard}${generateCta}<div class="scan-list">${rows}</div></section>`;
}

/** Card listing the scan scope: the locked project-root row plus each configured directory. */
function renderScanDirectoriesCard(state: WebviewState): string {
  const dirRows = state.scanDirectories
    .map((d) => {
      const p = escapeHtml(d.path);
      return `<div class="scan-dir-row">
    <span class="codicon codicon-folder" aria-hidden="true"></span>
    <span class="scan-dir-path" title="${p}">${p}</span>
    <label class="scan-dir-recursive" title="Scan ${p} and its subdirectories">
      <input type="checkbox" data-action="toggle-scan-dir-recursive" data-path="${p}" aria-label="Scan ${p} recursively"${d.recursive ? " checked" : ""} />
      <span>recursive</span>
    </label>
    <button type="button" class="btn icon-only" data-action="remove-scan-dir" data-path="${p}" title="Remove ${p}" aria-label="Remove ${p} from scan directories">
      <span class="codicon codicon-close" aria-hidden="true"></span>
    </button>
  </div>`;
    })
    .join("");

  return `<div class="scan-dirs">
  <div class="scan-dirs-header">
    <span class="scan-dirs-title">Scan directories</span>
  </div>
  <div class="scan-dir-add">
    <input id="add-scan-path" type="text" placeholder="packages/api or /opt/tools" aria-label="Path to add (relative for this project, full path for outside it)" />
    <button type="button" class="btn" data-action="add-scan-dir" title="Add this path">Add</button>
  </div>
  <div class="scan-dir-row locked">
    <span class="codicon codicon-root-folder" aria-hidden="true"></span>
    <span class="scan-dir-path" title="Project root">Project root</span>
    <span class="scan-dir-badge">always on</span>
    <span class="scan-dir-badge">non-recursive</span>
    <span class="codicon codicon-lock scan-dir-lock" aria-hidden="true"></span>
  </div>
  ${dirRows}
  <div class="muted scan-dirs-hint">The project root is always scanned at its top level. Paste a folder path to scan elsewhere: relative for this project, full path for anything outside it.</div>
</div>`;
}

function renderScanRow(script: DiscoveredScript, checked: boolean, disabled: boolean): string {
  const file = escapeHtml(script.file);
  // Standalone file entries (.sh, Python, venv actions) key on the path; show the basename.
  const rawName = script.script === script.file ? (script.file.split("/").pop() ?? script.script) : script.script;
  const name = escapeHtml(rawName);
  const command = escapeHtml(script.command);
  const tooltip = escapeHtml(script.description || script.command);
  const icon = script.icon ? `<span class="codicon codicon-${escapeHtml(script.icon)}" aria-hidden="true"></span>` : "";
  return `<label class="scan-row${disabled ? " disabled" : ""}" title="${tooltip}">
  <input type="checkbox" aria-label="Include ${name} from ${file}" data-action="toggle-script" data-file="${file}" data-script="${escapeHtml(script.script)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
  ${icon}
  <span class="scan-name">${name}</span>
  <code class="scan-cmd" title="${command}">${command}</code>
</label>`;
}

function renderScanGroup(group: ScriptGroup, selectedKeys: ReadonlySet<string>, projectDisabled: boolean): string {
  const file = escapeHtml(group.file);
  const fileChecked = group.fileChecked ? " checked" : "";
  const fileDisabled = projectDisabled ? " disabled" : "";
  const scriptDisabled = projectDisabled;

  const rows = group.scripts
    .map((s) => renderScanRow(s, selectedKeys.has(scriptKey(s)), scriptDisabled))
    .join("");

  return `<div class="scan-group collapsed" data-file="${file}">
  <div class="scan-group-header">
    <label class="scan-group-check" title="${file}">
      <input type="checkbox" data-action="toggle-file" data-file="${file}" data-selected-count="${group.selectedCount}" data-total="${group.scripts.length}"${fileChecked}${fileDisabled} />
    </label>
    <button type="button" class="scan-group-toggle" data-action="toggle-group" aria-expanded="false">
      <span class="codicon codicon-chevron-right scan-group-caret" aria-hidden="true"></span>
      <span class="scan-group-title">${file}</span>
      <span class="scan-group-count">${group.scripts.length}</span>
    </button>
  </div>
  <div class="scan-group-body">${rows}</div>
</div>`;
}

function renderButtonsPage(state: WebviewState, variant: RenderVariant): string {
  const projectHint = !state.hasWorkspace
    ? "No project buttons yet. Open a folder to get started."
    : !state.projectFileExists
      ? "No project buttons yet. Click Generate to include scripts from root-level files."
      : "No project buttons yet. Add a command or enable scripts in the Project scripts tab.";
  return `${renderTable(state, "project", "Project buttons", undefined, state.projectButtons, state.hasWorkspace, projectHint, variant)}
${renderTable(state, "global", "Global buttons", "Applies to every project", state.globalButtons, true, "No global buttons yet. Add a command to use across all projects.", variant)}`;
}

function renderTable(
  state: WebviewState,
  source: ButtonsSource,
  title: string,
  subtitle: string | undefined,
  buttons: ResolvedButton[],
  canAdd: boolean,
  emptyHint: string,
  variant: RenderVariant,
): string {
  const addButton = canAdd
    ? `<button class="btn" data-action="start-add" data-source="${source}">+ Add command</button>`
    : "";
  const insertSelected =
    buttons.length > 0
      ? `<button class="btn" data-action="insert-selected" data-source="${source}" title="Insert selected commands into the terminal without running them">Insert selected</button>`
      : "";
  const subtitleHtml = subtitle ? `<div class="section-subtitle">${escapeHtml(subtitle)}</div>` : "";
  const titleActions = `<span class="section-title-actions">${insertSelected}${addButton}</span>`;

  if (variant === "sidebar") {
    const rows: string[] = [];
    if (state.addingSource === source && !state.addingChildPath) {
      rows.push(renderCardAddRow(source));
    }
    for (const button of buttons) {
      rows.push(renderCardBlock(state, source, button));
    }
    if (rows.length === 0) {
      rows.push(`<div class="button-card empty"><span class="muted">${escapeHtml(emptyHint)}</span></div>`);
    }
    return `<section class="table-section">
  <div class="section-title">${escapeHtml(title)} ${titleActions}</div>
  ${subtitleHtml}
  <div class="button-card-list">${rows.join("")}</div>
</section>`;
  }

  const bodies: string[] = [];
  if (state.addingSource === source && !state.addingChildPath) {
    bodies.push(`<tbody>${renderAddRow(source)}</tbody>`);
  }
  for (const button of buttons) {
    bodies.push(renderEditorBlock(state, source, button));
  }
  if (bodies.length === 0) {
    bodies.push(`<tbody><tr><td colspan="3" class="muted empty">${escapeHtml(emptyHint)}</td></tr></tbody>`);
  }

  return `<section class="table-section">
  <div class="section-title">${escapeHtml(title)} ${titleActions}</div>
  ${subtitleHtml}
  <table class="buttons-table">
    <thead><tr><th>Command</th><th>Note</th><th class="actions-col">Actions</th></tr></thead>
    ${bodies.join("")}
  </table>
</section>`;
}

function renderDragHandle(): string {
  return `<span class="drag-handle" draggable="true" title="Drag to reorder" aria-label="Drag to reorder"><span class="codicon codicon-gripper" aria-hidden="true"></span></span>`;
}

function renderSelect(source: ButtonsSource, path: number[]): string {
  return `<input type="checkbox" data-action="toggle-select" ${sourcePathAttrs(source, path)} aria-label="Select command" />`;
}

function renderVariantToggle(source: ButtonsSource, path: number[]): string {
  return `<button type="button" class="scan-group-toggle variant-toggle" data-action="toggle-variants" ${sourcePathAttrs(source, path)} aria-expanded="false" title="Show parameter options">
    <span class="codicon codicon-chevron-right scan-group-caret" aria-hidden="true"></span>
  </button>`;
}

function renderBadges(button: ResolvedButton): string {
  const fileBadge =
    button.kind === "script" && isScriptButton(button.entry)
      ? `<span class="badge">${escapeHtml(button.entry.file)}</span>`
      : button.kind === "args"
        ? `<span class="badge">args</span>`
        : "";
  const missingBadge = button.missing ? `<span class="badge missing">not found</span>` : "";
  return `${fileBadge}${missingBadge}`;
}

function renderRowActions(source: ButtonsSource, button: ResolvedButton): string {
  const ds = sourcePathAttrs(source, button.path);
  const editLabel = button.kind === "script" ? "Note" : "Edit";
  const runActions = button.missing
    ? ""
    : `<button class="btn primary" data-action="run-current" ${ds} title="Run in the current integrated terminal">Run</button>
       <button class="btn" data-action="run-new" ${ds} title="Run in a new integrated terminal">New Terminal</button>
       <button class="btn" data-action="insert" ${ds} title="Insert into the terminal without running">Insert</button>
       <button class="btn" data-action="copy" ${ds} title="Copy command to clipboard">Copy</button>`;
  return `${runActions}
    <button class="btn" data-action="duplicate" ${ds} title="Duplicate this button">Duplicate</button>
    <button class="btn" data-action="start-edit" ${ds}>${editLabel}</button>
    <button class="btn danger" data-action="remove" ${ds} title="Remove">✕</button>`;
}

function renderAddVariant(state: WebviewState, source: ButtonsSource, parent: ResolvedButton): string {
  if (pathsEqual(state.addingChildPath, parent.path)) {
    return `<div class="button-card add-row">
  <div class="button-card-main"><input id="add-args" type="text" placeholder="extra args (e.g. --include app1 app2)" /></div>
  <div class="button-card-field"><input id="add-child-note" type="text" placeholder="note (optional)" /></div>
  <div class="button-card-actions">
    <button class="btn primary" data-action="save-add-child" ${sourcePathAttrs(source, parent.path)}>Save</button>
    <button class="btn" data-action="cancel-add">Cancel</button>
  </div>
</div>`;
  }
  return `<button class="btn" data-action="start-add-child" ${sourcePathAttrs(source, parent.path)}>+ Add variant</button>`;
}

function renderCardBlock(state: WebviewState, source: ButtonsSource, button: ResolvedButton): string {
  const forceOpen = pathsEqual(state.addingChildPath, button.path);
  const collapsed = forceOpen ? "" : " collapsed";
  const children = button.children.map((child) => renderCardRow(state, source, child, true)).join("");
  return `<div class="button-block${collapsed}" ${sourcePathAttrs(source, button.path)}>
  ${renderCardRow(state, source, button, false)}
  <div class="button-variants">
    ${children}
    ${renderAddVariant(state, source, button)}
  </div>
</div>`;
}

function renderCardRow(state: WebviewState, source: ButtonsSource, button: ResolvedButton, isChild: boolean): string {
  if (pathsEqual(state.editing?.path, button.path) && state.editing?.source === source) {
    return renderCardEditRow(source, button, isChild);
  }
  return renderCardDisplayRow(source, button, isChild);
}

function renderCardDisplayRow(source: ButtonsSource, button: ResolvedButton, isChild: boolean): string {
  const note = button.note ? `<div class="note">${escapeHtml(button.note)}</div>` : "";
  const toggle = isChild ? "" : renderVariantToggle(source, button.path);
  return `<div class="button-card${isChild ? " child" : ""}" ${sourcePathAttrs(source, button.path)}>
  <div class="button-card-head">
    ${renderDragHandle()}
    ${renderSelect(source, button.path)}
    ${toggle}
    <div class="button-card-main"><code>${escapeHtml(button.command)}</code>${renderBadges(button)}${note}</div>
  </div>
  <div class="button-card-actions">
    ${renderRowActions(source, button)}
  </div>
</div>`;
}

function renderCardEditRow(source: ButtonsSource, button: ResolvedButton, isChild: boolean): string {
  const ds = sourcePathAttrs(source, button.path);
  const commandCell = isCommandButton(button.entry)
    ? `<textarea id="edit-command" rows="2" placeholder="command">${escapeHtml(button.entry.command)}</textarea>`
    : isArgsButton(button.entry)
      ? `<input id="edit-args" type="text" value="${escapeHtml(button.entry.args)}" placeholder="extra args" />`
      : `<code>${escapeHtml(button.command)}</code>`;
  return `<div class="button-card editing${isChild ? " child" : ""}" ${ds}>
  <div class="button-card-main">${commandCell}</div>
  <div class="button-card-field"><input id="edit-note" type="text" value="${escapeHtml(button.note ?? "")}" placeholder="note (optional)" /></div>
  <div class="button-card-actions">
    <button class="btn primary" data-action="save-edit" ${ds}>Save</button>
    <button class="btn" data-action="cancel-edit">Cancel</button>
  </div>
</div>`;
}

function renderCardAddRow(source: ButtonsSource): string {
  return `<div class="button-card add-row" data-source="${source}">
  <div class="button-card-main"><textarea id="add-command" rows="2" placeholder="command (e.g. docker ps)"></textarea></div>
  <div class="button-card-field"><input id="add-note" type="text" placeholder="note (optional)" /></div>
  <div class="button-card-actions">
    <button class="btn primary" data-action="save-add" data-source="${source}">Save</button>
    <button class="btn" data-action="cancel-add">Cancel</button>
  </div>
</div>`;
}

function renderEditorBlock(state: WebviewState, source: ButtonsSource, button: ResolvedButton): string {
  const forceOpen = pathsEqual(state.addingChildPath, button.path);
  const collapsed = forceOpen ? "" : " collapsed";
  const childRows = button.children.map((child) => renderEditorRow(state, source, child)).join("");
  const add = renderEditorAddVariant(state, source, button);
  return `<tbody class="button-block${collapsed}" ${sourcePathAttrs(source, button.path)}>
  ${renderEditorRow(state, source, button, true)}
  <tr class="variants-row"><td colspan="3">
    <table class="buttons-table nested">${childRows}${add}</table>
  </td></tr>
</tbody>`;
}

function renderEditorRow(state: WebviewState, source: ButtonsSource, button: ResolvedButton, isParent = false): string {
  if (pathsEqual(state.editing?.path, button.path) && state.editing?.source === source) {
    return renderEditRow(source, button);
  }
  return renderDisplayRow(source, button, isParent);
}

function renderDisplayRow(source: ButtonsSource, button: ResolvedButton, isParent: boolean): string {
  const note = button.note ? escapeHtml(button.note) : "";
  const toggle = isParent ? renderVariantToggle(source, button.path) : "";
  const ds = sourcePathAttrs(source, button.path);
  return `<tr ${ds}>
  <td class="cmd">
    <div class="cmd-head">${renderDragHandle()}${renderSelect(source, button.path)}${toggle}<code>${escapeHtml(button.command)}</code>${renderBadges(button)}</div>
  </td>
  <td class="note">${note}</td>
  <td class="actions">${renderRowActions(source, button)}</td>
</tr>`;
}

function renderEditRow(source: ButtonsSource, button: ResolvedButton): string {
  const ds = sourcePathAttrs(source, button.path);
  const commandCell = isCommandButton(button.entry)
    ? `<textarea id="edit-command" rows="2" placeholder="command">${escapeHtml(button.entry.command)}</textarea>`
    : isArgsButton(button.entry)
      ? `<input id="edit-args" type="text" value="${escapeHtml(button.entry.args)}" placeholder="extra args" />`
      : `<code>${escapeHtml(button.command)}</code>`;
  return `<tr class="editing" ${ds}>
  <td class="cmd">${commandCell}</td>
  <td class="note"><input id="edit-note" type="text" value="${escapeHtml(button.note ?? "")}" placeholder="note (optional)" /></td>
  <td class="actions">
    <button class="btn primary" data-action="save-edit" ${ds}>Save</button>
    <button class="btn" data-action="cancel-edit">Cancel</button>
  </td>
</tr>`;
}

function renderAddRow(source: ButtonsSource): string {
  return `<tr class="add-row" data-source="${source}">
  <td class="cmd"><textarea id="add-command" rows="2" placeholder="command (e.g. docker ps)"></textarea></td>
  <td class="note"><input id="add-note" type="text" placeholder="note (optional)" /></td>
  <td class="actions">
    <button class="btn primary" data-action="save-add" data-source="${source}">Save</button>
    <button class="btn" data-action="cancel-add">Cancel</button>
  </td>
</tr>`;
}

function renderEditorAddVariant(state: WebviewState, source: ButtonsSource, parent: ResolvedButton): string {
  if (pathsEqual(state.addingChildPath, parent.path)) {
    return `<tr class="add-row">
  <td class="cmd"><input id="add-args" type="text" placeholder="extra args (e.g. --include app1 app2)" /></td>
  <td class="note"><input id="add-child-note" type="text" placeholder="note (optional)" /></td>
  <td class="actions">
    <button class="btn primary" data-action="save-add-child" ${sourcePathAttrs(source, parent.path)}>Save</button>
    <button class="btn" data-action="cancel-add">Cancel</button>
  </td>
</tr>`;
  }
  return `<tr><td colspan="3"><button class="btn" data-action="start-add-child" ${sourcePathAttrs(source, parent.path)}>+ Add variant</button></td></tr>`;
}

function css(variant: RenderVariant, textSizePx: number, colors: ButtonColors): string {
  const bg = variant === "editor" ? "var(--vscode-editor-background)" : "var(--vscode-sideBar-background)";
  const btnBg = colors.background || "var(--vscode-button-background)";
  const btnFg = colors.foreground || "var(--vscode-button-foreground)";
  const btnHover = colors.hoverBackground || "var(--vscode-button-hoverBackground)";
  const cardBg = colors.background || "transparent";
  const cardFg = colors.foreground || "inherit";
  const cardBorder = colors.background || "var(--border)";
  return `
:root {
  color-scheme: light dark;
  --bg: ${bg};
  --fg: var(--vscode-editor-foreground);
  --muted: var(--vscode-descriptionForeground);
  --border: var(--vscode-panel-border);
  --danger: var(--vscode-errorForeground);
  --btn-bg: ${btnBg};
  --btn-fg: ${btnFg};
  --btn-hover: ${btnHover};
  --card-bg: ${cardBg};
  --card-fg: ${cardFg};
  --card-border: ${cardBorder};
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 12px;
  font-family: var(--vscode-font-family);
  font-size: calc(var(--vscode-font-size, 13px) + ${textSizePx}px);
  color: var(--fg);
  background: var(--bg);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.header-title { font-size: 1.1em; font-weight: 600; }
.header-actions { display: flex; gap: 4px; flex-wrap: wrap; }
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}
.tab {
  appearance: none;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--muted);
  font-family: inherit;
  font-size: 0.95em;
  padding: 6px 10px;
  cursor: pointer;
}
.tab:hover { color: var(--fg); }
.tab.active {
  color: var(--fg);
  border-bottom-color: var(--vscode-focusBorder, var(--fg));
  font-weight: 600;
}
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--muted);
  margin: 14px 0 6px;
}
.section-title-actions { display: flex; gap: 4px; flex-wrap: wrap; }
.section-subtitle { color: var(--muted); font-size: 0.85em; margin-bottom: 4px; }
.section-title .btn { font-size: 1.06em; }
.btn {
  appearance: none;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--fg);
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: inherit;
  line-height: 1.4;
  cursor: pointer;
  white-space: nowrap;
}
.btn:hover { background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.1)); }
.btn.primary { background: var(--btn-bg); color: var(--btn-fg); border-color: transparent; }
.btn.primary:hover { background: var(--btn-hover); }
.btn.danger:hover { border-color: var(--danger); color: var(--danger); background: transparent; }
.error {
  border: 1px solid var(--danger);
  color: var(--danger);
  padding: 8px;
  border-radius: 4px;
  margin: 8px 0;
  font-size: 0.9em;
  white-space: pre-wrap;
}
.scan-dirs {
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.scan-dirs-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.scan-dir-add { display: flex; align-items: center; gap: 6px; padding: 2px 0 4px; }
.scan-dir-add input { flex: 1; min-width: 0; }
.scan-dirs-title {
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--muted);
  font-weight: 600;
}
.scan-dir-row { display: flex; align-items: center; gap: 6px; padding: 2px 0; min-width: 0; }
.scan-dir-row.locked { opacity: 0.8; }
.scan-dir-path {
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scan-dir-recursive {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: 0.85em;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
}
.scan-dir-recursive input[type="checkbox"] { margin: 0; }
.scan-dir-badge {
  padding: 0 5px;
  border: 1px solid var(--border);
  border-radius: 3px;
  font-size: 0.8em;
  color: var(--muted);
  white-space: nowrap;
  flex-shrink: 0;
}
.scan-dir-lock { color: var(--muted); flex-shrink: 0; }
.btn.icon-only { padding: 2px 4px; line-height: 1; }
.scan-dirs-hint { font-size: 0.8em; margin-top: 2px; }
.btn:focus-visible, .tab:focus-visible, .scan-group-toggle:focus-visible, input:focus-visible, textarea:focus-visible {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: 1px;
}
.scan-list { display: flex; flex-direction: column; }
.scan-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  cursor: pointer;
}
.scan-row.disabled { opacity: 0.55; cursor: default; }
.scan-row input[type="checkbox"] { margin: 0; flex-shrink: 0; }
.scan-name { font-weight: 500; white-space: nowrap; }
.scan-cmd {
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 0.85em;
  color: var(--muted);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.generate-cta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}
.scan-group { display: flex; flex-direction: column; }
.scan-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
}
.scan-group-check { display: flex; align-items: center; flex-shrink: 0; }
.scan-group-check input[type="checkbox"] { margin: 0; }
.scan-group-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  appearance: none;
  border: none;
  background: transparent;
  color: var(--fg);
  font-family: inherit;
  font-size: 1em;
  padding: 0;
  cursor: pointer;
  flex: 1;
  min-width: 0;
  text-align: left;
}
.scan-group-toggle:hover { color: var(--vscode-focusBorder, var(--fg)); }
.variant-toggle { flex: 0 0 auto; }
.scan-group-caret { transition: transform 0.1s ease; flex-shrink: 0; }
.scan-group:not(.collapsed) .scan-group-caret,
.button-block:not(.collapsed) .scan-group-caret { transform: rotate(90deg); }
.scan-group-title {
  font-weight: 600;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scan-group-count { color: var(--muted); font-size: 0.8em; flex-shrink: 0; }
.scan-group-body { display: flex; flex-direction: column; padding-left: 18px; }
.scan-group.collapsed .scan-group-body { display: none; }
.button-block.collapsed .button-variants,
.button-block.collapsed .variants-row { display: none; }
.button-variants { display: flex; flex-direction: column; gap: 6px; padding: 0 0 0 18px; }
.buttons-table { width: 100%; border-collapse: collapse; }
.buttons-table.nested { margin: 0; }
.buttons-table th {
  text-align: left;
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--muted);
  font-weight: 600;
  padding: 4px 6px;
  border-bottom: 1px solid var(--border);
}
.buttons-table td { padding: 6px; vertical-align: top; border-bottom: 1px solid var(--border); }
.cmd-head { display: flex; align-items: flex-start; gap: 6px; }
.cmd code, .button-card-main code {
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 1em;
  word-break: break-word;
  white-space: pre-wrap;
}
.badge {
  display: inline-block;
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 3px;
  font-size: 0.8em;
  border: 1px solid var(--border);
  color: var(--muted);
  vertical-align: middle;
}
.badge.missing { border-color: var(--danger); color: var(--danger); }
.note { color: var(--muted); font-size: 0.9em; word-break: break-word; }
.actions { display: flex; flex-wrap: wrap; gap: 4px; }
.actions .btn { padding: 2px 6px; font-size: 0.85em; }
.muted { color: var(--muted); }
.empty { text-align: center; padding: 12px; }
.button-card-list { display: flex; flex-direction: column; gap: 6px; }
.button-card {
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--card-fg);
  border-radius: 4px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.button-card.child { border-style: dashed; }
.button-card.editing, .button-card.add-row { border-color: var(--vscode-focusBorder, var(--fg)); }
.button-card.empty { border-style: dashed; }
.button-card-head { display: flex; align-items: flex-start; gap: 6px; }
.button-card-main { min-width: 0; flex: 1; }
.button-card-main .note { margin-top: 4px; }
.button-card-actions { display: flex; flex-wrap: wrap; gap: 4px; }
.button-card-field input, .button-card-field textarea { width: 100%; }
.drag-handle { cursor: grab; color: var(--muted); flex-shrink: 0; padding: 2px; }
.drag-handle:active { cursor: grabbing; }
.dragging { opacity: 0.5; }
.drag-over { outline: 1px dashed var(--vscode-focusBorder, var(--fg)); }
input[type="text"], textarea {
  width: 100%;
  background: var(--vscode-input-background, transparent);
  color: var(--vscode-input-foreground, var(--fg));
  border: 1px solid var(--border);
  padding: 3px 6px;
  border-radius: 3px;
  font-family: inherit;
  font-size: 0.9em;
}
textarea { resize: vertical; min-height: 2.4em; font-family: var(--vscode-editor-font-family, monospace); }
`;
}

function js(): string {
  return `
const vscode = acquireVsCodeApi();
function post(message) { vscode.postMessage(message); }

function parsePath(el) {
  if (!el || el.dataset.path === undefined) { return undefined; }
  try { return JSON.parse(el.dataset.path); } catch { return undefined; }
}

function focusSelector(el) {
  if (!el || !el.dataset || !el.dataset.action) { return null; }
  const parts = ['[data-action="' + CSS.escape(el.dataset.action) + '"]'];
  for (const a of ["path", "file", "script", "tab", "source"]) {
    if (el.dataset[a] !== undefined) { parts.push('[data-' + a + '="' + CSS.escape(el.dataset[a]) + '"]'); }
  }
  return parts.join("");
}

function rememberFocus(el) {
  const selector = focusSelector(el);
  if (selector) { vscode.setState({ ...(vscode.getState() || {}), focusTarget: selector }); }
}

function restoreFocus() {
  const saved = vscode.getState() || {};
  if (!saved.focusTarget) { return; }
  vscode.setState({ ...saved, focusTarget: null });
  const el = document.querySelector(saved.focusTarget);
  if (el) { el.focus(); }
}

const DRAFT_IDS = ["edit-command", "edit-note", "edit-args", "add-command", "add-note", "add-args", "add-child-note", "add-scan-path"];

function saveDrafts() {
  const drafts = {};
  for (const id of DRAFT_IDS) {
    const input = document.getElementById(id);
    if (input) { drafts[id] = input.value; }
  }
  vscode.setState({ ...(vscode.getState() || {}), drafts });
}

function clearDrafts() {
  vscode.setState({ ...(vscode.getState() || {}), drafts: {} });
}

function restoreDrafts() {
  const drafts = (vscode.getState() || {}).drafts || {};
  for (const id of DRAFT_IDS) {
    const input = document.getElementById(id);
    if (input && typeof drafts[id] === "string") { input.value = drafts[id]; }
  }
}

document.addEventListener("input", (event) => {
  if (event.target && event.target.id && DRAFT_IDS.includes(event.target.id)) { saveDrafts(); }
});

function submitScanPath() {
  const input = document.getElementById("add-scan-path");
  if (!input || !input.value.trim()) { return; }
  post({ type: "add-scan-dir", path: input.value });
  input.value = "";
  saveDrafts();
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target && event.target.id === "add-scan-path") { submitScanPath(); }
});

document.addEventListener("change", (event) => {
  const el = event.target;
  if (!el || !el.matches) { return; }
  rememberFocus(el);
  if (el.matches('input[data-action="toggle-script"]')) {
    post({
      type: "toggle-script",
      file: el.dataset.file,
      script: el.dataset.script,
      checked: el.checked,
    });
  } else if (el.matches('input[data-action="toggle-file"]')) {
    post({ type: "toggle-file", file: el.dataset.file, checked: el.checked });
  } else if (el.matches('input[data-action="toggle-scan-dir-recursive"]')) {
    post({ type: "toggle-scan-dir-recursive", path: el.dataset.path, recursive: el.checked });
  } else if (el.matches('input[data-action="toggle-select"]')) {
    persistChecked();
  }
});

document.addEventListener("click", (event) => {
  const el = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
  if (!el) { return; }

  const action = el.dataset.action;
  const source = el.dataset.source;
  const path = parsePath(el);
  if (action !== "toggle-group" && action !== "toggle-variants") { rememberFocus(el); }

  switch (action) {
    case "toggle-group": {
      const group = el.closest(".scan-group");
      if (!group) { break; }
      const nowCollapsed = group.classList.toggle("collapsed");
      const btn = group.querySelector(".scan-group-toggle");
      if (btn) { btn.setAttribute("aria-expanded", String(!nowCollapsed)); }
      persistScanGroupState();
      break;
    }
    case "toggle-variants": {
      const block = el.closest(".button-block");
      if (!block) { break; }
      const nowCollapsed = block.classList.toggle("collapsed");
      el.setAttribute("aria-expanded", String(!nowCollapsed));
      persistExpandedButtons();
      break;
    }
    case "rescan": post({ type: "rescan" }); break;
    case "generate": post({ type: "generate" }); break;
    case "add-scan-dir": submitScanPath(); break;
    case "remove-scan-dir": post({ type: "remove-scan-dir", path: el.dataset.path }); break;
    case "toggle-all": post({ type: "toggle-all", checked: el.dataset.checked === "true" }); break;
    case "set-tab": post({ type: "set-tab", tab: el.dataset.tab }); break;
    case "open-project-file": post({ type: "open-project-file" }); break;
    case "open-global-file": post({ type: "open-global-file" }); break;
    case "open-settings": post({ type: "open-settings" }); break;
    case "run-current": post({ type: "run-current", source, path }); break;
    case "run-new": post({ type: "run-new", source, path }); break;
    case "insert": post({ type: "insert", source, path }); break;
    case "insert-selected": {
      const paths = [];
      document.querySelectorAll('input[data-action="toggle-select"][data-source="' + CSS.escape(source) + '"]:checked').forEach((box) => {
        const p = parsePath(box);
        if (p) { paths.push(p); }
      });
      post({ type: "insert-selected", source, paths });
      break;
    }
    case "copy": post({ type: "copy", source, path }); break;
    case "duplicate": post({ type: "duplicate", source, path }); break;
    case "start-edit": clearDrafts(); post({ type: "start-edit", source, path }); break;
    case "cancel-edit": clearDrafts(); post({ type: "cancel-edit" }); break;
    case "save-edit": {
      const commandInput = document.getElementById("edit-command");
      const argsInput = document.getElementById("edit-args");
      const noteInput = document.getElementById("edit-note");
      clearDrafts();
      post({
        type: "save-edit",
        source,
        path,
        command: commandInput ? commandInput.value : undefined,
        args: argsInput ? argsInput.value : undefined,
        note: noteInput ? noteInput.value : "",
      });
      break;
    }
    case "remove": post({ type: "remove", source, path }); break;
    case "start-add": clearDrafts(); post({ type: "start-add", source }); break;
    case "start-add-child": clearDrafts(); post({ type: "start-add-child", source, path }); break;
    case "cancel-add": clearDrafts(); post({ type: "cancel-add" }); break;
    case "save-add": {
      const commandInput = document.getElementById("add-command");
      const noteInput = document.getElementById("add-note");
      clearDrafts();
      post({
        type: "save-add",
        source,
        command: commandInput ? commandInput.value : "",
        note: noteInput ? noteInput.value : "",
      });
      break;
    }
    case "save-add-child": {
      const argsInput = document.getElementById("add-args");
      const noteInput = document.getElementById("add-child-note");
      clearDrafts();
      post({
        type: "save-add-child",
        source,
        path,
        args: argsInput ? argsInput.value : "",
        note: noteInput ? noteInput.value : "",
      });
      break;
    }
  }
});

function collectExpandedFiles() {
  const expanded = [];
  document.querySelectorAll(".scan-group").forEach((group) => {
    if (!group.classList.contains("collapsed")) { expanded.push(group.dataset.file); }
  });
  return expanded;
}

function persistScanGroupState() {
  vscode.setState({ ...(vscode.getState() || {}), expandedFiles: collectExpandedFiles() });
}

function persistExpandedButtons() {
  const expandedButtons = [];
  document.querySelectorAll(".button-block").forEach((block) => {
    if (!block.classList.contains("collapsed")) {
      expandedButtons.push(block.dataset.source + ":" + block.dataset.path);
    }
  });
  vscode.setState({ ...(vscode.getState() || {}), expandedButtons });
}

function persistChecked() {
  const checkedPaths = [];
  document.querySelectorAll('input[data-action="toggle-select"]:checked').forEach((el) => {
    checkedPaths.push(el.dataset.source + ":" + el.dataset.path);
  });
  vscode.setState({ ...(vscode.getState() || {}), checkedPaths });
}

document.addEventListener("dragstart", (event) => {
  const handle = event.target && event.target.closest ? event.target.closest(".drag-handle") : null;
  if (!handle) { return; }
  const row = handle.closest("[data-path][data-source]");
  if (!row || !event.dataTransfer) { return; }
  event.dataTransfer.setData("application/json", JSON.stringify({ source: row.dataset.source, path: row.dataset.path }));
  event.dataTransfer.effectAllowed = "move";
  row.classList.add("dragging");
});

document.addEventListener("dragend", (event) => {
  const row = event.target && event.target.closest ? event.target.closest("[data-path]") : null;
  if (row) { row.classList.remove("dragging"); }
  document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
});

document.addEventListener("dragover", (event) => {
  const row = event.target && event.target.closest ? event.target.closest(".button-card[data-path], tr[data-path]") : null;
  if (!row) { return; }
  event.preventDefault();
  row.classList.add("drag-over");
});

document.addEventListener("dragleave", (event) => {
  const row = event.target && event.target.closest ? event.target.closest(".drag-over") : null;
  if (row) { row.classList.remove("drag-over"); }
});

document.addEventListener("drop", (event) => {
  const row = event.target && event.target.closest ? event.target.closest(".button-card[data-path][data-source], tr[data-path][data-source]") : null;
  if (!row || !event.dataTransfer) { return; }
  event.preventDefault();
  row.classList.remove("drag-over");
  let payload;
  try { payload = JSON.parse(event.dataTransfer.getData("application/json")); } catch { return; }
  if (!payload || payload.source !== row.dataset.source) { return; }
  let from;
  let to;
  try {
    from = JSON.parse(payload.path);
    to = JSON.parse(row.dataset.path);
  } catch { return; }
  post({ type: "reorder", source: payload.source, from, to });
});

document.querySelectorAll('input[data-action="toggle-file"]').forEach((el) => {
  const selected = Number(el.dataset.selectedCount || "0");
  const total = Number(el.dataset.total || "0");
  el.indeterminate = selected > 0 && selected < total;
});

const savedState = vscode.getState() || {};
const expandedFiles = new Set(Array.isArray(savedState.expandedFiles) ? savedState.expandedFiles : []);
document.querySelectorAll(".scan-group").forEach((group) => {
  if (expandedFiles.has(group.dataset.file)) {
    group.classList.remove("collapsed");
    const btn = group.querySelector(".scan-group-toggle");
    if (btn) { btn.setAttribute("aria-expanded", "true"); }
  }
});

const expandedButtons = new Set(Array.isArray(savedState.expandedButtons) ? savedState.expandedButtons : []);
document.querySelectorAll(".button-block").forEach((block) => {
  const key = block.dataset.source + ":" + block.dataset.path;
  if (expandedButtons.has(key)) {
    block.classList.remove("collapsed");
    const btn = block.querySelector("[data-action='toggle-variants']");
    if (btn) { btn.setAttribute("aria-expanded", "true"); }
  }
});

const checkedPaths = new Set(Array.isArray(savedState.checkedPaths) ? savedState.checkedPaths : []);
document.querySelectorAll('input[data-action="toggle-select"]').forEach((el) => {
  el.checked = checkedPaths.has(el.dataset.source + ":" + el.dataset.path);
});

restoreFocus();
restoreDrafts();
`;
}
