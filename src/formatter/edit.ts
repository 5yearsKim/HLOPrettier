export interface TextReplacement {
  endOffset: number;
  newText: string;
  startOffset: number;
}

export function computeMinimalReplacement(
  source: string,
  formatted: string,
): TextReplacement | undefined {
  if (source === formatted) return undefined;

  let startOffset = 0;
  const sharedLength = Math.min(source.length, formatted.length);
  while (startOffset < sharedLength && source[startOffset] === formatted[startOffset]) {
    startOffset += 1;
  }

  let sourceEnd = source.length;
  let formattedEnd = formatted.length;
  while (
    sourceEnd > startOffset &&
    formattedEnd > startOffset &&
    source[sourceEnd - 1] === formatted[formattedEnd - 1]
  ) {
    sourceEnd -= 1;
    formattedEnd -= 1;
  }

  return {
    endOffset: sourceEnd,
    newText: formatted.slice(startOffset, formattedEnd),
    startOffset,
  };
}
