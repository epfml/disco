import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { titanic } from "#root/default_tasks/index";
import { fetchTask, pushTask } from "#task/task_handler";

// a remote server reached without TLS, which must never see a token
const insecureServer = new URL("http://disco.example/");

describe("task handler", () => {
  const fetchSpy = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchSpy.mockReset();
  });

  it("refuses to fetch a private task without TLS", async () => {
    await expect(
      fetchTask(insecureServer, "private-task", "a-token"),
    ).rejects.toThrow("without TLS");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses to push a private task without TLS", async () => {
    const task = await titanic.getTask();

    await expect(
      pushTask(insecureServer, task, titanic.modelCard.card.id, {
        private: true,
      }),
    ).rejects.toThrow("without TLS");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
