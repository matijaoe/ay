import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: {
		name: "config",
		description: "Get, set, or edit configuration",
	},
	args: {
		action: {
			type: "positional",
			description: "Action: get, set, edit, list, path",
			required: false,
		},
		key: {
			type: "positional",
			description: "Config key (for get/set)",
			required: false,
		},
		value: {
			type: "positional",
			description: "Config value (for set)",
			required: false,
		},
		source: {
			type: "boolean",
			description: "Show which file each value comes from",
		},
	},
	run({ args }) {
		consola.info("ay config — not implemented yet", args);
	},
});
