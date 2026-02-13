import type { AyConfig } from "./schema";

/**
 * Default configuration used when no user config is found.
 * Matches the Zod schema defaults — kept in sync as a plain object
 * so c12 can use it as the base layer before schema validation.
 */
export const defaultConfig: AyConfig = {
	worktreePath: "~/worktrees/{repo}/{name}",
	defaults: {
		baseBranch: "main",
		autoName: true,
		nameStyle: "adjective-animal",
		branchPrefix: "",
		nodeModules: "install",
	},
	environment: {
		copy: [".env*"],
		symlink: [],
		ignore: ["node_modules/.cache"],
	},
	scripts: {
		setup: "",
		install: "",
		dev: "",
	},
	runOnNew: ["setup"],
	tools: {},
	provider: {
		type: "github",
		remote: "origin",
	},
};
