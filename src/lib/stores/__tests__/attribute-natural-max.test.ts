/**
 * Attribute natural-max clamp tests (issue #66)
 * ==============================================
 * setAttribute must clamp against the natural max (metatype max +
 * Attribute 'max' improvements), not the static metatype limit, so
 * Exceptional-Attribute-style qualities actually raise the settable cap.
 */
import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { startNewCharacter, setAttribute } from '../index';
import { character, characterStore } from '../character';
import { setGameDataForTesting, type GameQuality } from '../gamedata';

const EXCEPTIONAL_ATTRIBUTE_BOD: GameQuality = {
	name: 'Exceptional Attribute (BOD)',
	bp: 15,
	category: 'Positive',
	source: 'SR4',
	page: 92,
	mutant: false,
	limit: true,
	bonus: { specificattribute: [{ name: 'BOD', max: 1 }] }
};

describe('setAttribute natural-max clamp (issue #66)', () => {
	it('clamps to the metatype max when no improvement raises it', () => {
		startNewCharacter('test-user', 'bp');
		setAttribute('bod', 8); // human max is 6
		expect(get(character)?.attributes.bod.base).toBe(6);
	});

	it('Exceptional Attribute quality raises the settable cap by 1', () => {
		setGameDataForTesting({ qualities: [EXCEPTIONAL_ATTRIBUTE_BOD] });
		startNewCharacter('test-user', 'bp');

		setAttribute('bod', 7); // still capped at 6 before the quality
		expect(get(character)?.attributes.bod.base).toBe(6);

		// Directly wire the improvement (avoids depending on #62b's addQuality gamedata lookup path for this store test)
		const char = get(character)!;
		characterStore.set({
			...char,
			improvements: [
				{
					id: 'imp-1',
					type: 'Attribute',
					improvedName: 'bod',
					source: 'Quality',
					sourceName: 'Exceptional Attribute (BOD)',
					val: 0,
					min: 0,
					max: 1,
					aug: 0,
					augMax: 0,
					rating: 1,
					exclude: '',
					uniqueName: '',
					addToRating: false,
					enabled: true
				}
			]
		});

		setAttribute('bod', 7);
		expect(get(character)?.attributes.bod.base).toBe(7);
		setAttribute('bod', 8); // still clamps at the raised cap of 7
		expect(get(character)?.attributes.bod.base).toBe(7);
	});
});
