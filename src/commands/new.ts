import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: {
		name: "new",
		description: "Create a new worktree",
	},
	args: {
		name: {
			type: "positional",
			description: "Worktree name (auto-generated if omitted)",
			required: false,
		},
		from: {
			type: "string",
			description: "Base branch to create from",
		},
		install: {
			type: "boolean",
			description: "Run install script after creation",
		},
		all: {
			type: "boolean",
			description: "Run all scripts after creation",
		},
		"no-setup": {
			type: "boolean",
			description: "Skip all post-creation scripts",
		},
	},
	run({ args }) {
		consola.info("ay new — not implemented yet", args);
	},
});
