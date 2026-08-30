# HLO Prettier

Visual Studio Code syntax highlighting and editor support for XLA HLO text.

The extension recognizes `.hlo` files and common XLA/JAX text-dump names without
claiming every `.txt` file:

- `module_*.jit_*.txt`
- `*before_optimizations.txt`
- `*.cpu_after_optimizations.txt`
- `*.gpu_after_optimizations.txt`

The highlighting grammar will be added incrementally.

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
