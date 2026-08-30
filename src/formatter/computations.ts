import { analyzeLine } from "./scanner.js";

export function normalizeComputationSpacing(
  lines: string[],
  blankLineCount: number,
): string[] {
  const result: string[] = [];
  let depth = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const startsComputation = depth === 0 && isComputationStart(line);
    if (startsComputation) {
      let previousIndex = result.length - 1;
      while (previousIndex >= 0 && result[previousIndex].trim() === "") previousIndex -= 1;
      if (previousIndex >= 0 && result[previousIndex].trim() === "}") {
        result.length = previousIndex + 1;
        for (let count = 0; count < blankLineCount; count += 1) result.push("");
      }
    }

    result.push(line);
    const analysis = analyzeLine(line, inBlockComment);
    inBlockComment = analysis.inBlockComment;
    depth = Math.max(0, depth + analysis.openingBraces - analysis.closingBraces);
  }

  return result;
}

function isComputationStart(line: string): boolean {
  return /^(?:ENTRY\s+)?%?[A-Za-z_][A-Za-z0-9_.-]*(?:\s*\(|\s*\{)/.test(line.trimStart());
}
