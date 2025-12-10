/**
 * XML Exporter Tests
 * ==================
 * Tests for Chummer XML export functionality.
 */

import { describe, it, expect } from 'vitest';
import { exportToChummer } from '../exporter';
import { createEmptyCharacter } from '$types';

describe('XML Exporter', () => {
	describe('exportToChummer', () => {
		it('should export a basic character', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');
			const xml = exportToChummer(character);

			expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
			expect(xml).toContain('<character>');
			expect(xml).toContain('</character>');
		});

		it('should export identity information', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');
			const modifiedCharacter = {
				...character,
				identity: {
					...character.identity,
					name: 'Test Runner',
					alias: 'Shadow',
					metatype: 'Elf',
					sex: 'Female'
				}
			};

			const xml = exportToChummer(modifiedCharacter);

			expect(xml).toContain('<name>Test Runner</name>');
			expect(xml).toContain('<alias>Shadow</alias>');
			expect(xml).toContain('<metatype>Elf</metatype>');
			expect(xml).toContain('<sex>Female</sex>');
		});

		it('should export attributes', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');
			const modified = {
				...character,
				attributes: {
					...character.attributes,
					bod: { base: 4, bonus: 0, karma: 0 },
					agi: { base: 5, bonus: 1, karma: 0 }
				}
			};

			const xml = exportToChummer(modified);

			expect(xml).toContain('<attributes>');
			expect(xml).toContain('<name>BOD</name>');
			expect(xml).toContain('<name>AGI</name>');
			expect(xml).toContain('</attributes>');
		});

		it('should export skills', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');
			const modified = {
				...character,
				skills: [
					{ name: 'Pistols', rating: 4, specialization: null, bonus: 0, karmaSpent: 0 },
					{ name: 'Stealth', rating: 3, specialization: 'Urban', bonus: 0, karmaSpent: 0 }
				]
			};

			const xml = exportToChummer(modified);

			expect(xml).toContain('<skills>');
			expect(xml).toContain('<name>Pistols</name>');
			expect(xml).toContain('<rating>4</rating>');
			expect(xml).toContain('<name>Stealth</name>');
			expect(xml).toContain('<spec>Urban</spec>');
			expect(xml).toContain('</skills>');
		});

		it('should export knowledge skills with derived attributes', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');
			const modified = {
				...character,
				knowledgeSkills: [
					{ id: 'ks1', name: 'History', category: 'Academic' as const, attribute: 'LOG' as const, rating: 3, specialization: null },
					{ id: 'ks2', name: 'Urban Brawl', category: 'Interest' as const, attribute: 'INT' as const, rating: 2, specialization: null }
				]
			};

			const xml = exportToChummer(modified);

			expect(xml).toContain('<name>History</name>');
			expect(xml).toContain('<knowledge>True</knowledge>');
			/* Academic category should use LOG */
			expect(xml).toContain('<attribute>LOG</attribute>');
			/* Interest category should use INT */
			expect(xml).toContain('<attribute>INT</attribute>');
		});

		it('should export contacts', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');
			const modified = {
				...character,
				contacts: [
					{ id: 'c1', name: 'Fixer Mike', type: 'Fixer', loyalty: 4, connection: 3, notes: 'Reliable' }
				]
			};

			const xml = exportToChummer(modified);

			expect(xml).toContain('<contacts>');
			expect(xml).toContain('<name>Fixer Mike</name>');
			expect(xml).toContain('<loyalty>4</loyalty>');
			expect(xml).toContain('<connection>3</connection>');
			expect(xml).toContain('<type>Fixer</type>');
			expect(xml).toContain('</contacts>');
		});

		it('should export weapons', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');
			const modified = {
				...character,
				equipment: {
					...character.equipment,
					weapons: [
						{
							id: 'w1',
							name: 'Ares Predator IV',
							category: 'Pistols',
							type: 'Ranged' as const,
							reach: 0,
							damage: '5P',
							ap: '-1',
							mode: 'SA',
							rc: '0',
							ammo: '15(c)',
							currentAmmo: 15,
							conceal: 0,
							cost: 350,
							accessories: [],
							notes: ''
						}
					]
				}
			};

			const xml = exportToChummer(modified);

			expect(xml).toContain('<weapons>');
			expect(xml).toContain('<name>Ares Predator IV</name>');
			expect(xml).toContain('<damage>5P</damage>');
			expect(xml).toContain('<ap>-1</ap>');
			expect(xml).toContain('</weapons>');
		});

		it('should export armor', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');
			const modified = {
				...character,
				equipment: {
					...character.equipment,
					armor: [
						{
							id: 'a1',
							name: 'Armor Jacket',
							category: 'Armor',
							ballistic: 8,
							impact: 6,
							capacity: 4,
							capacityUsed: 0,
							equipped: true,
							cost: 900,
							modifications: [],
							notes: ''
						}
					]
				}
			};

			const xml = exportToChummer(modified);

			expect(xml).toContain('<armors>');
			expect(xml).toContain('<name>Armor Jacket</name>');
			expect(xml).toContain('<armor>8</armor>');
			expect(xml).toContain('<armorimpact>6</armorimpact>');
			expect(xml).toContain('</armors>');
		});

		it('should export cyberware with grade', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');
			const modified = {
				...character,
				equipment: {
					...character.equipment,
					cyberware: [
						{
							id: 'cy1',
							name: 'Wired Reflexes',
							category: 'Bodyware',
							grade: 'Alphaware' as const,
							rating: 2,
							essence: 1.6,
							cost: 32000,
							capacity: 0,
							capacityUsed: 0,
							location: '',
							subsystems: [],
							notes: ''
						}
					]
				}
			};

			const xml = exportToChummer(modified);

			expect(xml).toContain('<cyberwares>');
			expect(xml).toContain('<name>Wired Reflexes</name>');
			expect(xml).toContain('<grade>Alphaware</grade>');
			expect(xml).toContain('<rating>2</rating>');
			expect(xml).toContain('</cyberwares>');
		});

		it('should export qualities', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');
			const modified = {
				...character,
				qualities: [
					{ id: 'q1', name: 'SINner', category: 'Negative' as const, bp: 5, rating: 1, notes: '' }
				]
			};

			const xml = exportToChummer(modified);

			expect(xml).toContain('<qualities>');
			expect(xml).toContain('<name>SINner</name>');
			expect(xml).toContain('<bp>5</bp>');
			expect(xml).toContain('<qualitytype>Negative</qualitytype>');
			expect(xml).toContain('</qualities>');
		});

		it('should export magic data when available', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');
			const modified = {
				...character,
				magic: {
					tradition: 'Hermetic',
					mentor: null,
					initiateGrade: 0,
					powerPoints: 0,
					powerPointsUsed: 0,
					spells: [
						{
							id: 's1',
							name: 'Fireball',
							category: 'Combat',
							type: 'Physical',
							range: 'LOS (A)',
							damage: 'Physical',
							duration: 'Instant',
							dv: 'F/2+3',
							notes: ''
						}
					],
					powers: [],
					spirits: [],
					foci: [],
					metamagics: []
				}
			};

			const xml = exportToChummer(modified);

			expect(xml).toContain('<magenabled>True</magenabled>');
			expect(xml).toContain('<tradition>Hermetic</tradition>');
			expect(xml).toContain('<spells>');
			expect(xml).toContain('<name>Fireball</name>');
		});

		it('should escape XML special characters', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');
			const modified = {
				...character,
				identity: {
					...character.identity,
					name: 'Test <Runner> & "Alias"'
				}
			};

			const xml = exportToChummer(modified);

			expect(xml).toContain('Test &lt;Runner&gt; &amp; &quot;Alias&quot;');
			expect(xml).not.toContain('Test <Runner>');
		});

		it('should export career mode characters as created', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');
			const modified = {
				...character,
				status: 'career' as const
			};

			const xml = exportToChummer(modified);

			expect(xml).toContain('<created>True</created>');
		});

		it('should export creation mode characters as not created', () => {
			const character = createEmptyCharacter('test-id', 'user-123', 'bp');

			const xml = exportToChummer(character);

			expect(xml).toContain('<created>False</created>');
		});
	});
});
