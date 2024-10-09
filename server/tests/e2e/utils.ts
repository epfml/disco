import { List } from 'immutable';

export class Queue<T> {
  #content = List<T>();

  put(e: T) {
    this.#content = this.#content.push(e);
  }

  async next(): Promise<T> {
    for (;;) {
      const ret = this.#content.first();
      if (ret !== undefined) {
	this.#content = this.#content.shift()
	return ret
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}