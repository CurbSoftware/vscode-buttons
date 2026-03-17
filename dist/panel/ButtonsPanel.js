"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonsPanel = void 0;
const vscode = __importStar(require("vscode"));
class ButtonsPanel {
    extensionUri;
    getState;
    onMessage;
    panel;
    constructor(extensionUri, getState, onMessage) {
        this.extensionUri = extensionUri;
        this.getState = getState;
        this.onMessage = onMessage;
    }
    async show() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Active);
            await this.refresh();
            return;
        }
        this.panel = vscode.window.createWebviewPanel("buttons.panel", "Buttons", vscode.ViewColumn.Active, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
        this.panel.webview.onDidReceiveMessage(async (message) => {
            await this.onMessage(message);
        });
        await this.refresh();
    }
    async refresh() {
        if (!this.panel) {
            return;
        }
        const state = await this.getState();
        this.panel.webview.html = this.renderHtml(state);
    }
    renderHtml(state) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Buttons</title>
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
      padding: 24px;
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
      gap: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
    }

    .header-copy {
      display: grid;
      gap: 6px;
    }

    .title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }

    .subtitle, .path, .empty, .diagnostic {
      color: var(--muted);
    }

    .actions {
      display: flex;
      gap: 10px;
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
      gap: 16px;
    }

    .group {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
      background: color-mix(in srgb, var(--panel) 92%, transparent);
      display: grid;
      gap: 14px;
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
      font-size: 20px;
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
      padding: 14px;
      background: color-mix(in srgb, var(--vscode-editor-background) 86%, var(--panel));
    }

    .button-title {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      font-weight: 600;
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
  <div id="app">${this.renderApp(state)}</div>
  <script>
    const vscode = acquireVsCodeApi();
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
    renderApp(state) {
        const title = this.escapeHtml(state.resolved?.title ?? "Buttons");
        const description = state.resolved?.description
            ? `<div class="subtitle">${this.escapeHtml(state.resolved.description)}</div>`
            : "";
        const filePath = this.escapeHtml(state.filePath ?? "No .buttons file found");
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
        ${this.renderDiagnostics(state)}
        ${this.renderGroups(state)}
      </div>
    `;
    }
    renderDiagnostics(state) {
        if (state.diagnostics.length === 0) {
            return "";
        }
        return `<div class="diagnostics">${state.diagnostics
            .map((diagnostic) => `<div class="diagnostic ${diagnostic.severity}">${this.escapeHtml(diagnostic.message)}</div>`)
            .join("")}</div>`;
    }
    renderGroups(state) {
        const resolved = state.resolved;
        if (!resolved || resolved.groups.length === 0) {
            return '<div class="empty">No buttons are available yet. Create a .buttons file or add groups to it.</div>';
        }
        return `<div class="groups">${resolved.groups
            .map((group) => {
            const groupDescription = group.description ? `<div class="subtitle">${this.escapeHtml(group.description)}</div>` : "";
            const portBadges = group.ports
                .map((port) => `<button class="badge" data-port="${port}">:${port}</button>`)
                .join("");
            const linkBadges = group.links
                .map((link) => `<button class="badge" data-url="${this.escapeHtml(link.url)}">${this.renderCodicon(link.icon)} ${this.escapeHtml(link.label)}</button>`)
                .join("");
            const buttons = group.buttons
                .map((button) => {
                const description = button.description ? `<div class="subtitle">${this.escapeHtml(button.description)}</div>` : "";
                const command = resolved.showCommandPreview ? `<div class="command">${this.escapeHtml(button.command)}</div>` : "";
                const danger = button.danger ? '<span class="badge danger-pill">Danger</span>' : "";
                const urlActions = button.open_urls
                    .map((url) => `<button data-action="open-url" data-url="${this.escapeHtml(url)}">Open URL</button>`)
                    .join("");
                const portActions = button.open_ports
                    .map((port) => `<button data-action="open-port" data-port="${port}">Open :${port}</button>`)
                    .join("");
                return `
              <article class="button-card">
                <div class="button-title">
                  <span>${this.renderCodicon(button.icon)} ${this.escapeHtml(button.label)}</span>
                  ${danger}
                </div>
                ${description}
                ${command}
                <div class="button-actions">
                  <button class="primary" data-action="run-current" data-group-id="${this.escapeHtml(group.id)}" data-button-id="${this.escapeHtml(button.id)}">Run</button>
                  <button data-action="run-new" data-group-id="${this.escapeHtml(group.id)}" data-button-id="${this.escapeHtml(button.id)}">New Terminal</button>
                  <button data-action="copy" data-group-id="${this.escapeHtml(group.id)}" data-button-id="${this.escapeHtml(button.id)}">Copy</button>
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
                <div class="group-title">${this.renderCodicon(group.icon)} <span>${this.escapeHtml(group.name)}</span></div>
                ${groupDescription}
              </div>
              <div class="badge-row">
                ${portBadges}
                ${linkBadges}
              </div>
            </div>
            <div class="buttons ${resolved.layout}">
              ${buttons}
            </div>
          </section>
        `;
        })
            .join("")}</div>`;
    }
    renderCodicon(icon) {
        return icon ? `<span class="codicon codicon-${this.escapeHtml(icon)}"></span>` : "";
    }
    escapeHtml(value) {
        return value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }
}
exports.ButtonsPanel = ButtonsPanel;
//# sourceMappingURL=ButtonsPanel.js.map