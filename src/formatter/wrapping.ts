import { splitAtTopLevelCommas } from "./scanner.js";
import type { HloFormattingOptions } from "./types.js";

export function wrapInstructionAttributes(
  lines: string[],
  options: HloFormattingOptions,
  indentUnit: string,
): string[] {
  if (options.attributeWrapping === "preserve") return lines;

  const result: string[] = [];
  for (const line of lines) {
    if (!/^\s*(?:ROOT\s+)?%[A-Za-z_][A-Za-z0-9_.-]*\s*=/.test(line)) {
      result.push(line);
      continue;
    }

    const parts = splitAtTopLevelCommas(line);
    const attributes = parts.slice(1);
    const hasAttributes =
      attributes.length > 0 &&
      attributes.every((part) => /^[A-Za-z_][A-Za-z0-9_.-]*\s*=/.test(part.trim()));
    const shouldWrap =
      hasAttributes &&
      (options.attributeWrapping === "onePerLine" ||
        visualWidth(line, options.tabSize) > options.printWidth);

    if (!shouldWrap) {
      result.push(line);
      continue;
    }

    const baseIndent = line.match(/^\s*/)?.[0] ?? "";
    const continuationIndent = baseIndent + indentUnit;
    result.push(`${parts[0].trimEnd()},`);
    attributes.forEach((attribute, index) => {
      const comma = index < attributes.length - 1 ? "," : "";
      result.push(`${continuationIndent}${attribute.trim()}${comma}`);
    });
  }

  return result;
}

function visualWidth(line: string, tabSize: number): number {
  return line.replace(/\t/g, " ".repeat(tabSize)).length;
}
