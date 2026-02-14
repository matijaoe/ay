import { describe, expect, it, vi } from "vitest";
import { padEnd, relativeTime, truncate } from "./format";

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
