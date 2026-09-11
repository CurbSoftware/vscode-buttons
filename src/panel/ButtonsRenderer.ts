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

function pathIsPrefix(prefix: number[], full?: number[]): boolean {
  return Boolean(full && full.length >= prefix.length && prefix.every((n, i) => n === full[i]));
}

function sourcePathAttrs(source: ButtonsSource, path: number[]): string {
  return `data-source="${source}" data-path="${pathAttr(path)}"`;
}

function descendantCount(button: ResolvedButton): number {
  return button.children.reduce((n, child) => n + 1 + descendantCount(child), 0);
}

/** Direct children, or `direct:deeper` when descendants nest further. */
export function variantBadgeLabel(button: ResolvedButton): string {
  const direct = button.children.length;
  const deeper = descendantCount(button) - direct;
  return deeper > 0 ? `${direct}:${deeper}` : String(direct);
}

function nestDepth(path: number[]): number {
  return Math.max(0, path.length - 1) % 5;
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
  ${renderHeader(state, variant)}
  ${renderTabs(state)}
  ${state.parseError ? renderError(state.parseError) : ""}
  ${state.activeTab === "scripts" ? renderScanSection(state) : renderButtonsPage(state, variant)}
  <script>${js()}</script>
</body>
</html>`;
}

function renderHeader(state: WebviewState, variant: RenderVariant): string {
  // First-time Generate is also a CTA on the Scripts tab; keep this header
  // button off that tab so the empty-file state doesn't stack two primaries.
  const generateButton = state.hasWorkspace && !(state.activeTab === "scripts" && !state.projectFileExists)
    ? `<button class="btn${state.projectFileExists ? "" : " primary"}" data-action="generate" title="${state.projectFileExists ? "Include any missing root-level scripts. Custom commands and your edits stay." : "Scan and create the project .buttons.json"}"><span class="codicon codicon-wand" aria-hidden="true"></span> Generate</button>`
    : "";
  const openEditor = variant === "sidebar"
    ? `<button class="btn" data-action="open-main-panel" title="Open in editor" aria-label="Open in editor"><span class="codicon codicon-window" aria-hidden="true"></span></button>`
    : "";
  return `<header class="header">
  <div class="header-title">Buttons</div>
  <div class="header-actions">
    ${generateButton}
    ${openEditor}
    <button class="btn" data-action="rescan" title="Rescan project scripts"><span class="codicon codicon-refresh" aria-hidden="true"></span> Rescan</button>
    <button class="btn" data-action="open-project-file" title="Open the project .buttons.json file" aria-label="Open the project .buttons.json file"><span class="codicon codicon-file-code" aria-hidden="true"></span></button>
    <button class="btn" data-action="open-global-file" title="Open the global ~/.buttons.json file" aria-label="Open the global ~/.buttons.json file"><span class="codicon codicon-home" aria-hidden="true"></span></button>
    <button class="btn" data-action="export-skill" title="Copy or add the Buttons AI skill" aria-label="Copy or add the Buttons AI skill"><span class="codicon codicon-markdown" aria-hidden="true"></span></button>
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
  const subtitleHtml = subtitle ? `<div class="section-subtitle">${escapeHtml(subtitle)}</div>` : "";
  const titleActions = `<span class="section-title-actions">${addButton}</span>`;

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
    <colgroup><col class="col-cmd" /><col class="col-note" /><col class="col-actions" /></colgroup>
    <thead><tr>
      <th class="cmd-col">Command<span class="col-resize" data-col="0" role="separator" aria-orientation="vertical" aria-label="Resize Command column"></span></th>
      <th class="note-col">Note<span class="col-resize" data-col="1" role="separator" aria-orientation="vertical" aria-label="Resize Note column"></span></th>
      <th class="actions-col">Actions<span class="col-resize" data-col="2" role="separator" aria-orientation="vertical" aria-label="Resize Actions column"></span></th>
    </tr></thead>
    ${bodies.join("")}
  </table>
</section>`;
}

function renderDragHandle(): string {
  return `<span class="drag-handle" draggable="true" title="Drag to reorder" aria-label="Drag to reorder"><span class="codicon codicon-gripper" aria-hidden="true"></span></span>`;
}

function renderVariantToggle(source: ButtonsSource, button: ResolvedButton): string {
  const direct = button.children.length;
  const deeper = descendantCount(button) - direct;
  const count =
    direct > 0
      ? `<span class="badge variant-count" aria-label="${direct} variant${direct === 1 ? "" : "s"}${deeper > 0 ? `, ${deeper} nested` : ""}">${variantBadgeLabel(button)}</span>`
      : "";
  return `<button type="button" class="scan-group-toggle variant-toggle" data-action="toggle-variants" ${sourcePathAttrs(source, button.path)} aria-expanded="false" title="Show parameter options">
    <span class="codicon codicon-chevron-right scan-group-caret" aria-hidden="true"></span>
    ${count}
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
  const hidden = button.missing ? " action-hidden" : "";
  const hiddenAttrs = button.missing ? ` tabindex="-1" aria-hidden="true"` : "";
  const runDs = button.missing ? "" : ` ${ds}`;
  return `<button class="btn primary${hidden}" data-action="run-current"${runDs}${hiddenAttrs} title="Run in the current integrated terminal">Run</button>
    <button class="btn${hidden}" data-action="run-new"${runDs}${hiddenAttrs} title="Run in a new integrated terminal">New Terminal</button>
    <button class="btn${hidden}" data-action="open-system"${runDs}${hiddenAttrs} title="Open in the system terminal with this command ready. Press Enter there to run.">System</button>
    <button class="btn${hidden}" data-action="append" data-sep="space"${runDs}${hiddenAttrs} title="Add to the current terminal line (space). Does not run.">+</button>
    <button class="btn${hidden}" data-action="append" data-sep="newline"${runDs}${hiddenAttrs} title="Add on a new line. Does not run. Press Enter in the terminal to run.">↵</button>
    <button class="btn${hidden}" data-action="copy"${runDs}${hiddenAttrs} title="Copy command to clipboard">Copy</button>
    <button class="btn" data-action="duplicate" ${ds} title="Duplicate this button">Duplicate</button>
    <button class="btn" data-action="start-edit" ${ds}>${editLabel}</button>
    <button class="btn danger" data-action="remove" ${ds} title="Remove" aria-label="Remove">✕</button>`;
}

function actionsCell(inner: string): string {
  return `<td class="actions"><div class="action-group">${inner}</div></td>`;
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
  const forceOpen = pathIsPrefix(button.path, state.addingChildPath);
  const collapsed = forceOpen ? "" : " collapsed";
  const isChild = button.path.length > 1;
  const children = button.children.map((child) => renderCardBlock(state, source, child)).join("");
  return `<div class="button-block${collapsed}" data-nest="${nestDepth(button.path)}" ${sourcePathAttrs(source, button.path)}>
  ${renderCardRow(state, source, button, isChild)}
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
  const toggle = renderVariantToggle(source, button);
  return `<div class="button-card${isChild ? " child" : ""}" ${sourcePathAttrs(source, button.path)}>
  <div class="button-card-head">
    ${renderDragHandle()}
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

function nestIndentPx(path: number[]): number {
  return path.length <= 1 ? 0 : 32 + (path.length - 2) * 24;
}

function renderEditorBlock(state: WebviewState, source: ButtonsSource, button: ResolvedButton, wrap: "tbody" | "table" = "tbody"): string {
  const forceOpen = pathIsPrefix(button.path, state.addingChildPath);
  const collapsed = forceOpen ? "" : " collapsed";
  const childRows = button.children.map((child) =>
    `<tr class="nested-block-row"><td colspan="3">${renderEditorBlock(state, source, child, "table")}</td></tr>`,
  ).join("");
  const add = renderEditorAddVariant(state, source, button);
  const childIndent = nestIndentPx([...button.path, 0]);
  const inner = `${renderEditorRow(state, source, button)}
  <tr class="variants-row"><td colspan="3">
    <table class="buttons-table nested" style="--nest-indent:${childIndent}px"><colgroup><col class="col-cmd" /><col class="col-note" /><col class="col-actions" /></colgroup><tbody>${childRows}${add}</tbody></table>
  </td></tr>`;
  const attrs = sourcePathAttrs(source, button.path);
  const nest = `data-nest="${nestDepth(button.path)}"`;
  if (wrap === "table") {
    return `<table class="buttons-table nested" style="--nest-indent:${nestIndentPx(button.path)}px"><colgroup><col class="col-cmd" /><col class="col-note" /><col class="col-actions" /></colgroup><tbody class="button-block${collapsed}" ${nest} ${attrs}>${inner}</tbody></table>`;
  }
  return `<tbody class="button-block${collapsed}" ${nest} ${attrs}>
  ${inner}
</tbody>`;
}

function renderEditorRow(state: WebviewState, source: ButtonsSource, button: ResolvedButton): string {
  if (pathsEqual(state.editing?.path, button.path) && state.editing?.source === source) {
    return renderEditRow(source, button);
  }
  return renderDisplayRow(source, button);
}

function renderDisplayRow(source: ButtonsSource, button: ResolvedButton): string {
  const note = button.note ? escapeHtml(button.note) : "";
  const toggle = renderVariantToggle(source, button);
  const ds = sourcePathAttrs(source, button.path);
  return `<tr ${ds}>
  <td class="cmd">
    <div class="cmd-head">${renderDragHandle()}${toggle}<code>${escapeHtml(button.command)}</code>${renderBadges(button)}</div>
  </td>
  <td class="note">${note}</td>
  ${actionsCell(renderRowActions(source, button))}
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
  ${actionsCell(`<button class="btn primary" data-action="save-edit" ${ds}>Save</button>
    <button class="btn" data-action="cancel-edit">Cancel</button>`)}
</tr>`;
}

function renderAddRow(source: ButtonsSource): string {
  return `<tr class="add-row" data-source="${source}">
  <td class="cmd"><textarea id="add-command" rows="2" placeholder="command (e.g. docker ps)"></textarea></td>
  <td class="note"><input id="add-note" type="text" placeholder="note (optional)" /></td>
  ${actionsCell(`<button class="btn primary" data-action="save-add" data-source="${source}">Save</button>
    <button class="btn" data-action="cancel-add">Cancel</button>`)}
</tr>`;
}

function renderEditorAddVariant(state: WebviewState, source: ButtonsSource, parent: ResolvedButton): string {
  if (pathsEqual(state.addingChildPath, parent.path)) {
    return `<tr class="add-row">
  <td class="cmd"><input id="add-args" type="text" placeholder="extra args (e.g. --include app1 app2)" /></td>
  <td class="note"><input id="add-child-note" type="text" placeholder="note (optional)" /></td>
  ${actionsCell(`<button class="btn primary" data-action="save-add-child" ${sourcePathAttrs(source, parent.path)}>Save</button>
    <button class="btn" data-action="cancel-add">Cancel</button>`)}
</tr>`;
  }
  return `<tr class="add-variant-row"><td colspan="3"><button class="btn" data-action="start-add-child" ${sourcePathAttrs(source, parent.path)}>+ Add variant</button></td></tr>`;
}

function css(variant: RenderVariant, textSizePx: number, colors: ButtonColors): string {
  const bg = variant === "editor" ? "var(--vscode-editor-background)" : "var(--vscode-sideBar-background)";
  const actionBg = colors.actionBackground;
  const actionFg = colors.actionForeground;
  const btnBg = actionBg || colors.background || "var(--vscode-button-background)";
  const btnFg = actionFg || colors.foreground || "var(--vscode-button-foreground)";
  const btnHover = colors.hoverBackground || "var(--vscode-button-hoverBackground)";
  const rowBg = colors.rowBackground || colors.background || "transparent";
  const cmdFg = colors.commandForeground || colors.foreground || "inherit";
  const cmdBg = colors.commandBackground || "transparent";
  const variantCmdFg = colors.variantCommandForeground || cmdFg;
  const variantCmdBg = colors.variantCommandBackground || cmdBg;
  const rowOdd = colors.rowOddBackground || rowBg;
  const rowEven = colors.rowEvenBackground || rowBg;
  const variantRowFallback = colors.variantRowBackground || rowBg;
  const variantRowOdd = colors.variantRowOddBackground || variantRowFallback;
  const variantRowEven = colors.variantRowEvenBackground || variantRowFallback;
  const cardBorder = colors.rowBackground || colors.background || "var(--border)";
  const allActionHover = actionBg ? "var(--btn-hover)" : "var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.1))";
  const actionRule = (sel: string, specificBg: string, specificFg: string): string => {
    if (!specificBg && !specificFg) {
      return "";
    }
    const fill = specificBg || actionBg || colors.background;
    const text = specificFg || actionFg || colors.foreground;
    const parts = [fill && `background:${fill}`, fill && "border-color:transparent", text && `color:${text}`].filter(Boolean);
    return `${sel}{${parts.join(";")}}`;
  };
  const actionOverrides = [
    actionRule('.btn[data-action="run-current"]', colors.runBackground, colors.runForeground),
    actionRule('.btn[data-action="run-new"]', colors.newTerminalBackground, colors.newTerminalForeground),
    actionRule('.btn[data-action="append"][data-sep="space"]', colors.appendBackground, colors.appendForeground),
    actionRule('.btn[data-action="append"][data-sep="newline"]', colors.newlineBackground, colors.newlineForeground),
    actionRule('.btn[data-action="copy"]', colors.copyBackground, colors.copyForeground),
    actionRule('.btn[data-action="duplicate"]', colors.duplicateBackground, colors.duplicateForeground),
    actionRule('.btn[data-action="start-edit"]', colors.editBackground, colors.editForeground),
    actionRule('.btn[data-action="remove"]', colors.removeBackground, colors.removeForeground),
  ].join("");
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
  --action-bg: ${actionBg || "transparent"};
  --action-fg: ${actionFg || "var(--fg)"};
  --cmd-fg: ${cmdFg};
  --cmd-bg: ${cmdBg};
  --cmd-pad: ${colors.commandBackground ? "0 4px" : "0"};
  --variant-cmd-fg: ${variantCmdFg};
  --variant-cmd-bg: ${variantCmdBg};
  --variant-cmd-pad: ${colors.variantCommandBackground || colors.commandBackground ? "0 4px" : "0"};
  --card-bg: ${rowBg};
  --card-fg: inherit;
  --card-border: ${cardBorder};
  --row-bg: ${rowBg};
  --row-odd: ${rowOdd};
  --row-even: ${rowEven};
  --variant-row-odd: ${variantRowOdd};
  --variant-row-even: ${variantRowEven};
  --col-cmd: 56%;
  --col-note: 16%;
  --col-actions: 28%;
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
  background: var(--action-bg);
  color: var(--action-fg);
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: inherit;
  line-height: 1.4;
  cursor: pointer;
  white-space: nowrap;
}
.btn:hover { background: ${allActionHover}; }
.btn.primary { background: var(--btn-bg); color: var(--btn-fg); border-color: transparent; }
.btn.primary:hover { background: var(--btn-hover); }
.btn.danger:hover { border-color: var(--danger); color: var(--danger); background: transparent; }
.btn.danger.confirming {
  position: relative;
  z-index: 2;
  border-color: var(--danger);
  color: var(--danger);
}
.btn.danger.confirming::after {
  content: attr(title);
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 6px;
  background: var(--vscode-editorWidget-background, var(--bg));
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 3px;
  font-size: 0.85em;
  white-space: nowrap;
  pointer-events: none;
}
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
.variant-count { margin-left: 0; }
.button-block[data-nest="0"] { --nest-accent: var(--vscode-charts-blue, #3794ff); }
.button-block[data-nest="1"] { --nest-accent: var(--vscode-charts-orange, #d18616); }
.button-block[data-nest="2"] { --nest-accent: var(--vscode-charts-green, #89d185); }
.button-block[data-nest="3"] { --nest-accent: var(--vscode-charts-purple, #b180d7); }
.button-block[data-nest="4"] { --nest-accent: var(--vscode-charts-red, #f14c4c); }
.button-block:not(.collapsed) > tr.variants-row,
.button-block:not(.collapsed) > .button-variants { --chip-accent: var(--nest-accent); }
.button-block:not(.collapsed) > .button-card .scan-group-caret,
.button-block:not(.collapsed) > tr:first-child .scan-group-caret { color: var(--nest-accent); }
.button-block:not(.collapsed) > tr:first-child { border-bottom-color: var(--nest-accent); }
.button-block:not(.collapsed) > .button-card:not(.child) { border-color: var(--nest-accent); }
.scan-group-caret { transition: transform 0.1s ease; flex-shrink: 0; }
.scan-group:not(.collapsed) .scan-group-caret,
.button-block:not(.collapsed) > .button-card .scan-group-caret,
.button-block:not(.collapsed) > tr:first-child .scan-group-caret { transform: rotate(90deg); }
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
.button-block.collapsed > .button-variants,
.button-block.collapsed > tr.variants-row { display: none; }
.button-variants { display: flex; flex-direction: column; gap: 6px; padding: 0 0 0 32px; }
.button-variants .button-variants { padding-left: 24px; }
.table-section { overflow-x: hidden; }
.buttons-table { width: 100%; max-width: 100%; border-collapse: collapse; table-layout: fixed; --nest-indent: 0px; }
.buttons-table.nested { margin: 0; width: 100%; }
.buttons-table col.col-cmd, .buttons-table th.cmd-col, .buttons-table td.cmd { width: var(--col-cmd); min-width: 0; }
.buttons-table col.col-note, .buttons-table th.note-col, .buttons-table td.note { width: var(--col-note); min-width: 0; }
.buttons-table col.col-actions, .buttons-table th.actions-col, .buttons-table td.actions { width: var(--col-actions); }
.buttons-table th {
  text-align: left;
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--muted);
  font-weight: 600;
  padding: 4px 10px 4px 6px;
  border-bottom: 1px solid var(--border);
  position: relative;
  user-select: none;
}
.col-resize {
  position: absolute;
  top: 0;
  right: -3px;
  width: 7px;
  height: 100%;
  cursor: col-resize;
  z-index: 2;
  touch-action: none;
}
.col-resize:hover, .col-resize.dragging {
  background: var(--vscode-focusBorder, var(--fg));
}
.buttons-table td { padding: 6px; vertical-align: top; border-bottom: none; }
.buttons-table tr[data-path],
.buttons-table tr.add-row,
.buttons-table tr.editing,
.buttons-table tr.add-variant-row {
  border-bottom: 1px solid var(--border);
}
.buttons-table tr.variants-row,
.buttons-table tr.nested-block-row {
  border-bottom: none;
}
.buttons-table tr.variants-row > td,
.buttons-table tr.nested-block-row > td {
  padding: 0;
}
.buttons-table tr[data-path] > td:first-child,
.buttons-table tr.add-row > td:first-child,
.buttons-table tr.add-variant-row > td {
  padding-left: calc(6px + var(--nest-indent));
}
.buttons-table > tbody:nth-of-type(odd) > tr:first-child { background: var(--row-odd); }
.buttons-table > tbody:nth-of-type(even) > tr:first-child { background: var(--row-even); }
.buttons-table.nested > tbody > tr.nested-block-row:nth-child(odd) > td > table > tbody > tr:first-child { background: var(--variant-row-odd); }
.buttons-table.nested > tbody > tr.nested-block-row:nth-child(even) > td > table > tbody > tr:first-child { background: var(--variant-row-even); }
.buttons-table.nested > tbody.button-block > tr:first-child {
  border-bottom-color: var(--chip-accent, var(--border));
}
.buttons-table tr[data-path]:hover > td {
  background: var(--vscode-list-hoverBackground, rgba(128, 128, 128, 0.08));
}
.cmd-head { display: flex; align-items: flex-start; gap: 6px; min-width: 0; }
.cmd code, .button-card-main code {
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 1em;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  color: var(--cmd-fg);
  background: var(--cmd-bg);
  border-radius: 3px;
  padding: var(--cmd-pad);
}
.cmd-head code { flex: 1; min-width: 0; }
.button-card.child .button-card-main code,
.buttons-table.nested .cmd code {
  color: var(--variant-cmd-fg);
  background: var(--variant-cmd-bg);
  padding: var(--variant-cmd-pad);
  border: 1px solid var(--chip-accent, transparent);
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
.badge.variant-count {
  background: transparent;
  color: var(--fg);
  border-color: var(--nest-accent, var(--fg));
  font-size: 1em;
  font-weight: 600;
  line-height: 1.25;
  padding: 0 6px;
}
.badge.missing { border-color: var(--danger); color: var(--danger); }
.note { color: var(--muted); font-size: 0.9em; overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
.buttons-table td.cmd, .buttons-table td.note { overflow-wrap: anywhere; }
.action-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: start;
  min-width: 0;
}
.action-group .btn { padding: 2px 6px; font-size: 0.85em; }
.action-group .action-hidden { visibility: hidden; pointer-events: none; }
.button-card-actions .action-hidden { display: none; }
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
.button-card-list > .button-block:nth-child(odd) > .button-card { background: var(--row-odd); }
.button-card-list > .button-block:nth-child(even) > .button-card { background: var(--row-even); }
.button-variants > .button-card:nth-child(odd),
.button-variants > .button-block:nth-child(odd) > .button-card { background: var(--variant-row-odd); }
.button-variants > .button-card:nth-child(even),
.button-variants > .button-block:nth-child(even) > .button-card { background: var(--variant-row-even); }
.button-card[data-path]:hover {
  background: var(--vscode-list-hoverBackground, rgba(128, 128, 128, 0.08));
}
.button-card.child { border-style: dashed; border-color: var(--chip-accent, var(--card-border)); }
.add-variant-row .btn[data-action="start-add-child"],
.button-variants > .btn[data-action="start-add-child"] {
  border-color: var(--chip-accent, var(--nest-accent, var(--border)));
}
.button-block:not(.collapsed) .add-variant-row {
  border-bottom-color: var(--chip-accent, var(--nest-accent, var(--border)));
}
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
` + actionOverrides;
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
  }
});

document.addEventListener("click", (event) => {
  const el = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
  const confirming = document.querySelector('[data-action="remove"].confirming');
  if (confirming && el !== confirming) {
    confirming.classList.remove("confirming");
    confirming.setAttribute("title", "Remove");
    confirming.setAttribute("aria-label", "Remove");
  }
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
    case "open-main-panel": post({ type: "open-main-panel" }); break;
    case "export-skill": post({ type: "export-skill" }); break;
    case "run-current": post({ type: "run-current", source, path }); break;
    case "run-new": post({ type: "run-new", source, path }); break;
    case "open-system": post({ type: "open-system", source, path }); break;
    case "append": post({ type: "append", source, path, sep: el.dataset.sep === "newline" ? "newline" : "space" }); break;
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
    case "remove":
      if (!el.classList.contains("confirming")) {
        el.classList.add("confirming");
        el.setAttribute("title", "Confirm");
        el.setAttribute("aria-label", "Confirm");
        break;
      }
      post({ type: "remove", source, path });
      break;
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

const COL_MIN = 12;
const COL_DEFAULT = [56, 16, 28];

function clampCols(w) {
  const next = w.map((n) => Math.max(COL_MIN, n));
  const sum = next[0] + next[1] + next[2];
  return next.map((n) => (n / sum) * 100);
}

function applyColWidths(w) {
  const root = document.documentElement;
  root.style.setProperty("--col-cmd", w[0] + "%");
  root.style.setProperty("--col-note", w[1] + "%");
  root.style.setProperty("--col-actions", w[2] + "%");
}

function persistColWidths(w) {
  vscode.setState({ ...(vscode.getState() || {}), colWidths: w });
}

(function initColResize() {
  let drag = null;
  document.addEventListener("pointerdown", (event) => {
    const handle = event.target && event.target.closest ? event.target.closest(".col-resize") : null;
    if (!handle) { return; }
    event.preventDefault();
    const table = handle.closest(".buttons-table");
    if (!table) { return; }
    const col = Number(handle.dataset.col);
    const start = (vscode.getState() || {}).colWidths;
    const widths = Array.isArray(start) && start.length === 3 ? start.slice() : COL_DEFAULT.slice();
    drag = { col, startX: event.clientX, tableWidth: table.getBoundingClientRect().width, widths, handle };
    handle.classList.add("dragging");
    handle.setPointerCapture(event.pointerId);
  });
  document.addEventListener("pointermove", (event) => {
    if (!drag) { return; }
    const d = ((event.clientX - drag.startX) / drag.tableWidth) * 100;
    const w = drag.widths.slice();
    if (drag.col === 0) { w[0] += d; w[1] -= d; }
    else if (drag.col === 1) { w[1] += d; w[2] -= d; }
    else { w[2] += d; w[1] -= d; }
    applyColWidths(clampCols(w));
  });
  function endColDrag() {
    if (!drag) { return; }
    drag.handle.classList.remove("dragging");
    const cmd = parseFloat(document.documentElement.style.getPropertyValue("--col-cmd")) || COL_DEFAULT[0];
    const note = parseFloat(document.documentElement.style.getPropertyValue("--col-note")) || COL_DEFAULT[1];
    const actions = parseFloat(document.documentElement.style.getPropertyValue("--col-actions")) || COL_DEFAULT[2];
    persistColWidths(clampCols([cmd, note, actions]));
    drag = null;
  }
  document.addEventListener("pointerup", endColDrag);
  document.addEventListener("pointercancel", endColDrag);
})();

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
    const btn = block.querySelector(":scope > .button-card [data-action='toggle-variants'], :scope > tr:first-child [data-action='toggle-variants']");
    if (btn) { btn.setAttribute("aria-expanded", "true"); }
  }
});

restoreFocus();
restoreDrafts();
if (Array.isArray(savedState.colWidths) && savedState.colWidths.length === 3) {
  applyColWidths(clampCols(savedState.colWidths));
}
`;
}
