import { describe, expect, it } from "vitest";
import { isInsideWorktree } from "./worktree";

describe("isInsideWorktree", () => {
	it("returns true for exact match", () => {
		expect(isInsideWorktree("/home/user/wt1", "/home/user/wt1")).toBe(true);
	});

	it("returns true for subdirectory", () => {
		expect(isInsideWorktree("/home/user/wt1/src/index.ts", "/home/user/wt1")).toBe(true);
	});

	it("returns false for sibling with shared prefix", () => {
		expect(isInsideWorktree("/home/user/wt1-other", "/home/user/wt1")).toBe(false);
	});

	it("returns false for parent directory", () => {
		expect(isInsideWorktree("/home/user", "/home/user/wt1")).toBe(false);
	});

	it("returns false for unrelated path", () => {
		expect(isInsideWorktree("/tmp/something", "/home/user/wt1")).toBe(false);
	});

	it("returns true for direct child", () => {
		expect(isInsideWorktree("/home/user/wt1/file", "/home/user/wt1")).toBe(true);
	});

	it("handles root path exact match", () => {
		expect(isInsideWorktree("/", "/")).toBe(true);
	});
});
