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

    const res = await postTask(url, "private-task", { private: true });
    const { token } = (await res.json()) as { token: string };

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
      ["first-task", "second-task"].map(async (id) => {
        const res = await postTask(url, id, { private: true });
        return ((await res.json()) as { token: string }).token;
      }),
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
