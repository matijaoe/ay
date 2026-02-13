import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: {
		name: "clean",
		description: "Remove merged worktrees",
	},
	args: {
		merged: {
			type: "boolean",
			description: "Only remove merged worktrees",
		},
		force: {
			type: "boolean",
			description: "Skip confirmation",
		},
		"dry-run": {
			type: "boolean",
			description: "Show what would be deleted without doing it",
		},
	},
	run({ args }) {
		consola.info("ay clean — not implemented yet", args);
	},
});
