import assert from "node:assert/strict";
import test from "node:test";

import { computeMinimalReplacement } from "../src/formatter/edit.ts";

test("returns no replacement for unchanged text", () => {
  assert.equal(computeMinimalReplacement("same", "same"), undefined);
});

test("returns the smallest contiguous replacement", () => {
  assert.deepEqual(computeMinimalReplacement("before x after", "before value after"), {
    startOffset: 7,
    endOffset: 8,
    newText: "value",
  });
});

test("supports insertions and deletions", () => {
  assert.deepEqual(computeMinimalReplacement("ab", "a--b"), {
    startOffset: 1,
    endOffset: 1,
    newText: "--",
  });
  assert.deepEqual(computeMinimalReplacement("a--b", "ab"), {
    startOffset: 1,
    endOffset: 3,
    newText: "",
  });
});
