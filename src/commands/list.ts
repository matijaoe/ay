import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: {
		name: "list",
		description: "List all worktrees with status",
	},
	args: {
		json: {
			type: "boolean",
			description: "Output as JSON",
		},
		paths: {
			type: "boolean",
			description: "Output only paths (for scripting)",
		},
	},
	run({ args }) {
		consola.info("ay list — not implemented yet", args);
	},
});
