interface ProtectionState {
  inBlockComment: boolean;
  metadataDepth: number;
}

export function normalizeWhitespaceLines(lines: string[], formatMetadata: boolean): string[] {
  const state: ProtectionState = { inBlockComment: false, metadataDepth: 0 };
  return lines.map((line) => normalizeHorizontalWhitespace(line, formatMetadata, state));
}

function normalizeHorizontalWhitespace(
  line: string,
  formatMetadata: boolean,
  state: ProtectionState,
): string {
  if (line.trim() === "") return line;

  const protectedValues: string[] = [];
  let template = "";

  const protect = (value: string): void => {
    template += `\uE000${protectedValues.length}\uE001`;
    protectedValues.push(value);
  };

  for (let index = 0; index < line.length; ) {
    if (state.inBlockComment) {
      const end = line.indexOf("*/", index);
      if (end === -1) {
        protect(line.slice(index));
        index = line.length;
      } else {
        protect(line.slice(index, end + 2));
        state.inBlockComment = false;
        index = end + 2;
      }
      continue;
    }

    if (state.metadataDepth > 0) {
      const start = index;
      let quote = "";
      for (; index < line.length; index += 1) {
        const character = line[index];
        if (quote !== "") {
          if (character === "\\") index += 1;
          else if (character === quote) quote = "";
          continue;
        }
        if (character === '"' || character === "'") quote = character;
        else if (character === "{") state.metadataDepth += 1;
        else if (character === "}") {
          state.metadataDepth -= 1;
          if (state.metadataDepth === 0) {
            index += 1;
            break;
          }
        }
      }
      protect(line.slice(start, index));
      continue;
    }

    if (line.startsWith("//", index)) {
      protect(line.slice(index));
      break;
    }
    if (line.startsWith("/*", index)) {
      const end = line.indexOf("*/", index + 2);
      if (end === -1) {
        protect(line.slice(index));
        state.inBlockComment = true;
        break;
      }
      protect(line.slice(index, end + 2));
      index = end + 2;
      continue;
    }

    const character = line[index];
    if (character === '"' || character === "'") {
      const quote = character;
      const start = index;
      index += 1;
      while (index < line.length) {
        if (line[index] === "\\") index += 2;
        else if (line[index] === quote) {
          index += 1;
          break;
        } else index += 1;
      }
      protect(line.slice(start, index));
      continue;
    }

    if (!formatMetadata) {
      const metadata = line.slice(index).match(/^metadata\s*=\s*\{/);
      if (metadata) {
        state.metadataDepth = 1;
        protect(metadata[0]);
        index += metadata[0].length;
        continue;
      }
    }

    template += character;
    index += 1;
  }

  template = normalizeCode(template);
  return template.replace(/\uE000(\d+)\uE001/g, (_, index: string) => protectedValues[Number(index)]);
}

function normalizeCode(line: string): string {
  let result = line;

  const assignment = result.match(/^(\s*(?:ROOT\s+)?%[A-Za-z_][A-Za-z0-9_.-]*?)\s*=\s*/);
  if (assignment) result = `${assignment[1]} = ${result.slice(assignment[0].length)}`;

  result = result.replace(/(?<!%)\b([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*/g, "$1=");
  result = result.replace(/\s*->\s*/g, " -> ");
  result = result.replace(
    /^(\s*(?:ENTRY\s+)?%[A-Za-z_][A-Za-z0-9_.-]*)\s*\(/,
    "$1 (",
  );

  let normalized = "";
  const delimiters: Array<{ character: string; compact: boolean }> = [];
  let lastClosedCompactParenthesis = false;

  for (let index = 0; index < result.length; index += 1) {
    const character = result[index];
    const previousNonWhitespace = normalized.trimEnd().at(-1) ?? "";

    if (character === "[") {
      delimiters.push({ character, compact: true });
      lastClosedCompactParenthesis = false;
    } else if (character === "{") {
      delimiters.push({ character, compact: true });
      lastClosedCompactParenthesis = false;
    } else if (character === "(") {
      const compact =
        previousNonWhitespace === "T" ||
        previousNonWhitespace === "S" ||
        (previousNonWhitespace === ")" && lastClosedCompactParenthesis);
      delimiters.push({ character, compact });
      lastClosedCompactParenthesis = false;
    } else if (character === "]" || character === "}" || character === ")") {
      const expected = character === "]" ? "[" : character === "}" ? "{" : "(";
      const delimiter = delimiters.at(-1);
      if (delimiter?.character === expected) delimiters.pop();
      lastClosedCompactParenthesis = character === ")" && delimiter?.compact === true;
    } else if (!/\s/.test(character)) {
      lastClosedCompactParenthesis = false;
    }

    if (character === ",") {
      normalized = normalized.trimEnd() + ",";
      while (/\s/.test(result[index + 1] ?? "")) index += 1;
      if (delimiters.at(-1)?.compact !== true && index + 1 < result.length) normalized += " ";
      continue;
    }

    if (character === ":") {
      normalized = normalized.trimEnd() + ":";
      while (/\s/.test(result[index + 1] ?? "")) index += 1;
      if (delimiters.at(-1)?.compact !== true) normalized += " ";
      continue;
    }

    normalized += character;
  }

  if (/^(?:\s*ENTRY\s+)?\s*%[A-Za-z_]/.test(normalized) && /\{\s*$/.test(normalized)) {
    normalized = normalized.replace(/\s*\{\s*$/, " {");
  }

  return normalized;
}
