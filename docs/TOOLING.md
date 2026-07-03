# General tooling documentation

## Dependencies

We use `supports-color` as a root dev-dependency because when it is not declared it causes some bugs in pnpm v11.9, leading to duplicate dependencies and alternating constantly between versions of dependencies. The goal is to get it removed if the behavior gets fixed in future pnpm versions.  
To check with a new version, run `pnpm i`, then remove the dependency and `pnpm i` again. If something changes, it's still broken
