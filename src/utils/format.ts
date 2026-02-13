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
