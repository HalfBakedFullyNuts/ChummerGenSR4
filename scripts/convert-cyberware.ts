/**
 * Quick Cyberware Converter - Reads from Git Branch
 * ================================================
 * Regenerates cyberware.json from the Chummer-Desktop Git branch
 * with proper formula parsing.
 *
 * Usage: npx tsx scripts/convert-cyberware.ts
 */

import { XMLParser } from 'fast-xml-parser';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output to comparison folder, not live data
const OUTPUT_DIR = path.resolve(__dirname, '../static/data-comparison');
const BRANCH = 'Chummer-Desktop';

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	textNodeName: '#text',
	isArray: (tagName: string): boolean => {
		const arrayTags = ['cyberware', 'category', 'grade'];
		return arrayTags.includes(tagName);
	}
});

function toArray<T>(value: T | T[] | undefined): T[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
}

/**
 * Get XML content from Git branch.
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
 * Parse formula value and extract base multiplier.
 */
function parseFormulaValue(value: unknown): number | number[] | null {
	if (value === undefined || value === null || value === '') return null;
	if (typeof value === 'number') return value;

	const str = String(value).trim();

	// Simple number
	const simpleNum = Number(str);
	if (!isNaN(simpleNum)) return simpleNum;

	// FixedValues(a,b,c,d)
	const fixedMatch = str.match(/^FixedValues\(([^)]+)\)$/i);
	if (fixedMatch && fixedMatch[1]) {
		const values = fixedMatch[1].split(',').map((v) => parseFloat(v.trim()));
		if (values.every((v) => !isNaN(v))) return values;
	}

	// Rating * X
	const ratingMatch = str.match(/^Rating\s*\*\s*([\d.]+)$/i);
	if (ratingMatch && ratingMatch[1]) return parseFloat(ratingMatch[1]);

	// (Rating * X) + Y
	const complexMatch = str.match(/^\(Rating\s*\*\s*([\d.]+)\)\s*\+\s*([\d.]+)$/i);
	if (complexMatch && complexMatch[1]) return parseFloat(complexMatch[1]);

	// (Rating * X)
	const parenMatch = str.match(/^\(Rating\s*\*\s*([\d.]+)\)$/i);
	if (parenMatch && parenMatch[1]) return parseFloat(parenMatch[1]);

	return null;
}

function main(): void {
	console.log('Converting cyberware.xml from Chummer-Desktop branch...\n');

	const xmlContent = getXmlFromBranch('cyberware.xml');
	if (!xmlContent) {
		console.error('Failed to read cyberware.xml');
		process.exit(1);
	}

	const parsed = parser.parse(xmlContent) as Record<string, unknown>;
	const chummer = parsed['chummer'] as Record<string, unknown>;

	const categoriesRaw = toArray(
		(chummer['categories'] as Record<string, unknown>)?.['category'] as string[]
	);
	const gradesRaw = toArray(
		(chummer['grades'] as Record<string, unknown>)?.['grade'] as Record<string, unknown>[]
	);
	const cyberwareRaw = toArray(
		(chummer['cyberwares'] as Record<string, unknown>)?.['cyberware'] as Record<string, unknown>[]
	);

	// Process grades
	const grades = gradesRaw.map((g) => ({
		name: String(g?.['name'] ?? ''),
		essMultiplier: Number(g?.['ess'] ?? 1),
		costMultiplier: Number(g?.['cost'] ?? 1),
		availModifier: Number(g?.['avail'] ?? 0)
	}));

	interface Cyberware {
		name: string;
		category: string;
		ess: number | null;
		essFormula?: string;
		capacity: string;
		avail: string;
		cost: number | null;
		costFormula?: string;
		costByRating?: number[];
		rating: number;
		source: string;
		page: number;
	}

	const cyberware: Cyberware[] = [];

	for (const c of cyberwareRaw) {
		if (!c || typeof c !== 'object') continue;

		// Parse essence
		const essRaw = c['ess'];
		const essParsed = parseFormulaValue(essRaw);
		let ess: number | null = null;
		let essFormula: string | undefined;
		if (typeof essParsed === 'number') {
			ess = essParsed;
		} else if (Array.isArray(essParsed)) {
			ess = essParsed[0] ?? null;
		} else if (essRaw !== undefined && essRaw !== null && essRaw !== '') {
			essFormula = String(essRaw);
		}

		// Parse cost
		const costRaw = c['cost'];
		const costParsed = parseFormulaValue(costRaw);
		let cost: number | null = null;
		let costFormula: string | undefined;
		let costByRating: number[] | undefined;
		if (typeof costParsed === 'number') {
			cost = costParsed;
		} else if (Array.isArray(costParsed)) {
			costByRating = costParsed;
			cost = costParsed[0] ?? null;
		} else if (costRaw !== undefined && costRaw !== null && costRaw !== '') {
			costFormula = String(costRaw);
		}

		const item: Cyberware = {
			name: String(c['name'] ?? ''),
			category: String(c['category'] ?? ''),
			ess,
			capacity: String(c['capacity'] ?? '0'),
			avail: String(c['avail'] ?? '0'),
			cost,
			rating: Number(c['rating'] ?? 0),
			source: String(c['source'] ?? ''),
			page: Number(c['page'] ?? 0)
		};

		if (essFormula) item.essFormula = essFormula;
		if (costFormula) item.costFormula = costFormula;
		if (costByRating) item.costByRating = costByRating;

		cyberware.push(item);
	}

	// Write output
	const outputPath = path.join(OUTPUT_DIR, 'cyberware.json');
	fs.writeFileSync(
		outputPath,
		JSON.stringify({ categories: categoriesRaw, grades, cyberware }, null, 2)
	);

	console.log(`✓ Converted ${cyberware.length} cyberware items`);
	console.log(`  Written to: ${outputPath}`);

	// Count items with parsed values vs formulas
	const withEss = cyberware.filter((c) => c.ess !== null).length;
	const withCost = cyberware.filter((c) => c.cost !== null).length;
	const withCostArray = cyberware.filter((c) => c.costByRating).length;
	const withFormula = cyberware.filter((c) => c.costFormula || c.essFormula).length;

	console.log(`\nStats:`);
	console.log(`  - Items with parsed ess: ${withEss}`);
	console.log(`  - Items with parsed cost: ${withCost}`);
	console.log(`  - Items with costByRating array: ${withCostArray}`);
	console.log(`  - Items with unparsed formulas: ${withFormula}`);
}

main();
