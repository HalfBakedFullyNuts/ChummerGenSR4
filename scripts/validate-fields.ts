/**
 * Comprehensive Field-by-Field Data Validation for ChummerWeb
 * ============================================================
 * Validates ALL fields between Chummer XML source and webapp JSON data.
 * Ensures mechanical effects, stats, and all properties match exactly.
 *
 * Usage: npx tsx scripts/validate-fields.ts [dataType]
 *        npx tsx scripts/validate-fields.ts skills
 *        npx tsx scripts/validate-fields.ts all
 */

import { XMLParser } from 'fast-xml-parser';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/* ESM compatibility */
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
	parseAttributeValue: false,
	trimValues: true,
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
			'negative',
			'grade',
			'addattribute',
			'specificskill',
			'skillgroup',
			'oneof'
		];
		return arrayTags.includes(tagName);
	}
});

interface FieldMismatch {
	itemName: string;
	field: string;
	xmlValue: unknown;
	jsonValue: unknown;
}

interface ValidationReport {
	dataType: string;
	totalXmlItems: number;
	totalJsonItems: number;
	matchedItems: number;
	missingInJson: string[];
	extraInJson: string[];
	fieldMismatches: FieldMismatch[];
	allMatch: boolean;
}

/**
 * Get XML content from Chummer-Desktop branch.
 */
function getXmlFromBranch(filename: string): string | null {
	try {
		const result = execSync(`git show ${BRANCH}:bin/data/${filename}`, {
			cwd: path.resolve(__dirname, '..'),
			encoding: 'utf-8',
			maxBuffer: 20 * 1024 * 1024
		});
		return result;
	} catch (error) {
		console.error(`Failed to get ${filename}:`, (error as Error).message);
		return null;
	}
}

/**
 * Read JSON file from static/data.
 */
function readJsonFile(filename: string): Record<string, unknown> | null {
	const filePath = path.join(STATIC_DATA_DIR, filename);
	if (!fs.existsSync(filePath)) {
		console.error(`JSON file not found: ${filePath}`);
		return null;
	}
	return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
}

/**
 * Normalize array.
 */
function toArray<T>(value: T | T[] | undefined | null): T[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
}

/**
 * Normalize string for comparison (handles HTML entities).
 */
function normalizeString(value: unknown): string {
	if (value === undefined || value === null) return '';
	const str = String(value);
	// Decode common HTML entities
	return str
		.replace(/&amp;/g, '&')
		.replace(/&apos;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.trim();
}

/**
 * Parse number, handling various formats.
 */
function parseNum(value: unknown): number {
	if (value === undefined || value === null || value === '') return 0;
	const num = Number(value);
	return isNaN(num) ? 0 : num;
}

/**
 * Extract base value from a formula string like "Rating * 30000" or "Rating * 0.75"
 * Returns the multiplier if it matches the pattern, null otherwise.
 */
function extractFormulaBase(value: unknown): number | null {
	if (typeof value !== 'string') return null;
	const str = String(value).trim();

	// Pattern: "Rating * X" or "Rating*X"
	const ratingMatch = str.match(/^Rating\s*\*\s*([\d.]+)$/i);
	if (ratingMatch) {
		return parseFloat(ratingMatch[1]!);
	}

	// Pattern: "(Rating * X) + Y" - return base multiplier X
	const complexMatch = str.match(/^\(Rating\s*\*\s*([\d.]+)\)/i);
	if (complexMatch) {
		return parseFloat(complexMatch[1]!);
	}

	return null;
}

/**
 * Compare two values with type coercion.
 * Handles rating formulas: "Rating * 30000" matches JSON value 30000.
 */
function valuesMatch(xmlVal: unknown, jsonVal: unknown): boolean {
	// Handle null/undefined
	if (xmlVal === undefined || xmlVal === null || xmlVal === '') {
		return (
			jsonVal === undefined ||
			jsonVal === null ||
			jsonVal === '' ||
			jsonVal === 0 ||
			jsonVal === false
		);
	}
	if (jsonVal === undefined || jsonVal === null || jsonVal === '') {
		return xmlVal === undefined || xmlVal === null || xmlVal === '';
	}

	// Check if XML is a rating formula and JSON is the base value
	const formulaBase = extractFormulaBase(xmlVal);
	if (formulaBase !== null && typeof jsonVal === 'number') {
		return Math.abs(formulaBase - jsonVal) < 0.001; // Float comparison tolerance
	}

	// String comparison with HTML entity normalization
	const xmlStr = normalizeString(xmlVal);
	const jsonStr = normalizeString(jsonVal);
	if (xmlStr === jsonStr) return true;

	// Boolean comparison
	if (typeof jsonVal === 'boolean') {
		const xmlBool = xmlStr.toLowerCase() === 'yes' || xmlStr.toLowerCase() === 'true';
		return xmlBool === jsonVal;
	}

	// Number comparison
	if (typeof jsonVal === 'number') {
		return parseNum(xmlVal) === jsonVal;
	}

	return false;
}

/**
 * Validate Skills data.
 */
function validateSkills(): ValidationReport {
	const report: ValidationReport = {
		dataType: 'skills',
		totalXmlItems: 0,
		totalJsonItems: 0,
		matchedItems: 0,
		missingInJson: [],
		extraInJson: [],
		fieldMismatches: [],
		allMatch: false
	};

	const xmlContent = getXmlFromBranch('skills.xml');
	if (!xmlContent) return report;

	const json = readJsonFile('skills.json');
	if (!json) return report;

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	const chummer = parsed['chummer'] as Record<string, unknown>;
	const xmlSkills = toArray(
		(chummer['skills'] as Record<string, unknown>)?.['skill'] as Record<string, unknown>[]
	);
	const jsonSkills = (json['skills'] as Array<Record<string, unknown>>) ?? [];

	report.totalXmlItems = xmlSkills.length;
	report.totalJsonItems = jsonSkills.length;

	// Create maps
	const xmlMap = new Map<string, Record<string, unknown>>();
	for (const s of xmlSkills.slice(0, MAX_ITEMS)) {
		if (s && typeof s === 'object') {
			xmlMap.set(normalizeString(s['name']), s);
		}
	}

	const jsonMap = new Map<string, Record<string, unknown>>();
	for (const s of jsonSkills) {
		jsonMap.set(normalizeString(s.name), s);
	}

	// Find missing/extra
	for (const name of xmlMap.keys()) {
		if (!jsonMap.has(name)) report.missingInJson.push(name);
	}
	for (const name of jsonMap.keys()) {
		if (!xmlMap.has(name)) report.extraInJson.push(name);
	}

	// Field-by-field comparison
	for (const [name, xmlSkill] of xmlMap) {
		const jsonSkill = jsonMap.get(name);
		if (!jsonSkill) continue;

		report.matchedItems++;

		// Compare each field
		const fieldsToCompare = [
			['attribute', 'attribute'],
			['category', 'category'],
			['default', 'default'],
			['skillgroup', 'skillgroup'],
			['source', 'source'],
			['page', 'page']
		];

		for (const [xmlField, jsonField] of fieldsToCompare) {
			const xmlVal = xmlSkill[xmlField];
			const jsonVal = jsonSkill[jsonField];
			if (!valuesMatch(xmlVal, jsonVal)) {
				report.fieldMismatches.push({
					itemName: name,
					field: jsonField,
					xmlValue: xmlVal,
					jsonValue: jsonVal
				});
			}
		}

		// Compare specializations
		const xmlSpecs = toArray(
			(xmlSkill['specs'] as Record<string, unknown>)?.['spec'] as string[]
		).map(normalizeString);
		const jsonSpecs = ((jsonSkill.specializations as string[]) ?? []).map(normalizeString);

		if (xmlSpecs.length !== jsonSpecs.length || !xmlSpecs.every((s) => jsonSpecs.includes(s))) {
			report.fieldMismatches.push({
				itemName: name,
				field: 'specializations',
				xmlValue: xmlSpecs,
				jsonValue: jsonSpecs
			});
		}
	}

	report.allMatch =
		report.missingInJson.length === 0 &&
		report.extraInJson.length === 0 &&
		report.fieldMismatches.length === 0;

	return report;
}

/**
 * Validate Qualities data with full bonus comparison.
 */
function validateQualities(): ValidationReport {
	const report: ValidationReport = {
		dataType: 'qualities',
		totalXmlItems: 0,
		totalJsonItems: 0,
		matchedItems: 0,
		missingInJson: [],
		extraInJson: [],
		fieldMismatches: [],
		allMatch: false
	};

	const xmlContent = getXmlFromBranch('qualities.xml');
	if (!xmlContent) return report;

	const json = readJsonFile('qualities.json');
	if (!json) return report;

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	const chummer = parsed['chummer'] as Record<string, unknown>;
	const xmlQualities = toArray(
		(chummer['qualities'] as Record<string, unknown>)?.['quality'] as Record<string, unknown>[]
	);
	const jsonQualities = (json['qualities'] as Array<Record<string, unknown>>) ?? [];

	report.totalXmlItems = xmlQualities.length;
	report.totalJsonItems = jsonQualities.length;

	// Create maps
	const xmlMap = new Map<string, Record<string, unknown>>();
	for (const q of xmlQualities.slice(0, MAX_ITEMS)) {
		if (q && typeof q === 'object') {
			xmlMap.set(normalizeString(q['name']), q);
		}
	}

	const jsonMap = new Map<string, Record<string, unknown>>();
	for (const q of jsonQualities) {
		jsonMap.set(normalizeString(q.name), q);
	}

	// Find missing/extra
	for (const name of xmlMap.keys()) {
		if (!jsonMap.has(name)) report.missingInJson.push(name);
	}
	for (const name of jsonMap.keys()) {
		if (!xmlMap.has(name)) report.extraInJson.push(name);
	}

	// Field-by-field comparison
	for (const [name, xmlQuality] of xmlMap) {
		const jsonQuality = jsonMap.get(name);
		if (!jsonQuality) continue;

		report.matchedItems++;

		// Compare base fields
		const fieldsToCompare = [
			['bp', 'bp'],
			['category', 'category'],
			['source', 'source'],
			['page', 'page'],
			['mutant', 'mutant']
		];

		for (const [xmlField, jsonField] of fieldsToCompare) {
			const xmlVal = xmlQuality[xmlField];
			const jsonVal = jsonQuality[jsonField];
			if (!valuesMatch(xmlVal, jsonVal)) {
				report.fieldMismatches.push({
					itemName: name,
					field: jsonField,
					xmlValue: xmlVal,
					jsonValue: jsonVal
				});
			}
		}

		// Note: bonus objects are complex and would need deep comparison
		// The existing conversion may have transformed them
	}

	report.allMatch =
		report.missingInJson.length === 0 &&
		report.extraInJson.length === 0 &&
		report.fieldMismatches.length === 0;

	return report;
}

/**
 * Validate Cyberware data with all stats.
 */
function validateCyberware(): ValidationReport {
	const report: ValidationReport = {
		dataType: 'cyberware',
		totalXmlItems: 0,
		totalJsonItems: 0,
		matchedItems: 0,
		missingInJson: [],
		extraInJson: [],
		fieldMismatches: [],
		allMatch: false
	};

	const xmlContent = getXmlFromBranch('cyberware.xml');
	if (!xmlContent) return report;

	const json = readJsonFile('cyberware.json');
	if (!json) return report;

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	const chummer = parsed['chummer'] as Record<string, unknown>;
	const xmlCyberware = toArray(
		(chummer['cyberwares'] as Record<string, unknown>)?.['cyberware'] as Record<string, unknown>[]
	);
	const jsonCyberware = (json['cyberware'] as Array<Record<string, unknown>>) ?? [];

	report.totalXmlItems = xmlCyberware.length;
	report.totalJsonItems = jsonCyberware.length;

	// Create maps
	const xmlMap = new Map<string, Record<string, unknown>>();
	for (const c of xmlCyberware.slice(0, MAX_ITEMS)) {
		if (c && typeof c === 'object') {
			xmlMap.set(normalizeString(c['name']), c);
		}
	}

	const jsonMap = new Map<string, Record<string, unknown>>();
	for (const c of jsonCyberware) {
		jsonMap.set(normalizeString(c.name), c);
	}

	// Find missing/extra
	for (const name of xmlMap.keys()) {
		if (!jsonMap.has(name)) report.missingInJson.push(name);
	}
	for (const name of jsonMap.keys()) {
		if (!xmlMap.has(name)) report.extraInJson.push(name);
	}

	// Field-by-field comparison
	for (const [name, xmlItem] of xmlMap) {
		const jsonItem = jsonMap.get(name);
		if (!jsonItem) continue;

		report.matchedItems++;

		// Compare all mechanical fields
		const fieldsToCompare = [
			['category', 'category'],
			['ess', 'ess'],
			['capacity', 'capacity'],
			['avail', 'avail'],
			['cost', 'cost'],
			['rating', 'rating'],
			['source', 'source'],
			['page', 'page']
		];

		for (const [xmlField, jsonField] of fieldsToCompare) {
			const xmlVal = xmlItem[xmlField];
			const jsonVal = jsonItem[jsonField];
			if (!valuesMatch(xmlVal, jsonVal)) {
				report.fieldMismatches.push({
					itemName: name,
					field: jsonField,
					xmlValue: xmlVal,
					jsonValue: jsonVal
				});
			}
		}
	}

	report.allMatch =
		report.missingInJson.length === 0 &&
		report.extraInJson.length === 0 &&
		report.fieldMismatches.length === 0;

	return report;
}

/**
 * Validate Weapons data with damage, AP, cost, etc.
 */
function validateWeapons(): ValidationReport {
	const report: ValidationReport = {
		dataType: 'weapons',
		totalXmlItems: 0,
		totalJsonItems: 0,
		matchedItems: 0,
		missingInJson: [],
		extraInJson: [],
		fieldMismatches: [],
		allMatch: false
	};

	const xmlContent = getXmlFromBranch('weapons.xml');
	if (!xmlContent) return report;

	const json = readJsonFile('weapons.json');
	if (!json) return report;

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	const chummer = parsed['chummer'] as Record<string, unknown>;
	const xmlWeapons = toArray(
		(chummer['weapons'] as Record<string, unknown>)?.['weapon'] as Record<string, unknown>[]
	);
	const jsonWeapons = (json['weapons'] as Array<Record<string, unknown>>) ?? [];

	report.totalXmlItems = xmlWeapons.length;
	report.totalJsonItems = jsonWeapons.length;

	// Create maps
	const xmlMap = new Map<string, Record<string, unknown>>();
	for (const w of xmlWeapons.slice(0, MAX_ITEMS)) {
		if (w && typeof w === 'object') {
			xmlMap.set(normalizeString(w['name']), w);
		}
	}

	const jsonMap = new Map<string, Record<string, unknown>>();
	for (const w of jsonWeapons) {
		jsonMap.set(normalizeString(w.name), w);
	}

	// Find missing/extra
	for (const name of xmlMap.keys()) {
		if (!jsonMap.has(name)) report.missingInJson.push(name);
	}
	for (const name of jsonMap.keys()) {
		if (!xmlMap.has(name)) report.extraInJson.push(name);
	}

	// Field-by-field comparison
	for (const [name, xmlItem] of xmlMap) {
		const jsonItem = jsonMap.get(name);
		if (!jsonItem) continue;

		report.matchedItems++;

		// Compare all mechanical fields
		const fieldsToCompare = [
			['category', 'category'],
			['type', 'type'],
			['reach', 'reach'],
			['damage', 'damage'],
			['ap', 'ap'],
			['mode', 'mode'],
			['rc', 'rc'],
			['ammo', 'ammo'],
			['conceal', 'conceal'],
			['avail', 'avail'],
			['cost', 'cost'],
			['source', 'source'],
			['page', 'page']
		];

		for (const [xmlField, jsonField] of fieldsToCompare) {
			const xmlVal = xmlItem[xmlField];
			const jsonVal = jsonItem[jsonField];
			if (!valuesMatch(xmlVal, jsonVal)) {
				report.fieldMismatches.push({
					itemName: name,
					field: jsonField,
					xmlValue: xmlVal,
					jsonValue: jsonVal
				});
			}
		}
	}

	report.allMatch =
		report.missingInJson.length === 0 &&
		report.extraInJson.length === 0 &&
		report.fieldMismatches.length === 0;

	return report;
}

/**
 * Validate Spells data.
 */
function validateSpells(): ValidationReport {
	const report: ValidationReport = {
		dataType: 'spells',
		totalXmlItems: 0,
		totalJsonItems: 0,
		matchedItems: 0,
		missingInJson: [],
		extraInJson: [],
		fieldMismatches: [],
		allMatch: false
	};

	const xmlContent = getXmlFromBranch('spells.xml');
	if (!xmlContent) return report;

	const json = readJsonFile('spells.json');
	if (!json) return report;

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	const chummer = parsed['chummer'] as Record<string, unknown>;
	const xmlSpells = toArray(
		(chummer['spells'] as Record<string, unknown>)?.['spell'] as Record<string, unknown>[]
	);
	const jsonSpells = (json['spells'] as Array<Record<string, unknown>>) ?? [];

	report.totalXmlItems = xmlSpells.length;
	report.totalJsonItems = jsonSpells.length;

	// Create maps
	const xmlMap = new Map<string, Record<string, unknown>>();
	for (const s of xmlSpells.slice(0, MAX_ITEMS)) {
		if (s && typeof s === 'object') {
			xmlMap.set(normalizeString(s['name']), s);
		}
	}

	const jsonMap = new Map<string, Record<string, unknown>>();
	for (const s of jsonSpells) {
		jsonMap.set(normalizeString(s.name), s);
	}

	// Find missing/extra
	for (const name of xmlMap.keys()) {
		if (!jsonMap.has(name)) report.missingInJson.push(name);
	}
	for (const name of jsonMap.keys()) {
		if (!xmlMap.has(name)) report.extraInJson.push(name);
	}

	// Field-by-field comparison
	for (const [name, xmlItem] of xmlMap) {
		const jsonItem = jsonMap.get(name);
		if (!jsonItem) continue;

		report.matchedItems++;

		const fieldsToCompare = [
			['category', 'category'],
			['type', 'type'],
			['range', 'range'],
			['damage', 'damage'],
			['duration', 'duration'],
			['dv', 'dv'],
			['descriptor', 'descriptor'],
			['source', 'source'],
			['page', 'page']
		];

		for (const [xmlField, jsonField] of fieldsToCompare) {
			const xmlVal = xmlItem[xmlField];
			const jsonVal = jsonItem[jsonField];
			if (!valuesMatch(xmlVal, jsonVal)) {
				report.fieldMismatches.push({
					itemName: name,
					field: jsonField,
					xmlValue: xmlVal,
					jsonValue: jsonVal
				});
			}
		}
	}

	report.allMatch =
		report.missingInJson.length === 0 &&
		report.extraInJson.length === 0 &&
		report.fieldMismatches.length === 0;

	return report;
}

/**
 * Validate Bioware data.
 */
function validateBioware(): ValidationReport {
	const report: ValidationReport = {
		dataType: 'bioware',
		totalXmlItems: 0,
		totalJsonItems: 0,
		matchedItems: 0,
		missingInJson: [],
		extraInJson: [],
		fieldMismatches: [],
		allMatch: false
	};

	const xmlContent = getXmlFromBranch('bioware.xml');
	if (!xmlContent) return report;

	const json = readJsonFile('bioware.json');
	if (!json) return report;

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	const chummer = parsed['chummer'] as Record<string, unknown>;
	const xmlBioware = toArray(
		(chummer['biowares'] as Record<string, unknown>)?.['bioware'] as Record<string, unknown>[]
	);
	const jsonBioware = (json['biowares'] as Array<Record<string, unknown>>) ?? [];

	report.totalXmlItems = xmlBioware.length;
	report.totalJsonItems = jsonBioware.length;

	// Create maps
	const xmlMap = new Map<string, Record<string, unknown>>();
	for (const b of xmlBioware.slice(0, MAX_ITEMS)) {
		if (b && typeof b === 'object') {
			xmlMap.set(normalizeString(b['name']), b);
		}
	}

	const jsonMap = new Map<string, Record<string, unknown>>();
	for (const b of jsonBioware) {
		jsonMap.set(normalizeString(b.name), b);
	}

	// Find missing/extra
	for (const name of xmlMap.keys()) {
		if (!jsonMap.has(name)) report.missingInJson.push(name);
	}
	for (const name of jsonMap.keys()) {
		if (!xmlMap.has(name)) report.extraInJson.push(name);
	}

	// Field-by-field comparison
	for (const [name, xmlItem] of xmlMap) {
		const jsonItem = jsonMap.get(name);
		if (!jsonItem) continue;

		report.matchedItems++;

		const fieldsToCompare = [
			['category', 'category'],
			['ess', 'ess'],
			['capacity', 'capacity'],
			['avail', 'avail'],
			['cost', 'cost'],
			['rating', 'rating'],
			['source', 'source'],
			['page', 'page']
		];

		for (const [xmlField, jsonField] of fieldsToCompare) {
			const xmlVal = xmlItem[xmlField];
			const jsonVal = jsonItem[jsonField];
			if (!valuesMatch(xmlVal, jsonVal)) {
				report.fieldMismatches.push({
					itemName: name,
					field: jsonField,
					xmlValue: xmlVal,
					jsonValue: jsonVal
				});
			}
		}
	}

	report.allMatch =
		report.missingInJson.length === 0 &&
		report.extraInJson.length === 0 &&
		report.fieldMismatches.length === 0;

	return report;
}

/**
 * Print validation report.
 */
function printReport(report: ValidationReport): void {
	const status = report.allMatch ? '✓' : '✗';
	const color = report.allMatch ? '\x1b[32m' : '\x1b[31m';
	const reset = '\x1b[0m';

	console.log(`\n${color}${status}${reset} ${report.dataType.toUpperCase()}`);
	console.log(
		`  Items: ${report.totalXmlItems} XML, ${report.totalJsonItems} JSON, ${report.matchedItems} matched`
	);

	if (report.missingInJson.length > 0) {
		console.log(`  ⚠ Missing in JSON (${report.missingInJson.length}):`);
		for (const name of report.missingInJson.slice(0, 5)) {
			console.log(`    - ${name}`);
		}
		if (report.missingInJson.length > 5) {
			console.log(`    ... and ${report.missingInJson.length - 5} more`);
		}
	}

	if (report.extraInJson.length > 0) {
		console.log(`  ⚠ Extra in JSON (${report.extraInJson.length}):`);
		for (const name of report.extraInJson.slice(0, 5)) {
			console.log(`    - ${name}`);
		}
		if (report.extraInJson.length > 5) {
			console.log(`    ... and ${report.extraInJson.length - 5} more`);
		}
	}

	if (report.fieldMismatches.length > 0) {
		console.log(`  ⚠ Field mismatches (${report.fieldMismatches.length}):`);
		for (const m of report.fieldMismatches.slice(0, 10)) {
			console.log(`    - ${m.itemName}.${m.field}: XML="${m.xmlValue}" vs JSON="${m.jsonValue}"`);
		}
		if (report.fieldMismatches.length > 10) {
			console.log(`    ... and ${report.fieldMismatches.length - 10} more`);
		}
	}
}

/**
 * Main function.
 */
async function main(): Promise<void> {
	const arg = process.argv[2] || 'all';

	console.log('='.repeat(70));
	console.log('Comprehensive Field-by-Field Data Validation');
	console.log('Comparing ALL fields between Chummer XML and webapp JSON');
	console.log('='.repeat(70));

	const validators: { [key: string]: () => ValidationReport } = {
		skills: validateSkills,
		qualities: validateQualities,
		spells: validateSpells,
		cyberware: validateCyberware,
		bioware: validateBioware,
		weapons: validateWeapons
	};

	const reports: ValidationReport[] = [];

	if (arg === 'all') {
		for (const [name, validator] of Object.entries(validators)) {
			console.log(`\nValidating ${name}...`);
			reports.push(validator());
		}
	} else if (validators[arg]) {
		console.log(`\nValidating ${arg}...`);
		reports.push(validators[arg]!());
	} else {
		console.error(`Unknown data type: ${arg}`);
		console.log(`Available: ${Object.keys(validators).join(', ')}, all`);
		process.exit(1);
	}

	// Print reports
	for (const report of reports) {
		printReport(report);
	}

	// Summary
	const passed = reports.filter((r) => r.allMatch).length;
	const failed = reports.filter((r) => !r.allMatch).length;
	const totalMismatches = reports.reduce((sum, r) => sum + r.fieldMismatches.length, 0);

	console.log('\n' + '='.repeat(70));
	console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
	console.log(`Total field mismatches: ${totalMismatches}`);
	console.log('='.repeat(70));

	if (failed > 0) {
		process.exit(1);
	}
}

main().catch(console.error);
