import { describe, expect, it } from "vitest";
import type { StatusCounts } from "./format";
import {
	formatStatus,
	formatStatusPlain,
	padEnd,
	padEndVisible,
	relativeTime,
	stripAnsi,
	truncate,
} from "./format";

describe("relativeTime", () => {
	it("returns 'just now' for < 60 seconds ago", () => {
		const date = new Date(Date.now() - 30_000);
		expect(relativeTime(date)).toBe("just now");
	});

	it("returns minutes ago", () => {
		const date = new Date(Date.now() - 5 * 60_000);
		expect(relativeTime(date)).toBe("5m ago");
	});

	it("returns hours ago", () => {
		const date = new Date(Date.now() - 3 * 3600_000);
		expect(relativeTime(date)).toBe("3h ago");
	});

	it("returns days ago", () => {
		const date = new Date(Date.now() - 2 * 86400_000);
		expect(relativeTime(date)).toBe("2d ago");
	});

	it("returns weeks ago", () => {
		const date = new Date(Date.now() - 14 * 86400_000);
		expect(relativeTime(date)).toBe("2w ago");
	});

	it("boundary: exactly 60 seconds returns 1m ago", () => {
		const date = new Date(Date.now() - 60_000);
		expect(relativeTime(date)).toBe("1m ago");
	});

	it("boundary: exactly 60 minutes returns 1h ago", () => {
		const date = new Date(Date.now() - 60 * 60_000);
		expect(relativeTime(date)).toBe("1h ago");
	});

	it("boundary: exactly 24 hours returns 1d ago", () => {
		const date = new Date(Date.now() - 24 * 3600_000);
		expect(relativeTime(date)).toBe("1d ago");
	});

	it("boundary: exactly 7 days returns 1w ago", () => {
		const date = new Date(Date.now() - 7 * 86400_000);
		expect(relativeTime(date)).toBe("1w ago");
	});
});

describe("padEnd", () => {
	it("pads shorter strings", () => {
		expect(padEnd("hi", 5)).toBe("hi   ");
	});

	it("returns string unchanged if already long enough", () => {
		expect(padEnd("hello", 3)).toBe("hello");
	});

	it("returns string unchanged at exact length", () => {
		expect(padEnd("abc", 3)).toBe("abc");
	});

	it("handles empty string", () => {
		expect(padEnd("", 3)).toBe("   ");
	});
});

describe("truncate", () => {
	it("truncates long strings with ellipsis", () => {
		expect(truncate("hello world", 8)).toBe("hello w…");
	});

	it("returns short strings unchanged", () => {
		expect(truncate("hello", 10)).toBe("hello");
	});

	it("returns exact-length strings unchanged", () => {
		expect(truncate("abc", 3)).toBe("abc");
	});

	it("handles length of 1", () => {
		expect(truncate("hello", 1)).toBe("…");
	});
});

describe("stripAnsi", () => {
	it("strips color codes", () => {
		expect(stripAnsi("\x1b[32mgreen\x1b[0m")).toBe("green");
	});

	it("strips multiple codes", () => {
		expect(stripAnsi("\x1b[1m\x1b[33mbold yellow\x1b[0m")).toBe("bold yellow");
	});

	it("returns plain string unchanged", () => {
		expect(stripAnsi("hello")).toBe("hello");
	});

	it("handles empty string", () => {
		expect(stripAnsi("")).toBe("");
	});
});

describe("padEndVisible", () => {
	it("pads based on visible length, ignoring ANSI codes", () => {
		const colored = "\x1b[32mhi\x1b[0m";
		const result = padEndVisible(colored, 5);
		// "hi" is 2 visible chars, so 3 spaces added
		expect(stripAnsi(result)).toBe("hi   ");
	});

	it("does not pad if visible content is long enough", () => {
		const colored = "\x1b[32mhello\x1b[0m";
		const result = padEndVisible(colored, 3);
		expect(result).toBe(colored);
	});

	it("works with plain strings too", () => {
		expect(padEndVisible("hi", 5)).toBe("hi   ");
	});
});

describe("formatStatus", () => {
	const clean: StatusCounts = { modified: 0, added: 0, deleted: 0, renamed: 0, total: 0, isClean: true };
	const dirty: StatusCounts = { modified: 2, added: 1, deleted: 0, renamed: 0, total: 3, isClean: false };
	const allTypes: StatusCounts = { modified: 1, added: 2, deleted: 3, renamed: 1, total: 7, isClean: false };

	it("returns green 'clean' for clean status", () => {
		const result = formatStatus(clean);
		expect(stripAnsi(result)).toBe("clean");
		expect(result).toContain("\x1b[32m");
	});

	it("shows change types for dirty status", () => {
		const result = formatStatus(dirty);
		expect(stripAnsi(result)).toBe("~2 +1");
		expect(result).toContain("\x1b[33m");
	});

	it("shows all change types", () => {
		expect(stripAnsi(formatStatus(allTypes))).toBe("~1 +2 -3 r1");
	});

	it("omits zero-count types", () => {
		const onlyDeleted: StatusCounts = { modified: 0, added: 0, deleted: 5, renamed: 0, total: 5, isClean: false };
		expect(stripAnsi(formatStatus(onlyDeleted))).toBe("-5");
	});
});

describe("formatStatusPlain", () => {
	it("returns 'clean' for clean status", () => {
		expect(formatStatusPlain({ modified: 0, added: 0, deleted: 0, renamed: 0, total: 0, isClean: true })).toBe("clean");
	});

	it("shows change types without ANSI", () => {
		expect(formatStatusPlain({ modified: 3, added: 0, deleted: 1, renamed: 0, total: 4, isClean: false })).toBe("~3 -1");
	});
});
