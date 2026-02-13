import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: {
		name: "open",
		description: "Open a worktree in an editor or tool",
	},
	args: {
		name: {
			type: "positional",
			description: "Worktree name to open",
			required: false,
		},
	},
	run({ args }) {
		consola.info("ay open — not implemented yet", args);
	},
});
