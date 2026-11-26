import createDebug from "debug";
import { Map, Set } from "immutable";
import { defineStore } from "pinia";
import { shallowRef } from "vue";

import type { DataType, Network, Task } from "@epfml/discojs";
import { fetchTask, fetchTasks } from "@epfml/discojs";

import { useToaster } from "@/composables/toaster";
import { CONFIG } from "@/config";

const debug = createDebug("webapp:store");

const TASKS_TO_FILTER_OUT = Set.of("cifar10");

export const useTasksStore = defineStore("tasks", () => {
  // 3-state variable used to test whether the tasks have been retrieved successfully,
  // if the retrieving failed, or if they are currently being loaded
  // Use shallowRef instead of ref because ref deeply wraps the object and loses access
  // to its private methods
  const tasks = shallowRef<
    "loading" | "failed" | Map<Task.ID, Task<DataType, Network>>
  >("loading");

  /**
   * Tokens of the private tasks opened or created here.
   * Kept in memory only, so that they don't outlive the page.
   */
  const tokens = shallowRef(Map<Task.ID, string>());

  const publicTasksFetched = fetchTasks(CONFIG.serverUrl)
    .then((fetched) => {
      tasks.value = fetched.filter((t) => !TASKS_TO_FILTER_OUT.contains(t.id));
    })
    .catch((e) => {
      debug("while fetching tasks: %o", e);

      //Only display UI message once
      if (tasks.value === "loading") {
        const toaster = useToaster();
        toaster.error("The server is unreachable. Please try again later.");
        tasks.value = "failed";
      }
    });

  /**
   * Add a private task and its token, fetching the task with it.
   * The public tasks are fetched first, so that they don't replace it.
   *
   * @throws if the server doesn't give the task, such as for a wrong token
   */
  async function addPrivateTask(id: Task.ID, token: string): Promise<void> {
    await publicTasksFetched;
    if (typeof tasks.value === "string") return; // server unreachable

    const task = await fetchTask(CONFIG.serverUrl, id, token);
    tokens.value = tokens.value.set(id, token);
    tasks.value = tasks.value.set(id, task);
  }

  return { tasks, tokens, addPrivateTask };
});
