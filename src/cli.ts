import { defineCommand, runMain } from "citty";
import { version } from "../package.json";

const main = defineCommand({
	meta: {
		name: "ay",
		version,
		description: "Git worktree manager — create, switch, and manage worktrees with ease",
	},
	subCommands: {
		new: () => import("./commands/new").then((m) => m.default),
		n: () => import("./commands/new").then((m) => m.default),
		list: () => import("./commands/list").then((m) => m.default),
		ls: () => import("./commands/list").then((m) => m.default),
		delete: () => import("./commands/delete").then((m) => m.default),
		rm: () => import("./commands/delete").then((m) => m.default),
		open: () => import("./commands/open").then((m) => m.default),
		cd: () => import("./commands/cd").then((m) => m.default),
		init: () => import("./commands/init").then((m) => m.default),
		config: () => import("./commands/config").then((m) => m.default),
		setup: () => import("./commands/setup").then((m) => m.default),
		clean: () => import("./commands/clean").then((m) => m.default),
		status: () => import("./commands/status").then((m) => m.default),
		shell: () => import("./commands/shell").then((m) => m.default),
	},
	async run({ rawArgs }) {
		// citty always runs parent `run` — skip if a subcommand was matched
		const subCommandNames = [
			"new",
			"n",
			"list",
			"ls",
			"delete",
			"rm",
			"open",
			"cd",
			"init",
			"config",
			"setup",
			"clean",
			"status",
			"shell",
		];
		const firstArg = rawArgs.find((a) => !a.startsWith("-"));
		if (firstArg && subCommandNames.includes(firstArg)) return;

		const { interactiveMode } = await import("./interactive/picker");
		await interactiveMode();
	},
});

export { main };

runMain(main);
