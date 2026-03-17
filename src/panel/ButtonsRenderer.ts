import { CombinedButtonsState, LoadedButtonsState, MergedDisplaySettings, ResolvedButtonsGroup } from "../models/types";

export interface RenderOptions {
  sidebar: boolean;
}

export function renderHtml(state: CombinedButtonsState, codiconUri: string, options: RenderOptions): string {
  const padding = options.sidebar ? "12px" : "24px";
  const titleSize = options.sidebar ? "20px" : "28px";
  const groupTitleSize = options.sidebar ? "16px" : "20px";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Buttons</title>
  <link href="${codiconUri}" rel="stylesheet" />
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --muted: var(--vscode-descriptionForeground);
      --panel: color-mix(in srgb, var(--vscode-sideBar-background) 80%, transparent);
      --border: var(--vscode-panel-border);
      --accent: var(--vscode-focusBorder);
      --danger: var(--vscode-errorForeground);
      --card-gap: 12px;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: ${padding};
      font-family: var(--vscode-font-family);
      color: var(--fg);
      background: var(--bg);
    }

    button {
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--panel);
      color: inherit;
      cursor: pointer;
      padding: 8px 12px;
      font: inherit;
    }

    button:hover { border-color: var(--accent); }
    button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: transparent;
    }

    button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    button.colored-action {
      border-color: transparent;
      color: #fff;
    }

    button.colored-action:hover {
      filter: brightness(1.15);
    }

    .shell {
      display: grid;
      gap: ${options.sidebar ? "14px" : "20px"};
    }

    .header {
      display: flex;
      justify-content: space-between;
      gap: ${options.sidebar ? "10px" : "16px"};
      align-items: start;
      border-bottom: 1px solid var(--border);
      padding-bottom: ${options.sidebar ? "10px" : "16px"};
    }

    .header-copy {
      display: grid;
      gap: 6px;
    }

    .title {
      margin: 0;
      font-size: ${titleSize};
      font-weight: 700;
    }

    .subtitle, .path, .empty, .diagnostic {
      color: var(--muted);
    }

    .actions {
      display: flex;
      gap: ${options.sidebar ? "6px" : "10px"};
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .diagnostics {
      display: grid;
      gap: 8px;
    }

    .diagnostic {
      border-left: 3px solid var(--border);
      padding: 10px 12px;
      background: var(--panel);
    }

    .diagnostic.error {
      border-left-color: var(--danger);
      color: var(--vscode-errorForeground);
    }

    /* Source tabs */
    .source-tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
    }

    .tab {
      padding: 6px 16px;
      border-radius: 8px 8px 0 0;
      border: 1px solid var(--border);
      border-bottom: none;
      background: var(--panel);
      color: var(--muted);
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 500;
    }

    .tab:hover {
      color: var(--fg);
      border-color: var(--accent);
    }

    .tab.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: transparent;
    }

    .groups {
      display: grid;
      gap: ${options.sidebar ? "10px" : "16px"};
    }

    /* Accordion groups */
    .group {
      border: 1px solid var(--border);
      border-radius: ${options.sidebar ? "12px" : "16px"};
      background: color-mix(in srgb, var(--panel) 92%, transparent);
      overflow: hidden;
    }

    .group-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      padding: ${options.sidebar ? "10px" : "16px"};
      cursor: pointer;
      user-select: none;
    }

    .group-head:hover {
      background: color-mix(in srgb, var(--accent) 8%, transparent);
    }

    .group-head-left {
      display: flex;
      gap: 8px;
      align-items: center;
      min-width: 0;
    }

    .group-chevron {
      transition: transform 0.2s ease;
      flex-shrink: 0;
    }

    .group.collapsed .group-chevron {
      transform: rotate(-90deg);
    }

    .group-title-text {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .group-title {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: ${groupTitleSize};
      font-weight: 600;
    }

    .group-body {
      padding: 0 ${options.sidebar ? "10px" : "16px"} ${options.sidebar ? "10px" : "16px"};
      display: grid;
      gap: ${options.sidebar ? "10px" : "14px"};
      transition: max-height 0.25s ease, padding 0.25s ease, opacity 0.2s ease;
      overflow: hidden;
    }

    .group.collapsed .group-body {
      max-height: 0 !important;
      padding-top: 0;
      padding-bottom: 0;
      opacity: 0;
    }

    .badge-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge {
      padding: 4px 8px;
      border-radius: 999px;
      background: var(--panel);
      color: var(--muted);
      font-size: 12px;
      border: 1px solid var(--border);
    }

    /* Layout modes */
    .buttons.grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--card-gap);
    }

    .buttons.rows {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--card-gap);
    }

    .buttons.columns {
      display: grid;
      grid-template-columns: repeat(var(--col-count, 3), 1fr);
      gap: var(--card-gap);
    }

    .buttons.flow {
      display: flex;
      flex-wrap: wrap;
      gap: var(--card-gap);
    }

    .buttons.flow .button-card {
      min-width: 180px;
      flex: 1 1 180px;
      max-width: 320px;
    }

    .button-card {
      display: grid;
      gap: 12px;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: ${options.sidebar ? "10px" : "14px"};
      background: color-mix(in srgb, var(--vscode-editor-background) 86%, var(--panel));
    }

    .button-card.compact {
      gap: 10px;
      padding: 10px;
    }

    /* Hidden button (eye toggle) */
    .button-card.hidden-button {
      opacity: 0.4;
      padding: 6px 12px;
    }

    .button-card.hidden-button .button-actions,
    .button-card.hidden-button .command,
    .button-card.hidden-button .subtitle {
      display: none;
    }

    .button-title {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      font-weight: 600;
    }

    .button-title-actions {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .button-label {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      min-height: 20px;
    }

    .button-label.icon-only {
      min-width: 20px;
      justify-content: center;
    }

    .icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--muted);
      padding: 2px 4px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
    }

    .icon-btn:hover {
      color: var(--fg);
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }

    .command {
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-word;
      padding: 10px;
      border-radius: 10px;
      background: var(--panel);
      border: 1px solid var(--border);
    }

    .button-actions, .link-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .danger-pill {
      color: var(--vscode-errorForeground);
      border-color: color-mix(in srgb, var(--danger) 60%, var(--border));
    }

    /* Table layout */
    .buttons-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 4px;
    }

    .buttons-table td {
      padding: 8px 10px;
      background: color-mix(in srgb, var(--vscode-editor-background) 86%, var(--panel));
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }

    .buttons-table td:first-child {
      border-left: 1px solid var(--border);
      border-radius: 8px 0 0 8px;
    }

    .buttons-table td:last-child {
      border-right: 1px solid var(--border);
      border-radius: 0 8px 8px 0;
    }

    .buttons-table .table-label {
      font-weight: 600;
      white-space: nowrap;
    }

    .buttons-table .table-command {
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      color: var(--muted);
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .buttons-table .table-actions {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }

    .buttons-table .table-actions button {
      padding: 4px 8px;
      font-size: 12px;
      border-radius: 6px;
    }

    .buttons-table .hidden-row {
      opacity: 0.4;
    }
  </style>
</head>
<body>
  <div id="app">${renderApp(state, options)}</div>
  <script>
    const vscode = acquireVsCodeApi();
    const postMessage = (message) => vscode.postMessage(message);

    // Restore persisted webview state
    let panelState = vscode.getState() || { collapsedGroups: {}, hiddenButtons: {} };

    // Apply persisted collapsed state
    document.querySelectorAll('.group[data-group-id]').forEach(section => {
      const groupId = section.dataset.groupId;
      if (panelState.collapsedGroups[groupId]) {
        section.classList.add('collapsed');
      }
    });

    // Apply persisted hidden button state
    document.querySelectorAll('.button-card[data-button-key], tr[data-button-key]').forEach(el => {
      const key = el.dataset.buttonKey;
      if (panelState.hiddenButtons[key]) {
        el.classList.add(el.tagName === 'TR' ? 'hidden-row' : 'hidden-button');
        const eyeIcon = el.querySelector('.eye-toggle .codicon');
        if (eyeIcon) {
          eyeIcon.classList.remove('codicon-eye');
          eyeIcon.classList.add('codicon-eye-closed');
        }
      }
    });

    document.addEventListener('click', (event) => {
      // Accordion toggle
      const groupHead = event.target.closest('.group-head');
      if (groupHead && !event.target.closest('button')) {
        const section = groupHead.closest('.group');
        const groupId = section.dataset.groupId;
        section.classList.toggle('collapsed');
        panelState.collapsedGroups[groupId] = section.classList.contains('collapsed');
        vscode.setState(panelState);
        return;
      }

      // Eye toggle
      const eyeBtn = event.target.closest('.eye-toggle');
      if (eyeBtn) {
        const card = eyeBtn.closest('.button-card') || eyeBtn.closest('tr');
        const key = card.dataset.buttonKey;
        const isTable = card.tagName === 'TR';
        card.classList.toggle(isTable ? 'hidden-row' : 'hidden-button');
        const isHidden = card.classList.contains(isTable ? 'hidden-row' : 'hidden-button');
        panelState.hiddenButtons[key] = isHidden;
        const icon = eyeBtn.querySelector('.codicon');
        if (isHidden) {
          icon.classList.remove('codicon-eye');
          icon.classList.add('codicon-eye-closed');
        } else {
          icon.classList.remove('codicon-eye-closed');
          icon.classList.add('codicon-eye');
        }
        vscode.setState(panelState);
        event.stopPropagation();
        return;
      }

      const target = event.target.closest('button');
      if (!target) {
        return;
      }

      const action = target.dataset.action;
      if (action) {
        postMessage({
          type: action,
          groupId: target.dataset.groupId,
          buttonId: target.dataset.buttonId,
          url: target.dataset.url,
          port: target.dataset.port ? Number(target.dataset.port) : undefined,
          source: target.dataset.source,
        });
        return;
      }

      if (target.dataset.url) {
        postMessage({ type: 'open-url', url: target.dataset.url });
        return;
      }

      if (target.dataset.port) {
        postMessage({ type: 'open-port', port: Number(target.dataset.port) });
      }
    });
  </script>
</body>
</html>`;
}

function renderApp(state: CombinedButtonsState, options: RenderOptions): string {
  const activeState = state.activeSource === "user" ? state.user : state.project;
  const title = escapeHtml(activeState.resolved?.title ?? "Buttons");
  const description = activeState.resolved?.description
    ? `<div class="subtitle">${escapeHtml(activeState.resolved.description)}</div>`
    : "";
  const filePath = escapeHtml(activeState.filePath ?? "No .buttons file found");

  const hasUserConfig = state.user.resolved !== undefined;
  const hasProjectConfig = state.project.resolved !== undefined;
  const showTabs = hasUserConfig && hasProjectConfig;

  return `
    <div class="shell">
      <header class="header">
        <div class="header-copy">
          <h1 class="title">${title}</h1>
          ${description}
          <div class="path">${filePath}</div>
        </div>
        <div class="actions">
          <button data-action="reload">Reload</button>
          <button data-action="open-file">Open .buttons</button>
        </div>
      </header>
      ${showTabs ? renderSourceTabs(state.activeSource) : ""}
      ${renderDiagnostics(activeState)}
      ${renderGroups(activeState, options)}
    </div>
  `;
}

function renderSourceTabs(activeSource: string): string {
  const projectActive = activeSource === "project" ? " active" : "";
  const userActive = activeSource === "user" ? " active" : "";
  return `
    <div class="source-tabs">
      <button class="tab${projectActive}" data-action="toggle-source" data-source="project">Project</button>
      <button class="tab${userActive}" data-action="toggle-source" data-source="user">User</button>
    </div>
  `;
}

function renderDiagnostics(state: LoadedButtonsState): string {
  if (state.diagnostics.length === 0) {
    return "";
  }

  return `<div class="diagnostics">${state.diagnostics
    .map(
      (diagnostic) =>
        `<div class="diagnostic ${diagnostic.severity}">${escapeHtml(diagnostic.message)}</div>`,
    )
    .join("")}</div>`;
}

function renderGroups(state: LoadedButtonsState, options: RenderOptions): string {
  const resolved = state.resolved;
  if (!resolved || resolved.groups.length === 0) {
    return '<div class="empty">No buttons are available yet. Create a .buttons file or add groups to it.</div>';
  }

  return `<div class="groups">${resolved.groups
    .map((group) => {
      const groupDescription = group.description ? `<div class="subtitle">${escapeHtml(group.description)}</div>` : "";
      const portBadges = group.ports
        .map((port) => `<button class="badge" data-port="${port}">:${port}</button>`)
        .join("");
      const linkBadges = group.links
        .map(
          (link) =>
            `<button class="badge" data-url="${escapeHtml(link.url)}">${renderCodicon(link.icon, group.showIcons)}${escapeText(link.label)}</button>`,
        )
        .join("");

      const layout = options.sidebar ? "rows" : group.layout;
      const buttonsHtml = layout === "table"
        ? renderButtonsTable(group)
        : renderButtonsCards(group, layout);

      const bgStyle = group.groupBgColor
        ? ` style="background:${escapeHtml(group.groupBgColor)}"`
        : "";

      return `
        <section class="group" data-group-id="${escapeHtml(group.id)}"${bgStyle}>
          <div class="group-head">
            <div class="group-head-left">
              <span class="codicon codicon-chevron-down group-chevron"></span>
              <div class="group-title-text">
                <div class="group-title">${renderCodicon(group.icon, group.showIcons)}<span>${escapeHtml(group.name)}</span></div>
                ${groupDescription}
              </div>
            </div>
            <div class="badge-row">
              ${portBadges}
              ${linkBadges}
            </div>
          </div>
          <div class="group-body">
            ${buttonsHtml}
          </div>
        </section>
      `;
    })
    .join("")}</div>`;
}

function actionBtnStyle(color: string | undefined): string {
  if (!color) return "";
  return ` style="background:${escapeHtml(color)};border-color:transparent;color:#fff"`;
}

function actionBtnClass(color: string | undefined, primary: boolean): string {
  if (color) return "colored-action";
  if (primary) return "primary";
  return "";
}

function renderActionButtons(group: ResolvedButtonsGroup, buttonId: string, compact: boolean): string {
  const gid = escapeHtml(group.id);
  const bid = escapeHtml(buttonId);
  const attrs = `data-group-id="${gid}" data-button-id="${bid}"`;

  const parts: string[] = [];

  if (group.showRun) {
    const cls = actionBtnClass(group.runColor, true);
    const style = actionBtnStyle(group.runColor);
    parts.push(`<button${cls ? ` class="${cls}"` : ""}${style} data-action="run-current" ${attrs}>Run</button>`);
  }
  if (group.showNewTerminal) {
    const cls = actionBtnClass(group.newTerminalColor, false);
    const style = actionBtnStyle(group.newTerminalColor);
    parts.push(`<button${cls ? ` class="${cls}"` : ""}${style} data-action="run-new" ${attrs}>${compact ? "New" : "New Terminal"}</button>`);
  }
  if (group.showCopyToTerminal) {
    const cls = actionBtnClass(group.copyToTerminalColor, false);
    const style = actionBtnStyle(group.copyToTerminalColor);
    parts.push(`<button${cls ? ` class="${cls}"` : ""}${style} data-action="copy-to-terminal" ${attrs}>${compact ? "→Term" : "Copy to Terminal"}</button>`);
  }
  if (group.showCopyToNewTerminal) {
    const cls = actionBtnClass(group.copyToNewTerminalColor, false);
    const style = actionBtnStyle(group.copyToNewTerminalColor);
    parts.push(`<button${cls ? ` class="${cls}"` : ""}${style} data-action="copy-to-new-terminal" ${attrs}>${compact ? "→New" : "Copy to New Terminal"}</button>`);
  }
  if (group.showCopyToClipboard) {
    const cls = actionBtnClass(group.copyToClipboardColor, false);
    const style = actionBtnStyle(group.copyToClipboardColor);
    parts.push(`<button${cls ? ` class="${cls}"` : ""}${style} data-action="copy" ${attrs}>Copy</button>`);
  }

  return parts.join("\n                ");
}

function renderButtonsCards(group: ResolvedButtonsGroup, layout: string): string {
  const compact = group.compact;
  const cardBorderStyle = group.buttonColor
    ? ` style="border-color:color-mix(in srgb, ${escapeHtml(group.buttonColor)} 40%, var(--border))"`
    : "";

  const buttons = group.buttons
    .map((button) => {
      const buttonKey = `${group.id}:${button.id}`;
      const description = button.description ? `<div class="subtitle">${escapeHtml(button.description)}</div>` : "";
      const command = group.showCommandPreview ? `<div class="command">${escapeHtml(button.command)}</div>` : "";
      const danger = button.danger ? '<span class="badge danger-pill">Danger</span>' : "";
      const urlActions = button.open_urls
        .map((url) => `<button data-action="open-url" data-url="${escapeHtml(url)}">Open URL</button>`)
        .join("");
      const portActions = button.open_ports
        .map((port) => `<button data-action="open-port" data-port="${port}">Open :${port}</button>`)
        .join("");
      const label = renderButtonLabel(button.label, button.icon, group.showLabels, group.showIcons);
      const cardClassName = compact ? "button-card compact" : "button-card";

      return `
        <article class="${cardClassName}" data-button-key="${escapeHtml(buttonKey)}"${cardBorderStyle}>
          <div class="button-title">
            ${label}
            <div class="button-title-actions">
              ${danger}
              <span class="icon-btn eye-toggle" title="Toggle visibility">
                <span class="codicon codicon-eye"></span>
              </span>
            </div>
          </div>
          ${description}
          ${command}
          <div class="button-actions">
            ${renderActionButtons(group, button.id, false)}
            ${urlActions}
            ${portActions}
          </div>
        </article>
      `;
    })
    .join("");

  return `<div class="buttons ${layout}">${buttons}</div>`;
}

function renderButtonsTable(group: ResolvedButtonsGroup): string {
  const rows = group.buttons
    .map((button) => {
      const buttonKey = `${group.id}:${button.id}`;
      const iconHtml = renderCodicon(button.icon, group.showIcons);
      const labelHtml = group.showLabels ? escapeHtml(button.label) : "";
      const commandHtml = group.showCommandPreview ? escapeHtml(button.command) : "";

      return `
        <tr data-button-key="${escapeHtml(buttonKey)}">
          <td>${iconHtml}</td>
          <td class="table-label">${labelHtml}</td>
          <td class="table-command" title="${escapeHtml(button.command)}">${commandHtml}</td>
          <td>
            <div class="table-actions">
              ${renderActionButtons(group, button.id, true)}
              <span class="icon-btn eye-toggle" title="Toggle visibility">
                <span class="codicon codicon-eye"></span>
              </span>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  return `<table class="buttons-table">${rows}</table>`;
}

function renderButtonLabel(label: string, icon: string | undefined, showLabels: boolean, showIcons: boolean): string {
  const safeLabel = escapeHtml(label);
  const iconMarkup = renderCodicon(icon, showIcons);

  if (!showLabels && showIcons && iconMarkup) {
    return `<span class="button-label icon-only" title="${safeLabel}">${iconMarkup}</span>`;
  }

  if (!showLabels && !showIcons) {
    return `<span class="button-label">${safeLabel}</span>`;
  }

  return `<span class="button-label">${iconMarkup}${showLabels ? safeLabel : ""}</span>`;
}

function renderCodicon(icon: string | undefined, showIcons = true): string {
  if (!showIcons || !icon) {
    return "";
  }

  return `<span class="codicon codicon-${escapeHtml(icon)}"></span>`;
}

function escapeText(value: string): string {
  return value ? ` ${escapeHtml(value)}` : "";
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
