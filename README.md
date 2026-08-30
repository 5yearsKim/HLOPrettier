# HLO Prettier

Visual Studio Code syntax highlighting and configurable document formatting for
XLA HLO text.

The extension recognizes `.hlo` files and common XLA/JAX text-dump names without
claiming every `.txt` file:

- `module_*.jit_*.txt`
- `*before_optimizations.txt`
- `*.cpu_after_optimizations.txt`
- `*.gpu_after_optimizations.txt`

## Features

- Theme-compatible syntax highlighting for HLO modules, computations, shapes,
  primitive types, identifiers, attributes, literals, strings, and comments.
- Standard **Format Document** and format-on-save support.
- Configurable indentation, line width, attribute wrapping, metadata handling,
  and blank lines between computations.
- Safe handling of strings, comments, malformed input, and generated metadata.

Run **Format Document** from the Command Palette or use the editor's formatting
keyboard shortcut. If VS Code prompts for a formatter, select **HLO Prettier**.

## Development

Development requires Node.js 22 or newer and pnpm 11.24.0.

```shell
pnpm install
pnpm run validate
pnpm package
```

To preview changes without reinstalling a VSIX, open this repository in VS Code
and press <kbd>F5</kbd>. The Extension Development Host opens the project with
the extension loaded from the working tree. Open any `.hlo` file or recognized
XLA dump from the Explorer to inspect its highlighting.

Run `pnpm run validate` and `pnpm test` separately before packaging or
committing changes. They are not required to launch the visual preview.

## Formatting settings

Configure HLO Prettier with VS Code's `settings.json`:

```json
{
  "[hlo]": {
    "editor.defaultFormatter": "5yearsKim.hlo-prettier",
    "editor.formatOnSave": true,
    "editor.insertSpaces": true,
    "editor.tabSize": 2
  },
  "hloPrettier.printWidth": 120,
  "hloPrettier.attributeWrapping": "auto",
  "hloPrettier.formatMetadata": false,
  "hloPrettier.blankLinesBetweenComputations": 1
}
```

- `printWidth` controls when `auto` attribute wrapping begins.
- `attributeWrapping` accepts `auto`, `preserve`, or `onePerLine`.
- `formatMetadata` keeps metadata internals opaque by default; enable it to
  normalize their horizontal whitespace.
- `blankLinesBetweenComputations` accepts values from 0 through 2 and does not
  alter intentional blank lines inside computation bodies.
