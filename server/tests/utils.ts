import { List, Repeat } from "immutable";
import path from "node:path";

import { defaultTasks } from "@epfml/discojs";
import { loadImagesInDir } from "@epfml/discojs-node";

import { Server } from "../src/index.js";

export const DATASET_DIR = path.join("..", "datasets");

export class Queue<T> {
  #content = List<[index: number, T]>();
  // keep track of what was added and asked for
  #index = { head: 0, tail: 0 };

  put(e: T) {
    this.#content = this.#content.push([this.#index.tail, e]);
    this.#index.tail++;
  }

  async next(): Promise<T> {
    const index = this.#index.head;
    this.#index.head++;

    for (;;) {
      const ret = this.#content.first();
      if (ret !== undefined && ret[0] > index)
        throw new Error("assertion failed: head's index bigger than ours");

      // check that it is intended for us
      if (ret?.[0] === index) {
        this.#content = this.#content.shift();
        return ret[1];
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

export async function setupLusCOVID(scheme: "federated" | "decentralized") {
  const [server, url] = await new Server().serve(
    undefined,
    defaultTasks.lusCovid,
  );

  const lusCovidTask = defaultTasks.lusCovid.getTask();
  lusCovidTask.trainingInformation = {
    ...lusCovidTask.trainingInformation,
    scheme,
    epochs: 10,
    roundDuration: 2,
    minNbOfParticipants: 2,
  }

  const [positive, negative] = [
    (
      await loadImagesInDir(path.join(DATASET_DIR, "lus_covid", "COVID+"))
    ).zip(Repeat("COVID-Positive")),
    (
      await loadImagesInDir(path.join(DATASET_DIR, "lus_covid", "COVID-"))
    ).zip(Repeat("COVID-Negative")),
  ];
  const dataset = positive.chain(negative);
  return { server, url, lusCovidTask, dataset };
}
