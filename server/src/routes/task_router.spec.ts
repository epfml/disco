import express from "express";
import type * as http from "node:http";
import { afterEach, assert, describe, expect, it } from "vitest";

import {
  defaultModels,
  defaultTasks,
  serializeTaskToJSON,
} from "@epfml/discojs";

import { hashToken } from "../access_token.js";
import { TaskSet } from "../task_set.js";
import { titanicModelSet } from "../../tests/utils.js";
import { TaskRouter } from "./task_router.js";

let handle: http.Server | undefined;

afterEach(async () => {
  const started = handle;
  handle = undefined;
  if (started === undefined) return;

  await new Promise<void>((resolve, reject) =>
    started.close((e) => {
      if (e !== undefined) reject(e);
      else resolve();
    }),
  );
});

/** Serve a TaskRouter on a random port, exposing its TaskSet */
async function startRouter(): Promise<{ taskSet: TaskSet; url: URL }> {
  const modelSet = await titanicModelSet();
  const taskSet = new TaskSet(modelSet);

  const app = express();
  app.use("/tasks", new TaskRouter(taskSet, modelSet).router);

  const server = await new Promise<http.Server>((resolve, reject) => {
    const ret = app.listen(0);
    ret.once("error", reject);
    ret.once("listening", () => resolve(ret));
  });
  handle = server;

  const address = server.address();
  assert(address !== null && typeof address !== "string");
  return { taskSet, url: new URL(`http://localhost:${address.port}`) };
}

/** POST the titanic task under the given ID, with extra body fields */
async function postTask(
  url: URL,
  id: string,
  extra: Record<string, unknown> = {},
): Promise<Response> {
  return await fetch(new URL("tasks", url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: serializeTaskToJSON({
        ...(await defaultTasks.titanic.getTask()),
        id,
      }),
      model: defaultModels.TitanicClassifier.card.id,
      ...extra,
    }),
  });
}

/** POST a private task under the given ID, returning its token */
async function postPrivateTask(url: URL, id: string): Promise<string> {
  const res = await postTask(url, id, { private: true });
  assert(res.ok);
  return ((await res.json()) as { token: string }).token;
}

/** GET a single task, with the given Authorization header if any */
async function getTask(
  url: URL,
  id: string,
  authorization?: string,
): Promise<Response> {
  return await fetch(new URL(`tasks/${id}`, url), {
    headers:
      authorization === undefined ? {} : { Authorization: authorization },
  });
}

describe("POST /tasks", () => {
  it("keeps tasks public unless asked otherwise", async () => {
    const { taskSet, url } = await startRouter();

    const res = await postTask(url, "public-task");

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Successful task upload"); // no token
    expect(taskSet.policies.get("public-task")).toEqual({
      visibility: "public",
    });
  });

  it("returns a 256-bit token for a private task", async () => {
    const { url } = await startRouter();

    const res = await postTask(url, "private-task", { private: true });

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { token } = (await res.json()) as { token: string };
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
  });

  it("stores only the token's hash", async () => {
    const { taskSet, url } = await startRouter();

    const token = await postPrivateTask(url, "private-task");

    const policy = taskSet.policies.get("private-task");
    expect(policy).toEqual({
      visibility: "private",
      tokenHash: hashToken(token),
    });
    expect(JSON.stringify(policy)).not.toContain(token);
  });

  it("returns a different token for each private task", async () => {
    const { url } = await startRouter();

    const tokens = await Promise.all(
      ["first-task", "second-task"].map((id) => postPrivateTask(url, id)),
    );

    expect(tokens[0]).not.toEqual(tokens[1]);
  });

  it("answers 400 when private isn't a boolean", async () => {
    const { taskSet, url } = await startRouter();

    const res = await postTask(url, "private-task", { private: "yes" });

    expect(res.status).toBe(400);
    expect(taskSet.tasks.has("private-task")).toBe(false);
  });
});

describe("GET /tasks", () => {
  it("lists public tasks but not private ones", async () => {
    const { url } = await startRouter();
    expect((await postTask(url, "public-task")).status).toBe(200);
    await postPrivateTask(url, "private-task");

    const res = await fetch(new URL("tasks", url));

    expect(res.status).toBe(200);
    const ids = ((await res.json()) as { id: string }[]).map((t) => t.id);
    expect(ids).toEqual(["public-task"]);
  });
});

describe("GET /tasks/:id", () => {
  it("returns a public task without a token", async () => {
    const { url } = await startRouter();
    expect((await postTask(url, "public-task")).status).toBe(200);

    const res = await getTask(url, "public-task");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "public-task" });
  });

  it("returns a private task to the holder of its token", async () => {
    const { url } = await startRouter();
    const token = await postPrivateTask(url, "private-task");

    const res = await getTask(url, "private-task", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "private-task" });
  });

  it("hides a private task from requests without its token", async () => {
    const { url } = await startRouter();
    const token = await postPrivateTask(url, "private-task");
    const otherToken = await postPrivateTask(url, "other-task");

    // answered like an unknown task, so that private IDs can't be probed for
    for (const authorization of [
      undefined,
      `Bearer ${otherToken}`,
      `Basic ${token}`,
    ])
      expect((await getTask(url, "private-task", authorization)).status).toBe(
        404,
      );
  });

  it("answers 404 for an unknown task", async () => {
    const { url } = await startRouter();

    expect((await getTask(url, "unknown-task")).status).toBe(404);
  });
});
