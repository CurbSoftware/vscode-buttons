import * as vscode from "vscode";
import { CombinedButtonsState, PanelActionMessage } from "../models/types";
import { renderHtml } from "./ButtonsRenderer";

export class ButtonsSidebarProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly getState: () => Promise<CombinedButtonsState>,
    private readonly onMessage: (message: PanelActionMessage) => Promise<void>,
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.onDidReceiveMessage(async (message: PanelActionMessage) => {
      await this.onMessage(message);
    });

    webviewView.onDidDispose(() => {
      this.view = undefined;
    });

    void this.refresh();
  }

  public async refresh(): Promise<void> {
    if (!this.view) {
      return;
    }

    const state = await this.getState();
    const codiconUri = this.view.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "node_modules", "@vscode", "codicons", "dist", "codicon.css"),
    ).toString();
    this.view.webview.html = renderHtml(state, codiconUri, { sidebar: true });
  }
}
