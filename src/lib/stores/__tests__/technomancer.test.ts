import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { character, characterStore, startNewCharacter } from '../character';
import { initializeResonance, learnEcho, removeEcho } from '../technomancer';
import { setGameDataForTesting } from '../gamedata';

describe('Technomancer Store', () => {
    beforeEach(() => {
        startNewCharacter('test-user', 'bp');
        initializeResonance('Sprite Stream');
        characterStore.update((c) => {
            if (!c || !c.resonance) return c;
            return { ...c, resonance: { ...c.resonance, submersionGrade: 1 } };
        });
    });

    describe('Echo Management', () => {
        it('learnEcho adds if enough submersion grade', () => {
            const result = learnEcho('Analytic Mind');
            expect(result.success).toBe(true);
            expect(get(character)?.resonance?.echoes).toHaveLength(1);
        });

        it('removeEcho removes the echo', () => {
            learnEcho('Analytic Mind');
            removeEcho('Analytic Mind');
            expect(get(character)?.resonance?.echoes).toHaveLength(0);
        });

        it('learnEcho creates improvements from game-data bonus (issue #63b)', () => {
            setGameDataForTesting({
                echoes: [
                    {
                        name: 'Cyber-Adept',
                        source: 'SR4',
                        page: 128,
                        limit: 1,
                        bonusText: '',
                        bonus: { initiativepass: 1 }
                    }
                ]
            });

            learnEcho('Cyber-Adept');

            const char = get(character)!;
            expect(char.improvements).toEqual([
                expect.objectContaining({
                    type: 'InitiativePass',
                    val: 1,
                    uniqueName: 'initiativepass',
                    source: 'Echo',
                    sourceName: 'Cyber-Adept'
                })
            ]);

            removeEcho('Cyber-Adept');
            expect(get(character)!.improvements).toHaveLength(0);
        });

        it('a no-bonus echo creates no improvements', () => {
            const result = learnEcho('Analytic Mind');
            expect(result.success).toBe(true);
            expect(get(character)!.improvements).toHaveLength(0);
        });
    });
});
