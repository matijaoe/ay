import { describe, expect, it } from "vitest";
import { parseWorktreeList } from "./git";

describe("parseWorktreeList", () => {
	it("parses a single main worktree", () => {
		const raw = `worktree /home/user/repo
HEAD abc123def456
branch refs/heads/main

`;
		const result = parseWorktreeList(raw);
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			path: "/home/user/repo",
			branch: "main",
			head: "abc123def456",
			isBare: false,
			isMain: true,
		});
	});

	it("parses multiple worktrees", () => {
		const raw = `worktree /home/user/repo
HEAD abc123
branch refs/heads/main

worktree /home/user/worktrees/feature
HEAD def456
branch refs/heads/feat/auth

`;
		const result = parseWorktreeList(raw);
		expect(result).toHaveLength(2);
		expect(result[0].isMain).toBe(true);
		expect(result[0].branch).toBe("main");
		expect(result[1].isMain).toBe(false);
		expect(result[1].branch).toBe("feat/auth");
		expect(result[1].path).toBe("/home/user/worktrees/feature");
	});

	it("handles detached HEAD", () => {
		const raw = `worktree /home/user/repo
HEAD abc123
branch refs/heads/main

worktree /home/user/worktrees/detached
HEAD def456
detached

`;
		const result = parseWorktreeList(raw);
		expect(result).toHaveLength(2);
		expect(result[1].branch).toBe("(detached)");
	});

	it("handles bare repository", () => {
		const raw = `worktree /home/user/repo.git
HEAD abc123
bare

`;
		const result = parseWorktreeList(raw);
		expect(result).toHaveLength(1);
		expect(result[0].isBare).toBe(true);
		expect(result[0].branch).toBe("(unknown)");
	});

	it("handles empty output", () => {
		expect(parseWorktreeList("")).toEqual([]);
	});

	it("handles missing HEAD gracefully", () => {
		const raw = `worktree /home/user/repo
branch refs/heads/main

`;
		const result = parseWorktreeList(raw);
		expect(result).toHaveLength(1);
		expect(result[0].head).toBe("");
	});

	it("strips refs/heads/ from branch name", () => {
		const raw = `worktree /home/user/repo
HEAD abc
branch refs/heads/feature/deep/nested

`;
		const result = parseWorktreeList(raw);
		expect(result[0].branch).toBe("feature/deep/nested");
	});

	it("first worktree is always marked as main", () => {
		const raw = `worktree /home/user/a
HEAD aaa
branch refs/heads/develop

worktree /home/user/b
HEAD bbb
branch refs/heads/main

`;
		const result = parseWorktreeList(raw);
		// First entry is main regardless of branch name
		expect(result[0].isMain).toBe(true);
		expect(result[0].branch).toBe("develop");
		expect(result[1].isMain).toBe(false);
	});
});
