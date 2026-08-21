<!-- effect-solutions:start -->
## Effect Best Practices

**IMPORTANT:** Always consult effect-solutions before writing Effect code.

1. Run `effect-solutions list` to see available guides
2. Run `effect-solutions show <topic>...` for relevant patterns (supports multiple topics)
3. Search `~/.local/share/effect-solutions/effect` for real implementations

Topics: quick-start, project-setup, tsconfig, basics, services-and-layers, data-modeling, error-handling, config, testing, cli.

Never guess at Effect patterns - check the guide first.

## Local Effect Source

The Effect v4 repository is cloned to `~/.local/share/effect-solutions/effect` for reference.
Use this to explore APIs, find usage examples, and understand implementation
details when the documentation isn't enough.
<!-- effect-solutions:end -->

## Project-specific: pinned Effect source in this repo

`references/effect/` is a git subtree of `Effect-TS/effect-smol` (squashed, no
upstream history) committed directly into this repo — the version-pinned
source of truth for this project specifically, distinct from the
machine-wide `~/.local/share/effect-solutions/effect` clone above (which
tracks upstream `main` and can drift). When verifying an Effect API or
pattern actually used by this codebase, check `references/effect/` first.

To pull upstream updates into it: `git subtree pull --prefix=references/effect https://github.com/Effect-TS/effect-smol.git main --squash`.
