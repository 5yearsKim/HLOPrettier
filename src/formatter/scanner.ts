import type { LineAnalysis } from "./types.js";

export function analyzeLine(line: string, startsInBlockComment: boolean): LineAnalysis {
  let openingBraces = 0;
  let closingBraces = 0;
  let leadingClosingBraces = 0;
  let sawCode = false;
  let inBlockComment = startsInBlockComment;
  let quote = "";

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (inBlockComment) {
      if (character === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote !== "") {
      if (character === "\\") index += 1;
      else if (character === quote) quote = "";
      continue;
    }

    if (character === "/" && next === "/") break;
    if (character === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      sawCode = true;
      continue;
    }
    if (/\s/.test(character)) continue;

    if (character === "{") openingBraces += 1;
    else if (character === "}") {
      closingBraces += 1;
      if (!sawCode) leadingClosingBraces += 1;
    }

    sawCode = true;
  }

  return { closingBraces, inBlockComment, leadingClosingBraces, openingBraces };
}

export function splitAtTopLevelCommas(line: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let braces = 0;
  let quote = "";

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (quote !== "") {
      if (character === "\\") index += 1;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "/" && next === "/") break;
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "(") parentheses += 1;
    else if (character === ")") parentheses = Math.max(0, parentheses - 1);
    else if (character === "[") brackets += 1;
    else if (character === "]") brackets = Math.max(0, brackets - 1);
    else if (character === "{") braces += 1;
    else if (character === "}") braces = Math.max(0, braces - 1);
    else if (character === "," && parentheses === 0 && brackets === 0 && braces === 0) {
      parts.push(line.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(line.slice(start));
  return parts;
}
