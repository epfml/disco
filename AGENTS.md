# AGENTS.md

DISCO is a TypeScript pnpm monorepo for federated and decentralized learning. [DEV.md](./DEV.md) describes the packages and how to run them.

## Commands

- Install with `pnpm ci` (never npm or yarn), using the Node version in `.nvmrc`.
- Build with `pnpm -r run build`. `server`, `webapp` and `cli` only see `discojs` changes after a rebuild: `pnpm -F ./discojs build`.
- Fetch test datasets with `./datasets/populate`.
- Unit tests: `pnpm -F <package> test` (for `webapp`, `test:unit`; its Cypress suites are in [CONTRIBUTING.md](./docs/CONTRIBUTING.md#contributing-to-webapp)). For a single file, run `pnpm exec vitest --run --project=<package> <path>` from the root, or `pnpm -F webapp exec vitest --run <path>` for `webapp`. Stop any local server before running the `server` tests.
- Before you finish, run what CI runs: `pnpm run lint`, `pnpm exec knip`, `pnpm run check_cycles` and `pnpm run format:fix`.

## Code

- `discojs` must not depend on a platform. Node-only code goes in `discojs-node` and browser-only code in `discojs-web`.
- Use `List`, `Map` and `Set` from `immutable` rather than the native collections.
- Log through `debug` with a nested namespace, e.g. `createDebug("discojs:models:gpt")`, not `console.log`.
- Dispose of TensorFlow.js tensors. See [memory management](./docs/DISCOJS.md#tensorflowjs-memory-management).
- Don't add parameters, options or abstractions that nothing uses yet. Derive values rather than hardcoding them.
- Datasets never leave the user's device. User-facing text says "select" a dataset, never "upload".

## Comments

Comments explain _why_, not _what_. Add one wherever the reason isn't obvious: workarounds, magic values, the choice or split of test data, skipped work, sensitive parameters that are necessary for correctness.

Example of good comments are:
```ts
process.kill(-child.pid, "SIGTERM"); // negative PID also kills the spawned browser
```

Or:
```yml
steps:
    - uses: actions/checkout@v7
    - uses: ./.github/actions/setup-node
    - uses: ./.github/actions/pull-dataset-artifacts
    - uses: actions/download-artifact@v8
    with: { name: all-builds }
    # --shard splits E2E files across runners to stay within GitHub's 20-worker cap.
    # --no-file-parallelism runs files sequentially per runner to avoid CPU contention during training.
    - run: pnpm exec vitest --run --project=server server/tests/e2e --no-file-parallelism --shard=${{ matrix.shard }}/${{ strategy.job-total }}
```

Give new class attributes and exported functions a short JSDoc. When behaviour changes, update the comments around it.

## Tests

- Outside `webapp`, a unit spec sits next to the file it tests and shares its name: `foo.ts` and `foo.spec.ts`.
- `describe` + `it` together read as a sentence about the expected behaviour: `describe("sendAndWaitWithRetry")` + `it("resolves with server answer immediately")`.
- Never wait with fixed sleeps. Use `vi.waitFor(() => expect(...))` or fake timers.
- Narrow types with vitest's `assert` rather than the non-null `!` operator.
- Move repeated setup into helpers instead of copying test cases.

## Docs

If you change behaviour, commands, environment variables, CI or protocols, update the matching doc in the same PR:

| Doc                                              | Contents                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| [DEV.md](./DEV.md)                               | Package layout, installation, running `server`, `webapp`, `cli`        |
| [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)   | Per-package workflow, test suites and E2E env vars, CI jobs, debugging |
| [docs/DISCOJS.md](./docs/DISCOJS.md)             | `discojs` internals: trainer, client, aggregators, TF.js memory        |
| [docs/FEDERATED.md](./docs/FEDERATED.md)         | Federated connection, aggregation, late joiners, event flow            |
| [docs/DECENTRALIZED.md](./docs/DECENTRALIZED.md) | WebRTC peer connections, rounds, retries, event flow                   |
| [docs/PRIVACY.md](./docs/PRIVACY.md)             | Differential privacy and secure aggregation (MPC)                      |
| [docs/TASK.md](./docs/TASK.md)                   | Predefined and custom tasks, models, preprocessing                     |
| [docs/VUEJS.md](./docs/VUEJS.md)                 | `webapp` component architecture and Vue code guidelines                |
| [docs/TOOLING.md](./docs/TOOLING.md)             | Dependency and tooling workarounds                                     |
| [docs/FAQ.md](./docs/FAQ.md)                     | Troubleshooting setup and runtime issues                               |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)       | Releases and Google Cloud deployment                                   |
| [server/README.md](./server/README.md)           | Server HTTP API and deployment                                         |
| [cli/README.md](./cli/README.md)                 | CLI arguments, adding tasks, benchmarking                              |
