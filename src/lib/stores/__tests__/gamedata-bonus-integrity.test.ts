/**
 * Game Data Bonus Integrity Tests (issue #62b)
 * =============================================
 * Regression guard: scripts/convert-xml-to-json.ts must never silently
 * drop <bonus> data when regenerating static/data/*.json. Before #62b,
 * convertQualities() did not touch `bonus` at all, so running
 * `npm run convert-data` would have deleted every quality's bonus block.
 */
import { describe, it, expect } from 'vitest';
import qualitiesData from '../../../../static/data/qualities.json';
import cyberwareData from '../../../../static/data/cyberware.json';
import powersData from '../../../../static/data/powers.json';
import metatypesData from '../../../../static/data/metatypes.json';

interface BonusBearing {
	name: string;
	bonus?: Record<string, unknown>;
}

describe('Game data bonus integrity (issue #62b)', () => {
	it('Toughness quality retains its damageresistance bonus', () => {
		const quality = (qualitiesData.qualities as BonusBearing[]).find(
			(q) => q.name === 'Toughness'
		);
		expect(quality?.bonus).toEqual({ damageresistance: 1 });
	});

	it('Toughness keeps its hand-authored effect text (not sourced from XML)', () => {
		const quality = qualitiesData.qualities.find((q) => q.name === 'Toughness');
		expect(quality?.effect).toBe('+1 Damage Resistance');
	});

	it('at least 36 distinct bonus keys survive across qualities (pre-#62b baseline)', () => {
		const keys = new Set<string>();
		for (const q of qualitiesData.qualities as BonusBearing[]) {
			if (q.bonus) for (const k of Object.keys(q.bonus)) keys.add(k);
		}
		expect(keys.size).toBeGreaterThanOrEqual(36);
	});

	it('Wired Reflexes cyberware carries a structured, precedence-tagged REA bonus', () => {
		const cyber = (
			cyberwareData.cyberware as Array<{
				name: string;
				bonus?: { initiativepass?: unknown; specificattribute?: Array<Record<string, unknown>> };
			}>
		).find((c) => c.name === 'Wired Reflexes');
		expect(cyber?.bonus?.initiativepass).toBe('Rating');
		expect(cyber?.bonus?.specificattribute).toEqual([
			{ name: 'REA', precedence: '1', val: 'Rating' }
		]);
	});

	it('Improved Reflexes 2 power carries a precedence-0 REA bonus (does not stack with cyberware)', () => {
		const power = (
			powersData.powers as Array<{
				name: string;
				bonus?: { specificattribute?: Array<Record<string, unknown>> };
			}>
		).find((p) => p.name === 'Improved Reflexes 2');
		expect(power?.bonus?.specificattribute).toEqual([{ name: 'REA', precedence: '0', val: 2 }]);
	});

	it('Troll metatype carries a flat armor bonus object (not array-wrapped)', () => {
		const troll = (
			metatypesData.metatypes as Array<{ name: string; bonus?: Record<string, unknown> }>
		).find((m) => m.name === 'Troll');
		expect(troll?.bonus).toEqual({ armor: { b: 1, i: 1 }, reach: 1 });
	});

	it('boolean presence-flag bonuses (self-closing XML tags) convert to true, never empty string', () => {
		const uneducated = (qualitiesData.qualities as BonusBearing[]).find(
			(q) => q.name === 'Uneducated'
		);
		expect(uneducated?.bonus?.['uneducated']).toBe(true);
	});
});
