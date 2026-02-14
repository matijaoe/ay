import { describe, expect, it } from "vitest";
import type { AyToolConfig } from "../config/schema";
import { TOOL_PRESETS, getAllTools, resolveTool } from "./tools";

describe("resolveTool", () => {
	const userTools: Record<string, AyToolConfig> = {
		myeditor: { command: "myeditor --flag", passArgs: true },
	};

	it("resolves user tool by exact name", () => {
		const result = resolveTool("myeditor", userTools);
		expect(result).toEqual({ key: "myeditor", config: userTools.myeditor });
	});

	it("resolves preset by exact name", () => {
		const result = resolveTool("code", {});
		expect(result?.key).toBe("code");
		expect(result?.config.command).toBe("code");
	});

	it("resolves preset by alias", () => {
		const result = resolveTool("vscode", {});
		expect(result?.key).toBe("code");
	});

	it("resolves claude code alias", () => {
		const result = resolveTool("cc", {});
		expect(result?.key).toBe("claude");
	});

	it("resolves intellij aliases", () => {
		for (const alias of ["webstorm", "phpstorm", "goland", "pycharm"]) {
			const result = resolveTool(alias, {});
			expect(result?.key).toBe("idea");
		}
	});

	it("returns undefined for unknown tool", () => {
		expect(resolveTool("nonexistent", {})).toBeUndefined();
	});

	it("user config takes priority over preset", () => {
		const tools: Record<string, AyToolConfig> = {
			code: { command: "custom-code --special", passArgs: false },
		};
		const result = resolveTool("code", tools);
		expect(result?.config.command).toBe("custom-code --special");
	});

	it("alias lookup is case insensitive", () => {
		const result = resolveTool("VSCode", {});
		expect(result?.key).toBe("code");
	});
});

describe("getAllTools", () => {
	it("returns all presets when no user tools", () => {
		const all = getAllTools({});
		expect(Object.keys(all)).toContain("code");
		expect(Object.keys(all)).toContain("cursor");
		expect(Object.keys(all)).toContain("claude");
	});

	it("user tools override presets", () => {
		const userTools: Record<string, AyToolConfig> = {
			code: { command: "custom-code", passArgs: false },
		};
		const all = getAllTools(userTools);
		expect(all.code.command).toBe("custom-code");
	});

	it("user tools add new entries", () => {
		const userTools: Record<string, AyToolConfig> = {
			mytool: { command: "mytool-bin", passArgs: true },
		};
		const all = getAllTools(userTools);
		expect(all.mytool).toBeDefined();
		expect(all.mytool.command).toBe("mytool-bin");
	});

	it("preserves preset labels", () => {
		const all = getAllTools({});
		expect((all.code as any).label).toBe("VS Code");
	});
});

describe("TOOL_PRESETS", () => {
	it("has cwdOnly set for claude and codex", () => {
		expect(TOOL_PRESETS.claude.cwdOnly).toBe(true);
		expect(TOOL_PRESETS.codex.cwdOnly).toBe(true);
	});

	it("does not have cwdOnly for regular editors", () => {
		expect(TOOL_PRESETS.code.cwdOnly).toBeUndefined();
		expect(TOOL_PRESETS.cursor.cwdOnly).toBeUndefined();
	});

	it("all presets have command and aliases", () => {
		for (const [key, preset] of Object.entries(TOOL_PRESETS)) {
			expect(preset.command, `${key} missing command`).toBeTruthy();
			expect(Array.isArray(preset.aliases), `${key} aliases not array`).toBe(true);
		}
	});
});
