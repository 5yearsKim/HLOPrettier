import * as vscode from "vscode";

import { computeMinimalReplacement } from "./formatter/edit.js";
import { formatHlo } from "./formatter/index.js";
import type { AttributeWrapping } from "./formatter/index.js";

const formatter: vscode.DocumentFormattingEditProvider = {
  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
  ): vscode.TextEdit[] {
    const source = document.getText();
    const configuration = vscode.workspace.getConfiguration("hloPrettier", document.uri);
    const formatted = formatHlo(source, {
      attributeWrapping: configuration.get<AttributeWrapping>("attributeWrapping", "auto"),
      blankLinesBetweenComputations: configuration.get<number>(
        "blankLinesBetweenComputations",
        1,
      ),
      formatMetadata: configuration.get<boolean>("formatMetadata", false),
      insertSpaces: options.insertSpaces,
      printWidth: configuration.get<number>("printWidth", 120),
      tabSize: options.tabSize,
    });

    const replacement = computeMinimalReplacement(source, formatted);
    if (!replacement) return [];

    return [
      vscode.TextEdit.replace(
        new vscode.Range(
          document.positionAt(replacement.startOffset),
          document.positionAt(replacement.endOffset),
        ),
        replacement.newText,
      ),
    ];
  },
};

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider("hlo", formatter),
  );
}

export function deactivate(): void {}
