import {
	adjectives,
	animals,
	colors,
	type Config as UngConfig,
	uniqueNamesGenerator,
} from "unique-names-generator";
import type { NameStyle } from "../config/schema";

// City-style names — curated short list for brevity
const cities: string[] = [
	"oslo",
	"tokyo",
	"paris",
	"lima",
	"rome",
	"dubai",
	"baku",
	"riga",
	"milan",
	"lyon",
	"cork",
	"bath",
	"york",
	"gent",
	"bern",
	"kobe",
	"mesa",
	"nice",
	"pune",
	"waco",
	"faro",
	"hilo",
	"java",
	"oulu",
	"perm",
];

const nouns: string[] = [
	"falcon",
	"river",
	"storm",
	"ember",
	"frost",
	"spark",
	"bloom",
	"drift",
	"grove",
	"ridge",
	"shore",
	"spire",
	"trail",
	"vault",
	"flame",
	"haven",
	"nexus",
	"orbit",
	"prism",
	"pulse",
	"shard",
	"surge",
	"tower",
	"vortex",
	"delta",
];

function getConfig(style: NameStyle): UngConfig {
	switch (style) {
		case "adjective-animal":
			return { dictionaries: [adjectives, animals], separator: "-", length: 2 };
		case "city":
			return { dictionaries: [cities], separator: "-", length: 1 };
		case "color-noun":
			return { dictionaries: [colors, nouns], separator: "-", length: 2 };
	}
}

export function generateName(style: NameStyle): string {
	return uniqueNamesGenerator(getConfig(style));
}

export function generateUniqueName(
	style: NameStyle,
	existing: Set<string>,
	maxAttempts = 50,
): string {
	for (let i = 0; i < maxAttempts; i++) {
		const name = generateName(style);
		if (!existing.has(name)) return name;
	}
	// Fallback: append timestamp
	return `${generateName(style)}-${Date.now() % 10000}`;
}
