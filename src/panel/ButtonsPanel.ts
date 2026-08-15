import * as vscode from "vscode";
import type { PanelActionMessage, WebviewState } from "../models/types";
import { renderHtml } from "./ButtonsRenderer";

export class ButtonsPanel {
  private panel: vscode.WebviewPanel | undefined;

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly getState: () => Promise<WebviewState>,
    private readonly onMessage: (message: PanelActionMessage) => Promise<void>,
  ) {}

  public async createOrShow(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "buttons.mainPanel",
      "Buttons",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [this.extensionUri],
        retainContextWhenHidden: true,
      },
    );

    this.panel.webview.onDidReceiveMessage(async (message: PanelActionMessage) => {
      await this.onMessage(message);
    });

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    await this.refresh();
  }

  public async refresh(): Promise<void> {
    if (!this.panel) {
      return;
    }

    const state = await this.getState();
    const codiconUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "node_modules", "@vscode", "codicons", "dist", "codicon.css"),
    ).toString();
    this.panel.webview.html = renderHtml(state, codiconUri, "editor");
  }
}
