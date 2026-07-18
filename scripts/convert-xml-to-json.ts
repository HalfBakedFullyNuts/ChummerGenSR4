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
const SOURCE_DIR = path.resolve(__dirname, '../bin/data');
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
			'metatype',
			'metavariant',
			'skill',
			'quality',
			'spell',
			'power',
			'gear',
			'weapon',
			'armor',
			'cyberware',
			'bioware',
			'vehicle',
			'mod',
			'accessory',
			'spec',
			'category',
			'name',
			'program',
			'critterpower',
			'martialart',
			'maneuver',
			'lifestyle',
			'tradition',
			'mentor',
			'metamagic',
			'echo',
			'positive',
			'negative'
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
 * Minimal recursive-descent arithmetic evaluator for Rating-based cost/essence
 * formulas (e.g. "Rating * 3000", "600 + (Rating * 100)", "(Rating - 3) * 1500"),
 * used only to compute a flat rating-1 display baseline at conversion time —
 * mirrors src/lib/engine/improvementManager.ts's resolveBonusValue evaluator,
 * duplicated here (rather than imported) since this script is a standalone
 * Node/tsx entry point with no SvelteKit path-alias resolution. The actual
 * per-purchase evaluation at runtime happens via that module's
 * evaluateRatingFormula against the preserved costFormula/essFormula string.
 * Returns undefined for expressions it can't parse (e.g. `ceiling(...)`/`div`).
 */
function evaluateFormulaAtRating(formula: string, rating: number): number | undefined {
	const substituted = formula.replace(/Rating/gi, String(rating));
	let i = 0;
	const tokens: string[] = [];
	while (i < substituted.length) {
		const ch = substituted[i]!;
		if (ch === ' ') {
			i++;
			continue;
		}
		if ('+-*/()'.includes(ch)) {
			tokens.push(ch);
			i++;
			continue;
		}
		if (/[0-9.]/.test(ch)) {
			let j = i;
			while (j < substituted.length && /[0-9.]/.test(substituted[j]!)) j++;
			tokens.push(substituted.slice(i, j));
			i = j;
			continue;
		}
		return undefined;
	}

	const pos = { i: 0 };
	const parseFactor = (): number | undefined => {
		const tok = tokens[pos.i];
		if (tok === '-') {
			pos.i++;
			const inner = parseFactor();
			return inner === undefined ? undefined : -inner;
		}
		if (tok === '(') {
			pos.i++;
			const inner = parseExpr();
			if (tokens[pos.i] !== ')') return undefined;
			pos.i++;
			return inner;
		}
		if (tok !== undefined && /^[0-9.]+$/.test(tok)) {
			pos.i++;
			return Number(tok);
		}
		return undefined;
	};
	const parseTerm = (): number | undefined => {
		let value = parseFactor();
		if (value === undefined) return undefined;
		while (tokens[pos.i] === '*' || tokens[pos.i] === '/') {
			const op = tokens[pos.i];
			pos.i++;
			const rhs = parseFactor();
			if (rhs === undefined) return undefined;
			value = op === '*' ? value * rhs : value / rhs;
		}
		return value;
	};
	const parseExpr = (): number | undefined => {
		let value = parseTerm();
		if (value === undefined) return undefined;
		while (tokens[pos.i] === '+' || tokens[pos.i] === '-') {
			const op = tokens[pos.i];
			pos.i++;
			const rhs = parseTerm();
			if (rhs === undefined) return undefined;
			value = op === '+' ? value + rhs : value - rhs;
		}
		return value;
	};

	const result = parseExpr();
	if (result === undefined || pos.i !== tokens.length) return undefined;
	/* Clean up binary floating-point noise (e.g. 0.1 + 0.2 = 0.30000000000000004);
	 * Shadowrun ess/cost formulas never need more than a handful of decimals. */
	return Math.round(result * 1e6) / 1e6;
}

/**
 * Parse a formula value into a plain number or a `FixedValues(...)` per-rating
 * table. Any other Rating-referencing arithmetic ("Rating * 3000",
 * "600 + (Rating * 100)", "(Rating - 3) * 1500", ...) is intentionally left
 * unparsed here and returned as `null` — reducing it to a single coefficient
 * silently discards the Rating-scaling (or the additive base), which is
 * exactly the issue #71-adjacent bug this function used to have. Callers
 * preserve the original string (e.g. `costFormula`/`essFormula`) so it can be
 * evaluated against the actual purchased rating at runtime instead.
 *
 * Handles:
 * - Simple numbers: "5000" -> 5000
 * - FixedValues: "FixedValues(500,750,1000)" -> [500, 750, 1000]
 *
 * Returns number/array for the shapes above, null otherwise (formula string).
 */
function parseFormulaValue(value: unknown): number | number[] | null {
	if (value === undefined || value === null || value === '') {
		return null;
	}

	/* Already a number */
	if (typeof value === 'number') {
		return value;
	}

	const str = String(value).trim();

	/* Simple number */
	const simpleNum = Number(str);
	if (!isNaN(simpleNum)) {
		return simpleNum;
	}

	/* FixedValues(a,b,c,d) - return array of values by rating */
	const fixedMatch = str.match(/^FixedValues\(([^)]+)\)$/i);
	if (fixedMatch && fixedMatch[1]) {
		const values = fixedMatch[1].split(',').map((v) => parseFloat(v.trim()));
		if (values.every((v) => !isNaN(v))) {
			return values;
		}
	}

	return null;
}

/**
 * Parse cost/essence value, returning base number or null.
 * Uses parseFormulaValue internally, flattens arrays to first value.
 */
function parseNumericFormula(value: unknown): number | null {
	const result = parseFormulaValue(value);
	if (result === null) return null;
	if (Array.isArray(result)) {
		return result.length > 0 ? result[0]! : null;
	}
	return result;
}

/**
 * Parse a value, returning the numeric result or the original string.
 * Used for availability and capacity which may contain formulas we want to preserve.
 */
function parseOrString(value: unknown): string {
	if (value === undefined || value === null || value === '') {
		return '0';
	}
	return String(value);
}

/**
 * Repeating child keys inside a <bonus> node that must always be arrays,
 * even when only a single instance is present in the source XML.
 * Mirrors src/lib/types/improvements.ts BonusData.
 */
const BONUS_LIST_KEYS = [
	'specificattribute',
	'addattribute',
	'specificskill',
	'skillgroup',
	'skillcategory'
];

/**
 * Flatten a single list-item node (e.g. one <specificattribute> entry) into a
 * plain object, hoisting any XML attribute on a child element (e.g. the
 * `precedence` attribute on `<name precedence="1">REA</name>`) up as a
 * sibling key alongside that child's text value.
 *
 * `<specificattribute><name precedence="1">REA</name><val>Rating</val></specificattribute>`
 * becomes `{ name: 'REA', precedence: '1', val: 'Rating' }`.
 */
function flattenBonusListItem(raw: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, rawVal] of Object.entries(raw)) {
		/*
		 * `name` (among others) is in the XML parser's global isArray list
		 * (needed elsewhere for repeated <name rating="X">...</name> siblings),
		 * so a single `<name precedence="1">REA</name>` child arrives
		 * pre-wrapped as a one-element array. Unwrap before checking for
		 * the `#text`/attribute leaf shape.
		 */
		const val = Array.isArray(rawVal) && rawVal.length === 1 ? rawVal[0] : rawVal;
		if (val !== null && typeof val === 'object' && !Array.isArray(val) && '#text' in val) {
			const obj = val as Record<string, unknown>;
			result[key] = obj['#text'];
			for (const [attrKey, attrVal] of Object.entries(obj)) {
				if (attrKey.startsWith('@_')) {
					result[attrKey.slice(2)] = attrVal;
				}
			}
		} else {
			result[key] = val;
		}
	}
	return result;
}

/**
 * Generically flatten a parsed XML value for structure-preserving JSON output:
 * - A self-closing empty tag (e.g. `<blackmarketdiscount />`) parses to `''`;
 *   in Chummer's bonus schema an empty tag is always a presence/boolean flag
 *   (desktop's CreateImprovements checks node existence, not content), so it
 *   becomes `true` — never a falsy `''` that would silently break `if (bonus.x)`.
 * - Plain primitives (numbers/booleans already resolved by fast-xml-parser) pass through.
 * - A `{'#text': X, '@_attr': Y}` leaf (element with both text and attributes,
 *   e.g. rare cases outside the known list-item shapes) becomes `{ value: X, attr: Y }`.
 * - A leaf with only `#text` passes through as the text.
 * - A plain nested object with no `#text` (e.g. `<conditionmonitor><physical>1</physical></conditionmonitor>`)
 *   recurses per key, stripping `@_` prefixes.
 * - A single-key `{ name: 'X' }` object collapses to just `'X'` (desktop's
 *   `<enabletab><name>adept</name></enabletab>` idiom for one-off wrapper tags).
 */
function flattenGenericBonusValue(val: unknown): unknown {
	if (val === null || val === undefined) return undefined;
	if (val === '') return true;
	if (typeof val !== 'object') return val;
	if (Array.isArray(val)) return val.map(flattenGenericBonusValue);

	const obj = val as Record<string, unknown>;

	if ('#text' in obj) {
		const attrs = Object.entries(obj).filter(([k]) => k.startsWith('@_'));
		if (attrs.length === 0) return obj['#text'];
		const flat: Record<string, unknown> = { value: obj['#text'] };
		for (const [k, v] of attrs) flat[k.slice(2)] = v;
		return flat;
	}

	const keys = Object.keys(obj);
	if (keys.length === 1 && keys[0] === 'name') {
		/* `name` is force-arrayed by the parser's global isArray list even for
		 * single, attribute-less occurrences (e.g. <enabletab><name>adept</name></enabletab>). */
		const nameVal =
			Array.isArray(obj['name']) && (obj['name'] as unknown[]).length === 1
				? (obj['name'] as unknown[])[0]
				: obj['name'];
		if (typeof nameVal !== 'object') return nameVal;
	}

	const nested: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) {
		if (k.startsWith('@_')) {
			nested[k.slice(2)] = v;
			continue;
		}
		nested[k] = flattenGenericBonusValue(v);
	}
	return nested;
}

/**
 * Convert a raw parsed `<bonus>` XML node into structure-preserving JSON.
 * Does not resolve semantics (e.g. "Rating" expressions, precedence
 * stacking) — that is engine/improvementManager.ts's job (see #66/#68).
 * This function's only job is to never silently drop bonus data.
 */
function extractBonus(raw: unknown): Record<string, unknown> | undefined {
	if (raw === null || raw === undefined || typeof raw !== 'object') return undefined;
	const rawObj = raw as Record<string, unknown>;
	if (Object.keys(rawObj).length === 0) return undefined;

	const result: Record<string, unknown> = {};
	for (const [key, val] of Object.entries(rawObj)) {
		if (BONUS_LIST_KEYS.includes(key)) {
			result[key] = toArray(val as Record<string, unknown> | Record<string, unknown>[]).map((item) =>
				flattenBonusListItem(item as Record<string, unknown>)
			);
		} else {
			/*
			 * Some bonus child tags share a name with the XML parser's global
			 * isArray list (added for unrelated top-level collections, e.g.
			 * `<armor>` under `<armors>`), so a single, non-repeating child
			 * like `<bonus><armor><b>1</b><i>1</i></armor></bonus>` arrives
			 * pre-wrapped in a one-element array. Unwrap it here — outside
			 * BONUS_LIST_KEYS, a real repeating bonus child never occurs today.
			 */
			const unwrapped = Array.isArray(val) && val.length === 1 ? val[0] : val;
			result[key] = flattenGenericBonusValue(unwrapped);
		}
	}
	return result;
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
		bonus?: Record<string, unknown>;
		metavariants: Array<{
			name: string;
			bp: number;
			qualities: { positive: string[]; negative: string[] };
			source: string;
			page: number;
			bonus?: Record<string, unknown>;
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
				bod: {
					min: Number(m['bodmin'] ?? 1),
					max: Number(m['bodmax'] ?? 6),
					aug: Number(m['bodaug'] ?? 9)
				},
				agi: {
					min: Number(m['agimin'] ?? 1),
					max: Number(m['agimax'] ?? 6),
					aug: Number(m['agiaug'] ?? 9)
				},
				rea: {
					min: Number(m['reamin'] ?? 1),
					max: Number(m['reamax'] ?? 6),
					aug: Number(m['reaaug'] ?? 9)
				},
				str: {
					min: Number(m['strmin'] ?? 1),
					max: Number(m['strmax'] ?? 6),
					aug: Number(m['straug'] ?? 9)
				},
				cha: {
					min: Number(m['chamin'] ?? 1),
					max: Number(m['chamax'] ?? 6),
					aug: Number(m['chaaug'] ?? 9)
				},
				int: {
					min: Number(m['intmin'] ?? 1),
					max: Number(m['intmax'] ?? 6),
					aug: Number(m['intaug'] ?? 9)
				},
				log: {
					min: Number(m['logmin'] ?? 1),
					max: Number(m['logmax'] ?? 6),
					aug: Number(m['logaug'] ?? 9)
				},
				wil: {
					min: Number(m['wilmin'] ?? 1),
					max: Number(m['wilmax'] ?? 6),
					aug: Number(m['wilaug'] ?? 9)
				},
				ini: {
					min: Number(m['inimin'] ?? 2),
					max: Number(m['inimax'] ?? 12),
					aug: Number(m['iniaug'] ?? 18)
				},
				edg: {
					min: Number(m['edgmin'] ?? 1),
					max: Number(m['edgmax'] ?? 6),
					aug: Number(m['edgaug'] ?? 6)
				},
				mag: {
					min: Number(m['magmin'] ?? 1),
					max: Number(m['magmax'] ?? 6),
					aug: Number(m['magaug'] ?? 6)
				},
				res: {
					min: Number(m['resmin'] ?? 1),
					max: Number(m['resmax'] ?? 6),
					aug: Number(m['resaug'] ?? 6)
				},
				ess: {
					min: Number(m['essmin'] ?? 0),
					max: Number(m['essmax'] ?? 6),
					aug: Number(m['essaug'] ?? 6)
				}
			},
			movement: String(m['movement'] ?? ''),
			qualities: {
				positive: toArray(
					(m['qualities'] as Record<string, unknown>)?.['positive']?.['quality'] as string[]
				),
				negative: toArray(
					(m['qualities'] as Record<string, unknown>)?.['negative']?.['quality'] as string[]
				)
			},
			source: String(m['source'] ?? ''),
			page: Number(m['page'] ?? 0),
			metavariants: []
		};

		const mtBonus = extractBonus(m['bonus']);
		if (mtBonus) mt.bonus = mtBonus;

		/* Process metavariants */
		const variants = toArray(
			(m['metavariants'] as Record<string, unknown>)?.['metavariant'] as Record<string, unknown>[]
		);
		for (const v of variants) {
			if (!v || typeof v !== 'object') continue;
			const variant: Metatype['metavariants'][number] = {
				name: String(v['name'] ?? ''),
				bp: Number(v['bp'] ?? 0),
				qualities: {
					positive: toArray(
						(v['qualities'] as Record<string, unknown>)?.['positive']?.['quality'] as string[]
					),
					negative: toArray(
						(v['qualities'] as Record<string, unknown>)?.['negative']?.['quality'] as string[]
					)
				},
				source: String(v['source'] ?? ''),
				page: Number(v['page'] ?? 0)
			};
			const variantBonus = extractBonus(v['bonus']);
			if (variantBonus) variant.bonus = variantBonus;
			mt.metavariants.push(variant);
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
	const skillGroups = toArray(
		(chummer['skillgroups'] as Record<string, unknown>)?.['name'] as string[]
	);
	const categoriesRaw = toArray(
		(chummer['categories'] as Record<string, unknown>)?.['category'] as Array<
			string | Record<string, unknown>
		>
	);
	const skillsRaw = toArray(
		(chummer['skills'] as Record<string, unknown>)?.['skill'] as Record<string, unknown>[]
	);

	/* Parse categories with type attribute */
	interface Category {
		name: string;
		type: 'active' | 'knowledge';
	}
	const categories: Category[] = categoriesRaw.map((c) => {
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
	const categoriesRaw = toArray(
		(chummer['categories'] as Record<string, unknown>)?.['category'] as string[]
	);
	const qualitiesRaw = toArray(
		(chummer['qualities'] as Record<string, unknown>)?.['quality'] as Record<string, unknown>[]
	);

	interface Quality {
		name: string;
		bp: number;
		category: 'Positive' | 'Negative';
		source: string;
		page: number;
		mutant: boolean;
		limit: boolean;
		bonus?: Record<string, unknown>;
		effect?: string;
		descriptionLabel?: string;
	}

	/*
	 * effect/descriptionLabel are hand-authored display text with no
	 * corresponding tag in qualities.xml. Preserve them from the existing
	 * output by name so regenerating never drops curated content the
	 * desktop XML can't supply.
	 */
	const existingPath = path.join(OUTPUT_DIR, 'qualities.json');
	const preservedByName = new Map<string, { effect?: string; descriptionLabel?: string }>();
	if (fs.existsSync(existingPath)) {
		const existing = JSON.parse(fs.readFileSync(existingPath, 'utf-8')) as {
			qualities: Array<{ name: string; effect?: string; descriptionLabel?: string }>;
		};
		for (const q of existing.qualities) {
			preservedByName.set(q.name, { effect: q.effect, descriptionLabel: q.descriptionLabel });
		}
	}

	const qualities: Quality[] = [];
	const limit = Math.min(qualitiesRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const q = qualitiesRaw[i];
		if (!q || typeof q !== 'object') continue;

		const name = String(q['name'] ?? '');
		const preserved = preservedByName.get(name);

		const quality: Quality = {
			name,
			bp: Number(q['bp'] ?? 0),
			category: String(q['category'] ?? 'Positive') as 'Positive' | 'Negative',
			source: String(q['source'] ?? ''),
			page: Number(q['page'] ?? 0),
			mutant: String(q['mutant']).toLowerCase() === 'yes',
			limit: String(q['limit']).toLowerCase() !== 'no'
		};

		const bonus = extractBonus(q['bonus']);
		if (bonus) quality.bonus = bonus;
		if (preserved?.effect) quality.effect = preserved.effect;
		if (preserved?.descriptionLabel) quality.descriptionLabel = preserved.descriptionLabel;

		qualities.push(quality);
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
	const categoriesRaw = toArray(
		(chummer['categories'] as Record<string, unknown>)?.['category'] as string[]
	);
	const spellsRaw = toArray(
		(chummer['spells'] as Record<string, unknown>)?.['spell'] as Record<string, unknown>[]
	);

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
	const powersRaw = toArray(
		(chummer['powers'] as Record<string, unknown>)?.['power'] as Record<string, unknown>[]
	);

	interface Power {
		name: string;
		points: number;
		levels: boolean;
		maxlevels: number;
		action: string;
		source: string;
		page: number;
		bonus?: Record<string, unknown>;
	}

	const powers: Power[] = [];
	const limit = Math.min(powersRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const p = powersRaw[i];
		if (!p || typeof p !== 'object') continue;

		const power: Power = {
			name: String(p['name'] ?? ''),
			points: Number(p['points'] ?? 0),
			levels: String(p['levels']).toLowerCase() === 'true',
			maxlevels: Number(p['maxlevels'] ?? 0),
			action: String(p['action'] ?? ''),
			source: String(p['source'] ?? ''),
			page: Number(p['page'] ?? 0)
		};
		const bonus = extractBonus(p['bonus']);
		if (bonus) power.bonus = bonus;
		powers.push(power);
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
	const traditionsRaw = toArray(
		(chummer['traditions'] as Record<string, unknown>)?.['tradition'] as Record<string, unknown>[]
	);

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
	const mentorsRaw = toArray(
		(chummer['mentors'] as Record<string, unknown>)?.['mentor'] as Record<string, unknown>[]
	);

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
	const lifestylesRaw = toArray(
		(chummer['lifestyles'] as Record<string, unknown>)?.['lifestyle'] as Record<string, unknown>[]
	);

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
	const categoriesRaw = toArray(
		(chummer['categories'] as Record<string, unknown>)?.['category'] as string[]
	);
	const programsRaw = toArray(
		(chummer['programs'] as Record<string, unknown>)?.['program'] as Record<string, unknown>[]
	);

	interface Program {
		name: string;
		category: string;
		complexform: boolean;
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
			complexform: String(p['complexform']).toLowerCase() === 'yes',
			source: String(p['source'] ?? ''),
			page: Number(p['page'] ?? 0)
		});
	}

	writeJsonFile('programs.json', { categories: categoriesRaw, programs });
	return { success: true, itemCount: programs.length };
}

/**
 * Convert weapons.xml to JSON.
 * Extracts weapons with damage, AP, and availability.
 */
function convertWeapons(): ConversionResult {
	const xml = readXmlFile('weapons.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const categoriesRaw = toArray(
		(chummer['categories'] as Record<string, unknown>)?.['category'] as string[]
	);
	const weaponsRaw = toArray(
		(chummer['weapons'] as Record<string, unknown>)?.['weapon'] as Record<string, unknown>[]
	);

	interface Weapon {
		name: string;
		category: string;
		type: string;
		reach: number;
		damage: string;
		ap: string;
		mode: string;
		rc: string;
		ammo: string;
		conceal: number;
		avail: string;
		cost: number;
		source: string;
		page: number;
	}

	const weapons: Weapon[] = [];
	const limit = Math.min(weaponsRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const w = weaponsRaw[i];
		if (!w || typeof w !== 'object') continue;

		weapons.push({
			name: String(w['name'] ?? ''),
			category: String(w['category'] ?? ''),
			type: String(w['type'] ?? ''),
			reach: Number(w['reach'] ?? 0),
			damage: String(w['damage'] ?? ''),
			ap: String(w['ap'] ?? '-'),
			mode: String(w['mode'] ?? ''),
			rc: String(w['rc'] ?? ''),
			ammo: String(w['ammo'] ?? ''),
			conceal: Number(w['conceal'] ?? 0),
			avail: String(w['avail'] ?? '0'),
			cost: Number(w['cost'] ?? 0),
			source: String(w['source'] ?? ''),
			page: Number(w['page'] ?? 0)
		});
	}

	writeJsonFile('weapons.json', { categories: categoriesRaw, weapons });
	return { success: true, itemCount: weapons.length };
}

/**
 * Convert armor.xml to JSON.
 * Extracts armor with ballistic and impact ratings.
 */
function convertArmor(): ConversionResult {
	const xml = readXmlFile('armor.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const categoriesRaw = toArray(
		(chummer['categories'] as Record<string, unknown>)?.['category'] as string[]
	);
	const armorRaw = toArray(
		(chummer['armors'] as Record<string, unknown>)?.['armor'] as Record<string, unknown>[]
	);

	interface Armor {
		name: string;
		category: string;
		ballistic: number;
		impact: number;
		capacity: number;
		avail: string;
		cost: number;
		source: string;
		page: number;
		bonus?: Record<string, unknown>;
	}

	const armor: Armor[] = [];
	const limit = Math.min(armorRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const a = armorRaw[i];
		if (!a || typeof a !== 'object') continue;

		/* Parse ballistic/impact - can be number or "+X" */
		const bVal = String(a['b'] ?? '0');
		const iVal = String(a['i'] ?? '0');

		const armorItem: Armor = {
			name: String(a['name'] ?? ''),
			category: String(a['category'] ?? ''),
			ballistic: bVal.startsWith('+') ? parseInt(bVal) : Number(bVal),
			impact: iVal.startsWith('+') ? parseInt(iVal) : Number(iVal),
			capacity: Number(a['armorcapacity'] ?? 0),
			avail: String(a['avail'] ?? '0'),
			cost: Number(String(a['cost'] ?? '0').replace(/Variable\([^)]+\)/g, '0')),
			source: String(a['source'] ?? ''),
			page: Number(a['page'] ?? 0)
		};
		const bonus = extractBonus(a['bonus']);
		if (bonus) armorItem.bonus = bonus;
		armor.push(armorItem);
	}

	writeJsonFile('armor.json', { categories: categoriesRaw, armor });
	return { success: true, itemCount: armor.length };
}

/**
 * Convert cyberware.xml to JSON.
 * Extracts cyberware with essence costs and grades.
 */
function convertCyberware(): ConversionResult {
	const xml = readXmlFile('cyberware.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const categoriesRaw = toArray(
		(chummer['categories'] as Record<string, unknown>)?.['category'] as string[]
	);
	const gradesRaw = toArray(
		(chummer['grades'] as Record<string, unknown>)?.['grade'] as Record<string, unknown>[]
	);
	const cyberwareRaw = toArray(
		(chummer['cyberwares'] as Record<string, unknown>)?.['cyberware'] as Record<string, unknown>[]
	);

	interface CyberwareGrade {
		name: string;
		essMultiplier: number;
		costMultiplier: number;
		availModifier: number;
	}

	const grades: CyberwareGrade[] = [];
	for (const g of gradesRaw) {
		if (!g || typeof g !== 'object') continue;
		grades.push({
			name: String(g['name'] ?? ''),
			essMultiplier: Number(g['ess'] ?? 1),
			costMultiplier: Number(g['cost'] ?? 1),
			availModifier: Number(g['avail'] ?? 0)
		});
	}

	interface Cyberware {
		name: string;
		category: string;
		ess: number | null;
		essFormula?: string;
		essByRating?: number[];
		capacity: string;
		avail: string;
		cost: number | null;
		costFormula?: string;
		costByRating?: number[];
		rating: number;
		source: string;
		page: number;
		bonus?: Record<string, unknown>;
	}

	const cyberware: Cyberware[] = [];
	const limit = Math.min(cyberwareRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const c = cyberwareRaw[i];
		if (!c || typeof c !== 'object') continue;

		/* Parse essence - may be a formula like "Rating * 0.1" or "(Rating * 0.1) + 0.1" */
		const essRaw = c['ess'];
		const essParsed = parseFormulaValue(essRaw);
		let ess: number | null = null;
		let essFormula: string | undefined;
		let essByRating: number[] | undefined;
		if (typeof essParsed === 'number') {
			ess = essParsed;
		} else if (Array.isArray(essParsed)) {
			/* FixedValues (e.g. Wired Reflexes 2/3/5) - store as array for rating lookup */
			essByRating = essParsed;
			ess = essParsed[0] ?? null;
		} else if (essRaw !== undefined && essRaw !== null && essRaw !== '') {
			/* Preserve formula string for complex cases, evaluated at runtime
			 * against the purchased rating; `ess` is just a rating-1 display
			 * baseline (mirrors the FixedValues index-0 convention above). */
			essFormula = String(essRaw);
			ess = evaluateFormulaAtRating(essFormula, 1) ?? null;
		}

		/* Parse cost - may be a formula like "Rating * 3000" or "FixedValues(500,750,1000)" */
		const costRaw = c['cost'];
		const costParsed = parseFormulaValue(costRaw);
		let cost: number | null = null;
		let costFormula: string | undefined;
		let costByRating: number[] | undefined;
		if (typeof costParsed === 'number') {
			cost = costParsed;
		} else if (Array.isArray(costParsed)) {
			/* FixedValues - store as array for rating lookup */
			costByRating = costParsed;
			cost = costParsed[0] ?? null;
		} else if (costRaw !== undefined && costRaw !== null && costRaw !== '') {
			/* Preserve formula string for complex cases, evaluated at runtime
			 * against the purchased rating; `cost` is just a rating-1 display
			 * baseline (mirrors the FixedValues index-0 convention above). */
			costFormula = String(costRaw);
			cost = evaluateFormulaAtRating(costFormula, 1) ?? null;
		}

		const item: Cyberware = {
			name: String(c['name'] ?? ''),
			category: String(c['category'] ?? ''),
			ess,
			capacity: parseOrString(c['capacity']),
			avail: parseOrString(c['avail']),
			cost,
			rating: Number(c['rating'] ?? 0),
			source: String(c['source'] ?? ''),
			page: Number(c['page'] ?? 0)
		};

		/* Add optional formula fields only if present */
		if (essFormula) item.essFormula = essFormula;
		if (essByRating) item.essByRating = essByRating;
		if (costFormula) item.costFormula = costFormula;
		if (costByRating) item.costByRating = costByRating;
		const bonus = extractBonus(c['bonus']);
		if (bonus) item.bonus = bonus;

		cyberware.push(item);
	}

	writeJsonFile('cyberware.json', { categories: categoriesRaw, grades, cyberware });
	return { success: true, itemCount: cyberware.length };
}

/**
 * Convert gear.xml to JSON (essential items only).
 * Extracts commlinks, fake IDs, tools, and common gear.
 */
function convertGear(): ConversionResult {
	const xml = readXmlFile('gear.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const categoriesRaw = toArray(
		(chummer['categories'] as Record<string, unknown>)?.['category'] as Array<
			string | Record<string, unknown>
		>
	);
	const gearRaw = toArray(
		(chummer['gears'] as Record<string, unknown>)?.['gear'] as Record<string, unknown>[]
	);

	/* Filter categories to show only essential ones */
	const essentialCategories = [
		'Commlink',
		'Commlink Accessories',
		'Commlink Operating System',
		'ID/Credsticks',
		'Communications',
		'Sensors',
		'Security Devices',
		'B&E Gear',
		'Biotech',
		'Disguise',
		'Survival Gear',
		'Foci',
		'Magical Supplies',
		'DocWagon Contract',
		'Drugs',
		'Slap Patches'
	];

	const categories = categoriesRaw
		.map((c) => (typeof c === 'string' ? c : String(c['#text'] ?? '')))
		.filter((c) => essentialCategories.some((e) => c.includes(e) || e.includes(c)));

	interface GearItem {
		name: string;
		category: string;
		rating: number;
		avail: string;
		cost: number;
		source: string;
		page: number;
		bonus?: Record<string, unknown>;
	}

	const gear: GearItem[] = [];
	const limit = Math.min(gearRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const g = gearRaw[i];
		if (!g || typeof g !== 'object') continue;

		const category = String(g['category'] ?? '');
		/* Only include essential categories */
		if (!essentialCategories.some((e) => category.includes(e) || e.includes(category))) {
			continue;
		}

		const gearItem: GearItem = {
			name: String(g['name'] ?? ''),
			category,
			rating: Number(g['rating'] ?? 0),
			avail: String(g['avail'] ?? '0'),
			cost: Number(g['cost'] ?? 0),
			source: String(g['source'] ?? ''),
			page: Number(g['page'] ?? 0)
		};
		const bonus = extractBonus(g['bonus']);
		if (bonus) gearItem.bonus = bonus;
		gear.push(gearItem);
	}

	writeJsonFile('gear.json', { categories, gear });
	return { success: true, itemCount: gear.length };
}

/**
 * Convert metamagic.xml to JSON.
 */
function convertMetamagic(): ConversionResult {
	const xml = readXmlFile('metamagic.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const metamagicsRaw = toArray(
		(chummer['metamagics'] as Record<string, unknown>)?.['metamagic'] as Record<string, unknown>[]
	);

	interface Metamagic {
		name: string;
		adept: boolean;
		magician: boolean;
		source: string;
		page: number;
		bonus?: Record<string, unknown>;
	}

	const metamagics: Metamagic[] = [];
	const limit = Math.min(metamagicsRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const m = metamagicsRaw[i];
		if (!m || typeof m !== 'object') continue;

		const metamagic: Metamagic = {
			name: String(m['name'] ?? ''),
			adept: String(m['adept']).toLowerCase() === 'yes',
			magician: String(m['magician']).toLowerCase() === 'yes',
			source: String(m['source'] ?? ''),
			page: Number(m['page'] ?? 0)
		};
		const bonus = extractBonus(m['bonus']);
		if (bonus) metamagic.bonus = bonus;
		metamagics.push(metamagic);
	}

	writeJsonFile('metamagic.json', { metamagics });
	return { success: true, itemCount: metamagics.length };
}

/**
 * Convert books.xml to JSON.
 */
function convertBooks(): ConversionResult {
	const xml = readXmlFile('books.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const booksRaw = toArray(
		(chummer['books'] as Record<string, unknown>)?.['book'] as Record<string, unknown>[]
	);

	interface Book {
		name: string;
		code: string;
	}

	const books: Book[] = [];
	const limit = Math.min(booksRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const b = booksRaw[i];
		if (!b || typeof b !== 'object') continue;

		books.push({
			name: String(b['name'] ?? ''),
			code: String(b['code'] ?? '')
		});
	}

	writeJsonFile('books.json', { books });
	return { success: true, itemCount: books.length };
}

/**
 * Convert ranges.xml to JSON.
 */
function convertRanges(): ConversionResult {
	const xml = readXmlFile('ranges.xml');
	if (!xml) {
		return { success: false, itemCount: 0, error: 'Failed to read file' };
	}

	const chummer = xml['chummer'] as Record<string, unknown>;
	const rangesRaw = toArray(
		(chummer['ranges'] as Record<string, unknown>)?.['range'] as Record<string, unknown>[]
	);

	interface Range {
		category: string;
		min: string;
		short: string;
		medium: string;
		long: string;
		extreme: string;
	}

	const ranges: Range[] = [];
	const limit = Math.min(rangesRaw.length, MAX_ITEMS);

	for (let i = 0; i < limit; i++) {
		const r = rangesRaw[i];
		if (!r || typeof r !== 'object') continue;

		ranges.push({
			category: String(r['category'] ?? ''),
			min: String(r['min'] ?? '0'),
			short: String(r['short'] ?? '0'),
			medium: String(r['medium'] ?? '0'),
			long: String(r['long'] ?? '0'),
			extreme: String(r['extreme'] ?? '0')
		});
	}

	writeJsonFile('ranges.json', { ranges });
	return { success: true, itemCount: ranges.length };
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
		{ name: 'Programs', fn: convertPrograms },
		{ name: 'Weapons', fn: convertWeapons },
		{ name: 'Armor', fn: convertArmor },
		{ name: 'Cyberware', fn: convertCyberware },
		{ name: 'Gear', fn: convertGear },
		{ name: 'Metamagic', fn: convertMetamagic },
		{ name: 'Books', fn: convertBooks },
		{ name: 'Ranges', fn: convertRanges }
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
