import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { character, characterStore, startNewCharacter, setResourcesBP, addQuality } from '../character';
import {
    initializeMagic,
    setTradition,
    setMentor,
    addSpell,
    removeSpell,
    addPower,
    removePower,
    addSpirit,
    removeSpirit,
    useSpiritService,
    updateSpiritServices,
    learnMetamagic,
    removeMetamagic,
    getFocusKarmaCost,
    bondFocus,
    unbondFocus
} from '../magic';

describe('Magic Store', () => {
    beforeEach(() => {
        startNewCharacter('test-user', 'bp');
        // Add Magician quality so initializeMagic doesn't bail out
        addQuality('Magician', 'Positive', 15);
    });

    describe('Initialization & Configuration', () => {
        it('initializeMagic sets tradition and updates attributes', () => {
            initializeMagic('Hermetic');
            const char = get(character);
            expect(char?.magic?.tradition).toBe('Hermetic');
            expect(char?.attributes.mag).toBeDefined();
            expect(char?.attributes.mag?.base).toBe(1);
        });

        it('setTradition changes tradition after initialization', () => {
            initializeMagic('Hermetic');
            setTradition('Shamanic');
            expect(get(character)?.magic?.tradition).toBe('Shamanic');
        });

        it('setMentor works', () => {
            initializeMagic('Hermetic');
            setMentor('Bear');
            const char = get(character);
            expect(char?.magic?.mentor).toBe('Bear');
            expect(char?.buildPointsSpent.mentor).toBe(5);
        });

        it('setMentor to null removes mentor', () => {
            initializeMagic('Hermetic');
            setMentor('Bear');
            setMentor(null);
            const char = get(character);
            expect(char?.magic?.mentor).toBe(null);
            expect(char?.buildPointsSpent.mentor).toBe(0);
        });
    });

    describe('Spells & Powers', () => {
        beforeEach(() => {
            initializeMagic('Hermetic');
        });

        it('addSpell pushes to spells array', () => {
            addSpell({
                name: 'Manabolt', category: 'Combat', type: 'M',
                range: 'LOS', damage: 'P', duration: 'I', dv: '(F/2)'
            });
            const char = get(character);
            expect(char?.magic?.spells).toHaveLength(1);
            expect(char?.magic?.spells[0]?.name).toBe('Manabolt');
        });

        it('removeSpell takes out a spell', () => {
            addSpell({
                name: 'Manabolt', category: 'Combat', type: 'M',
                range: 'LOS', damage: 'P', duration: 'I', dv: '(F/2)'
            });
            let char = get(character);
            const spellId = char?.magic?.spells[0]?.id;

            removeSpell(spellId!);
            char = get(character);
            expect(char?.magic?.spells).toHaveLength(0);
        });

        it('addPower and removePower manage powers', () => {
            // Need to set character to Adept for power points
            characterStore.update((c) => {
                if (!c || !c.magic) return c;
                return { ...c, magic: { ...c.magic, powerPoints: 6 } };
            })
            addPower({ name: 'Killing Hands', points: 0.5, level: 1 });
            let char = get(character);
            expect(char?.magic?.powers).toHaveLength(1);

            const powerId = char?.magic?.powers[0]?.id;
            removePower(powerId!);

            char = get(character);
            expect(char?.magic?.powers).toHaveLength(0);
        });
    });

    describe('Spirit Management', () => {
        beforeEach(() => {
            initializeMagic('Hermetic');
            setResourcesBP(20); // give them some nuyen if needed
        });

        it('addSpirit works and spends money if binding materials are used (in creation? well, let us just check it adds)', () => {
            const result = addSpirit('Fire', 4, 3, true);
            expect(result.success).toBe(true);

            const char = get(character);
            expect(char?.magic?.spirits).toHaveLength(1);
            expect(char?.magic?.spirits[0]?.bound).toBe(true);
        });

        it('removeSpirit works', () => {
            addSpirit('Fire', 4, 3, true);
            let char = get(character);
            const spId = char?.magic?.spirits[0]?.id;

            removeSpirit(spId!);
            char = get(character);
            expect(char?.magic?.spirits).toHaveLength(0);
        });

        it('useSpiritService decrements services', () => {
            addSpirit('Fire', 4, 3, true);
            let char = get(character);
            const spId = char?.magic?.spirits[0]?.id;

            useSpiritService(spId!);
            char = get(character);
            expect(char?.magic?.spirits[0]?.services).toBe(2);
        });

        it('updateSpiritServices sets exact services', () => {
            addSpirit('Fire', 4, 3, true);
            let char = get(character);
            const spId = char?.magic?.spirits[0]?.id;

            updateSpiritServices(spId!, 5);
            char = get(character);
            expect(char?.magic?.spirits[0]?.services).toBe(5);
        });
    });

    describe('Metamagic Management', () => {
        beforeEach(() => {
            initializeMagic('Hermetic');
        });

        it('learnMetamagic adds if enough initiateGrade', () => {
            characterStore.update(c => {
                if (!c || !c.magic) return c;
                return { ...c, magic: { ...c.magic, initiateGrade: 1 } };
            });
            const result = learnMetamagic('Centering');
            expect(result.success).toBe(true);
            const char = get(character);
            expect(char?.magic?.metamagics).toHaveLength(1);
        });

        it('removeMetamagic removes the metamagic', () => {
            characterStore.update(c => {
                if (!c || !c.magic) return c;
                return { ...c, magic: { ...c.magic, initiateGrade: 1 } };
            });
            learnMetamagic('Centering');
            removeMetamagic('Centering');
            const char = get(character);
            expect(char?.magic?.metamagics).toHaveLength(0);
        });
    });

    describe('Foci Bonding', () => {
        beforeEach(() => {
            initializeMagic('Hermetic');
            // Adding mock focus via character store update to test bonding
            characterStore.update(c => {
                if (!c) return c;
                return {
                    ...c,
                    equipment: {
                        ...c.equipment,
                        foci: [
                            { id: 'f1', name: 'Power Focus', category: 'Power Focus', force: 2, bonded: false } as any
                        ]
                    }
                };
            });
        });

        it('getFocusKarmaCost calculation', () => {
            // Power focus = force * 4 karma/bp
            expect(getFocusKarmaCost('Power Focus', 'Power Focus', 2)).toBe(8);
            expect(getFocusKarmaCost('Weapon Focus', 'Weapon Focus', 3)).toBe(9);
        });

        it('bondFocus sets bonded to true', () => {
            const result = bondFocus('f1');
            expect(result.success).toBe(true);

            const char = get(character);
            expect(char?.equipment.foci[0]?.bonded).toBe(true);
        });

        it('unbondFocus sets bonded to false', () => {
            bondFocus('f1');
            unbondFocus('f1');

            const char = get(character);
            expect(char?.equipment.foci[0]?.bonded).toBe(false);
        });
    });
});
