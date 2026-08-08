import createDebug from "debug";
import type { Map } from "immutable";
import { Set } from "immutable";
import { defineStore } from "pinia";
import { shallowRef } from "vue";

import type { DataType, Network, Task } from "@epfml/discojs";
import { fetchTasks } from "@epfml/discojs";

import { useToaster } from "@/composables/toaster";
import { CONFIG } from "@/config";

const debug = createDebug("webapp:store");

const TASKS_TO_FILTER_OUT = Set.of("simple_face", "cifar10");

export const useTasksStore = defineStore("tasks", () => {
  // 3-state variable used to test whether the tasks have been retrieved successfully,
  // if the retrieving failed, or if they are currently being loaded
  const tasks = shallowRef<
    "loading" | "failed" | Map<Task.ID, Task<DataType, Network>>
  >("loading");

  fetchTasks(CONFIG.serverUrl)
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

  return { tasks };
});
