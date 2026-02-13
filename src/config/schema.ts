import { z } from "zod";

// --- Sub-schemas ---

export const nameStyleSchema = z.enum(["adjective-animal", "city", "color-noun"]);

export const nodeModulesStrategySchema = z.enum(["copy", "symlink", "install", "skip"]);

export const providerTypeSchema = z.enum(["github", "gitlab"]);

export const defaultsSchema = z.object({
	baseBranch: z.string().default("main"),
	autoName: z.boolean().default(true),
	nameStyle: nameStyleSchema.default("adjective-animal"),
	branchPrefix: z.string().default(""),
	nodeModules: nodeModulesStrategySchema.default("install"),
});

export const environmentSchema = z.object({
	copy: z.array(z.string()).default([".env*"]),
	symlink: z.array(z.string()).default([]),
	ignore: z.array(z.string()).default(["node_modules/.cache"]),
});

export const scriptsSchema = z.object({
	setup: z.string().default(""),
	install: z.string().default(""),
	dev: z.string().default(""),
});

export const toolConfigSchema = z.object({
	command: z.string(),
	shortFlag: z.string().optional(),
	passArgs: z.boolean().default(false),
	cwdOnly: z.boolean().optional(),
});

export const providerSchema = z.object({
	type: providerTypeSchema.default("github"),
	remote: z.string().default("origin"),
});

// --- Main config schema ---

export const configSchema = z.object({
	$schema: z.string().optional(),
	worktreePath: z.string().default("~/worktrees/{repo}/{name}"),
	defaults: defaultsSchema.default({
		baseBranch: "main",
		autoName: true,
		nameStyle: "adjective-animal",
		branchPrefix: "",
		nodeModules: "install",
	}),
	environment: environmentSchema.default({
		copy: [".env*"],
		symlink: [],
		ignore: ["node_modules/.cache"],
	}),
	scripts: scriptsSchema.default({
		setup: "",
		install: "",
		dev: "",
	}),
	runOnNew: z.array(z.string()).default(["setup"]),
	tools: z.record(z.string(), toolConfigSchema).default({}),
	provider: providerSchema.default({
		type: "github",
		remote: "origin",
	}),
});

// --- Types inferred from Zod ---

export type AyConfig = z.infer<typeof configSchema>;
export type AyDefaults = z.infer<typeof defaultsSchema>;
export type AyEnvironment = z.infer<typeof environmentSchema>;
export type AyScripts = z.infer<typeof scriptsSchema>;
export type AyToolConfig = z.infer<typeof toolConfigSchema>;
export type AyProvider = z.infer<typeof providerSchema>;
export type NameStyle = z.infer<typeof nameStyleSchema>;
export type NodeModulesStrategy = z.infer<typeof nodeModulesStrategySchema>;
