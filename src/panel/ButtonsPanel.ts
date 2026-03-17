import * as vscode from "vscode";
import { LoadedButtonsState, PanelActionMessage } from "../models/types";
import { renderHtml } from "./ButtonsRenderer";

export class ButtonsPanel {
  private panel: vscode.WebviewPanel | undefined;

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly getState: () => Promise<LoadedButtonsState>,
    private readonly onMessage: (message: PanelActionMessage) => Promise<void>,
  ) {}

  public async show(): Promise<void> {
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

    this.panel.webview.onDidReceiveMessage(async (message: PanelActionMessage) => {
      await this.onMessage(message);
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
    this.panel.webview.html = renderHtml(state, codiconUri, { sidebar: false });
  }
}
