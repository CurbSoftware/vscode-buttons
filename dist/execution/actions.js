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
exports.runButton = runButton;
exports.copyButtonCommand = copyButtonCommand;
exports.openButtonUrl = openButtonUrl;
exports.openButtonPort = openButtonPort;
const vscode = __importStar(require("vscode"));
const BUTTONS_TERMINAL_NAME = "Buttons";
async function runButton(resolved, groupId, buttonId, terminalMode, confirmDangerousCommands) {
    const button = findButton(resolved, groupId, buttonId);
    if (!button) {
        void vscode.window.showErrorMessage("Button not found in the current Buttons config.");
        return;
    }
    if (confirmDangerousCommands && (button.confirm || button.danger)) {
        const answer = await vscode.window.showWarningMessage(`Run '${button.label}'?`, { modal: true, detail: button.command }, "Run");
        if (answer !== "Run") {
            return;
        }
    }
    const terminal = terminalMode === "new" ? createNewTerminal(button) : getOrCreateCurrentTerminal(button);
    terminal.show(Boolean(button.reveal_terminal));
    terminal.sendText(button.command, true);
}
async function copyButtonCommand(resolved, groupId, buttonId) {
    const button = findButton(resolved, groupId, buttonId);
    if (!button) {
        void vscode.window.showErrorMessage("Button not found in the current Buttons config.");
        return;
    }
    await vscode.env.clipboard.writeText(button.command);
    void vscode.window.showInformationMessage(`Copied '${button.label}' command.`);
}
async function openButtonUrl(url) {
    await vscode.env.openExternal(vscode.Uri.parse(url));
}
async function openButtonPort(port) {
    await vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}`));
}
function findButton(resolved, groupId, buttonId) {
    return resolved?.groups.find((group) => group.id === groupId)?.buttons.find((button) => button.id === buttonId);
}
function getOrCreateCurrentTerminal(button) {
    const activeTerminal = vscode.window.activeTerminal;
    if (activeTerminal) {
        return activeTerminal;
    }
    const buttonsTerminal = vscode.window.terminals.find((terminal) => terminal.name === BUTTONS_TERMINAL_NAME);
    if (buttonsTerminal) {
        return buttonsTerminal;
    }
    return vscode.window.createTerminal({
        name: BUTTONS_TERMINAL_NAME,
        cwd: button.cwd,
        env: button.env,
    });
}
function createNewTerminal(button) {
    return vscode.window.createTerminal({
        name: `Buttons: ${button.label}`,
        cwd: button.cwd,
        env: button.env,
    });
}
//# sourceMappingURL=actions.js.map