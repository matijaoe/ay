import { execa, execaSync } from "execa";

const TUI_PROGRAMS = new Set([
	"nano",
	"vim",
	"vi",
	"nvim",
	"neovim",
	"emacs",
	"micro",
	"helix",
	"hx",
	"joe",
	"pico",
	"ne",
	"kak",
	"claude",
	"codex",
]);

function baseName(bin: string): string {
	return bin.split("/").pop() ?? bin;
}

function isTuiProgram(bin: string): boolean {
	return TUI_PROGRAMS.has(baseName(bin));
}

/**
 * Check if a binary exists in $PATH.
 */
export function whichSync(bin: string): boolean {
	try {
		execaSync("which", [bin], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

/**
 * Launch a tool, handling TUI vs GUI programs correctly.
 *
 * TUI programs (nano, vim, claude, codex, etc.) → stdio: "inherit", await completion
 * GUI programs (code, cursor, etc.) → detached, fire-and-forget
 *
 * Throws a user-friendly error if the binary is not found.
 */
export async function launchTool(
	bin: string,
	args: string[],
	opts: { cwd?: string } = {},
): Promise<void> {
	if (!whichSync(bin)) {
		throw new Error(`"${bin}" not found in $PATH. Is it installed?`);
	}

	if (isTuiProgram(bin)) {
		await execa(bin, args, {
			cwd: opts.cwd,
			stdio: "inherit",
		});
	} else {
		const subprocess = execa(bin, args, {
			cwd: opts.cwd,
			detached: true,
			stdio: "ignore",
		});
		subprocess.unref();
	}
}
