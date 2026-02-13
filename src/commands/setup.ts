import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: {
		name: "setup",
		description: "Run setup/install scripts on an existing worktree",
	},
	args: {
		name: {
			type: "positional",
			description: "Worktree name",
			required: false,
		},
		install: {
			type: "boolean",
			description: "Run install script",
		},
		all: {
			type: "boolean",
			description: "Run all scripts",
		},
	},
	run({ args }) {
		consola.info("ay setup — not implemented yet", args);
	},
});
