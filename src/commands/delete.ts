import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: {
		name: "delete",
		description: "Remove a worktree and its branch",
	},
	args: {
		name: {
			type: "positional",
			description: "Worktree name to delete",
			required: false,
		},
		force: {
			type: "boolean",
			description: "Skip confirmation prompt",
		},
		"keep-branch": {
			type: "boolean",
			description: "Don't delete the git branch",
		},
	},
	run({ args }) {
		consola.info("ay delete — not implemented yet", args);
	},
});
