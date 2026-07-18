import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { character, startNewCharacter, addQuality, removeQuality } from '../index';
import * as barrel from '../index';
import * as direct from '../character';
import { setGameDataForTesting, type GameQuality } from '../gamedata';

const TOUGHNESS: GameQuality = {
	name: 'Toughness',
	bp: 10,
	category: 'Positive',
	source: 'SR4',
	page: 93,
	mutant: true,
	limit: true,
	bonus: { damageresistance: 1 }
};

describe('Quality barrel exports (issue #61)', () => {
	it('barrel addQuality creates improvements from gamedata bonus', () => {
		setGameDataForTesting({ qualities: [TOUGHNESS] });
		startNewCharacter('test-user', 'bp');

		addQuality('Toughness', 'Positive', 10);

		const char = get(character);
		expect(char?.improvements).toHaveLength(1);
		expect(char?.improvements[0]).toMatchObject({
			type: 'DamageResistance',
			source: 'Quality',
			sourceName: 'Toughness',
			val: 1
		});
	});

	it('barrel removeQuality removes improvements and refunds BP', () => {
		setGameDataForTesting({ qualities: [TOUGHNESS] });
		startNewCharacter('test-user', 'bp');

		addQuality('Toughness', 'Positive', 10);
		const added = get(character);
		const qualityId = added?.qualities[0]?.id;

		removeQuality(qualityId!);

		const char = get(character);
		expect(char?.improvements).toHaveLength(0);
		expect(char?.qualities).toHaveLength(0);
		expect(char?.buildPointsSpent.qualities).toBe(0);
	});

	it('barrel and direct import are identical', () => {
		expect(barrel.addQuality).toBe(direct.addQuality);
		expect(barrel.addQualityAgain).toBe(direct.addQualityAgain);
		expect(barrel.removeQuality).toBe(direct.removeQuality);
	});
});
