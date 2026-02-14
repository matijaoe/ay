export function relativeTime(date: Date): string {
	const now = Date.now();
	const diff = now - date.getTime();
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const weeks = Math.floor(days / 7);

	if (seconds < 60) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 7) return `${days}d ago`;
	return `${weeks}w ago`;
}

export function padEnd(str: string, len: number): string {
	return str.length >= len ? str : str + " ".repeat(len - str.length);
}

export function truncate(str: string, len: number): string {
	return str.length <= len ? str : `${str.slice(0, len - 1)}…`;
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes use control chars
const ANSI_RE = /\x1b\[[0-9;]*m/g;

/** Strip ANSI escape codes to get visible string length. */
export function stripAnsi(str: string): string {
	return str.replace(ANSI_RE, "");
}

/** Pad a string that may contain ANSI escape codes to a visible width. */
export function padEndVisible(str: string, len: number): string {
	const visible = stripAnsi(str).length;
	return visible >= len ? str : str + " ".repeat(len - visible);
}

export interface StatusCounts {
	modified: number;
	added: number;
	deleted: number;
	renamed: number;
	total: number;
	isClean: boolean;
}

/** Format file status as compact colored string: `~2 +1 -1` or green `clean`. */
export function formatStatus(status: StatusCounts): string {
	if (status.isClean) return "\x1b[32mclean\x1b[0m";
	const parts: string[] = [];
	if (status.modified > 0) parts.push(`~${status.modified}`);
	if (status.added > 0) parts.push(`+${status.added}`);
	if (status.deleted > 0) parts.push(`-${status.deleted}`);
	if (status.renamed > 0) parts.push(`r${status.renamed}`);
	return `\x1b[33m${parts.join(" ")}\x1b[0m`;
}

/** Plain text version for visible-width calculations. */
export function formatStatusPlain(status: StatusCounts): string {
	if (status.isClean) return "clean";
	const parts: string[] = [];
	if (status.modified > 0) parts.push(`~${status.modified}`);
	if (status.added > 0) parts.push(`+${status.added}`);
	if (status.deleted > 0) parts.push(`-${status.deleted}`);
	if (status.renamed > 0) parts.push(`r${status.renamed}`);
	return parts.join(" ");
}
