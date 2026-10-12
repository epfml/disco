import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const tests = [
  "discojs",
  "discojs_node",
  "discojs_web",
  "server",
  "webapp",
  "cli",
  "docs_examples",
];

function selectAll() {
  return {
    build: true,
    docker: true,
    any_tests: true,
    ...Object.fromEntries(tests.map((test) => [test, true])),
  };
}

export function classifyPaths(paths) {
  const selected = new Set();
  let build = false;
  let docker = false;

  for (const path of paths) {
    if (path.endsWith(".md") && !path.startsWith("docs/examples/")) continue;
    if (path.startsWith("docs/") && !path.startsWith("docs/examples/"))
      continue;

    build = true;
    if (path.startsWith("webapp/")) {
      selected.add("webapp");
    } else if (path.startsWith("cli/")) {
      selected.add("cli");
    } else if (path.startsWith("server/")) {
      docker = true;
      selected.add("server");
      selected.add("cli");
      selected.add("webapp");
      selected.add("docs_examples");
    } else if (path.startsWith("discojs-node/")) {
      docker = true;
      selected.add("discojs_node");
      selected.add("server");
      selected.add("cli");
      selected.add("webapp");
      selected.add("docs_examples");
    } else if (path.startsWith("discojs-web/")) {
      selected.add("discojs_web");
      selected.add("webapp");
    } else if (path.startsWith("docs/examples/")) {
      selected.add("docs_examples");
    } else if (path.startsWith("onnx-converter/")) {
      // It has no dedicated test job, but the workspace build still covers it.
    } else {
      // Shared code, CI configuration, root files, and new paths get full CI.
      docker = true;
      tests.forEach((test) => selected.add(test));
    }
  }

  return {
    build,
    docker,
    any_tests: selected.size > 0,
    ...Object.fromEntries(tests.map((test) => [test, selected.has(test)])),
  };
}

export function selectForEvent(eventName, ref, paths = []) {
  if (
    eventName === "merge_group" ||
    (eventName === "push" && ref === "refs/heads/main")
  ) {
    return selectAll();
  }
  if (eventName === "pull_request") return classifyPaths(paths);
  throw new Error(`Unexpected event: ${eventName} on ${ref}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { GITHUB_EVENT_NAME, GITHUB_OUTPUT, BASE_SHA, HEAD_SHA } = process.env;
  if (!GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required");

  let paths = [];
  if (GITHUB_EVENT_NAME === "pull_request") {
    if (
      !/^[a-f0-9]{40}$/.test(BASE_SHA ?? "") ||
      !/^[a-f0-9]{40}$/.test(HEAD_SHA ?? "")
    ) {
      throw new Error("Expected the PR base and head commit SHAs");
    }
    paths = execFileSync("git", [
      "diff",
      "--no-renames",
      "--name-only",
      "-z",
      BASE_SHA,
      HEAD_SHA,
    ])
      .toString()
      .split("\0")
      .filter(Boolean);
  }

  const selected = selectForEvent(
    GITHUB_EVENT_NAME,
    process.env.GITHUB_REF,
    paths,
  );
  appendFileSync(
    GITHUB_OUTPUT,
    Object.entries(selected)
      .map(([name, enabled]) => `${name}=${enabled}\n`)
      .join(""),
  );
  console.log("Changed paths:", paths);
  console.log("CI jobs:", selected);
}
