import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: {
		name: "status",
		description: "Show detailed worktree status",
	},
	args: {
		watch: {
			type: "boolean",
			alias: "w",
			description: "Live-refresh mode",
		},
		interval: {
			type: "string",
			alias: "i",
			description: "Refresh interval in seconds (default: 2)",
		},
	},
	run({ args }) {
		consola.info("ay status — not implemented yet", args);
	},
});
