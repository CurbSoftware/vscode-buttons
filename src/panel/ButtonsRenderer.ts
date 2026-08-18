import type { ButtonsSource, ResolvedButton, WebviewState } from "../models/types";
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

type RenderVariant = "sidebar" | "editor";

export function renderHtml(state: WebviewState, codiconUri: string, variant: RenderVariant = "sidebar"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link href="${codiconUri}" rel="stylesheet" />
<style>${css(variant, state.textSizePx)}</style>
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
  const generateButton = state.hasWorkspace && !state.projectFileExists
    ? `<button class="btn primary" data-action="generate" title="Scan and create the project .buttons.json"><span class="codicon codicon-wand"></span> Generate</button>`
    : "";
  return `<header class="header">
  <div class="header-title">Buttons</div>
  <div class="header-actions">
    ${generateButton}
    <button class="btn" data-action="rescan" title="Rescan project scripts"><span class="codicon codicon-refresh"></span> Rescan</button>
    <button class="btn" data-action="open-project-file" title="Open the project .buttons.json file"><span class="codicon codicon-file-code"></span></button>
    <button class="btn" data-action="open-global-file" title="Open the global ~/.buttons.json file"><span class="codicon codicon-home"></span></button>
    <button class="btn" data-action="open-settings" title="Open Buttons settings"><span class="codicon codicon-settings-gear"></span></button>
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
  if (state.discovered.length === 0) {
    return `<section class="scan">${title}<div class="muted">No scripts found in the enabled script file types.</div></section>`;
  }

  const rootCount = state.discovered.filter((d) => d.packageDir === "").length;
  const generateCta = !state.projectFileExists
    ? `<div class="generate-cta"><button class="btn primary" data-action="generate"><span class="codicon codicon-wand"></span> Generate buttons file</button><span class="muted">Include ${rootCount} root-level scripts as project buttons.</span></div>`
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

  return `<section class="scan">${titleWithBulk}${generateCta}<div class="scan-list">${rows}</div></section>`;
}

function renderScanRow(script: DiscoveredScript, checked: boolean, disabled: boolean): string {
  const file = escapeHtml(script.file);
  const name = escapeHtml(script.script);
  const command = escapeHtml(script.command);
  const icon = script.icon ? `<span class="codicon codicon-${escapeHtml(script.icon)}"></span>` : "";
  return `<label class="scan-row${disabled ? " disabled" : ""}" title="${escapeHtml(script.description ?? "")}">
  <input type="checkbox" data-action="toggle-script" data-file="${file}" data-script="${name}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
  ${icon}
  <span class="scan-name">${name}</span>
  <code class="scan-cmd">${command}</code>
</label>`;
}

function renderScanGroup(group: ScriptGroup, selectedKeys: ReadonlySet<string>, projectDisabled: boolean): string {
  const file = escapeHtml(group.file);
  const fileChecked = group.fileChecked ? " checked" : "";
  const fileDisabled = projectDisabled ? " disabled" : "";
  const scriptDisabled = projectDisabled || group.fileChecked;

  const rows = group.scripts
    .map((s) => renderScanRow(s, selectedKeys.has(scriptKey(s)), scriptDisabled))
    .join("");

  return `<div class="scan-group collapsed" data-file="${file}">
  <div class="scan-group-header">
    <label class="scan-group-check" title="${file}">
      <input type="checkbox" data-action="toggle-file" data-file="${file}" data-selected-count="${group.selectedCount}" data-total="${group.scripts.length}"${fileChecked}${fileDisabled} />
    </label>
    <button type="button" class="scan-group-toggle" data-action="toggle-group" aria-expanded="false">
      <span class="codicon codicon-chevron-right scan-group-caret"></span>
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
  const subtitleHtml = subtitle ? `<div class="section-subtitle">${escapeHtml(subtitle)}</div>` : "";

  if (variant === "sidebar") {
    const rows: string[] = [];
    if (state.addingSource === source) {
      rows.push(renderCardAddRow(source));
    }
    for (const button of buttons) {
      rows.push(renderCardRow(state, source, button));
    }
    if (rows.length === 0) {
      rows.push(`<div class="button-card empty"><span class="muted">${escapeHtml(emptyHint)}</span></div>`);
    }
    return `<section class="table-section">
  <div class="section-title">${escapeHtml(title)} ${addButton}</div>
  ${subtitleHtml}
  <div class="button-card-list">${rows.join("")}</div>
</section>`;
  }

  const rows: string[] = [];
  if (state.addingSource === source) {
    rows.push(renderAddRow(source));
  }
  for (const button of buttons) {
    rows.push(renderRow(state, source, button));
  }
  if (rows.length === 0) {
    rows.push(`<tr><td colspan="3" class="muted empty">${escapeHtml(emptyHint)}</td></tr>`);
  }

  return `<section class="table-section">
  <div class="section-title">${escapeHtml(title)} ${addButton}</div>
  ${subtitleHtml}
  <table class="buttons-table">
    <thead><tr><th>Command</th><th>Note</th><th class="actions-col">Actions</th></tr></thead>
    <tbody>${rows.join("")}</tbody>
  </table>
</section>`;
}

function renderRow(state: WebviewState, source: ButtonsSource, button: ResolvedButton): string {
  if (state.editing?.source === source && state.editing.id === button.id) {
    return renderEditRow(source, button);
  }
  return renderDisplayRow(source, button);
}

function renderDisplayRow(source: ButtonsSource, button: ResolvedButton): string {
  const fileBadge =
    button.kind === "script" && button.entry.type === "script"
      ? `<span class="badge">${escapeHtml(button.entry.file)}</span>`
      : "";
  const missingBadge = button.missing ? `<span class="badge missing">not found</span>` : "";
  const note = button.note ? escapeHtml(button.note) : "";
  const editLabel = button.kind === "script" ? "Note" : "Edit";

  const runActions = button.missing
    ? ""
    : `<button class="btn primary" data-action="run-current" data-source="${source}" data-index="${button.index}" title="Run in the current integrated terminal">Run</button>
       <button class="btn" data-action="run-new" data-source="${source}" data-index="${button.index}" title="Run in a new integrated terminal">New Terminal</button>
       <button class="btn" data-action="copy" data-source="${source}" data-index="${button.index}" title="Copy command to clipboard">Copy</button>`;

  return `<tr data-source="${source}" data-index="${button.index}">
  <td class="cmd"><code>${escapeHtml(button.command)}</code>${fileBadge}${missingBadge}</td>
  <td class="note">${note}</td>
  <td class="actions">
    ${runActions}
    <button class="btn" data-action="start-edit" data-source="${source}" data-index="${button.index}">${editLabel}</button>
    <button class="btn danger" data-action="remove" data-source="${source}" data-index="${button.index}" title="Remove">✕</button>
  </td>
</tr>`;
}

function renderEditRow(source: ButtonsSource, button: ResolvedButton): string {
  const commandCell =
    button.kind === "command"
      ? `<input id="edit-command" type="text" value="${escapeHtml(button.command)}" placeholder="command" />`
      : `<code>${escapeHtml(button.command)}</code>`;

  return `<tr class="editing" data-source="${source}" data-index="${button.index}">
  <td class="cmd">${commandCell}</td>
  <td class="note"><input id="edit-note" type="text" value="${escapeHtml(button.note ?? "")}" placeholder="note (optional)" /></td>
  <td class="actions">
    <button class="btn primary" data-action="save-edit" data-source="${source}" data-id="${button.id}">Save</button>
    <button class="btn" data-action="cancel-edit">Cancel</button>
  </td>
</tr>`;
}

function renderAddRow(source: ButtonsSource): string {
  return `<tr class="add-row" data-source="${source}">
  <td class="cmd"><input id="add-command" type="text" placeholder="command (e.g. docker ps)" /></td>
  <td class="note"><input id="add-note" type="text" placeholder="note (optional)" /></td>
  <td class="actions">
    <button class="btn primary" data-action="save-add" data-source="${source}">Save</button>
    <button class="btn" data-action="cancel-add">Cancel</button>
  </td>
</tr>`;
}

function renderCardRow(state: WebviewState, source: ButtonsSource, button: ResolvedButton): string {
  if (state.editing?.source === source && state.editing.id === button.id) {
    return renderCardEditRow(source, button);
  }
  return renderCardDisplayRow(source, button);
}

function renderCardDisplayRow(source: ButtonsSource, button: ResolvedButton): string {
  const fileBadge =
    button.kind === "script" && button.entry.type === "script"
      ? `<span class="badge">${escapeHtml(button.entry.file)}</span>`
      : "";
  const missingBadge = button.missing ? `<span class="badge missing">not found</span>` : "";
  const note = button.note ? `<div class="note">${escapeHtml(button.note)}</div>` : "";
  const editLabel = button.kind === "script" ? "Note" : "Edit";

  const runActions = button.missing
    ? ""
    : `<button class="btn primary" data-action="run-current" data-source="${source}" data-index="${button.index}" title="Run in the current integrated terminal">Run</button>
       <button class="btn" data-action="run-new" data-source="${source}" data-index="${button.index}" title="Run in a new integrated terminal">New Terminal</button>
       <button class="btn" data-action="copy" data-source="${source}" data-index="${button.index}" title="Copy command to clipboard">Copy</button>`;

  return `<div class="button-card" data-source="${source}" data-index="${button.index}">
  <div class="button-card-main"><code>${escapeHtml(button.command)}</code>${fileBadge}${missingBadge}${note}</div>
  <div class="button-card-actions">
    ${runActions}
    <button class="btn" data-action="start-edit" data-source="${source}" data-index="${button.index}">${editLabel}</button>
    <button class="btn danger" data-action="remove" data-source="${source}" data-index="${button.index}" title="Remove">✕</button>
  </div>
</div>`;
}

function renderCardEditRow(source: ButtonsSource, button: ResolvedButton): string {
  const commandCell =
    button.kind === "command"
      ? `<input id="edit-command" type="text" value="${escapeHtml(button.command)}" placeholder="command" />`
      : `<code>${escapeHtml(button.command)}</code>`;

  return `<div class="button-card editing" data-source="${source}" data-index="${button.index}">
  <div class="button-card-main">${commandCell}</div>
  <div class="button-card-field"><input id="edit-note" type="text" value="${escapeHtml(button.note ?? "")}" placeholder="note (optional)" /></div>
  <div class="button-card-actions">
    <button class="btn primary" data-action="save-edit" data-source="${source}" data-id="${button.id}">Save</button>
    <button class="btn" data-action="cancel-edit">Cancel</button>
  </div>
</div>`;
}

function renderCardAddRow(source: ButtonsSource): string {
  return `<div class="button-card add-row" data-source="${source}">
  <div class="button-card-main"><input id="add-command" type="text" placeholder="command (e.g. docker ps)" /></div>
  <div class="button-card-field"><input id="add-note" type="text" placeholder="note (optional)" /></div>
  <div class="button-card-actions">
    <button class="btn primary" data-action="save-add" data-source="${source}">Save</button>
    <button class="btn" data-action="cancel-add">Cancel</button>
  </div>
</div>`;
}

function css(variant: RenderVariant, textSizePx: number): string {
  const bg = variant === "editor" ? "var(--vscode-editor-background)" : "var(--vscode-sideBar-background)";
  return `
:root {
  color-scheme: light dark;
  --bg: ${bg};
  --fg: var(--vscode-editor-foreground);
  --muted: var(--vscode-descriptionForeground);
  --border: var(--vscode-panel-border);
  --danger: var(--vscode-errorForeground);
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
.section-subtitle { color: var(--muted); font-size: 0.85em; margin-bottom: 4px; }
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
.btn:hover { background: var(--vscode-button-hoverBackground); color: var(--vscode-button-foreground); }
.btn.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-color: transparent; }
.btn.primary:hover { background: var(--vscode-button-hoverBackground); }
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
.scan-group-caret { transition: transform 0.1s ease; flex-shrink: 0; }
.scan-group.collapsed .scan-group-caret { transform: rotate(-90deg); }
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
.buttons-table { width: 100%; border-collapse: collapse; }
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
.cmd code {
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 1em;
  word-break: break-word;
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
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.button-card.editing, .button-card.add-row { border-color: var(--vscode-focusBorder, var(--fg)); }
.button-card.empty { border-style: dashed; }
.button-card-main { min-width: 0; }
.button-card-main code {
  font-family: var(--vscode-editor-font-family, monospace);
  word-break: break-word;
}
.button-card-main .note { margin-top: 4px; }
.button-card-actions { display: flex; flex-wrap: wrap; gap: 4px; }
.button-card-field input { width: 100%; }
input[type="text"] {
  width: 100%;
  background: var(--vscode-input-background, transparent);
  color: var(--vscode-input-foreground, var(--fg));
  border: 1px solid var(--border);
  padding: 3px 6px;
  border-radius: 3px;
  font-family: inherit;
  font-size: 0.9em;
}
`;
}

function js(): string {
  return `
const vscode = acquireVsCodeApi();
function post(message) { vscode.postMessage(message); }

document.addEventListener("change", (event) => {
  const el = event.target;
  if (!el || !el.matches) { return; }
  if (el.matches('input[data-action="toggle-script"]')) {
    post({
      type: "toggle-script",
      file: el.dataset.file,
      script: el.dataset.script,
      checked: el.checked,
    });
  } else if (el.matches('input[data-action="toggle-file"]')) {
    post({ type: "toggle-file", file: el.dataset.file, checked: el.checked });
  }
});

document.addEventListener("click", (event) => {
  const el = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
  if (!el) { return; }

  const action = el.dataset.action;
  const source = el.dataset.source;
  const index = el.dataset.index !== undefined ? Number(el.dataset.index) : undefined;

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
    case "rescan": post({ type: "rescan" }); break;
    case "generate": post({ type: "generate" }); break;
    case "toggle-all": post({ type: "toggle-all", checked: el.dataset.checked === "true" }); break;
    case "set-tab": post({ type: "set-tab", tab: el.dataset.tab }); break;
    case "open-project-file": post({ type: "open-project-file" }); break;
    case "open-global-file": post({ type: "open-global-file" }); break;
    case "open-settings": post({ type: "open-settings" }); break;
    case "run-current": post({ type: "run-current", source, index }); break;
    case "run-new": post({ type: "run-new", source, index }); break;
    case "copy": post({ type: "copy", source, index }); break;
    case "start-edit": post({ type: "start-edit", source, index }); break;
    case "cancel-edit": post({ type: "cancel-edit" }); break;
    case "save-edit": {
      const commandInput = document.getElementById("edit-command");
      const noteInput = document.getElementById("edit-note");
      post({
        type: "save-edit",
        source,
        id: el.dataset.id,
        command: commandInput ? commandInput.value : undefined,
        note: noteInput ? noteInput.value : "",
      });
      break;
    }
    case "remove": post({ type: "remove", source, index }); break;
    case "start-add": post({ type: "start-add", source }); break;
    case "cancel-add": post({ type: "cancel-add" }); break;
    case "save-add": {
      const commandInput = document.getElementById("add-command");
      const noteInput = document.getElementById("add-note");
      post({
        type: "save-add",
        source,
        command: commandInput ? commandInput.value : "",
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
`;
}
