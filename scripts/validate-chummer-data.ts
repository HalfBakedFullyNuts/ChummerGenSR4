/**
 * XML Data Validation Script for ChummerWeb
 * ==========================================
 * Extracts XML data from Chummer-Desktop branch, converts to JSON,
 * and validates against existing JSON in static/data/.
 *
 * Usage: npx tsx scripts/validate-chummer-data.ts
 */

import { XMLParser } from 'fast-xml-parser';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/* ESM compatibility for __dirname */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Constants */
const STATIC_DATA_DIR = path.resolve(__dirname, '../static/data');
const BRANCH = 'Chummer-Desktop';
const MAX_ITEMS = 10000;

/* XML Parser configuration */
const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	textNodeName: '#text',
	isArray: (tagName: string): boolean => {
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

interface ValidationResult {
	file: string;
	xmlCount: number;
	jsonCount: number;
	match: boolean;
	missingInJson: string[];
	extraInJson: string[];
	fieldMismatches: Array<{ name: string; field: string; xml: unknown; json: unknown }>;
}

/**
 * Get XML file content from Chummer-Desktop branch.
 */
function getXmlFromBranch(filename: string): string | null {
	try {
		const result = execSync(`git show ${BRANCH}:bin/data/${filename}`, {
			cwd: path.resolve(__dirname, '..'),
			encoding: 'utf-8',
			maxBuffer: 10 * 1024 * 1024 // 10MB buffer
		});
		return result;
	} catch (error) {
		console.error(`Failed to get ${filename} from ${BRANCH}:`, (error as Error).message);
		return null;
	}
}

/**
 * Read existing JSON file from static/data.
 */
function readJsonFile(filename: string): Record<string, unknown> | null {
	const filePath = path.join(STATIC_DATA_DIR, filename);
	if (!fs.existsSync(filePath)) {
		console.error(`JSON file not found: ${filePath}`);
		return null;
	}
	const content = fs.readFileSync(filePath, 'utf-8');
	return JSON.parse(content) as Record<string, unknown>;
}

/**
 * Normalize array - ensures value is always an array.
 */
function toArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined || value === null) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
}

/**
 * Compare skills.xml with skills.json
 */
function validateSkills(): ValidationResult {
	const result: ValidationResult = {
		file: 'skills',
		xmlCount: 0,
		jsonCount: 0,
		match: false,
		missingInJson: [],
		extraInJson: [],
		fieldMismatches: []
	};

	const xmlContent = getXmlFromBranch('skills.xml');
	if (!xmlContent) return result;

	const json = readJsonFile('skills.json');
	if (!json) return result;

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	const chummer = parsed['chummer'] as Record<string, unknown>;
	const xmlSkills = toArray(
		(chummer['skills'] as Record<string, unknown>)?.['skill'] as Record<string, unknown>[]
	);
	const jsonSkills =
		(json['skills'] as Array<{
			name: string;
			attribute: string;
			category: string;
			default: boolean;
			skillgroup: string;
			specializations: string[];
			source: string;
			page: number;
		}>) ?? [];

	result.xmlCount = xmlSkills.length;
	result.jsonCount = jsonSkills.length;

	// Create maps for comparison
	const xmlMap = new Map<string, Record<string, unknown>>();
	for (let i = 0; i < Math.min(xmlSkills.length, MAX_ITEMS); i++) {
		const s = xmlSkills[i];
		if (s && typeof s === 'object') {
			xmlMap.set(String(s['name'] ?? ''), s);
		}
	}

	const jsonMap = new Map<string, (typeof jsonSkills)[0]>();
	for (const s of jsonSkills) {
		jsonMap.set(s.name, s);
	}

	// Find missing in JSON
	for (const name of xmlMap.keys()) {
		if (!jsonMap.has(name)) {
			result.missingInJson.push(name);
		}
	}

	// Find extra in JSON
	for (const name of jsonMap.keys()) {
		if (!xmlMap.has(name)) {
			result.extraInJson.push(name);
		}
	}

	// Compare fields for matching entries
	for (const [name, xmlSkill] of xmlMap) {
		const jsonSkill = jsonMap.get(name);
		if (!jsonSkill) continue;

		// Compare attribute
		if (String(xmlSkill['attribute'] ?? '').toUpperCase() !== jsonSkill.attribute.toUpperCase()) {
			result.fieldMismatches.push({
				name,
				field: 'attribute',
				xml: xmlSkill['attribute'],
				json: jsonSkill.attribute
			});
		}

		// Compare category
		if (String(xmlSkill['category'] ?? '') !== jsonSkill.category) {
			result.fieldMismatches.push({
				name,
				field: 'category',
				xml: xmlSkill['category'],
				json: jsonSkill.category
			});
		}

		// Compare default
		const xmlDefault = String(xmlSkill['default'] ?? '').toLowerCase() === 'yes';
		if (xmlDefault !== jsonSkill.default) {
			result.fieldMismatches.push({
				name,
				field: 'default',
				xml: xmlDefault,
				json: jsonSkill.default
			});
		}

		// Compare source
		if (String(xmlSkill['source'] ?? '') !== jsonSkill.source) {
			result.fieldMismatches.push({
				name,
				field: 'source',
				xml: xmlSkill['source'],
				json: jsonSkill.source
			});
		}

		// Compare page
		if (Number(xmlSkill['page'] ?? 0) !== jsonSkill.page) {
			result.fieldMismatches.push({
				name,
				field: 'page',
				xml: xmlSkill['page'],
				json: jsonSkill.page
			});
		}
	}

	result.match =
		result.missingInJson.length === 0 &&
		result.extraInJson.length === 0 &&
		result.fieldMismatches.length === 0;

	return result;
}

/**
 * Compare qualities.xml with qualities.json
 */
function validateQualities(): ValidationResult {
	const result: ValidationResult = {
		file: 'qualities',
		xmlCount: 0,
		jsonCount: 0,
		match: false,
		missingInJson: [],
		extraInJson: [],
		fieldMismatches: []
	};

	const xmlContent = getXmlFromBranch('qualities.xml');
	if (!xmlContent) return result;

	const json = readJsonFile('qualities.json');
	if (!json) return result;

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	const chummer = parsed['chummer'] as Record<string, unknown>;
	const xmlQualities = toArray(
		(chummer['qualities'] as Record<string, unknown>)?.['quality'] as Record<string, unknown>[]
	);
	const jsonQualities =
		(json['qualities'] as Array<{
			name: string;
			bp: number;
			category: string;
			source: string;
			page: number;
		}>) ?? [];

	result.xmlCount = xmlQualities.length;
	result.jsonCount = jsonQualities.length;

	// Create maps for comparison
	const xmlMap = new Map<string, Record<string, unknown>>();
	for (let i = 0; i < Math.min(xmlQualities.length, MAX_ITEMS); i++) {
		const q = xmlQualities[i];
		if (q && typeof q === 'object') {
			xmlMap.set(String(q['name'] ?? ''), q);
		}
	}

	const jsonMap = new Map<string, (typeof jsonQualities)[0]>();
	for (const q of jsonQualities) {
		jsonMap.set(q.name, q);
	}

	// Find missing in JSON
	for (const name of xmlMap.keys()) {
		if (!jsonMap.has(name)) {
			result.missingInJson.push(name);
		}
	}

	// Find extra in JSON
	for (const name of jsonMap.keys()) {
		if (!xmlMap.has(name)) {
			result.extraInJson.push(name);
		}
	}

	// Compare fields for matching entries
	for (const [name, xmlQuality] of xmlMap) {
		const jsonQuality = jsonMap.get(name);
		if (!jsonQuality) continue;

		// Compare BP
		if (Number(xmlQuality['bp'] ?? 0) !== jsonQuality.bp) {
			result.fieldMismatches.push({
				name,
				field: 'bp',
				xml: xmlQuality['bp'],
				json: jsonQuality.bp
			});
		}

		// Compare category
		if (String(xmlQuality['category'] ?? '') !== jsonQuality.category) {
			result.fieldMismatches.push({
				name,
				field: 'category',
				xml: xmlQuality['category'],
				json: jsonQuality.category
			});
		}

		// Compare source
		if (String(xmlQuality['source'] ?? '') !== jsonQuality.source) {
			result.fieldMismatches.push({
				name,
				field: 'source',
				xml: xmlQuality['source'],
				json: jsonQuality.source
			});
		}

		// Compare page
		if (Number(xmlQuality['page'] ?? 0) !== jsonQuality.page) {
			result.fieldMismatches.push({
				name,
				field: 'page',
				xml: xmlQuality['page'],
				json: jsonQuality.page
			});
		}
	}

	result.match =
		result.missingInJson.length === 0 &&
		result.extraInJson.length === 0 &&
		result.fieldMismatches.length === 0;

	return result;
}

/**
 * Compare spells.xml with spells.json
 */
function validateSpells(): ValidationResult {
	const result: ValidationResult = {
		file: 'spells',
		xmlCount: 0,
		jsonCount: 0,
		match: false,
		missingInJson: [],
		extraInJson: [],
		fieldMismatches: []
	};

	const xmlContent = getXmlFromBranch('spells.xml');
	if (!xmlContent) return result;

	const json = readJsonFile('spells.json');
	if (!json) return result;

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	const chummer = parsed['chummer'] as Record<string, unknown>;
	const xmlSpells = toArray(
		(chummer['spells'] as Record<string, unknown>)?.['spell'] as Record<string, unknown>[]
	);
	const jsonSpells =
		(json['spells'] as Array<{
			name: string;
			category: string;
			type: string;
			range: string;
			damage: string;
			duration: string;
			dv: string;
			source: string;
			page: number;
		}>) ?? [];

	result.xmlCount = xmlSpells.length;
	result.jsonCount = jsonSpells.length;

	// Create maps for comparison
	const xmlMap = new Map<string, Record<string, unknown>>();
	for (let i = 0; i < Math.min(xmlSpells.length, MAX_ITEMS); i++) {
		const s = xmlSpells[i];
		if (s && typeof s === 'object') {
			xmlMap.set(String(s['name'] ?? ''), s);
		}
	}

	const jsonMap = new Map<string, (typeof jsonSpells)[0]>();
	for (const s of jsonSpells) {
		jsonMap.set(s.name, s);
	}

	// Find missing in JSON
	for (const name of xmlMap.keys()) {
		if (!jsonMap.has(name)) {
			result.missingInJson.push(name);
		}
	}

	// Find extra in JSON
	for (const name of jsonMap.keys()) {
		if (!xmlMap.has(name)) {
			result.extraInJson.push(name);
		}
	}

	// Compare fields for matching entries
	for (const [name, xmlSpell] of xmlMap) {
		const jsonSpell = jsonMap.get(name);
		if (!jsonSpell) continue;

		// Compare category
		if (String(xmlSpell['category'] ?? '') !== jsonSpell.category) {
			result.fieldMismatches.push({
				name,
				field: 'category',
				xml: xmlSpell['category'],
				json: jsonSpell.category
			});
		}

		// Compare type
		if (String(xmlSpell['type'] ?? '') !== jsonSpell.type) {
			result.fieldMismatches.push({
				name,
				field: 'type',
				xml: xmlSpell['type'],
				json: jsonSpell.type
			});
		}

		// Compare source
		if (String(xmlSpell['source'] ?? '') !== jsonSpell.source) {
			result.fieldMismatches.push({
				name,
				field: 'source',
				xml: xmlSpell['source'],
				json: jsonSpell.source
			});
		}
	}

	result.match =
		result.missingInJson.length === 0 &&
		result.extraInJson.length === 0 &&
		result.fieldMismatches.length === 0;

	return result;
}

/**
 * Compare metatypes.xml with metatypes.json
 */
function validateMetatypes(): ValidationResult {
	const result: ValidationResult = {
		file: 'metatypes',
		xmlCount: 0,
		jsonCount: 0,
		match: false,
		missingInJson: [],
		extraInJson: [],
		fieldMismatches: []
	};

	const xmlContent = getXmlFromBranch('metatypes.xml');
	if (!xmlContent) return result;

	const json = readJsonFile('metatypes.json');
	if (!json) return result;

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	const chummer = parsed['chummer'] as Record<string, unknown>;
	const xmlMetatypes = toArray(
		(chummer['metatypes'] as Record<string, unknown>)?.['metatype'] as Record<string, unknown>[]
	);
	const jsonMetatypes =
		(json['metatypes'] as Array<{
			name: string;
			category: string;
			bp: number;
			source: string;
			page: number;
		}>) ?? [];

	result.xmlCount = xmlMetatypes.length;
	result.jsonCount = jsonMetatypes.length;

	// Create maps for comparison
	const xmlMap = new Map<string, Record<string, unknown>>();
	for (let i = 0; i < Math.min(xmlMetatypes.length, MAX_ITEMS); i++) {
		const m = xmlMetatypes[i];
		if (m && typeof m === 'object') {
			xmlMap.set(String(m['name'] ?? ''), m);
		}
	}

	const jsonMap = new Map<string, (typeof jsonMetatypes)[0]>();
	for (const m of jsonMetatypes) {
		jsonMap.set(m.name, m);
	}

	// Find missing in JSON
	for (const name of xmlMap.keys()) {
		if (!jsonMap.has(name)) {
			result.missingInJson.push(name);
		}
	}

	// Find extra in JSON
	for (const name of jsonMap.keys()) {
		if (!xmlMap.has(name)) {
			result.extraInJson.push(name);
		}
	}

	// Compare fields for matching entries
	for (const [name, xmlMeta] of xmlMap) {
		const jsonMeta = jsonMap.get(name);
		if (!jsonMeta) continue;

		// Compare BP
		if (Number(xmlMeta['bp'] ?? 0) !== jsonMeta.bp) {
			result.fieldMismatches.push({ name, field: 'bp', xml: xmlMeta['bp'], json: jsonMeta.bp });
		}

		// Compare category
		if (String(xmlMeta['category'] ?? '') !== jsonMeta.category) {
			result.fieldMismatches.push({
				name,
				field: 'category',
				xml: xmlMeta['category'],
				json: jsonMeta.category
			});
		}

		// Compare source
		if (String(xmlMeta['source'] ?? '') !== jsonMeta.source) {
			result.fieldMismatches.push({
				name,
				field: 'source',
				xml: xmlMeta['source'],
				json: jsonMeta.source
			});
		}
	}

	result.match =
		result.missingInJson.length === 0 &&
		result.extraInJson.length === 0 &&
		result.fieldMismatches.length === 0;

	return result;
}

/**
 * Compare weapons.xml with weapons.json
 */
function validateWeapons(): ValidationResult {
	const result: ValidationResult = {
		file: 'weapons',
		xmlCount: 0,
		jsonCount: 0,
		match: false,
		missingInJson: [],
		extraInJson: [],
		fieldMismatches: []
	};

	const xmlContent = getXmlFromBranch('weapons.xml');
	if (!xmlContent) return result;

	const json = readJsonFile('weapons.json');
	if (!json) return result;

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	const chummer = parsed['chummer'] as Record<string, unknown>;
	const xmlWeapons = toArray(
		(chummer['weapons'] as Record<string, unknown>)?.['weapon'] as Record<string, unknown>[]
	);
	const jsonWeapons =
		(json['weapons'] as Array<{
			name: string;
			category: string;
			damage: string;
			ap: string;
			cost: number;
			source: string;
			page: number;
		}>) ?? [];

	result.xmlCount = xmlWeapons.length;
	result.jsonCount = jsonWeapons.length;

	// Create maps for comparison
	const xmlMap = new Map<string, Record<string, unknown>>();
	for (let i = 0; i < Math.min(xmlWeapons.length, MAX_ITEMS); i++) {
		const w = xmlWeapons[i];
		if (w && typeof w === 'object') {
			xmlMap.set(String(w['name'] ?? ''), w);
		}
	}

	const jsonMap = new Map<string, (typeof jsonWeapons)[0]>();
	for (const w of jsonWeapons) {
		jsonMap.set(w.name, w);
	}

	// Find missing in JSON
	for (const name of xmlMap.keys()) {
		if (!jsonMap.has(name)) {
			result.missingInJson.push(name);
		}
	}

	// Find extra in JSON
	for (const name of jsonMap.keys()) {
		if (!xmlMap.has(name)) {
			result.extraInJson.push(name);
		}
	}

	// Compare fields for matching entries
	for (const [name, xmlWeapon] of xmlMap) {
		const jsonWeapon = jsonMap.get(name);
		if (!jsonWeapon) continue;

		// Compare category
		if (String(xmlWeapon['category'] ?? '') !== jsonWeapon.category) {
			result.fieldMismatches.push({
				name,
				field: 'category',
				xml: xmlWeapon['category'],
				json: jsonWeapon.category
			});
		}

		// Compare damage
		if (String(xmlWeapon['damage'] ?? '') !== jsonWeapon.damage) {
			result.fieldMismatches.push({
				name,
				field: 'damage',
				xml: xmlWeapon['damage'],
				json: jsonWeapon.damage
			});
		}

		// Compare source
		if (String(xmlWeapon['source'] ?? '') !== jsonWeapon.source) {
			result.fieldMismatches.push({
				name,
				field: 'source',
				xml: xmlWeapon['source'],
				json: jsonWeapon.source
			});
		}
	}

	result.match =
		result.missingInJson.length === 0 &&
		result.extraInJson.length === 0 &&
		result.fieldMismatches.length === 0;

	return result;
}

/**
 * Compare armor.xml with armor.json
 */
function validateArmor(): ValidationResult {
	const result: ValidationResult = {
		file: 'armor',
		xmlCount: 0,
		jsonCount: 0,
		match: false,
		missingInJson: [],
		extraInJson: [],
		fieldMismatches: []
	};

	const xmlContent = getXmlFromBranch('armor.xml');
	if (!xmlContent) return result;

	const json = readJsonFile('armor.json');
	if (!json) return result;

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	const chummer = parsed['chummer'] as Record<string, unknown>;
	const xmlArmor = toArray(
		(chummer['armors'] as Record<string, unknown>)?.['armor'] as Record<string, unknown>[]
	);
	const jsonArmor =
		(json['armor'] as Array<{
			name: string;
			category: string;
			ballistic: number;
			impact: number;
			source: string;
			page: number;
		}>) ?? [];

	result.xmlCount = xmlArmor.length;
	result.jsonCount = jsonArmor.length;

	// Create maps for comparison
	const xmlMap = new Map<string, Record<string, unknown>>();
	for (let i = 0; i < Math.min(xmlArmor.length, MAX_ITEMS); i++) {
		const a = xmlArmor[i];
		if (a && typeof a === 'object') {
			xmlMap.set(String(a['name'] ?? ''), a);
		}
	}

	const jsonMap = new Map<string, (typeof jsonArmor)[0]>();
	for (const a of jsonArmor) {
		jsonMap.set(a.name, a);
	}

	// Find missing in JSON
	for (const name of xmlMap.keys()) {
		if (!jsonMap.has(name)) {
			result.missingInJson.push(name);
		}
	}

	// Find extra in JSON
	for (const name of jsonMap.keys()) {
		if (!xmlMap.has(name)) {
			result.extraInJson.push(name);
		}
	}

	result.match =
		result.missingInJson.length === 0 &&
		result.extraInJson.length === 0 &&
		result.fieldMismatches.length === 0;

	return result;
}

/**
 * Print validation result summary.
 */
function printResult(result: ValidationResult): void {
	const status = result.match ? '✓' : '✗';
	const color = result.match ? '\x1b[32m' : '\x1b[31m';
	const reset = '\x1b[0m';

	console.log(`\n${color}${status}${reset} ${result.file.toUpperCase()}`);
	console.log(`  XML items: ${result.xmlCount}, JSON items: ${result.jsonCount}`);

	if (result.missingInJson.length > 0) {
		console.log(`  ⚠ Missing in JSON (${result.missingInJson.length}):`);
		for (const name of result.missingInJson.slice(0, 10)) {
			console.log(`    - ${name}`);
		}
		if (result.missingInJson.length > 10) {
			console.log(`    ... and ${result.missingInJson.length - 10} more`);
		}
	}

	if (result.extraInJson.length > 0) {
		console.log(`  ⚠ Extra in JSON (${result.extraInJson.length}):`);
		for (const name of result.extraInJson.slice(0, 10)) {
			console.log(`    - ${name}`);
		}
		if (result.extraInJson.length > 10) {
			console.log(`    ... and ${result.extraInJson.length - 10} more`);
		}
	}

	if (result.fieldMismatches.length > 0) {
		console.log(`  ⚠ Field mismatches (${result.fieldMismatches.length}):`);
		for (const m of result.fieldMismatches.slice(0, 10)) {
			console.log(`    - ${m.name}.${m.field}: XML="${m.xml}" vs JSON="${m.json}"`);
		}
		if (result.fieldMismatches.length > 10) {
			console.log(`    ... and ${result.fieldMismatches.length - 10} more`);
		}
	}
}

/**
 * Generic validation for simple data files.
 */
function validateGeneric(
	xmlFile: string,
	jsonFile: string,
	xmlPath: string[],
	jsonKey: string
): ValidationResult {
	const result: ValidationResult = {
		file: jsonFile.replace('.json', ''),
		xmlCount: 0,
		jsonCount: 0,
		match: false,
		missingInJson: [],
		extraInJson: [],
		fieldMismatches: []
	};

	const xmlContent = getXmlFromBranch(xmlFile);
	if (!xmlContent) return result;

	const json = readJsonFile(jsonFile);
	if (!json) return result;

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	let xmlData: unknown = parsed['chummer'];
	for (const key of xmlPath) {
		xmlData = (xmlData as Record<string, unknown>)?.[key];
	}
	const xmlItems = toArray(xmlData as Record<string, unknown>[]);
	const jsonItems = (json[jsonKey] as Array<{ name: string }>) ?? [];

	result.xmlCount = xmlItems.length;
	result.jsonCount = jsonItems.length;

	// Create maps for comparison
	const xmlMap = new Map<string, Record<string, unknown>>();
	for (let i = 0; i < Math.min(xmlItems.length, MAX_ITEMS); i++) {
		const item = xmlItems[i];
		if (item && typeof item === 'object') {
			xmlMap.set(String(item['name'] ?? ''), item);
		}
	}

	const jsonMap = new Map<string, (typeof jsonItems)[0]>();
	for (const item of jsonItems) {
		jsonMap.set(item.name, item);
	}

	// Find missing in JSON
	for (const name of xmlMap.keys()) {
		if (!jsonMap.has(name)) {
			result.missingInJson.push(name);
		}
	}

	// Find extra in JSON
	for (const name of jsonMap.keys()) {
		if (!xmlMap.has(name)) {
			result.extraInJson.push(name);
		}
	}

	result.match =
		result.missingInJson.length === 0 &&
		result.extraInJson.length === 0 &&
		result.fieldMismatches.length === 0;

	return result;
}

/**
 * Main validation function.
 */
async function main(): Promise<void> {
	console.log('='.repeat(60));
	console.log('Chummer XML Data Validation');
	console.log(`Comparing ${BRANCH} branch XML with static/data JSON`);
	console.log('='.repeat(60));

	const results: ValidationResult[] = [];

	console.log('\nValidating core data files...');

	// Core game data
	results.push(validateSkills());
	results.push(validateQualities());
	results.push(validateSpells());
	results.push(validateMetatypes());
	results.push(validateWeapons());
	results.push(validateArmor());

	console.log('\nValidating equipment data files...');

	// Equipment
	results.push(
		validateGeneric('cyberware.xml', 'cyberware.json', ['cyberwares', 'cyberware'], 'cyberware')
	);
	results.push(validateGeneric('bioware.xml', 'bioware.json', ['biowares', 'bioware'], 'biowares')); // Note: JSON uses 'biowares'
	results.push(
		validateGeneric('vehicles.xml', 'vehicles.json', ['vehicles', 'vehicle'], 'vehicles')
	);
	// Note: gear.json contains only essential categories (filtered from full gear.xml)
	results.push(validateGeneric('gear.xml', 'gear.json', ['gears', 'gear'], 'gear'));

	console.log('\nValidating magic/resonance data files...');

	// Magic/Resonance
	results.push(validateGeneric('powers.xml', 'powers.json', ['powers', 'power'], 'powers'));
	results.push(
		validateGeneric('traditions.xml', 'traditions.json', ['traditions', 'tradition'], 'traditions')
	);
	results.push(validateGeneric('mentors.xml', 'mentors.json', ['mentors', 'mentor'], 'mentors'));
	results.push(validateGeneric('echoes.xml', 'echoes.json', ['echoes', 'echo'], 'echoes'));
	// Note: streams.xml in Chummer-Desktop is empty, webapp has manually-added streams
	/* results.push(validateGeneric('streams.xml', 'streams.json', ['streams', 'stream'], 'streams')); */

	console.log('\nValidating other data files...');

	// Other
	results.push(
		validateGeneric('programs.xml', 'programs.json', ['programs', 'program'], 'programs')
	);
	results.push(
		validateGeneric('lifestyles.xml', 'lifestyles.json', ['lifestyles', 'lifestyle'], 'lifestyles')
	);
	results.push(
		validateGeneric('martialarts.xml', 'martialarts.json', ['martialarts', 'martialart'], 'styles')
	); // Note: JSON uses 'styles'

	// Print results
	for (const result of results) {
		printResult(result);
	}

	// Summary
	const passed = results.filter((r) => r.match).length;
	const failed = results.filter((r) => !r.match).length;

	console.log('\n' + '='.repeat(60));
	console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
	console.log('='.repeat(60));

	// Exit with error code if any failed
	if (failed > 0) {
		process.exit(1);
	}
}

main().catch(console.error);
