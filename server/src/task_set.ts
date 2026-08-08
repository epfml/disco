import { Map } from "immutable";
import "@tensorflow/tfjs-node";

import type { DataType, Network, Task , Encoded } from "@epfml/discojs";
import { EventEmitter } from "@epfml/discojs";
import type { ModelSet } from "./model_set.js";

type EncodedModel = Encoded;
type TaskAndModel = [Task<DataType, Network>, EncodedModel];

/**
 * The TaskSet essentially handles initializing a Task and
 * loading its associated EncodedModel.
 *
 * TaskSet is an EventEmitter, registering callbacks on new tasks and
 * emitting a 'newTask' event when a new task has been added.
 *
 * Tasks are usually passed to TaskSet when booting the server
 * and objects depending on tasks and models can subscribe to
 * the 'newTask' event to run callbacks whenever a new Task and
 * EncodedModel are initialized.
 */
export class TaskSet extends EventEmitter<{
  newTask: TaskAndModel;
}> {
  // Keep track of previously initialized task-model pairs
  #tasks = Map<Task.ID, TaskAndModel>();
  #modelSet: ModelSet;

  constructor(modelSet: ModelSet) {
    super();
    this.#modelSet = modelSet;
  }

  get tasks(): Map<Task.ID, TaskAndModel> {
    return this.#tasks;
  }

  // send known tasks to new listener
  override on(
    e: "newTask",
    listener: (_: TaskAndModel) => void | Promise<void>,
  ): void {
    super.on(e, listener);
    this.#tasks.forEach(listener);
  }

  /**
   * Method to add a new task.
   * The method emits a 'newTask' event with the resulting Task.
   */
  addTask<D extends DataType>(task: Task<D, Network>, model_id: string): void {
    if (this.#tasks.has(task.id)) {
      // Note: Error message is being matched in task_router.ts
      throw new Error("added task already exists");
    }

    const model = this.#modelSet.models.get(model_id);
    if (model === undefined) {
      // Note: Error message is being matched in task_router.ts
      throw new Error("referenced model unavailable");
    }
    if (model[0].dataType !== task.dataType) {
      // Note: Error message is being matched in task_router.ts
      throw new Error("task and model data types do not match");
    }
    const encodedModel = model[1];

    this.#tasks = this.#tasks.set(task.id, [task, encodedModel]);
    this.emit("newTask", [task, encodedModel]);
  }
}
