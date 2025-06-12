import * as fs from "node:fs/promises";
import path from "node:path";
import { withFile } from "tmp-promise";
import { describe, expect, it } from "vitest";
import {
	loadCSV,
	loadImage,
	loadImagesInDir,
	loadText,
} from "./loaders/index.js";

const DATASETS_DIR = path.join(__dirname, "..", "..", "datasets");

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const ret: T[] = [];
	for await (const e of iter) ret.push(e);
	return ret;
}

describe("csv parser", () => {
	it("parses basic file", async () => {
		await withFile(async ({ path }) => {
			await fs.writeFile(path, ["a,b,c", "1,2,3", "4,5,6"].join("\n"));

			const dataset = loadCSV(path);

			expect(await arrayFromAsync(dataset)).to.have.deep.ordered.members([
				{ a: "1", b: "2", c: "3" },
				{ a: "4", b: "5", c: "6" },
			]);
		});
	});
});

describe("image parser", () => {
	it("parses mnist example", async () => {
		const parsed = await loadImage(
			path.join(DATASETS_DIR, "9-mnist-example.png"),
		);

		expect(parsed).to.have.property("width").that.equals(172);
		expect(parsed).to.have.property("height").that.equals(178);
	});
});

describe("image directory parser", () => {
	it("parses all cifar10 files", async () => {
		const parsed = await loadImagesInDir(path.join(DATASETS_DIR, "CIFAR10"));

		expect(await parsed.size()).to.equal(24);
	});
});

describe("text parser", () => {
	it("parses basic file", async () => {
		const text = ["a", "b", "c"].join("\n");
		await withFile(async ({ path }) => {
			await fs.writeFile(path, text);

			const sequences = await arrayFromAsync(loadText(path));
			expect(sequences.length).to.equal(1);
			expect(sequences[0]).to.equal(text);
		});
	});
});
