/**
 * Career Mode Tests
 * =================
 * Tests for career mode character advancement.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	character,
	startNewCharacter,
	enterCareerMode,
	awardKarma,
	awardNuyen,
	spendNuyen,
	improveAttribute,
	improveSkill,
	learnNewSkill,
	addSpecialization,
	learnKnowledgeSkill,
	improveKnowledgeSkill,
	learnSpell,
	initiate,
	getExpenseLog,
	isCareerMode,
	KARMA_COSTS,
	setSkill,
	addQuality,
	initializeMagic,
	setAttribute
} from '../character';

describe('Career Mode', () => {
	beforeEach(() => {
		startNewCharacter('test-user', 'bp');
	});

	describe('enterCareerMode', () => {
		it('should transition character to career mode', () => {
			const result = enterCareerMode();
			expect(result.success).toBe(true);

			const char = get(character);
			expect(char?.status).toBe('career');
		});

		it('should fail if already in career mode', () => {
			enterCareerMode();
			const result = enterCareerMode();

			expect(result.success).toBe(false);
			expect(result.error).toContain('already in career mode');
		});

		it('should update isCareerMode derived store', () => {
			expect(get(isCareerMode)).toBe(false);
			enterCareerMode();
			expect(get(isCareerMode)).toBe(true);
		});
	});

	describe('awardKarma', () => {
		it('should add karma to the character', () => {
			const charBefore = get(character);
			const karmaBefore = charBefore?.karma ?? 0;

			const result = awardKarma(10, 'Session reward');

			expect(result.success).toBe(true);
			const charAfter = get(character);
			expect(charAfter?.karma).toBe(karmaBefore + 10);
			expect(charAfter?.totalKarma).toBe(karmaBefore + 10);
		});

		it('should add entry to expense log', () => {
			awardKarma(10, 'Session reward');

			const log = getExpenseLog();
			expect(log.length).toBeGreaterThan(0);
			expect(log[log.length - 1]?.type).toBe('karma');
			expect(log[log.length - 1]?.amount).toBe(10);
			expect(log[log.length - 1]?.reason).toBe('Session reward');
		});

		it('should fail with zero or negative amount', () => {
			const result = awardKarma(0, 'Test');
			expect(result.success).toBe(false);

			const result2 = awardKarma(-5, 'Test');
			expect(result2.success).toBe(false);
		});
	});

	describe('awardNuyen', () => {
		it('should add nuyen to the character', () => {
			const charBefore = get(character);
			const nuyenBefore = charBefore?.nuyen ?? 0;

			const result = awardNuyen(5000, 'Job payment');

			expect(result.success).toBe(true);
			const charAfter = get(character);
			expect(charAfter?.nuyen).toBe(nuyenBefore + 5000);
		});

		it('should add entry to expense log', () => {
			awardNuyen(5000, 'Job payment');

			const log = getExpenseLog();
			expect(log.length).toBeGreaterThan(0);
			expect(log[log.length - 1]?.type).toBe('nuyen');
			expect(log[log.length - 1]?.amount).toBe(5000);
		});
	});

	describe('spendNuyen', () => {
		it('should subtract nuyen from the character', () => {
			awardNuyen(10000, 'Starting funds');
			const charBefore = get(character);
			const nuyenBefore = charBefore?.nuyen ?? 0;

			const result = spendNuyen(3000, 'Bought gear');

			expect(result.success).toBe(true);
			const charAfter = get(character);
			expect(charAfter?.nuyen).toBe(nuyenBefore - 3000);
		});

		it('should fail if not enough nuyen', () => {
			const result = spendNuyen(1000000, 'Too expensive');

			expect(result.success).toBe(false);
			expect(result.error).toContain('Not enough nuyen');
		});

		it('should add negative entry to expense log', () => {
			awardNuyen(10000, 'Starting');
			spendNuyen(3000, 'Equipment');

			const log = getExpenseLog();
			const lastEntry = log[log.length - 1];
			expect(lastEntry?.amount).toBe(-3000);
		});
	});

	describe('improveAttribute', () => {
		beforeEach(() => {
			enterCareerMode();
			awardKarma(100, 'Test karma');
		});

		it('should improve an attribute with correct karma cost', () => {
			const charBefore = get(character);
			const bodBefore = charBefore?.attributes.bod.base ?? 0;
			const karmaBefore = charBefore?.karma ?? 0;
			const newRating = bodBefore + 1;
			const expectedCost = newRating * KARMA_COSTS.IMPROVE_ATTRIBUTE_MULTIPLIER;

			const result = improveAttribute('bod');

			expect(result.success).toBe(true);
			const charAfter = get(character);
			expect(charAfter?.attributes.bod.base).toBe(bodBefore + 1);
			expect(charAfter?.karma).toBe(karmaBefore - expectedCost);
		});

		it('should fail if not in career mode', () => {
			startNewCharacter('test-user', 'bp');
			awardKarma(100, 'Test karma');

			const result = improveAttribute('bod');

			expect(result.success).toBe(false);
			expect(result.error).toContain('career mode');
		});

		it('should fail if not enough karma', () => {
			/* Test with no karma - start fresh */
			startNewCharacter('test-user', 'bp');
			enterCareerMode();
			/* No karma added */

			const result = improveAttribute('bod');
			expect(result.success).toBe(false);
			expect(result.error).toContain('Not enough karma');
		});

		it('should fail if at maximum', () => {
			/* Set attribute to max first */
			setAttribute('bod', 6);
			enterCareerMode();
			awardKarma(500, 'Test karma');

			const result = improveAttribute('bod');

			expect(result.success).toBe(false);
			expect(result.error).toContain('maximum');
		});
	});

	describe('improveSkill', () => {
		beforeEach(() => {
			setSkill('Pistols', 3);
			enterCareerMode();
			awardKarma(100, 'Test karma');
		});

		it('should improve a skill with correct karma cost', () => {
			const charBefore = get(character);
			const skill = charBefore?.skills.find(s => s.name === 'Pistols');
			const ratingBefore = skill?.rating ?? 0;
			const karmaBefore = charBefore?.karma ?? 0;
			const newRating = ratingBefore + 1;
			const expectedCost = newRating * KARMA_COSTS.IMPROVE_SKILL_MULTIPLIER;

			const result = improveSkill('Pistols');

			expect(result.success).toBe(true);
			const charAfter = get(character);
			const skillAfter = charAfter?.skills.find(s => s.name === 'Pistols');
			expect(skillAfter?.rating).toBe(ratingBefore + 1);
			expect(charAfter?.karma).toBe(karmaBefore - expectedCost);
		});

		it('should fail for non-existent skill', () => {
			const result = improveSkill('NonExistentSkill');

			expect(result.success).toBe(false);
			expect(result.error).toContain('not found');
		});

		it('should fail if skill at maximum (6)', () => {
			setSkill('Longarms', 6);

			const result = improveSkill('Longarms');

			expect(result.success).toBe(false);
			expect(result.error).toContain('maximum');
		});
	});

	describe('learnNewSkill', () => {
		beforeEach(() => {
			enterCareerMode();
			awardKarma(100, 'Test karma');
		});

		it('should add a new skill at rating 1', () => {
			const result = learnNewSkill('Automatics');

			expect(result.success).toBe(true);
			const char = get(character);
			const newSkill = char?.skills.find(s => s.name === 'Automatics');
			expect(newSkill).toBeDefined();
			expect(newSkill?.rating).toBe(1);
		});

		it('should cost 4 karma', () => {
			const charBefore = get(character);
			const karmaBefore = charBefore?.karma ?? 0;

			learnNewSkill('Automatics');

			const charAfter = get(character);
			expect(charAfter?.karma).toBe(karmaBefore - KARMA_COSTS.NEW_SKILL);
		});

		it('should fail if already has the skill', () => {
			learnNewSkill('Automatics');
			const result = learnNewSkill('Automatics');

			expect(result.success).toBe(false);
			expect(result.error).toContain('Already has');
		});
	});

	describe('addSpecialization', () => {
		beforeEach(() => {
			setSkill('Pistols', 3);
			enterCareerMode();
			awardKarma(100, 'Test karma');
		});

		it('should add a specialization to a skill', () => {
			const result = addSpecialization('Pistols', 'Semi-Automatics');

			expect(result.success).toBe(true);
			const char = get(character);
			const skill = char?.skills.find(s => s.name === 'Pistols');
			expect(skill?.specialization).toBe('Semi-Automatics');
		});

		it('should cost 2 karma', () => {
			const charBefore = get(character);
			const karmaBefore = charBefore?.karma ?? 0;

			addSpecialization('Pistols', 'Semi-Automatics');

			const charAfter = get(character);
			expect(charAfter?.karma).toBe(karmaBefore - 2);
		});

		it('should fail if skill already has specialization', () => {
			addSpecialization('Pistols', 'Semi-Automatics');
			const result = addSpecialization('Pistols', 'Revolvers');

			expect(result.success).toBe(false);
			expect(result.error).toContain('already has a specialization');
		});
	});

	describe('learnKnowledgeSkill', () => {
		beforeEach(() => {
			enterCareerMode();
			awardKarma(100, 'Test karma');
		});

		it('should add a new knowledge skill at rating 1', () => {
			const result = learnKnowledgeSkill('Seattle Gangs', 'Street');

			expect(result.success).toBe(true);
			const char = get(character);
			const newSkill = char?.knowledgeSkills.find(s => s.name === 'Seattle Gangs');
			expect(newSkill).toBeDefined();
			expect(newSkill?.rating).toBe(1);
			expect(newSkill?.category).toBe('Street');
		});

		it('should cost 2 karma', () => {
			const charBefore = get(character);
			const karmaBefore = charBefore?.karma ?? 0;

			learnKnowledgeSkill('Seattle Gangs', 'Street');

			const charAfter = get(character);
			expect(charAfter?.karma).toBe(karmaBefore - KARMA_COSTS.NEW_KNOWLEDGE_SKILL);
		});
	});

	describe('improveKnowledgeSkill', () => {
		beforeEach(() => {
			enterCareerMode();
			awardKarma(100, 'Test karma');
			learnKnowledgeSkill('Seattle History', 'Academic');
		});

		it('should improve a knowledge skill', () => {
			const char = get(character);
			const skill = char?.knowledgeSkills.find(s => s.name === 'Seattle History');
			const skillId = skill?.id;

			const result = improveKnowledgeSkill(skillId!);

			expect(result.success).toBe(true);
			const charAfter = get(character);
			const skillAfter = charAfter?.knowledgeSkills.find(s => s.id === skillId);
			expect(skillAfter?.rating).toBe(2);
		});

		it('should cost new rating × 1 karma', () => {
			const char = get(character);
			const skill = char?.knowledgeSkills.find(s => s.name === 'Seattle History');
			const skillId = skill?.id;
			const karmaBefore = char?.karma ?? 0;

			improveKnowledgeSkill(skillId!);

			const charAfter = get(character);
			/* From rating 1 to 2 costs 2 × 1 = 2 karma */
			expect(charAfter?.karma).toBe(karmaBefore - 2);
		});
	});

	describe('learnSpell', () => {
		beforeEach(() => {
			/* Add Magician quality first to make character awakened */
			addQuality('Magician', 'Positive', 15);
			initializeMagic('Hermetic');
			enterCareerMode();
			awardKarma(100, 'Test karma');
		});

		it('should add a new spell', () => {
			const result = learnSpell({
				name: 'Manabolt',
				category: 'Combat',
				type: 'Mana',
				range: 'LOS',
				damage: 'Physical',
				duration: 'Instant',
				dv: 'F/2'
			});

			expect(result.success).toBe(true);
			const char = get(character);
			const spell = char?.magic?.spells.find(s => s.name === 'Manabolt');
			expect(spell).toBeDefined();
		});

		it('should cost 5 karma', () => {
			const charBefore = get(character);
			const karmaBefore = charBefore?.karma ?? 0;

			learnSpell({
				name: 'Manabolt',
				category: 'Combat',
				type: 'Mana',
				range: 'LOS',
				damage: 'Physical',
				duration: 'Instant',
				dv: 'F/2'
			});

			const charAfter = get(character);
			expect(charAfter?.karma).toBe(karmaBefore - KARMA_COSTS.NEW_SPELL);
		});

		it('should fail for non-magical character', () => {
			startNewCharacter('test-user', 'bp');
			enterCareerMode();
			awardKarma(100, 'Test karma');

			const result = learnSpell({
				name: 'Manabolt',
				category: 'Combat',
				type: 'Mana',
				range: 'LOS',
				damage: 'Physical',
				duration: 'Instant',
				dv: 'F/2'
			});

			expect(result.success).toBe(false);
			expect(result.error).toContain('not awakened');
		});
	});

	describe('initiate', () => {
		beforeEach(() => {
			/* Add Magician quality first to make character awakened */
			addQuality('Magician', 'Positive', 15);
			initializeMagic('Hermetic');
			enterCareerMode();
			awardKarma(100, 'Test karma');
		});

		it('should increase initiate grade', () => {
			const charBefore = get(character);
			const gradeBefore = charBefore?.magic?.initiateGrade ?? 0;

			const result = initiate();

			expect(result.success).toBe(true);
			const charAfter = get(character);
			expect(charAfter?.magic?.initiateGrade).toBe(gradeBefore + 1);
		});

		it('should cost 10 + (new grade × 3) karma', () => {
			const charBefore = get(character);
			const karmaBefore = charBefore?.karma ?? 0;
			/* First initiation: 10 + (1 × 3) = 13 karma */

			initiate();

			const charAfter = get(character);
			expect(charAfter?.karma).toBe(karmaBefore - 13);
		});

		it('should fail for non-magical character', () => {
			startNewCharacter('test-user', 'bp');
			enterCareerMode();
			awardKarma(100, 'Test karma');

			const result = initiate();

			expect(result.success).toBe(false);
			expect(result.error).toContain('not awakened');
		});
	});

	describe('KARMA_COSTS', () => {
		it('should have correct values', () => {
			expect(KARMA_COSTS.NEW_SKILL).toBe(4);
			expect(KARMA_COSTS.IMPROVE_SKILL_MULTIPLIER).toBe(2);
			expect(KARMA_COSTS.NEW_SKILL_GROUP).toBe(10);
			expect(KARMA_COSTS.IMPROVE_SKILL_GROUP_MULTIPLIER).toBe(5);
			expect(KARMA_COSTS.NEW_KNOWLEDGE_SKILL).toBe(2);
			expect(KARMA_COSTS.IMPROVE_KNOWLEDGE_SKILL_MULTIPLIER).toBe(1);
			expect(KARMA_COSTS.IMPROVE_ATTRIBUTE_MULTIPLIER).toBe(5);
			expect(KARMA_COSTS.NEW_SPELL).toBe(5);
			expect(KARMA_COSTS.NEW_COMPLEX_FORM).toBe(5);
			expect(KARMA_COSTS.INITIATION_BASE).toBe(10);
			expect(KARMA_COSTS.INITIATION_MULTIPLIER).toBe(3);
		});
	});
});
