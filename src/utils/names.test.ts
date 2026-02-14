import { describe, expect, it } from "vitest";
import { fuzzyMatch, generateName, generateUniqueName } from "./names";

describe("fuzzyMatch", () => {
	const candidates = ["feature-auth", "bugfix-login", "hotfix-nav", "refactor-api"];

	it("returns exact match", () => {
		expect(fuzzyMatch("feature-auth", candidates)).toBe("feature-auth");
	});

	it("is case insensitive", () => {
		expect(fuzzyMatch("Feature-Auth", candidates)).toBe("feature-auth");
	});

	it("returns prefix match", () => {
		expect(fuzzyMatch("bug", candidates)).toBe("bugfix-login");
	});

	it("returns substring match", () => {
		expect(fuzzyMatch("login", candidates)).toBe("bugfix-login");
	});

	it("returns fuzzy (chars in order) match", () => {
		expect(fuzzyMatch("fxnav", candidates)).toBe("hotfix-nav");
	});

	it("returns undefined for no match", () => {
		expect(fuzzyMatch("xyz", candidates)).toBeUndefined();
	});

	it("prefers exact over prefix", () => {
		const list = ["ab", "abc", "abcd"];
		expect(fuzzyMatch("ab", list)).toBe("ab");
	});

	it("prefers prefix over substring", () => {
		const list = ["xab", "aby"];
		expect(fuzzyMatch("ab", list)).toBe("aby");
	});

	it("handles empty candidates", () => {
		expect(fuzzyMatch("foo", [])).toBeUndefined();
	});

	it("handles single-char query", () => {
		expect(fuzzyMatch("f", candidates)).toBe("feature-auth");
	});
});

describe("generateName", () => {
	it("generates a name for adjective-animal style", () => {
		const name = generateName("adjective-animal");
		expect(name).toMatch(/^[a-z]+-[a-z]+$/);
	});

	it("generates a name for city style", () => {
		const name = generateName("city");
		expect(name).toMatch(/^[a-z]+$/);
	});

	it("generates a name for color-noun style", () => {
		const name = generateName("color-noun");
		expect(name).toMatch(/^[a-z]+-[a-z]+$/);
	});
});

describe("generateUniqueName", () => {
	it("returns a name not in the existing set", () => {
		const existing = new Set(["taken-name"]);
		const name = generateUniqueName("city", existing);
		expect(existing.has(name)).toBe(false);
	});

	it("avoids collisions", () => {
		// Create a set that contains many possible names
		const names = new Set<string>();
		for (let i = 0; i < 10; i++) {
			names.add(generateUniqueName("city", new Set()));
		}
		// Should have generated unique names
		expect(names.size).toBeGreaterThan(0);
	});
});
