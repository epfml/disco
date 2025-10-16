import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		setupFiles: "./testSetupImportTFJSNode.ts",

		projects: [
			{
				extends: true,
				test: { name: "discojs", include: ["discojs/**/*.spec.ts"] },
			},
			{
				extends: true,
				test: { name: "discojs-node", include: ["discojs-node/**/*.spec.ts"] },
			},
			{
				extends: true,
				test: {
					name: "discojs-web",
					include: ["discojs-web/**/*.spec.ts"],
					environment: "jsdom",
				},
			},
			{
				extends: true,
				test: { name: "server", include: ["server/tests/**/*.spec.ts"] },
			},
		],
	},
});
