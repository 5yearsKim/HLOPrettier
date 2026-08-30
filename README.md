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
