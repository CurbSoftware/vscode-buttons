import { LoadedButtonsState } from "../models/types";

export interface RenderOptions {
  sidebar: boolean;
}

export function renderHtml(state: LoadedButtonsState, codiconUri: string, options: RenderOptions): string {
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
      background:
        radial-gradient(circle at top left, color-mix(in srgb, var(--vscode-textLink-foreground) 14%, transparent), transparent 28%),
        radial-gradient(circle at top right, color-mix(in srgb, var(--vscode-button-background) 18%, transparent), transparent 24%),
        var(--bg);
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

    .groups {
      display: grid;
      gap: ${options.sidebar ? "10px" : "16px"};
    }

    .group {
      border: 1px solid var(--border);
      border-radius: ${options.sidebar ? "12px" : "16px"};
      padding: ${options.sidebar ? "10px" : "16px"};
      background: color-mix(in srgb, var(--panel) 92%, transparent);
      display: grid;
      gap: ${options.sidebar ? "10px" : "14px"};
    }

    .group-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
    }

    .group-title {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: ${groupTitleSize};
      font-weight: 600;
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

    .button-title {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      font-weight: 600;
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
  </style>
</head>
<body>
  <div id="app">${renderApp(state, options)}</div>
  <script>
    const vscode = acquireVsCodeApi();
    const postMessage = (message) => vscode.postMessage(message);
    document.addEventListener('click', (event) => {
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

function renderApp(state: LoadedButtonsState, options: RenderOptions): string {
  const title = escapeHtml(state.resolved?.title ?? "Buttons");
  const description = state.resolved?.description
    ? `<div class="subtitle">${escapeHtml(state.resolved.description)}</div>`
    : "";
  const filePath = escapeHtml(state.filePath ?? "No .buttons file found");

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
      ${renderDiagnostics(state)}
      ${renderGroups(state, options)}
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

  const layout = options.sidebar ? "rows" : resolved.layout;

  return `<div class="groups">${resolved.groups
    .map((group) => {
      const groupDescription = group.description ? `<div class="subtitle">${escapeHtml(group.description)}</div>` : "";
      const portBadges = group.ports
        .map((port) => `<button class="badge" data-port="${port}">:${port}</button>`)
        .join("");
      const linkBadges = group.links
        .map(
          (link) =>
            `<button class="badge" data-url="${escapeHtml(link.url)}">${renderCodicon(link.icon, resolved.showIcons)}${escapeText(link.label)}</button>`,
        )
        .join("");
      const buttons = group.buttons
        .map((button) => {
          const description = button.description ? `<div class="subtitle">${escapeHtml(button.description)}</div>` : "";
          const command = resolved.showCommandPreview ? `<div class="command">${escapeHtml(button.command)}</div>` : "";
          const danger = button.danger ? '<span class="badge danger-pill">Danger</span>' : "";
          const urlActions = button.open_urls
            .map((url) => `<button data-action="open-url" data-url="${escapeHtml(url)}">Open URL</button>`)
            .join("");
          const portActions = button.open_ports
            .map((port) => `<button data-action="open-port" data-port="${port}">Open :${port}</button>`)
            .join("");
          const label = renderButtonLabel(button.label, button.icon, resolved.showLabels, resolved.showIcons);
          const cardClassName = resolved.compact ? "button-card compact" : "button-card";

          return `
            <article class="${cardClassName}">
              <div class="button-title">
                ${label}
                ${danger}
              </div>
              ${description}
              ${command}
              <div class="button-actions">
                <button class="primary" data-action="run-current" data-group-id="${escapeHtml(group.id)}" data-button-id="${escapeHtml(button.id)}">Run</button>
                <button data-action="run-new" data-group-id="${escapeHtml(group.id)}" data-button-id="${escapeHtml(button.id)}">New Terminal</button>
                <button data-action="copy" data-group-id="${escapeHtml(group.id)}" data-button-id="${escapeHtml(button.id)}">Copy</button>
                ${urlActions}
                ${portActions}
              </div>
            </article>
          `;
        })
        .join("");

      return `
        <section class="group">
          <div class="group-head">
            <div>
              <div class="group-title">${renderCodicon(group.icon, resolved.showIcons)}<span>${escapeHtml(group.name)}</span></div>
              ${groupDescription}
            </div>
            <div class="badge-row">
              ${portBadges}
              ${linkBadges}
            </div>
          </div>
          <div class="buttons ${layout}">
            ${buttons}
          </div>
        </section>
      `;
    })
    .join("")}</div>`;
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
