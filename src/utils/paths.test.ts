import os from "node:os";
import { describe, expect, it } from "vitest";
import { contractHome, expandHome, resolveWorktreePath } from "./paths";

describe("expandHome", () => {
	const home = os.homedir();

	it("expands ~ to home directory", () => {
		expect(expandHome("~/projects")).toBe(`${home}/projects`);
	});

	it("expands bare ~", () => {
		expect(expandHome("~")).toBe(home);
	});

	it("leaves absolute paths unchanged", () => {
		expect(expandHome("/tmp/foo")).toBe("/tmp/foo");
	});

	it("leaves relative paths unchanged", () => {
		expect(expandHome("./foo")).toBe("./foo");
	});

	it("does not expand ~ in the middle of a path", () => {
		expect(expandHome("/tmp/~/foo")).toBe("/tmp/~/foo");
	});
});

describe("contractHome", () => {
	const home = os.homedir();

	it("contracts home directory to ~", () => {
		expect(contractHome(`${home}/projects`)).toBe("~/projects");
	});

	it("contracts exact home to ~", () => {
		expect(contractHome(home)).toBe("~");
	});

	it("leaves non-home paths unchanged", () => {
		expect(contractHome("/tmp/foo")).toBe("/tmp/foo");
	});
});

describe("resolveWorktreePath", () => {
	it("replaces {repo} and {name} placeholders", () => {
		const result = resolveWorktreePath("/worktrees/{repo}/{name}", "my-app", "feature-x");
		expect(result).toBe("/worktrees/my-app/feature-x");
	});

	it("expands ~ in template", () => {
		const home = os.homedir();
		const result = resolveWorktreePath("~/wt/{repo}/{name}", "my-app", "feat");
		expect(result).toBe(`${home}/wt/my-app/feat`);
	});

	it("handles template without placeholders", () => {
		const result = resolveWorktreePath("/static/path", "repo", "name");
		expect(result).toBe("/static/path");
	});

	it("handles multiple occurrences of same placeholder", () => {
		const result = resolveWorktreePath("/{repo}/{repo}", "app", "name");
		// Only first is replaced (String.replace behavior)
		expect(result).toBe("/app/{repo}");
	});
});
