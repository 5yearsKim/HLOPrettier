import { normalizeComputationSpacing } from "./computations.js";
import { applyIndentation, createIndentUnit } from "./indentation.js";
import type { HloFormattingOptions } from "./types.js";
import { normalizeWhitespaceLines } from "./whitespace.js";
import { wrapInstructionAttributes } from "./wrapping.js";

export type { AttributeWrapping, HloFormattingOptions } from "./types.js";

/** Formats an HLO document using a sequence of independent formatting passes. */
export function formatHlo(source: string, options: HloFormattingOptions): string {
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const indentUnit = createIndentUnit(options);

  const normalized = normalizeWhitespaceLines(source.split(/\r?\n/), options.formatMetadata);
  const indented = applyIndentation(normalized, indentUnit);
  const separated = normalizeComputationSpacing(
    indented,
    options.blankLinesBetweenComputations,
  );
  const wrapped = wrapInstructionAttributes(separated, options, indentUnit);

  return wrapped.join(newline);
}
