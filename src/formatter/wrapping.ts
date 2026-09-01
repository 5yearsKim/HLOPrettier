import { splitAtTopLevelCommas } from "./scanner.js";
import type { HloFormattingOptions } from "./types.js";

const INSTRUCTION = /^\s*(?:ROOT\s+)?%[A-Za-z_][A-Za-z0-9_.-]*\s*=/;
const ATTRIBUTE = /^[A-Za-z_][A-Za-z0-9_.-]*\s*=/;
const BACKEND_CONFIG = /^(\s*backend_config\s*=\s*)(\{.*\})(,?)\s*$/;

export function wrapInstructionAttributes(
  lines: string[],
  options: HloFormattingOptions,
  indentUnit: string,
): string[] {
  if (options.attributeWrapping === "preserve") return lines;

  return lines
    .flatMap((line) => wrapAttributes(line, options, indentUnit))
    .flatMap((line) => wrapBackendConfig(line, options, indentUnit));
}

function wrapAttributes(
  line: string,
  options: HloFormattingOptions,
  indentUnit: string,
): string[] {
  if (!INSTRUCTION.test(line)) return [line];

  const [instruction, ...attributes] = splitAtTopLevelCommas(line);
  const canWrap =
    attributes.length > 0 && attributes.every((part) => ATTRIBUTE.test(part.trim()));
  const exceedsPrintWidth = visualWidth(line, options.tabSize) > options.printWidth;
  if (!canWrap || (options.attributeWrapping !== "onePerLine" && !exceedsPrintWidth)) {
    return [line];
  }

  const continuationIndent = leadingWhitespace(line) + indentUnit;
  const wrapped = attributes.map((attribute, index) => {
    const comma = index < attributes.length - 1 ? "," : "";
    return `${continuationIndent}${attribute.trim()}${comma}`;
  });

  return [`${instruction.trimEnd()},`, ...wrapped];
}

function wrapBackendConfig(
  line: string,
  options: HloFormattingOptions,
  indentUnit: string,
): string[] {
  if (visualWidth(line, options.tabSize) <= options.printWidth) return [line];

  const match = line.match(BACKEND_CONFIG);
  if (!match) return [line];

  const json = prettyPrintJson(match[2]);
  if (!json) return [line];

  const prefix = match[1];
  const baseIndent = leadingWhitespace(prefix);
  const jsonLines = json.split("\n");

  return jsonLines.map((jsonLine, index) => {
    const jsonIndent = jsonLine.match(/^ */)?.[0].length ?? 0;
    const content = jsonLine.trimStart();
    const indentation = indentUnit.repeat(jsonIndent / 2);

    if (index === 0) return `${prefix}${content}`;
    const suffix = index === jsonLines.length - 1 ? match[3] : "";
    return `${baseIndent}${indentation}${content}${suffix}`;
  });
}

function prettyPrintJson(source: string): string | undefined {
  try {
    return JSON.stringify(JSON.parse(source), null, 2);
  } catch {
    return undefined;
  }
}

function leadingWhitespace(value: string): string {
  return value.match(/^\s*/)?.[0] ?? "";
}

function visualWidth(line: string, tabSize: number): number {
  return line.replace(/\t/g, " ".repeat(tabSize)).length;
}
