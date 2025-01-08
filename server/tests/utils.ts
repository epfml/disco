import path from "node:path";
import { List, Repeat } from "immutable";

import { loadCSV, loadImagesInDir, loadText } from "@epfml/discojs-node";

const DATASET_DIR = path.join("..", "datasets");
export const datasets = {
	async loadCifar10() {
		// TODO single label means model can't be wrong
		return (await loadImagesInDir(path.join(DATASET_DIR, "CIFAR10"))).zip(
			Repeat("cat"),
		);
	},
	async loadLusCOVID() {
		const [positive, negative] = [
			(
				await loadImagesInDir(path.join(DATASET_DIR, "lus_covid", "COVID+"))
			).zip(Repeat("COVID-Positive")),
			(
				await loadImagesInDir(path.join(DATASET_DIR, "lus_covid", "COVID-"))
			).zip(Repeat("COVID-Negative")),
		];
		return positive.chain(negative);
	},
	loadTitanic: () => loadCSV(path.join(DATASET_DIR, "titanic_train.csv")),
	loadWikitext: () =>
		loadText(path.join(DATASET_DIR, "wikitext", "wiki.train.tokens")).chain(
			loadText(path.join(DATASET_DIR, "wikitext", "wiki.valid.tokens")),
		),
};

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
