import { createPinia, setActivePinia } from "pinia";
import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { defaultTasks, serializeTaskToJSON } from "@epfml/discojs";

import { CONFIG } from "@/config";

import { useTasksStore } from "../tasks";

const TOKEN = "the-task-token";

/** Serve the titanic task publicly, and a private copy of it behind TOKEN */
async function stubServer(): Promise<void> {
  const publicTask = await defaultTasks.titanic.getTask();
  const privateTask = { ...publicTask, id: "private-task" };

  vi.stubGlobal("fetch", (url: string | URL, init?: RequestInit) => {
    switch (url.toString()) {
      case new URL("tasks", CONFIG.serverUrl).href:
        return Response.json([serializeTaskToJSON(publicTask)]);
      case new URL("tasks/private-task", CONFIG.serverUrl).href:
        if (
          new Headers(init?.headers).get("Authorization") !== `Bearer ${TOKEN}`
        )
          return new Response(null, { status: 404 });
        return Response.json(serializeTaskToJSON(privateTask));
    }
    throw new Error(`unhandled fetch: ${url.toString()}`);
  });
}

beforeEach(async () => {
  await stubServer();
  setActivePinia(createPinia());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("addPrivateTask", () => {
  it("adds the private task and its token next to the public ones", async () => {
    const store = useTasksStore();

    await store.addPrivateTask("private-task", TOKEN);

    assert(typeof store.tasks !== "string");
    expect([...store.tasks.keys()].sort()).toEqual(["private-task", "titanic"]);
    expect(store.tokens.get("private-task")).toBe(TOKEN);
  });

  it("adds nothing for a wrong token", async () => {
    const store = useTasksStore();

    await expect(
      store.addPrivateTask("private-task", "another-token"),
    ).rejects.toThrow("HTTP status 404");

    assert(typeof store.tasks !== "string");
    expect(store.tasks.has("private-task")).toBe(false);
    expect(store.tokens.isEmpty()).toBe(true);
  });
});
