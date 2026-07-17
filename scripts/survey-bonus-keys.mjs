#!/usr/bin/env node
/**
 * Bonus Key Survey
 * ================
 * Scans static/data/*.json for distinct `bonus` object keys and prints a
 * per-file frequency table. Used to verify the converter (#62b) preserves
 * or enriches bonus coverage, and to drive the parser-expansion priority
 * list in #68 (only implement handlers for keys real data actually uses).
 *
 * Usage: node scripts/survey-bonus-keys.mjs
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../static/data');

/** Files known to carry a top-level array of bonus-bearing items. */
const TARGETS = [
	{ file: 'qualities.json', items: 'qualities' },
	{ file: 'cyberware.json', items: 'cyberware' },
	{ file: 'bioware.json', items: 'biowares' },
	{ file: 'gear.json', items: 'gear' },
	{ file: 'armor.json', items: 'armor' },
	{ file: 'powers.json', items: 'powers' },
	{ file: 'metamagic.json', items: 'metamagics' },
	{ file: 'echoes.json', items: 'echoes' }
];

function surveyFile(filename, itemsKey) {
	const filePath = path.join(DATA_DIR, filename);
	if (!fs.existsSync(filePath)) {
		return null;
	}
	const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
	const items = data[itemsKey] ?? [];
	const keyCounts = new Map();
	let withBonus = 0;

	for (const item of items) {
		if (!item.bonus || typeof item.bonus !== 'object') continue;
		withBonus++;
		for (const key of Object.keys(item.bonus)) {
			keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
		}
	}

	/* metatypes.json nests bonus data under metavariants too */
	if (filename === 'metatypes.json') {
		for (const mt of data.metatypes ?? []) {
			for (const variant of mt.metavariants ?? []) {
				if (!variant.bonus) continue;
				for (const key of Object.keys(variant.bonus)) {
					keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
				}
			}
		}
	}

	return { total: items.length, withBonus, keyCounts };
}

console.log('Bonus Key Survey');
console.log('================\n');

const allKeys = new Set();

for (const { file, items } of TARGETS) {
	const result = surveyFile(file, items);
	if (!result) {
		console.log(`${file}: not present, skipped\n`);
		continue;
	}
	const { total, withBonus, keyCounts } = result;
	console.log(`${file}: ${withBonus}/${total} items with bonus data`);
	const sorted = [...keyCounts.entries()].sort((a, b) => b[1] - a[1]);
	for (const [key, count] of sorted) {
		allKeys.add(key);
		console.log(`  ${key}: ${count}`);
	}
	console.log('');
}

/* metatypes.json is a special shape (single object, not an array), survey separately */
const metatypesPath = path.join(DATA_DIR, 'metatypes.json');
if (fs.existsSync(metatypesPath)) {
	const data = JSON.parse(fs.readFileSync(metatypesPath, 'utf-8'));
	const keyCounts = new Map();
	let withBonus = 0;
	for (const mt of data.metatypes ?? []) {
		if (mt.bonus) {
			withBonus++;
			for (const key of Object.keys(mt.bonus)) keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
		}
		for (const variant of mt.metavariants ?? []) {
			if (!variant.bonus) continue;
			withBonus++;
			for (const key of Object.keys(variant.bonus)) {
				keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
			}
		}
	}
	console.log(`metatypes.json (incl. metavariants): ${withBonus} entries with bonus data`);
	const sorted = [...keyCounts.entries()].sort((a, b) => b[1] - a[1]);
	for (const [key, count] of sorted) {
		allKeys.add(key);
		console.log(`  ${key}: ${count}`);
	}
	console.log('');
}

console.log('================');
console.log(`Total distinct bonus keys across all files: ${allKeys.size}`);
console.log([...allKeys].sort().join(', '));
