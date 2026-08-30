# Changelog

All notable changes to HLO Prettier are documented here.

## 0.1.0

Initial release.

- Added syntax highlighting for XLA HLO modules, computations, instructions,
  shapes, primitive types, attributes, literals, strings, and comments.
- Added automatic language detection for `.hlo` files and common XLA/JAX text
  dump filenames.
- Added **Format Document** and format-on-save support.
- Added configurable print width, attribute wrapping, metadata formatting, and
  blank lines between computations.
- Added support for editor-controlled spaces, tabs, and indentation width.
- Added safe formatting for comments, strings, metadata, and incomplete HLO.
