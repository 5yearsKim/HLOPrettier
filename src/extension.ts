import * as vscode from "vscode";

const formatter: vscode.DocumentFormattingEditProvider = {
  provideDocumentFormattingEdits(): vscode.TextEdit[] {
    // Formatting rules will be added incrementally. Returning no edits keeps
    // this registration safe while making HLO Prettier available to VS Code's
    // standard Format Document command.
    return [];
  },
};

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider("hlo", formatter),
  );
}

export function deactivate(): void {}
