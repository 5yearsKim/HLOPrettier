import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { formatHlo } from "../src/formatter/index.ts";

const spaces = {
  attributeWrapping: "auto",
  blankLinesBetweenComputations: 1,
  formatMetadata: false,
  insertSpaces: true,
  printWidth: 120,
  tabSize: 2,
};

test("indents computation bodies with spaces", () => {
  const input = [
    "HloModule example",
    "",
    "ENTRY %main () -> f32[] {",
    "%value = f32[] constant(0)",
    "ROOT %result = f32[] copy(%value)",
    "}",
  ].join("\n");

  const expected = [
    "HloModule example",
    "",
    "ENTRY %main () -> f32[] {",
    "  %value = f32[] constant(0)",
    "  ROOT %result = f32[] copy(%value)",
    "}",
  ].join("\n");

  assert.equal(formatHlo(input, spaces), expected);
});

test("ignores braces inside strings and comments", () => {
  const input = [
    "ENTRY %main () -> f32[] {",
    "// A comment with } and {",
    "%value = f32[] constant(0), metadata={op_name=\"literal } {\"}",
    "/* A block comment {",
    "   still inside } */",
    "ROOT %result = f32[] copy(%value)",
    "}",
  ].join("\n");

  const expected = [
    "ENTRY %main () -> f32[] {",
    "  // A comment with } and {",
    "  %value = f32[] constant(0), metadata={op_name=\"literal } {\"}",
    "  /* A block comment {",
    "   still inside } */",
    "  ROOT %result = f32[] copy(%value)",
    "}",
  ].join("\n");

  assert.equal(formatHlo(input, spaces), expected);
});

test("supports tabs and preserves CRLF and blank lines", () => {
  const input = "ENTRY %main {\r\n\r\nROOT %result = token[] after-all()\r\n}\r\n";
  const expected = "ENTRY %main {\r\n\r\n\tROOT %result = token[] after-all()\r\n}\r\n";

  assert.equal(formatHlo(input, { ...spaces, insertSpaces: false, tabSize: 8 }), expected);
});

test("is idempotent", () => {
  const input = "ENTRY %main {\nROOT %result = token[] after-all()\n}\n";
  const once = formatHlo(input, spaces);

  assert.equal(formatHlo(once, spaces), once);
});

test("normalizes safe horizontal spacing while keeping shapes compact", () => {
  const input = [
    "ENTRY %main(input:f32[32, 64])->f32[32]{0}{",
    "%input=f32[32, 64]{1, 0} parameter(0)",
    "ROOT %output=f32[32]{0} reduce(%input,%zero),dimensions={1, 0}",
    "}",
  ].join("\n");

  const expected = [
    "ENTRY %main (input: f32[32,64]) -> f32[32]{0} {",
    "  %input = f32[32,64]{1,0} parameter(0)",
    "  ROOT %output = f32[32]{0} reduce(%input, %zero), dimensions={1,0}",
    "}",
  ].join("\n");

  assert.equal(formatHlo(input, spaces), expected);
});

test("spaces tuple elements while keeping layouts and tiling compact", () => {
  const input =
    "HloModule example, entry_computation_layout={(f32[8, 16]{1, 0:T(8, 128)(2, 1)S(5)},f32[])->(f32[],s32[])}";
  const expected =
    "HloModule example, entry_computation_layout={(f32[8,16]{1,0:T(8,128)(2,1)S(5)}, f32[]) -> (f32[], s32[])}";

  assert.equal(formatHlo(input, spaces), expected);
});

test("preserves metadata, strings, and comments during spacing", () => {
  const input = [
    "ENTRY %main(input:f32[])->f32[]{",
    "%input=f32[] parameter(0),metadata={op_name=\"a,b:c -> d\", source_line = 1}",
    "ROOT %output=f32[] copy(%input) // keep,a:b->c",
    "}",
  ].join("\n");

  const expected = [
    "ENTRY %main (input: f32[]) -> f32[] {",
    "  %input = f32[] parameter(0), metadata={op_name=\"a,b:c -> d\", source_line = 1}",
    "  ROOT %output = f32[] copy(%input) // keep,a:b->c",
    "}",
  ].join("\n");

  assert.equal(formatHlo(input, spaces), expected);
});

test("normalizes blank lines only between top-level computations", () => {
  const input = [
    "HloModule example",
    "",
    "%helper () -> f32[] {",
    "  %value = f32[] constant(0)",
    "",
    "  ROOT %result = f32[] copy(%value)",
    "}",
    "",
    "",
    "",
    "ENTRY %main () -> f32[] {",
    "  ROOT %result = f32[] call(), to_apply=%helper",
    "}",
  ].join("\n");

  const oneBlank = formatHlo(input, spaces);
  assert.match(oneBlank, /constant\(0\)\n\n  ROOT/);
  assert.match(oneBlank, /^}\n\nENTRY/m);
  assert.doesNotMatch(oneBlank, /^}\n\n\nENTRY/m);

  const noBlanks = formatHlo(input, { ...spaces, blankLinesBetweenComputations: 0 });
  assert.match(noBlanks, /^}\nENTRY/m);

  const twoBlanks = formatHlo(input, { ...spaces, blankLinesBetweenComputations: 2 });
  assert.match(twoBlanks, /^}\n\n\nENTRY/m);
});

test("wraps trailing attributes according to printWidth", () => {
  const input = [
    "ENTRY %main () -> f32[32,32] {",
    "ROOT %result = f32[32,32]{1,0} reduce(%input, %zero), dimensions={1}, to_apply=%sum, metadata={op_name=\"long-name\"}",
    "}",
  ].join("\n");

  const expected = [
    "ENTRY %main () -> f32[32,32] {",
    "  ROOT %result = f32[32,32]{1,0} reduce(%input, %zero),",
    "    dimensions={1},",
    "    to_apply=%sum,",
    "    metadata={op_name=\"long-name\"}",
    "}",
  ].join("\n");

  assert.equal(formatHlo(input, { ...spaces, printWidth: 60 }), expected);
  assert.equal(formatHlo(expected, { ...spaces, printWidth: 60 }), expected);
});

test("supports preserve and onePerLine attribute wrapping", () => {
  const input = [
    "ENTRY %main () -> f32[] {",
    "ROOT %result = f32[] call(), to_apply=%helper, frontend_attributes={x=1}",
    "}",
  ].join("\n");

  const preserved = formatHlo(input, {
    ...spaces,
    attributeWrapping: "preserve",
    printWidth: 40,
  });
  assert.equal(preserved.split("\n").length, 3);

  const onePerLine = formatHlo(input, {
    ...spaces,
    attributeWrapping: "onePerLine",
    printWidth: 500,
  });
  assert.match(onePerLine, /call\(\),\n    to_apply=%helper,\n    frontend_attributes=\{x=1\}/);
});

test("formats metadata internals only when enabled", () => {
  const input = [
    "ENTRY %main () -> f32[] {",
    "%value=f32[] constant(0),metadata={op_name = \"x,y\", source_line = 7}",
    "}",
  ].join("\n");

  const opaque = formatHlo(input, spaces);
  assert.match(opaque, /metadata=\{op_name = \"x,y\", source_line = 7\}/);

  const formatted = formatHlo(input, { ...spaces, formatMetadata: true });
  assert.match(formatted, /metadata=\{op_name=\"x,y\",source_line=7\}/);
});

test("handles incomplete HLO without throwing and remains idempotent", () => {
  const inputs = [
    "ENTRY %main {\n%value=f32[] constant(0)",
    "ENTRY %main {\n%value=f32[] custom-call(), metadata={op_name=\"unterminated",
    "ENTRY %main {\n/* unterminated { comment",
  ];

  for (const input of inputs) {
    const once = formatHlo(input, spaces);
    assert.equal(formatHlo(once, spaces), once);
  }
});

test("formats every local dump idempotently", async (context) => {
  const dumpsDirectory = new URL("../samples/dumps/", import.meta.url);
  let files;
  try {
    files = (await readdir(dumpsDirectory)).filter((file) => file.endsWith(".txt"));
  } catch (error) {
    if (error.code === "ENOENT") return context.skip("no local dumps");
    throw error;
  }
  if (files.length === 0) return context.skip("no local dumps");

  for (const file of files) {
    const input = await readFile(new URL(file, dumpsDirectory), "utf8");
    const once = formatHlo(input, spaces);
    assert.equal(formatHlo(once, spaces), once, file);
  }
});
