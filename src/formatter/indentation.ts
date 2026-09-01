import { analyzeLine } from "./scanner.js";
import type { HloFormattingOptions } from "./types.js";

export function createIndentUnit(options: HloFormattingOptions): string {
  return options.insertSpaces ? " ".repeat(options.tabSize) : "\t";
}

export function applyIndentation(lines: string[], indentUnit: string): string[] {
  let depth = 0;
  let inBlockComment = false;
  let multilineAttributeDepth = 0;

  return lines.map((line, index) => {
    const startedInsideBlockComment = inBlockComment;
    const analysis = analyzeLine(line, inBlockComment);
    inBlockComment = analysis.inBlockComment;

    const lineDepth = Math.max(0, depth - analysis.leadingClosingBraces);
    const isAttributeContinuation =
      index > 0 &&
      lines[index - 1].trimEnd().endsWith(",") &&
      /^[A-Za-z_][A-Za-z0-9_.-]*\s*=/.test(line.trimStart());
    let result = line;

    if (line.trim() !== "" && !startedInsideBlockComment) {
      const continuationDepth = isAttributeContinuation || multilineAttributeDepth > 0 ? 1 : 0;
      result = indentUnit.repeat(lineDepth + continuationDepth) + line.trimStart();
    }

    const braceDelta = analysis.openingBraces - analysis.closingBraces;
    if (multilineAttributeDepth > 0 || (isAttributeContinuation && braceDelta > 0)) {
      multilineAttributeDepth = Math.max(0, multilineAttributeDepth + braceDelta);
    }
    depth = Math.max(0, depth + braceDelta);
    return result;
  });
}
