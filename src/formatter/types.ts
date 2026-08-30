export type AttributeWrapping = "auto" | "preserve" | "onePerLine";

export interface HloFormattingOptions {
  attributeWrapping: AttributeWrapping;
  blankLinesBetweenComputations: number;
  formatMetadata: boolean;
  insertSpaces: boolean;
  printWidth: number;
  tabSize: number;
}

export interface LineAnalysis {
  closingBraces: number;
  inBlockComment: boolean;
  leadingClosingBraces: number;
  openingBraces: number;
}
