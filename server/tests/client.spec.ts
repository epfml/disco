import type * as http from "node:http";

import type { DataType, Network, TaskProvider } from "@epfml/discojs";
import {
	aggregator as aggregators,
	client as clients,
	defaultTasks,
} from "@epfml/discojs";

import { Server } from "../src/index.js";

describe("decentralized client", () => {
	let handle: http.Server;
	async function startServer(
		...tasks: TaskProvider<DataType, Network>[]
	): Promise<URL> {
		const server = await Server.with(...tasks);

		let url: URL;
		[handle, url] = await server.serve();
		return url;
	}
	afterEach(
		() =>
			new Promise<void>((resolve, reject) =>
				handle?.close((e) => {
					if (e !== undefined) reject(e);
					else resolve();
				}),
			),
	);

	it("connects to valid task", async () => {
		const url = await startServer(defaultTasks.cifar10);

		const client = new clients.decentralized.DecentralizedClient(
			url,
			await defaultTasks.cifar10.getTask(),
			new aggregators.MeanAggregator(),
		);

		await client.connect();
		await client.disconnect();
	});

	it("fails to connect to invalid task", async () => {
		const url = await startServer(); // no task

		const client = new clients.decentralized.DecentralizedClient(
			url,
			await defaultTasks.cifar10.getTask(),
			new aggregators.MeanAggregator(),
		);

		try {
			await client.connect();
		} catch {
			return; // fail as expected
		}

		throw new Error("connect didn't fail");
	});
});

describe("federated client", () => {
	let handle: http.Server;
	async function startServer(
		...tasks: TaskProvider<DataType, Network>[]
	): Promise<URL> {
		const server = await Server.with(...tasks);

		let url: URL;
		[handle, url] = await server.serve();
		return url;
	}
	afterEach(
		() =>
			new Promise<void>((resolve, reject) =>
				handle?.close((e) => {
					if (e !== undefined) reject(e);
					else resolve();
				}),
			),
	);

	it("connects to valid task", async () => {
		const url = await startServer(defaultTasks.titanic);

		const client = new clients.federated.FederatedClient(
			url,
			await defaultTasks.titanic.getTask(),
			new aggregators.MeanAggregator(),
		);

		await client.connect();
		await client.disconnect();
	});

	it("fails to connect to invalid task", async () => {
		const url = await startServer(); // no task

		const client = new clients.federated.FederatedClient(
			url,
			await defaultTasks.titanic.getTask(),
			new aggregators.MeanAggregator(),
		);

		try {
			await client.connect();
		} catch {
			return; // fail as expected
		}

		throw new Error("connect didn't fail");
	});
});
