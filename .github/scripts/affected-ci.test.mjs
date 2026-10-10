import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyPaths, selectForEvent } from "./affected-ci.mjs";

test("webapp changes skip CLI, server, and Docker", () => {
  const result = classifyPaths(["webapp/src/App.vue"]);
  assert.equal(result.webapp, true);
  assert.equal(result.cli, false);
  assert.equal(result.server, false);
  assert.equal(result.docker, false);
});

test("server changes include its consumers", () => {
  const result = classifyPaths(["server/src/main.ts"]);
  assert.equal(result.server, true);
  assert.equal(result.cli, true);
  assert.equal(result.webapp, true);
  assert.equal(result.docs_examples, true);
  assert.equal(result.docker, true);
});

test("Node support changes reach CLI and server without running core tests", () => {
  const result = classifyPaths(["discojs-node/src/index.ts"]);
  assert.equal(result.discojs_node, true);
  assert.equal(result.server, true);
  assert.equal(result.cli, true);
  assert.equal(result.webapp, true);
  assert.equal(result.discojs, false);
  assert.equal(result.docker, true);
});

test("root configuration and unfamiliar paths run everything", () => {
  for (const path of [
    "pnpm-lock.yaml",
    "discojs/src/index.ts",
    "new-package/src/index.ts",
  ]) {
    const result = classifyPaths([path]);
    assert.equal(result.docker, true);
    assert.equal(result.discojs, true);
    assert.equal(result.docs_examples, true);
  }
});

test("mixed PR changes select the union of affected jobs", () => {
  const result = selectForEvent("pull_request", "refs/pull/1/merge", [
    "webapp/src/App.vue",
    "cli/src/main.ts",
  ]);
  assert.equal(result.webapp, true);
  assert.equal(result.cli, true);
  assert.equal(result.server, false);
  assert.equal(result.docker, false);
});

test("merge groups and main pushes select the complete pipeline", () => {
  for (const [event, ref] of [
    ["merge_group", "refs/heads/gh-readonly-queue/main/pr-1"],
    ["push", "refs/heads/main"],
  ]) {
    const result = selectForEvent(event, ref);
    assert.equal(result.build, true);
    assert.equal(result.docker, true);
    assert.equal(result.any_tests, true);
    assert.equal(result.discojs, true);
    assert.equal(result.server, true);
    assert.equal(result.webapp, true);
    assert.equal(result.cli, true);
    assert.equal(result.docs_examples, true);
  }
});

test("documentation-only changes leave verification to formatting", () => {
  const result = classifyPaths(["docs/CONTRIBUTING.md"]);
  assert.equal(result.build, false);
  assert.equal(result.any_tests, false);
});
