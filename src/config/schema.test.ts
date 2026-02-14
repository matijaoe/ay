import { describe, expect, it } from "vitest";
import {
	configSchema,
	defaultsSchema,
	environmentSchema,
	nameStyleSchema,
	nodeModulesStrategySchema,
	providerSchema,
	toolConfigSchema,
} from "./schema";

describe("nameStyleSchema", () => {
	it("accepts valid styles", () => {
		expect(nameStyleSchema.parse("adjective-animal")).toBe("adjective-animal");
		expect(nameStyleSchema.parse("city")).toBe("city");
		expect(nameStyleSchema.parse("color-noun")).toBe("color-noun");
	});

	it("rejects invalid style", () => {
		expect(() => nameStyleSchema.parse("random")).toThrow();
	});
});

describe("nodeModulesStrategySchema", () => {
	it("accepts valid strategies", () => {
		for (const s of ["copy", "symlink", "install", "skip"]) {
			expect(nodeModulesStrategySchema.parse(s)).toBe(s);
		}
	});

	it("rejects invalid strategy", () => {
		expect(() => nodeModulesStrategySchema.parse("move")).toThrow();
	});
});

describe("defaultsSchema", () => {
	it("fills in all defaults from empty object", () => {
		const result = defaultsSchema.parse({});
		expect(result).toEqual({
			baseBranch: "main",
			autoName: true,
			nameStyle: "adjective-animal",
			branchPrefix: "",
			nodeModules: "install",
		});
	});

	it("preserves provided values", () => {
		const result = defaultsSchema.parse({
			baseBranch: "develop",
			autoName: false,
			branchPrefix: "feat/",
		});
		expect(result.baseBranch).toBe("develop");
		expect(result.autoName).toBe(false);
		expect(result.branchPrefix).toBe("feat/");
		// defaults still filled
		expect(result.nameStyle).toBe("adjective-animal");
		expect(result.nodeModules).toBe("install");
	});
});

describe("environmentSchema", () => {
	it("fills in defaults", () => {
		const result = environmentSchema.parse({});
		expect(result).toEqual({
			copy: [".env*"],
			symlink: [],
			ignore: ["node_modules/.cache"],
		});
	});

	it("accepts custom patterns", () => {
		const result = environmentSchema.parse({
			copy: [".env", ".env.local"],
			symlink: [".prisma"],
		});
		expect(result.copy).toEqual([".env", ".env.local"]);
		expect(result.symlink).toEqual([".prisma"]);
	});
});

describe("toolConfigSchema", () => {
	it("requires command", () => {
		expect(() => toolConfigSchema.parse({})).toThrow();
	});

	it("accepts minimal config", () => {
		const result = toolConfigSchema.parse({ command: "code" });
		expect(result.command).toBe("code");
		expect(result.passArgs).toBe(false);
	});

	it("accepts full config", () => {
		const result = toolConfigSchema.parse({
			command: "code -r .",
			shortFlag: "c",
			passArgs: true,
			cwdOnly: true,
		});
		expect(result).toEqual({
			command: "code -r .",
			shortFlag: "c",
			passArgs: true,
			cwdOnly: true,
		});
	});
});

describe("providerSchema", () => {
	it("defaults to github/origin", () => {
		const result = providerSchema.parse({});
		expect(result).toEqual({ type: "github", remote: "origin" });
	});

	it("accepts gitlab", () => {
		const result = providerSchema.parse({ type: "gitlab" });
		expect(result.type).toBe("gitlab");
	});

	it("rejects unknown provider", () => {
		expect(() => providerSchema.parse({ type: "bitbucket" })).toThrow();
	});
});

describe("configSchema", () => {
	it("parses empty object with all defaults", () => {
		const result = configSchema.parse({});
		expect(result.worktreePath).toBe("~/worktrees/{repo}/{name}");
		expect(result.defaults.baseBranch).toBe("main");
		expect(result.environment.copy).toEqual([".env*"]);
		expect(result.scripts.setup).toBe("");
		expect(result.runOnNew).toEqual(["setup"]);
		expect(result.tools).toEqual({});
		expect(result.provider.type).toBe("github");
	});

	it("ignores $schema field", () => {
		const result = configSchema.parse({ $schema: "https://example.com/schema.json" });
		expect(result.$schema).toBe("https://example.com/schema.json");
	});

	it("parses a realistic config", () => {
		const result = configSchema.parse({
			worktreePath: "~/dev/{repo}/{name}",
			defaults: {
				baseBranch: "develop",
				branchPrefix: "feat/",
				nodeModules: "symlink",
			},
			scripts: {
				install: "pnpm install",
			},
			tools: {
				cursor: { command: "cursor", passArgs: true },
			},
		});
		expect(result.worktreePath).toBe("~/dev/{repo}/{name}");
		expect(result.defaults.baseBranch).toBe("develop");
		expect(result.defaults.branchPrefix).toBe("feat/");
		expect(result.defaults.nodeModules).toBe("symlink");
		expect(result.scripts.install).toBe("pnpm install");
		expect(result.tools.cursor.command).toBe("cursor");
	});
});
