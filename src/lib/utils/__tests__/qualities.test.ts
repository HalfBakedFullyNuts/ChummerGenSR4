import { describe, it, expect } from 'vitest';
import { getEnabledTabs, formatQualityBonus, generateQualityTags } from '$lib/utils/qualities';
import type { GameQuality } from '$stores/gamedata';

describe('getEnabledTabs', () => {
	it('returns empty array when enabletab is absent', () => {
		expect(getEnabledTabs(undefined)).toEqual([]);
	});

	it('wraps a plain string enabletab', () => {
		expect(getEnabledTabs('adept')).toEqual(['adept']);
	});

	it('unwraps a multi-tab enabletab (e.g. Mystic Adept: magician + adept)', () => {
		expect(getEnabledTabs({ name: ['magician', 'adept'] })).toEqual(['magician', 'adept']);
	});

	it('unwraps a single-name object enabletab', () => {
		expect(getEnabledTabs({ name: 'magician' })).toEqual(['magician']);
	});
});

describe('formatQualityBonus enabletab handling', () => {
	it('does not throw for a quality that enables more than one tab', () => {
		expect(() =>
			formatQualityBonus({ enabletab: { name: ['magician', 'adept'] } })
		).not.toThrow();
	});

	it('emits one "Enables X abilities" line per tab', () => {
		const results = formatQualityBonus({ enabletab: { name: ['magician', 'adept'] } });
		expect(results).toEqual([
			{ text: 'Enables Magician abilities', positive: true },
			{ text: 'Enables Adept abilities', positive: true }
		]);
	});

	it('still handles the plain-string case', () => {
		const results = formatQualityBonus({ enabletab: 'technomancer' });
		expect(results).toEqual([{ text: 'Enables Technomancer abilities', positive: true }]);
	});
});

describe('generateQualityTags enabletab handling', () => {
	const baseQuality: GameQuality = {
		name: 'Mystic Adept',
		bp: 10,
		category: 'Positive',
		source: 'SR4',
		page: 92,
		mutant: false,
		limit: false
	};

	it('tags a multi-tab quality as magic without throwing', () => {
		const quality: GameQuality = {
			...baseQuality,
			bonus: { enabletab: { name: ['magician', 'adept'] } }
		};
		expect(() => generateQualityTags(quality)).not.toThrow();
		expect(generateQualityTags(quality)).toContain('magic');
	});
});
