/**
 * Chummer XML Import Module
 * =========================
 * Parses Chummer SR4 XML files and converts to internal Character format.
 */

import { XMLParser } from 'fast-xml-parser';
import type {
	Character,
	BuildMethod,
	CharacterQuality,
	CharacterSkill,
	CharacterSkillGroup,
	KnowledgeSkill,
	KnowledgeSkillCategory,
	SkillGroupName,
	Contact,
	CharacterWeapon,
	WeaponType,
	CharacterArmor,
	CharacterCyberware,
	CharacterGear,
	CharacterLifestyle,
	CharacterMagic,
	CharacterResonance,
	CharacterSpell,
	CharacterPower,
	CyberwareGrade
} from '$types';
import { createEmptyCharacter } from '$types';

/** Result of import operation. */
export interface ImportResult {
	success: boolean;
	error?: string;
	character?: Character;
}

/**
 * Import a character from Chummer XML string.
 */
export function importFromChummer(xmlString: string, userId: string): ImportResult {
	try {
		/* Handle UTF-16 encoding */
		const cleanXml = cleanXmlString(xmlString);

		const parser = new XMLParser({
			ignoreAttributes: false,
			parseAttributeValue: true,
			trimValues: true
		});

		const result = parser.parse(cleanXml);
		const charData = result.character;

		if (!charData) {
			return { success: false, error: 'Invalid Chummer XML: missing character element' };
		}

		const character = parseCharacter(charData, userId);
		return { success: true, character };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to parse XML';
		return { success: false, error: message };
	}
}

/**
 * Clean XML string, handling UTF-16 encoding issues.
 */
function cleanXmlString(xmlString: string): string {
	/* Remove BOM and convert common UTF-16 artifacts */
	let clean = xmlString
		.replace(/^\uFEFF/, '')
		.replace(/\0/g, '')
		.replace(/\x00/g, '');

	/* Fix common encoding issues */
	if (clean.includes('< ? x m l')) {
		/* UTF-16 displayed as UTF-8 - remove extra spaces */
		clean = clean.replace(/ /g, '');
	}

	return clean;
}

/**
 * Parse character data from XML object.
 */
function parseCharacter(data: Record<string, unknown>, userId: string): Character {
	const id = generateId();
	const buildMethod: BuildMethod = getString(data, 'buildmethod') === 'Karma' ? 'karma' : 'bp';
	const base = createEmptyCharacter(id, userId, buildMethod);

	/* Calculate BP spent from XML data */
	const metatypeBP = getNumber(data, 'metatypebp');
	const nuyenBP = getNumber(data, 'nuyenbp');

	/* Parse attributes */
	const attributes = parseAttributes(data.attributes);
	const attributeLimits = parseAttributeLimits(data.attributes);

	/* Parse skills */
	const { activeSkills, knowledgeSkills } = parseSkills(data.skills);
	const skillGroups = parseSkillGroups(data.skillgroups);

	/* Parse qualities */
	const qualities = parseQualities(data.qualities);
	const qualityBP = qualities.reduce((sum, q) => sum + q.bp, 0);

	/* Parse contacts */
	const contacts = parseContacts(data.contacts);
	const contactBP = contacts.reduce((sum, c) => sum + c.loyalty + c.connection, 0);

	/* Parse equipment */
	const weapons = parseWeapons(data.weapons);
	const armor = parseArmor(data.armors);
	const cyberware = parseCyberware(data.cyberwares);
	const gear = parseGear(data.gears);
	const lifestyle = parseLifestyle(data.lifestyles);

	/* Parse magic/resonance */
	const magic = parseMagic(data);
	const resonance = parseResonance(data);

	/* Calculate skill BP */
	const skillBP = activeSkills.reduce((sum, s) => sum + s.rating * 4, 0);
	const skillGroupBP = skillGroups.reduce((sum, g) => sum + g.rating * 10, 0);

	/* Calculate spell BP */
	const spellBP = magic?.spells.length ? magic.spells.length * 5 : 0;

	const character: Character = {
		...base,
		identity: {
			name: getString(data, 'name'),
			alias: getString(data, 'alias'),
			playerName: getString(data, 'playername'),
			metatype: getString(data, 'metatype'),
			metavariant: getString(data, 'metavariant') || null,
			sex: getString(data, 'sex'),
			age: getString(data, 'age'),
			height: getString(data, 'height'),
			weight: getString(data, 'weight'),
			hair: getString(data, 'hair'),
			eyes: getString(data, 'eyes'),
			skin: getString(data, 'skin')
		},
		background: {
			description: getString(data, 'description'),
			background: getString(data, 'background'),
			concept: getString(data, 'concept'),
			notes: getString(data, 'notes')
		},
		status: getString(data, 'created') === 'True' ? 'career' : 'creation',
		buildMethod,
		buildPoints: getNumber(data, 'bp') || 400,
		buildPointsSpent: {
			metatype: metatypeBP,
			attributes: 0, /* Calculated elsewhere */
			skills: skillBP,
			skillGroups: skillGroupBP,
			qualities: qualityBP,
			spells: spellBP,
			complexForms: 0,
			contacts: contactBP,
			resources: nuyenBP
		},
		attributes,
		attributeLimits,
		skills: activeSkills,
		skillGroups,
		knowledgeSkills,
		knowledgeSkillPoints: getNumber(data, 'knowpts'),
		qualities,
		magic,
		resonance,
		contacts,
		equipment: {
			weapons,
			armor,
			cyberware,
			gear,
			lifestyle
		},
		nuyen: getNumber(data, 'nuyen'),
		startingNuyen: 0,
		karma: getNumber(data, 'karma'),
		totalKarma: getNumber(data, 'totalkarma'),
		reputation: {
			streetCred: getNumber(data, 'streetcred'),
			notoriety: getNumber(data, 'notoriety'),
			publicAwareness: getNumber(data, 'publicawareness')
		},
		condition: {
			physicalMax: 10,
			physicalCurrent: getNumber(data, 'physicalcmfilled'),
			stunMax: 10,
			stunCurrent: getNumber(data, 'stuncmfilled'),
			overflow: 0
		},
		expenseLog: [],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		settings: {
			maxAvailability: getNumber(data, 'maxavail') || 12,
			startingBP: getNumber(data, 'bp') || 400,
			startingKarma: 0,
			startingNuyen: 0,
			ignoreRules: false
		}
	};

	return character;
}

/**
 * Parse attributes from XML.
 */
function parseAttributes(attrs: unknown): Character['attributes'] {
	const attrMap = new Map<string, { value: number; aug: number }>();

	if (attrs && typeof attrs === 'object' && 'attribute' in attrs) {
		const attrList = ensureArray((attrs as Record<string, unknown>).attribute);
		for (const attr of attrList) {
			const name = getString(attr, 'name');
			const value = getNumber(attr, 'value');
			const aug = getNumber(attr, 'augmodifier');
			attrMap.set(name, { value, aug });
		}
	}

	return {
		bod: { base: attrMap.get('BOD')?.value ?? 1, bonus: attrMap.get('BOD')?.aug ?? 0, karma: 0 },
		agi: { base: attrMap.get('AGI')?.value ?? 1, bonus: attrMap.get('AGI')?.aug ?? 0, karma: 0 },
		rea: { base: attrMap.get('REA')?.value ?? 1, bonus: attrMap.get('REA')?.aug ?? 0, karma: 0 },
		str: { base: attrMap.get('STR')?.value ?? 1, bonus: attrMap.get('STR')?.aug ?? 0, karma: 0 },
		cha: { base: attrMap.get('CHA')?.value ?? 1, bonus: attrMap.get('CHA')?.aug ?? 0, karma: 0 },
		int: { base: attrMap.get('INT')?.value ?? 1, bonus: attrMap.get('INT')?.aug ?? 0, karma: 0 },
		log: { base: attrMap.get('LOG')?.value ?? 1, bonus: attrMap.get('LOG')?.aug ?? 0, karma: 0 },
		wil: { base: attrMap.get('WIL')?.value ?? 1, bonus: attrMap.get('WIL')?.aug ?? 0, karma: 0 },
		edg: { base: attrMap.get('EDG')?.value ?? 1, bonus: attrMap.get('EDG')?.aug ?? 0, karma: 0 },
		mag: attrMap.get('MAG')?.value ? { base: attrMap.get('MAG')!.value, bonus: attrMap.get('MAG')!.aug, karma: 0 } : null,
		res: attrMap.get('RES')?.value ? { base: attrMap.get('RES')!.value, bonus: attrMap.get('RES')!.aug, karma: 0 } : null,
		ess: parseFloat(String(attrMap.get('ESS')?.value ?? 6))
	};
}

/**
 * Parse attribute limits from XML.
 */
function parseAttributeLimits(attrs: unknown): Character['attributeLimits'] {
	const limitMap = new Map<string, { min: number; max: number; aug: number }>();

	if (attrs && typeof attrs === 'object' && 'attribute' in attrs) {
		const attrList = ensureArray((attrs as Record<string, unknown>).attribute);
		for (const attr of attrList) {
			const name = getString(attr, 'name');
			limitMap.set(name, {
				min: getNumber(attr, 'metatypemin'),
				max: getNumber(attr, 'metatypemax'),
				aug: getNumber(attr, 'metatypeaugmax')
			});
		}
	}

	const defaultLimit = { min: 1, max: 6, aug: 9 };

	return {
		bod: limitMap.get('BOD') ?? defaultLimit,
		agi: limitMap.get('AGI') ?? defaultLimit,
		rea: limitMap.get('REA') ?? defaultLimit,
		str: limitMap.get('STR') ?? defaultLimit,
		cha: limitMap.get('CHA') ?? defaultLimit,
		int: limitMap.get('INT') ?? defaultLimit,
		log: limitMap.get('LOG') ?? defaultLimit,
		wil: limitMap.get('WIL') ?? defaultLimit,
		ini: limitMap.get('INI') ?? { min: 2, max: 12, aug: 18 },
		edg: limitMap.get('EDG') ?? { min: 1, max: 6, aug: 6 },
		mag: limitMap.get('MAG') ?? { min: 1, max: 6, aug: 6 },
		res: limitMap.get('RES') ?? { min: 1, max: 6, aug: 6 },
		ess: { min: 0, max: 6, aug: 6 }
	};
}

/**
 * Parse skills from XML.
 */
function parseSkills(skills: unknown): { activeSkills: CharacterSkill[]; knowledgeSkills: KnowledgeSkill[] } {
	const activeSkills: CharacterSkill[] = [];
	const knowledgeSkills: KnowledgeSkill[] = [];

	if (skills && typeof skills === 'object' && 'skill' in skills) {
		const skillList = ensureArray((skills as Record<string, unknown>).skill);
		for (const skill of skillList) {
			const rating = getNumber(skill, 'rating');
			if (rating === 0) continue; /* Skip unlearned skills */

			const isKnowledge = getString(skill, 'knowledge') === 'True';

			if (isKnowledge) {
				const category = getString(skill, 'skillcategory');
				const validCategories = ['Academic', 'Interest', 'Language', 'Professional', 'Street'];
				knowledgeSkills.push({
					id: generateId(),
					name: getString(skill, 'name'),
					category: validCategories.includes(category) ? category as KnowledgeSkillCategory : 'Interest',
					rating,
					specialization: getString(skill, 'spec') || null
				});
			} else {
				activeSkills.push({
					name: getString(skill, 'name'),
					rating,
					specialization: getString(skill, 'spec') || null,
					bonus: 0,
					karmaSpent: 0
				});
			}
		}
	}

	return { activeSkills, knowledgeSkills };
}

/**
 * Parse skill groups from XML.
 */
function parseSkillGroups(groups: unknown): CharacterSkillGroup[] {
	const result: CharacterSkillGroup[] = [];

	const validGroupNames: SkillGroupName[] = [
		'Animal Husbandry', 'Athletics', 'Biotech', 'Close Combat', 'Conjuring',
		'Cracking', 'Electronics', 'Firearms', 'Influence', 'Mechanic',
		'Outdoors', 'Sorcery', 'Stealth', 'Tasking'
	];

	if (groups && typeof groups === 'object' && 'skillgroup' in groups) {
		const groupList = ensureArray((groups as Record<string, unknown>).skillgroup);
		for (const group of groupList) {
			const rating = getNumber(group, 'rating');
			if (rating === 0) continue;

			const name = getString(group, 'name');
			if (validGroupNames.includes(name as SkillGroupName)) {
				result.push({
					name: name as SkillGroupName,
					rating,
					broken: getString(group, 'broken') === 'True'
				});
			}
		}
	}

	return result;
}

/**
 * Parse qualities from XML.
 */
function parseQualities(qualities: unknown): CharacterQuality[] {
	const result: CharacterQuality[] = [];

	if (qualities && typeof qualities === 'object' && 'quality' in qualities) {
		const qualityList = ensureArray((qualities as Record<string, unknown>).quality);
		for (const quality of qualityList) {
			result.push({
				id: generateId(),
				name: getString(quality, 'name'),
				category: getString(quality, 'qualitytype') as 'Positive' | 'Negative',
				bp: getNumber(quality, 'bp'),
				rating: 1,
				notes: getString(quality, 'notes')
			});
		}
	}

	return result;
}

/**
 * Parse contacts from XML.
 */
function parseContacts(contacts: unknown): Contact[] {
	const result: Contact[] = [];

	if (contacts && typeof contacts === 'object' && 'contact' in contacts) {
		const contactList = ensureArray((contacts as Record<string, unknown>).contact);
		for (const contact of contactList) {
			result.push({
				id: generateId(),
				name: getString(contact, 'name'),
				type: getString(contact, 'type') || 'Contact',
				loyalty: getNumber(contact, 'loyalty'),
				connection: getNumber(contact, 'connection'),
				notes: getString(contact, 'notes')
			});
		}
	}

	return result;
}

/**
 * Parse weapons from XML.
 */
function parseWeapons(weapons: unknown): CharacterWeapon[] {
	const result: CharacterWeapon[] = [];

	if (weapons && typeof weapons === 'object' && 'weapon' in weapons) {
		const weaponList = ensureArray((weapons as Record<string, unknown>).weapon);
		for (const weapon of weaponList) {
			const typeStr = getString(weapon, 'type');
			const weaponType: WeaponType = typeStr === 'Melee' ? 'Melee' : 'Ranged';

			result.push({
				id: generateId(),
				name: getString(weapon, 'name'),
				category: getString(weapon, 'category'),
				type: weaponType,
				reach: getNumber(weapon, 'reach'),
				damage: getString(weapon, 'damage'),
				ap: getString(weapon, 'ap') || String(getNumber(weapon, 'ap')),
				mode: getString(weapon, 'mode'),
				rc: getString(weapon, 'rc') || String(getNumber(weapon, 'rc')),
				ammo: getString(weapon, 'ammo'),
				currentAmmo: getNumber(weapon, 'ammoremaining'),
				conceal: getNumber(weapon, 'conceal'),
				cost: getNumber(weapon, 'cost'),
				accessories: [],
				notes: getString(weapon, 'notes')
			});
		}
	}

	return result;
}

/**
 * Parse armor from XML.
 */
function parseArmor(armors: unknown): CharacterArmor[] {
	const result: CharacterArmor[] = [];

	if (armors && typeof armors === 'object' && 'armor' in armors) {
		const armorList = ensureArray((armors as Record<string, unknown>).armor);
		for (const armor of armorList) {
			result.push({
				id: generateId(),
				name: getString(armor, 'name'),
				category: getString(armor, 'category'),
				ballistic: getNumber(armor, 'armor'),
				impact: getNumber(armor, 'armorimpact'),
				capacity: getNumber(armor, 'armorcapacity'),
				capacityUsed: 0,
				equipped: getString(armor, 'equipped') === 'True',
				cost: getNumber(armor, 'cost'),
				modifications: [],
				notes: getString(armor, 'notes')
			});
		}
	}

	return result;
}

/**
 * Parse cyberware from XML.
 */
function parseCyberware(cyberwares: unknown): CharacterCyberware[] {
	const result: CharacterCyberware[] = [];

	if (cyberwares && typeof cyberwares === 'object' && 'cyberware' in cyberwares) {
		const cyberList = ensureArray((cyberwares as Record<string, unknown>).cyberware);
		for (const cyber of cyberList) {
			const gradeStr = getString(cyber, 'grade');
			const grade: CyberwareGrade =
				gradeStr === 'Alphaware' ? 'Alphaware' :
					gradeStr === 'Betaware' ? 'Betaware' :
						gradeStr === 'Deltaware' ? 'Deltaware' :
							gradeStr === 'Used' ? 'Used' : 'Standard';

			result.push({
				id: generateId(),
				name: getString(cyber, 'name'),
				category: getString(cyber, 'category'),
				grade,
				rating: getNumber(cyber, 'rating'),
				essence: parseFloat(String(getNumberOrString(cyber, 'ess'))) || 0,
				cost: getNumber(cyber, 'cost'),
				capacity: getNumber(cyber, 'capacity'),
				capacityUsed: 0,
				location: getString(cyber, 'location'),
				subsystems: [],
				notes: getString(cyber, 'notes')
			});
		}
	}

	return result;
}

/**
 * Parse gear from XML.
 */
function parseGear(gears: unknown): CharacterGear[] {
	const result: CharacterGear[] = [];

	if (gears && typeof gears === 'object' && 'gear' in gears) {
		const gearList = ensureArray((gears as Record<string, unknown>).gear);
		for (const gear of gearList) {
			result.push({
				id: generateId(),
				name: getString(gear, 'name'),
				category: getString(gear, 'category'),
				rating: getNumber(gear, 'rating'),
				quantity: getNumber(gear, 'qty') || 1,
				cost: getNumber(gear, 'cost'),
				location: getString(gear, 'location'),
				notes: getString(gear, 'notes')
			});
		}
	}

	return result;
}

/**
 * Parse lifestyle from XML.
 */
function parseLifestyle(lifestyles: unknown): CharacterLifestyle | null {
	if (lifestyles && typeof lifestyles === 'object' && 'lifestyle' in lifestyles) {
		const lifestyleList = ensureArray((lifestyles as Record<string, unknown>).lifestyle);
		if (lifestyleList.length > 0) {
			const ls = lifestyleList[0];
			return {
				id: generateId(),
				name: getString(ls, 'name'),
				level: getString(ls, 'baselifestyle') || 'Middle',
				monthlyCost: getNumber(ls, 'cost'),
				monthsPrepaid: getNumber(ls, 'months') || 1,
				location: '',
				notes: getString(ls, 'notes')
			};
		}
	}

	return null;
}

/**
 * Parse magic data from XML.
 */
function parseMagic(data: Record<string, unknown>): CharacterMagic | null {
	if (getString(data, 'magenabled') !== 'True') {
		return null;
	}

	const spells: CharacterSpell[] = [];
	if (data.spells && typeof data.spells === 'object' && 'spell' in data.spells) {
		const spellList = ensureArray((data.spells as Record<string, unknown>).spell);
		for (const spell of spellList) {
			spells.push({
				id: generateId(),
				name: getString(spell, 'name'),
				category: getString(spell, 'category'),
				type: getString(spell, 'type'),
				range: getString(spell, 'range'),
				damage: getString(spell, 'damage'),
				duration: getString(spell, 'duration'),
				dv: getString(spell, 'dv'),
				notes: getString(spell, 'notes')
			});
		}
	}

	const powers: CharacterPower[] = [];
	if (data.powers && typeof data.powers === 'object' && 'power' in data.powers) {
		const powerList = ensureArray((data.powers as Record<string, unknown>).power);
		for (const power of powerList) {
			powers.push({
				id: generateId(),
				name: getString(power, 'name'),
				points: parseFloat(String(getNumberOrString(power, 'pointsperlevel'))) || 0.5,
				level: getNumber(power, 'rating') || 1,
				notes: getString(power, 'notes')
			});
		}
	}

	return {
		tradition: getString(data, 'tradition'),
		mentor: null,
		initiateGrade: getNumber(data, 'initiategrade'),
		powerPoints: powers.reduce((sum, p) => sum + p.points * p.level, 0),
		powerPointsUsed: powers.reduce((sum, p) => sum + p.points * p.level, 0),
		spells,
		powers,
		spirits: [],
		foci: [],
		metamagics: []
	};
}

/**
 * Parse resonance data from XML.
 */
function parseResonance(data: Record<string, unknown>): CharacterResonance | null {
	if (getString(data, 'resenabled') !== 'True') {
		return null;
	}

	return {
		stream: getString(data, 'stream'),
		submersionGrade: getNumber(data, 'submersiongrade'),
		complexForms: [],
		sprites: [],
		echoes: []
	};
}

/* Helper functions */

function getString(obj: unknown, key: string): string {
	if (obj && typeof obj === 'object' && key in obj) {
		const value = (obj as Record<string, unknown>)[key];
		return String(value ?? '');
	}
	return '';
}

function getNumber(obj: unknown, key: string): number {
	if (obj && typeof obj === 'object' && key in obj) {
		const value = (obj as Record<string, unknown>)[key];
		const num = Number(value);
		return isNaN(num) ? 0 : num;
	}
	return 0;
}

function getNumberOrString(obj: unknown, key: string): number | string {
	if (obj && typeof obj === 'object' && key in obj) {
		return (obj as Record<string, unknown>)[key] as number | string;
	}
	return 0;
}

function ensureArray<T>(value: T | T[]): T[] {
	if (Array.isArray(value)) return value;
	if (value === undefined || value === null) return [];
	return [value];
}

function generateId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `${timestamp}-${random}`;
}

/**
 * Import from file input.
 */
export async function importFromFile(file: File, userId: string): Promise<ImportResult> {
	try {
		const text = await file.text();
		return importFromChummer(text, userId);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to read file';
		return { success: false, error: message };
	}
}
