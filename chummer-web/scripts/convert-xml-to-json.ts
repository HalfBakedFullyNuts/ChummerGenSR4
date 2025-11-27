/**
 * XML to JSON Converter for Chummer Game Data
 * ============================================
 * Converts Chummer XML data files to optimized JSON format for the web app.
 *
 * Usage: npm run convert-data
 */

import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/* ESM compatibility for __dirname */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Constants for file paths */
const SOURCE_DIR = path.resolve(__dirname, '../../bin/data');
const OUTPUT_DIR = path.resolve(__dirname, '../static/data');

/* Maximum items to process per file (safety bound) */
const MAX_ITEMS = 10000;

/** XML Parser configuration for consistent parsing. */
const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	textNodeName: '#text',
	isArray: (tagName: string): boolean => {
		/* Tags that should always be arrays */
		const arrayTags = [
			'metatype', 'metavariant', 'skill', 'quality', 'spell',
			'power', 'gear', 'weapon', 'armor', 'cyberware', 'bioware',
			'vehicle', 'mod', 'accessory', 'spec', 'category', 'name',
			'program', 'critterpower', 'martialart', 'maneuver', 'lifestyle',
			'tradition', 'mentor', 'metamagic', 'echo', 'positive', 'negative'
		];
		return arrayTags.includes(tagName);
	}
});

/** Result type for conversion operations. */
interface ConversionResult {
	success: boolean;
	itemCount: number;
	error?: string;
}

/**
 * Ensure output directory exists.
 * Creates the directory if it doesn't exist.
 */
function ensureOutputDir(): void {
	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}
}

/**
 * Read and parse XML file.
 * Returns parsed object or null on error.
 */
function readXmlFile(filename: string): Record<string, unknown> | null {
	const filePath = path.join(SOURCE_DIR, filename);

	if (!fs.existsSync(filePath)) {
		console.error(`File not found: ${filePath}`);
		return null;
	}

	const content = fs.readFileSync(filePath, 'utf-8');
	const parsed = parser.parse(content) as Record<string, unknown>;
	return parsed;
}

/**
 * Write JSON file to output directory.
 * Returns true on success, false on error.
 */
function writeJsonFile(filename: string, data: unknown): boolean {
	const filePath = path.join(OUTPUT_DIR, filename);
	const content = JSON.stringify(data, null, 2);

	fs.writeFileSync(filePath, content, 'utf-8');
	console.log(`  Written: ${filename}`);
	return true;
}

/**
 * Normalize array - ensures value is always an array.
 * Handles XML parser quirks where single items aren't arrays.
 */
function toArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined || value === null) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
}

/**
 * Convert metatypes.xml to JSON.
 * Extracts metatypes with attribute limits and metavariants.
 */
function convertMetatypes(): ConversionResult {
	const xml = readXmlFile('metatypes.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const categories = toArray(chummer['categories']?.['category'] as string[]);
	const metatypes = toArray(chummer['metatypes']?.['metatype'] as Record<string, unknown>[]);

	interface Metatype {
		name: string;
		category: string;
		bp: number;
		attributes: {
			bod: { min: number; max: number; aug: number };
			agi: { min: number; max: number; aug: number };
			rea: { min: number; max: number; aug: number };
			str: { min: number; max: number; aug: number };
			cha: { min: number; max: number; aug: number };
			int: { min: number; max: number; aug: number };
			log: { min: number; max: number; aug: number };
			wil: { min: number; max: number; aug: number };
			ini: { min: number; max: number; aug: number };
			edg: { min: number; max: number; aug: number };
			mag: { min: number; max: number; aug: number };
			res: { min: number; max: number; aug: number };
			ess: { min: number; max: number; aug: number };
		};
		movement: string;
		qualities: { positive: string[]; negative: string[] };
		source: string;
		page: number;
		metavariants: Array<{
			name: string;
			bp: number;
			qualities: { positive: string[]; negative: string[] };
			source: string;
			page: number;
		}>;
	}

	const processed: Metatype[] = [];
	const limit = Math.min(metatypes.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const m = metatypes[i];
		if (!m || typeof m !== 'object') continue;

		const mt: Metatype = {
			name: String(m['name'] ?? ''),
			category: String(m['category'] ?? ''),
			bp: Number(m['bp'] ?? 0),
			attributes: {
				bod: { min: Number(m['bodmin'] ?? 1), max: Number(m['bodmax'] ?? 6), aug: Number(m['bodaug'] ?? 9) },
				agi: { min: Number(m['agimin'] ?? 1), max: Number(m['agimax'] ?? 6), aug: Number(m['agiaug'] ?? 9) },
				rea: { min: Number(m['reamin'] ?? 1), max: Number(m['reamax'] ?? 6), aug: Number(m['reaaug'] ?? 9) },
				str: { min: Number(m['strmin'] ?? 1), max: Number(m['strmax'] ?? 6), aug: Number(m['straug'] ?? 9) },
				cha: { min: Number(m['chamin'] ?? 1), max: Number(m['chamax'] ?? 6), aug: Number(m['chaaug'] ?? 9) },
				int: { min: Number(m['intmin'] ?? 1), max: Number(m['intmax'] ?? 6), aug: Number(m['intaug'] ?? 9) },
				log: { min: Number(m['logmin'] ?? 1), max: Number(m['logmax'] ?? 6), aug: Number(m['logaug'] ?? 9) },
				wil: { min: Number(m['wilmin'] ?? 1), max: Number(m['wilmax'] ?? 6), aug: Number(m['wilaug'] ?? 9) },
				ini: { min: Number(m['inimin'] ?? 2), max: Number(m['inimax'] ?? 12), aug: Number(m['iniaug'] ?? 18) },
				edg: { min: Number(m['edgmin'] ?? 1), max: Number(m['edgmax'] ?? 6), aug: Number(m['edgaug'] ?? 6) },
				mag: { min: Number(m['magmin'] ?? 1), max: Number(m['magmax'] ?? 6), aug: Number(m['magaug'] ?? 6) },
				res: { min: Number(m['resmin'] ?? 1), max: Number(m['resmax'] ?? 6), aug: Number(m['resaug'] ?? 6) },
				ess: { min: Number(m['essmin'] ?? 0), max: Number(m['essmax'] ?? 6), aug: Number(m['essaug'] ?? 6) }
			},
			movement: String(m['movement'] ?? ''),
			qualities: {
				positive: toArray((m['qualities'] as Record<string, unknown>)?.['positive']?.['quality'] as string[]),
				negative: toArray((m['qualities'] as Record<string, unknown>)?.['negative']?.['quality'] as string[])
			},
			source: String(m['source'] ?? ''),
			page: Number(m['page'] ?? 0),
			metavariants: []
		};

		/* Process metavariants */
		const variants = toArray((m['metavariants'] as Record<string, unknown>)?.['metavariant'] as Record<string, unknown>[]);
		for (const v of variants) {
			if (!v || typeof v !== 'object') continue;
			mt.metavariants.push({
				name: String(v['name'] ?? ''),
				bp: Number(v['bp'] ?? 0),
				qualities: {
					positive: toArray((v['qualities'] as Record<string, unknown>)?.['positive']?.['quality'] as string[]),
					negative: toArray((v['qualities'] as Record<string, unknown>)?.['negative']?.['quality'] as string[])
				},
				source: String(v['source'] ?? ''),
				page: Number(v['page'] ?? 0)
			});
		}

		processed.push(mt);
	}

	const output = { categories, metatypes: processed };
	writeJsonFile('metatypes.json', output);
	return { success: true, itemCount: processed.length };
}

/**
 * Convert skills.xml to JSON.
 * Extracts skills with categories, groups, and specializations.
 */
function convertSkills(): ConversionResult {
	const xml = readXmlFile('skills.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const skillGroups = toArray((chummer['skillgroups'] as Record<string, unknown>)?.['name'] as string[]);
	const categoriesRaw = toArray((chummer['categories'] as Record<string, unknown>)?.['category'] as Array<string | Record<string, unknown>>);
	const skillsRaw = toArray((chummer['skills'] as Record<string, unknown>)?.['skill'] as Record<string, unknown>[]);

	/* Parse categories with type attribute */
	interface Category {
		name: string;
		type: 'active' | 'knowledge';
	}
	const categories: Category[] = categoriesRaw.map(c => {
		if (typeof c === 'string') {
			return { name: c, type: 'active' as const };
		}
		return {
			name: String(c['#text'] ?? ''),
			type: (c['@_type'] === 'knowledge' ? 'knowledge' : 'active') as 'active' | 'knowledge'
		};
	});

	interface Skill {
		name: string;
		attribute: string;
		category: string;
		default: boolean;
		skillgroup: string;
		specializations: string[];
		source: string;
		page: number;
	}

	const skills: Skill[] = [];
	const limit = Math.min(skillsRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const s = skillsRaw[i];
		if (!s || typeof s !== 'object') continue;

		skills.push({
			name: String(s['name'] ?? ''),
			attribute: String(s['attribute'] ?? ''),
			category: String(s['category'] ?? ''),
			default: String(s['default']).toLowerCase() === 'yes',
			skillgroup: String(s['skillgroup'] ?? ''),
			specializations: toArray((s['specs'] as Record<string, unknown>)?.['spec'] as string[]),
			source: String(s['source'] ?? ''),
			page: Number(s['page'] ?? 0)
		});
	}

	const output = { skillGroups, categories, skills };
	writeJsonFile('skills.json', output);
	return { success: true, itemCount: skills.length };
}

/**
 * Convert qualities.xml to JSON.
 * Extracts positive and negative qualities with costs and effects.
 */
function convertQualities(): ConversionResult {
	const xml = readXmlFile('qualities.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const categoriesRaw = toArray((chummer['categories'] as Record<string, unknown>)?.['category'] as string[]);
	const qualitiesRaw = toArray((chummer['qualities'] as Record<string, unknown>)?.['quality'] as Record<string, unknown>[]);

	interface Quality {
		name: string;
		bp: number;
		category: 'Positive' | 'Negative';
		source: string;
		page: number;
		mutant: boolean;
		limit: boolean;
	}

	const qualities: Quality[] = [];
	const limit = Math.min(qualitiesRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const q = qualitiesRaw[i];
		if (!q || typeof q !== 'object') continue;

		qualities.push({
			name: String(q['name'] ?? ''),
			bp: Number(q['bp'] ?? 0),
			category: String(q['category'] ?? 'Positive') as 'Positive' | 'Negative',
			source: String(q['source'] ?? ''),
			page: Number(q['page'] ?? 0),
			mutant: String(q['mutant']).toLowerCase() === 'yes',
			limit: String(q['limit']).toLowerCase() !== 'no'
		});
	}

	const output = { categories: categoriesRaw, qualities };
	writeJsonFile('qualities.json', output);
	return { success: true, itemCount: qualities.length };
}

/**
 * Convert spells.xml to JSON.
 * Extracts spells with categories, types, and damage codes.
 */
function convertSpells(): ConversionResult {
	const xml = readXmlFile('spells.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const categoriesRaw = toArray((chummer['categories'] as Record<string, unknown>)?.['category'] as string[]);
	const spellsRaw = toArray((chummer['spells'] as Record<string, unknown>)?.['spell'] as Record<string, unknown>[]);

	interface Spell {
		name: string;
		category: string;
		type: string;
		range: string;
		damage: string;
		duration: string;
		dv: string;
		descriptor: string;
		source: string;
		page: number;
	}

	const spells: Spell[] = [];
	const limit = Math.min(spellsRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const s = spellsRaw[i];
		if (!s || typeof s !== 'object') continue;

		spells.push({
			name: String(s['name'] ?? ''),
			category: String(s['category'] ?? ''),
			type: String(s['type'] ?? ''),
			range: String(s['range'] ?? ''),
			damage: String(s['damage'] ?? ''),
			duration: String(s['duration'] ?? ''),
			dv: String(s['dv'] ?? ''),
			descriptor: String(s['descriptor'] ?? ''),
			source: String(s['source'] ?? ''),
			page: Number(s['page'] ?? 0)
		});
	}

	const output = { categories: categoriesRaw, spells };
	writeJsonFile('spells.json', output);
	return { success: true, itemCount: spells.length };
}

/**
 * Convert powers.xml to JSON.
 * Extracts adept powers with costs and effects.
 */
function convertPowers(): ConversionResult {
	const xml = readXmlFile('powers.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const powersRaw = toArray((chummer['powers'] as Record<string, unknown>)?.['power'] as Record<string, unknown>[]);

	interface Power {
		name: string;
		points: number;
		levels: boolean;
		maxlevels: number;
		action: string;
		source: string;
		page: number;
	}

	const powers: Power[] = [];
	const limit = Math.min(powersRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const p = powersRaw[i];
		if (!p || typeof p !== 'object') continue;

		powers.push({
			name: String(p['name'] ?? ''),
			points: Number(p['points'] ?? 0),
			levels: String(p['levels']).toLowerCase() === 'true',
			maxlevels: Number(p['maxlevels'] ?? 0),
			action: String(p['action'] ?? ''),
			source: String(p['source'] ?? ''),
			page: Number(p['page'] ?? 0)
		});
	}

	writeJsonFile('powers.json', { powers });
	return { success: true, itemCount: powers.length };
}

/**
 * Convert traditions.xml to JSON.
 * Extracts magic traditions with drain attributes.
 */
function convertTraditions(): ConversionResult {
	const xml = readXmlFile('traditions.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const traditionsRaw = toArray((chummer['traditions'] as Record<string, unknown>)?.['tradition'] as Record<string, unknown>[]);

	interface Tradition {
		name: string;
		drain: string;
		spirits: string[];
		source: string;
		page: number;
	}

	const traditions: Tradition[] = [];
	const limit = Math.min(traditionsRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const t = traditionsRaw[i];
		if (!t || typeof t !== 'object') continue;

		traditions.push({
			name: String(t['name'] ?? ''),
			drain: String(t['drain'] ?? ''),
			spirits: toArray((t['spirits'] as Record<string, unknown>)?.['spirit'] as string[]),
			source: String(t['source'] ?? ''),
			page: Number(t['page'] ?? 0)
		});
	}

	writeJsonFile('traditions.json', { traditions });
	return { success: true, itemCount: traditions.length };
}

/**
 * Convert mentors.xml to JSON.
 * Extracts mentor spirits with bonuses and restrictions.
 */
function convertMentors(): ConversionResult {
	const xml = readXmlFile('mentors.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const mentorsRaw = toArray((chummer['mentors'] as Record<string, unknown>)?.['mentor'] as Record<string, unknown>[]);

	interface Mentor {
		name: string;
		advantage: string;
		disadvantage: string;
		source: string;
		page: number;
	}

	const mentors: Mentor[] = [];
	const limit = Math.min(mentorsRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const m = mentorsRaw[i];
		if (!m || typeof m !== 'object') continue;

		mentors.push({
			name: String(m['name'] ?? ''),
			advantage: String(m['advantage'] ?? ''),
			disadvantage: String(m['disadvantage'] ?? ''),
			source: String(m['source'] ?? ''),
			page: Number(m['page'] ?? 0)
		});
	}

	writeJsonFile('mentors.json', { mentors });
	return { success: true, itemCount: mentors.length };
}

/**
 * Convert lifestyles.xml to JSON.
 * Extracts lifestyle options with costs.
 */
function convertLifestyles(): ConversionResult {
	const xml = readXmlFile('lifestyles.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const lifestylesRaw = toArray((chummer['lifestyles'] as Record<string, unknown>)?.['lifestyle'] as Record<string, unknown>[]);

	interface Lifestyle {
		name: string;
		cost: number;
		dice: number;
		multiplier: number;
		source: string;
		page: number;
	}

	const lifestyles: Lifestyle[] = [];
	const limit = Math.min(lifestylesRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const l = lifestylesRaw[i];
		if (!l || typeof l !== 'object') continue;

		lifestyles.push({
			name: String(l['name'] ?? ''),
			cost: Number(l['cost'] ?? 0),
			dice: Number(l['dice'] ?? 0),
			multiplier: Number(l['multiplier'] ?? 1),
			source: String(l['source'] ?? ''),
			page: Number(l['page'] ?? 0)
		});
	}

	writeJsonFile('lifestyles.json', { lifestyles });
	return { success: true, itemCount: lifestyles.length };
}

/**
 * Convert programs.xml to JSON.
 * Extracts matrix programs for technomancers.
 */
function convertPrograms(): ConversionResult {
	const xml = readXmlFile('programs.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const categoriesRaw = toArray((chummer['categories'] as Record<string, unknown>)?.['category'] as string[]);
	const programsRaw = toArray((chummer['programs'] as Record<string, unknown>)?.['program'] as Record<string, unknown>[]);

	interface Program {
		name: string;
		category: string;
		source: string;
		page: number;
	}

	const programs: Program[] = [];
	const limit = Math.min(programsRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const p = programsRaw[i];
		if (!p || typeof p !== 'object') continue;

		programs.push({
			name: String(p['name'] ?? ''),
			category: String(p['category'] ?? ''),
			source: String(p['source'] ?? ''),
			page: Number(p['page'] ?? 0)
		});
	}

	writeJsonFile('programs.json', { categories: categoriesRaw, programs });
	return { success: true, itemCount: programs.length };
}

/**
 * Main entry point.
 * Runs all converters and reports results.
 */
function main(): void {
	console.log('ChummerWeb Data Converter');
	console.log('=========================\n');

	ensureOutputDir();

	const converters: Array<{ name: string; fn: () => ConversionResult }> = [
		{ name: 'Metatypes', fn: convertMetatypes },
		{ name: 'Skills', fn: convertSkills },
		{ name: 'Qualities', fn: convertQualities },
		{ name: 'Spells', fn: convertSpells },
		{ name: 'Powers', fn: convertPowers },
		{ name: 'Traditions', fn: convertTraditions },
		{ name: 'Mentors', fn: convertMentors },
		{ name: 'Lifestyles', fn: convertLifestyles },
		{ name: 'Programs', fn: convertPrograms }
	];

	let totalItems = 0;
	let successCount = 0;

	for (const converter of converters) {
		console.log(`Converting ${converter.name}...`);
		const result = converter.fn();

		if (result.success) {
			console.log(`  ✓ ${result.itemCount} items\n`);
			totalItems += result.itemCount;
			successCount++;
		} else {
			console.log(`  ✗ Error: ${result.error}\n`);
		}
	}

	console.log('=========================');
	console.log(`Complete: ${successCount}/${converters.length} files, ${totalItems} total items`);
}

main();
