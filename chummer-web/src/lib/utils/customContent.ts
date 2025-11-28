/**
 * Custom Content Import
 * =====================
 * Allows importing custom XML data files for SR4 content.
 * Supports qualities, spells, powers, gear, weapons, etc.
 */

import type {
	GameQuality,
	GameSpell,
	GamePower,
	GameWeapon,
	GameArmor,
	GameCyberware,
	GameGear
} from '$types';

/** Custom content manifest. */
export interface CustomContentManifest {
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly author?: string;
	readonly description?: string;
	readonly source?: string;
	readonly createdAt: string;
	readonly content: CustomContentData;
}

/** Custom content data by type. */
export interface CustomContentData {
	readonly qualities?: readonly GameQuality[];
	readonly spells?: readonly GameSpell[];
	readonly powers?: readonly GamePower[];
	readonly weapons?: readonly GameWeapon[];
	readonly armor?: readonly GameArmor[];
	readonly cyberware?: readonly GameCyberware[];
	readonly gear?: readonly GameGear[];
}

/** Content types that can be imported. */
export type CustomContentType = keyof CustomContentData;

/** Result of parsing custom content. */
export interface ParseResult {
	readonly success: boolean;
	readonly manifest?: CustomContentManifest;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}

/** Validation result for a single item. */
interface ItemValidation {
	readonly valid: boolean;
	readonly errors: readonly string[];
}

/* ============================================
 * XML Parsing Helpers
 * ============================================ */

/** Get text content of an XML element. */
function getElementText(parent: Element, tagName: string): string {
	const element = parent.getElementsByTagName(tagName)[0];
	return element?.textContent?.trim() ?? '';
}

/** Get numeric content of an XML element. */
function getElementNumber(parent: Element, tagName: string, defaultValue: number = 0): number {
	const text = getElementText(parent, tagName);
	const num = parseFloat(text);
	return isNaN(num) ? defaultValue : num;
}

/** Get integer content of an XML element. */
function getElementInt(parent: Element, tagName: string, defaultValue: number = 0): number {
	return Math.floor(getElementNumber(parent, tagName, defaultValue));
}

/* ============================================
 * Content Parsers
 * ============================================ */

/** Parse a quality from XML. */
function parseQuality(element: Element): GameQuality | null {
	const name = getElementText(element, 'name');
	if (!name) return null;

	return {
		name,
		category: getElementText(element, 'category') || 'Positive',
		bp: getElementInt(element, 'bp'),
		metagenetic: getElementText(element, 'metagenetic') === 'True',
		source: getElementText(element, 'source') || 'Custom',
		page: getElementInt(element, 'page')
	};
}

/** Parse a spell from XML. */
function parseSpell(element: Element): GameSpell | null {
	const name = getElementText(element, 'name');
	if (!name) return null;

	return {
		name,
		category: getElementText(element, 'category') || 'Combat',
		type: getElementText(element, 'type') || 'P',
		range: getElementText(element, 'range') || 'LOS',
		damage: getElementText(element, 'damage') || '',
		duration: getElementText(element, 'duration') || 'I',
		drain: getElementText(element, 'dv') || 'F/2',
		descriptor: getElementText(element, 'descriptor') || '',
		source: getElementText(element, 'source') || 'Custom',
		page: getElementInt(element, 'page'),
		limited: getElementText(element, 'limited') === 'True'
	};
}

/** Parse an adept power from XML. */
function parsePower(element: Element): GamePower | null {
	const name = getElementText(element, 'name');
	if (!name) return null;

	return {
		name,
		category: getElementText(element, 'category') || 'Physical',
		points: getElementNumber(element, 'points', 0.5),
		source: getElementText(element, 'source') || 'Custom',
		page: getElementInt(element, 'page'),
		levels: getElementText(element, 'levels') === 'True',
		maxlevels: getElementInt(element, 'maxlevels', 6)
	};
}

/** Parse a weapon from XML. */
function parseWeapon(element: Element): GameWeapon | null {
	const name = getElementText(element, 'name');
	if (!name) return null;

	return {
		name,
		category: getElementText(element, 'category') || 'Blades',
		type: (getElementText(element, 'type') || 'Melee') as 'Melee' | 'Ranged',
		reach: getElementInt(element, 'reach'),
		damage: getElementText(element, 'damage') || '(STR/2)P',
		ap: getElementText(element, 'ap') || '0',
		mode: getElementText(element, 'mode') || '',
		rc: getElementText(element, 'rc') || '',
		ammo: getElementText(element, 'ammo') || '',
		conceal: getElementInt(element, 'conceal'),
		avail: getElementText(element, 'avail') || '0',
		cost: getElementInt(element, 'cost'),
		source: getElementText(element, 'source') || 'Custom',
		page: getElementInt(element, 'page')
	};
}

/** Parse armor from XML. */
function parseArmor(element: Element): GameArmor | null {
	const name = getElementText(element, 'name');
	if (!name) return null;

	return {
		name,
		category: getElementText(element, 'category') || 'Armor',
		ballistic: getElementInt(element, 'b') || getElementInt(element, 'ballistic'),
		impact: getElementInt(element, 'i') || getElementInt(element, 'impact'),
		capacity: getElementInt(element, 'armorcapacity'),
		avail: getElementText(element, 'avail') || '0',
		cost: getElementInt(element, 'cost'),
		source: getElementText(element, 'source') || 'Custom',
		page: getElementInt(element, 'page')
	};
}

/** Parse cyberware from XML. */
function parseCyberware(element: Element): GameCyberware | null {
	const name = getElementText(element, 'name');
	if (!name) return null;

	return {
		name,
		category: getElementText(element, 'category') || 'Bodyware',
		ess: getElementNumber(element, 'ess', 0.1),
		capacity: getElementText(element, 'capacity') || '0',
		avail: getElementText(element, 'avail') || '0',
		cost: getElementInt(element, 'cost'),
		source: getElementText(element, 'source') || 'Custom',
		page: getElementInt(element, 'page'),
		rating: getElementInt(element, 'rating'),
		minRating: getElementInt(element, 'minrating', 1),
		maxRating: getElementInt(element, 'maxrating', 6)
	};
}

/** Parse gear from XML. */
function parseGear(element: Element): GameGear | null {
	const name = getElementText(element, 'name');
	if (!name) return null;

	return {
		name,
		category: getElementText(element, 'category') || 'Gear',
		rating: getElementInt(element, 'rating'),
		avail: getElementText(element, 'avail') || '0',
		cost: getElementInt(element, 'cost'),
		source: getElementText(element, 'source') || 'Custom',
		page: getElementInt(element, 'page'),
		capacity: getElementInt(element, 'capacity'),
		capacityCost: getElementInt(element, 'capacitycost', 1),
		isContainer: getElementText(element, 'iscontainer') === 'True'
	};
}

/* ============================================
 * Main Import Functions
 * ============================================ */

/** Generate a unique ID for custom content. */
function generateContentId(): string {
	return 'custom_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Parse custom content from XML string. */
export function parseCustomContent(xmlString: string): ParseResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	/* Parse XML */
	let doc: Document;
	try {
		const parser = new DOMParser();
		doc = parser.parseFromString(xmlString, 'text/xml');

		/* Check for parse errors */
		const parseError = doc.querySelector('parsererror');
		if (parseError) {
			return {
				success: false,
				errors: ['Invalid XML: ' + parseError.textContent],
				warnings: []
			};
		}
	} catch (err) {
		return {
			success: false,
			errors: ['Failed to parse XML: ' + String(err)],
			warnings: []
		};
	}

	/* Get root element */
	const root = doc.documentElement;
	if (!root) {
		return {
			success: false,
			errors: ['No root element found'],
			warnings: []
		};
	}

	/* Parse manifest info */
	const name = getElementText(root, 'name') || 'Custom Content';
	const version = getElementText(root, 'version') || '1.0';
	const author = getElementText(root, 'author') || undefined;
	const description = getElementText(root, 'description') || undefined;
	const source = getElementText(root, 'source') || 'Custom';

	/* Parse content */
	const content: CustomContentData = {};

	/* Parse qualities */
	const qualitiesElement = root.getElementsByTagName('qualities')[0];
	if (qualitiesElement) {
		const qualities: GameQuality[] = [];
		const qualityElements = qualitiesElement.getElementsByTagName('quality');
		for (let i = 0; i < qualityElements.length; i++) {
			const quality = parseQuality(qualityElements[i]!);
			if (quality) {
				qualities.push(quality);
			} else {
				warnings.push(`Failed to parse quality at index ${i}`);
			}
		}
		if (qualities.length > 0) {
			(content as { qualities: GameQuality[] }).qualities = qualities;
		}
	}

	/* Parse spells */
	const spellsElement = root.getElementsByTagName('spells')[0];
	if (spellsElement) {
		const spells: GameSpell[] = [];
		const spellElements = spellsElement.getElementsByTagName('spell');
		for (let i = 0; i < spellElements.length; i++) {
			const spell = parseSpell(spellElements[i]!);
			if (spell) {
				spells.push(spell);
			} else {
				warnings.push(`Failed to parse spell at index ${i}`);
			}
		}
		if (spells.length > 0) {
			(content as { spells: GameSpell[] }).spells = spells;
		}
	}

	/* Parse powers */
	const powersElement = root.getElementsByTagName('powers')[0];
	if (powersElement) {
		const powers: GamePower[] = [];
		const powerElements = powersElement.getElementsByTagName('power');
		for (let i = 0; i < powerElements.length; i++) {
			const power = parsePower(powerElements[i]!);
			if (power) {
				powers.push(power);
			} else {
				warnings.push(`Failed to parse power at index ${i}`);
			}
		}
		if (powers.length > 0) {
			(content as { powers: GamePower[] }).powers = powers;
		}
	}

	/* Parse weapons */
	const weaponsElement = root.getElementsByTagName('weapons')[0];
	if (weaponsElement) {
		const weapons: GameWeapon[] = [];
		const weaponElements = weaponsElement.getElementsByTagName('weapon');
		for (let i = 0; i < weaponElements.length; i++) {
			const weapon = parseWeapon(weaponElements[i]!);
			if (weapon) {
				weapons.push(weapon);
			} else {
				warnings.push(`Failed to parse weapon at index ${i}`);
			}
		}
		if (weapons.length > 0) {
			(content as { weapons: GameWeapon[] }).weapons = weapons;
		}
	}

	/* Parse armor */
	const armorsElement = root.getElementsByTagName('armors')[0];
	if (armorsElement) {
		const armors: GameArmor[] = [];
		const armorElements = armorsElement.getElementsByTagName('armor');
		for (let i = 0; i < armorElements.length; i++) {
			const armor = parseArmor(armorElements[i]!);
			if (armor) {
				armors.push(armor);
			} else {
				warnings.push(`Failed to parse armor at index ${i}`);
			}
		}
		if (armors.length > 0) {
			(content as { armor: GameArmor[] }).armor = armors;
		}
	}

	/* Parse cyberware */
	const cyberwareElement = root.getElementsByTagName('cyberwares')[0];
	if (cyberwareElement) {
		const cyberwares: GameCyberware[] = [];
		const cyberElements = cyberwareElement.getElementsByTagName('cyberware');
		for (let i = 0; i < cyberElements.length; i++) {
			const cyberware = parseCyberware(cyberElements[i]!);
			if (cyberware) {
				cyberwares.push(cyberware);
			} else {
				warnings.push(`Failed to parse cyberware at index ${i}`);
			}
		}
		if (cyberwares.length > 0) {
			(content as { cyberware: GameCyberware[] }).cyberware = cyberwares;
		}
	}

	/* Parse gear */
	const gearElement = root.getElementsByTagName('gears')[0];
	if (gearElement) {
		const gears: GameGear[] = [];
		const gearElements = gearElement.getElementsByTagName('gear');
		for (let i = 0; i < gearElements.length; i++) {
			const gear = parseGear(gearElements[i]!);
			if (gear) {
				gears.push(gear);
			} else {
				warnings.push(`Failed to parse gear at index ${i}`);
			}
		}
		if (gears.length > 0) {
			(content as { gear: GameGear[] }).gear = gears;
		}
	}

	/* Check if any content was parsed */
	const hasContent = Object.values(content).some(arr => arr && arr.length > 0);
	if (!hasContent) {
		errors.push('No valid content found in file');
		return { success: false, errors, warnings };
	}

	/* Create manifest */
	const manifest: CustomContentManifest = {
		id: generateContentId(),
		name,
		version,
		author,
		description,
		source,
		createdAt: new Date().toISOString(),
		content
	};

	return {
		success: true,
		manifest,
		errors,
		warnings
	};
}

/** Parse custom content from File object. */
export async function parseCustomContentFile(file: File): Promise<ParseResult> {
	try {
		const text = await file.text();
		return parseCustomContent(text);
	} catch (err) {
		return {
			success: false,
			errors: ['Failed to read file: ' + String(err)],
			warnings: []
		};
	}
}

/* ============================================
 * Local Storage for Custom Content
 * ============================================ */

const STORAGE_KEY = 'chummer_custom_content';

/** Get all stored custom content manifests. */
export function getStoredCustomContent(): CustomContentManifest[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];
		return JSON.parse(stored) as CustomContentManifest[];
	} catch {
		return [];
	}
}

/** Save a custom content manifest to storage. */
export function saveCustomContent(manifest: CustomContentManifest): void {
	const existing = getStoredCustomContent();
	const filtered = existing.filter(m => m.id !== manifest.id);
	filtered.push(manifest);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/** Remove custom content from storage. */
export function removeCustomContent(manifestId: string): void {
	const existing = getStoredCustomContent();
	const filtered = existing.filter(m => m.id !== manifestId);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/** Get combined custom content data. */
export function getCombinedCustomContent(): CustomContentData {
	const manifests = getStoredCustomContent();
	const combined: CustomContentData = {
		qualities: [],
		spells: [],
		powers: [],
		weapons: [],
		armor: [],
		cyberware: [],
		gear: []
	};

	for (const manifest of manifests) {
		if (manifest.content.qualities) {
			(combined.qualities as GameQuality[]).push(...manifest.content.qualities);
		}
		if (manifest.content.spells) {
			(combined.spells as GameSpell[]).push(...manifest.content.spells);
		}
		if (manifest.content.powers) {
			(combined.powers as GamePower[]).push(...manifest.content.powers);
		}
		if (manifest.content.weapons) {
			(combined.weapons as GameWeapon[]).push(...manifest.content.weapons);
		}
		if (manifest.content.armor) {
			(combined.armor as GameArmor[]).push(...manifest.content.armor);
		}
		if (manifest.content.cyberware) {
			(combined.cyberware as GameCyberware[]).push(...manifest.content.cyberware);
		}
		if (manifest.content.gear) {
			(combined.gear as GameGear[]).push(...manifest.content.gear);
		}
	}

	return combined;
}

/** Get content summary for display. */
export function getContentSummary(manifest: CustomContentManifest): string {
	const counts: string[] = [];
	const content = manifest.content;

	if (content.qualities?.length) counts.push(`${content.qualities.length} qualities`);
	if (content.spells?.length) counts.push(`${content.spells.length} spells`);
	if (content.powers?.length) counts.push(`${content.powers.length} powers`);
	if (content.weapons?.length) counts.push(`${content.weapons.length} weapons`);
	if (content.armor?.length) counts.push(`${content.armor.length} armor`);
	if (content.cyberware?.length) counts.push(`${content.cyberware.length} cyberware`);
	if (content.gear?.length) counts.push(`${content.gear.length} gear`);

	return counts.join(', ') || 'No content';
}
