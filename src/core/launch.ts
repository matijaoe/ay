import { execa } from "execa";

const TUI_EDITORS = new Set([
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
]);

function isTuiProgram(bin: string): boolean {
	// Extract the base name (e.g. "/usr/bin/nano" → "nano")
	const base = bin.split("/").pop() ?? bin;
	return TUI_EDITORS.has(base);
}

/**
 * Launch a tool, handling TUI vs GUI editors correctly.
 *
 * TUI editors (nano, vim, etc.) → stdio: "inherit", await completion
 * GUI editors (code, cursor, etc.) → detached, fire-and-forget
 */
export async function launchTool(
	bin: string,
	args: string[],
	opts: { cwd?: string } = {},
): Promise<void> {
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
		// Let the GUI process outlive us
		subprocess.unref();
	}
}
