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

/** POST the titanic task, with extra body fields */
async function postTask(
  url: URL,
  extra: Record<string, unknown> = {},
): Promise<Response> {
  return await fetch(new URL("tasks", url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: serializeTaskToJSON(await defaultTasks.titanic.getTask()),
      model: defaultModels.TitanicClassifier.card.id,
      ...extra,
    }),
  });
}

/** POST a public task, returning the ID the server gave it */
async function postPublicTask(url: URL): Promise<string> {
  const res = await postTask(url);
  assert(res.ok);
  return ((await res.json()) as { id: string }).id;
}

/** POST a private task, returning the ID the server gave it and its token */
async function postPrivateTask(
  url: URL,
): Promise<{ id: string; token: string }> {
  const res = await postTask(url, { private: true });
  assert(res.ok);
  return (await res.json()) as { id: string; token: string };
}

/** GET the given path, with the given Authorization header if any */
async function get(
  url: URL,
  path: string,
  authorization?: string,
): Promise<Response> {
  return await fetch(new URL(path, url), {
    headers:
      authorization === undefined ? {} : { Authorization: authorization },
  });
}

/**
 * Authorization headers that don't grant access to a private task: none,
 * another task's token, and its own token under the wrong scheme
 */
function wrongAuthorizations(
  token: string,
  otherToken: string,
): (string | undefined)[] {
  return [undefined, `Bearer ${otherToken}`, `Basic ${token}`];
}

describe("POST /tasks", () => {
  it("keeps tasks public unless asked otherwise", async () => {
    const { taskSet, url } = await startRouter();

    const res = await postTask(url);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(["id"]); // no token
    expect(taskSet.policies.get(body.id as string)).toEqual({
      visibility: "public",
    });
  });

  it("returns a 256-bit token for a private task", async () => {
    const { url } = await startRouter();

    const res = await postTask(url, { private: true });

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { token } = (await res.json()) as { token: string };
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
  });

  it("stores only the token's hash", async () => {
    const { taskSet, url } = await startRouter();

    const { id, token } = await postPrivateTask(url);

    const policy = taskSet.policies.get(id);
    expect(policy).toEqual({
      visibility: "private",
      tokenHash: hashToken(token),
    });
    expect(JSON.stringify(policy)).not.toContain(token);
  });

  it("returns a different ID and token for each private task", async () => {
    const { url } = await startRouter();

    const [first, second] = await Promise.all([
      postPrivateTask(url),
      postPrivateTask(url),
    ]);

    expect(first.id).not.toEqual(second.id);
    expect(first.token).not.toEqual(second.token);
  });

  it("answers 400 when private isn't a boolean", async () => {
    const { taskSet, url } = await startRouter();

    const res = await postTask(url, { private: "yes" });

    expect(res.status).toBe(400);
    expect(taskSet.tasks.size).toBe(0);
  });
});

describe("GET /tasks", () => {
  it("lists public tasks but not private ones", async () => {
    const { url } = await startRouter();
    const publicID = await postPublicTask(url);
    await postPrivateTask(url);

    const res = await fetch(new URL("tasks", url));

    expect(res.status).toBe(200);
    const ids = ((await res.json()) as { id: string }[]).map((t) => t.id);
    expect(ids).toEqual([publicID]);
  });
});

describe("GET /tasks/:id", () => {
  it("returns a public task without a token", async () => {
    const { url } = await startRouter();
    const id = await postPublicTask(url);

    const res = await get(url, `tasks/${id}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id });
  });

  it("returns a private task to the holder of its token", async () => {
    const { url } = await startRouter();
    const { id, token } = await postPrivateTask(url);

    const res = await get(url, `tasks/${id}`, `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id });
  });

  it("hides a private task from requests without its token", async () => {
    const { url } = await startRouter();
    const { id, token } = await postPrivateTask(url);
    const other = await postPrivateTask(url);

    // answered like an unknown task, so that private IDs can't be probed for
    for (const authorization of wrongAuthorizations(token, other.token))
      expect((await get(url, `tasks/${id}`, authorization)).status).toBe(404);
  });

  it("answers 404 for an unknown task", async () => {
    const { url } = await startRouter();

    expect((await get(url, "tasks/unknown-task")).status).toBe(404);
  });
});

describe("GET /tasks/:id/:file", () => {
  const files = ["model.json", "weights.bin"];

  it("serves a public task's model without a token", async () => {
    const { url } = await startRouter();
    const id = await postPublicTask(url);

    for (const file of files) {
      const res = await get(url, `tasks/${id}/${file}`);

      expect(res.status).toBe(200);
      // the dummy bytes of titanicModelSet
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(
        Uint8Array.of(1, 2, 3),
      );
    }
  });

  it("serves a private task's model to the holder of its token", async () => {
    const { url } = await startRouter();
    const { id, token } = await postPrivateTask(url);

    for (const file of files) {
      const res = await get(url, `tasks/${id}/${file}`, `Bearer ${token}`);

      expect(res.status).toBe(200);
    }
  });

  it("hides a private task's model from requests without its token", async () => {
    const { url } = await startRouter();
    const { id, token } = await postPrivateTask(url);
    const other = await postPrivateTask(url);

    for (const file of files)
      for (const authorization of wrongAuthorizations(token, other.token))
        expect(
          (await get(url, `tasks/${id}/${file}`, authorization)).status,
        ).toBe(404);
  });
});
