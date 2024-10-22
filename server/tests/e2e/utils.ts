import { List } from "immutable";

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
