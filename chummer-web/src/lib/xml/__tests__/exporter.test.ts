/**
 * XML Exporter Tests
 * ==================
 * Tests for Chummer XML export functionality with round-trip testing.
 */

import { describe, it, expect } from 'vitest';
import { exportToChummer } from '../exporter';
import { importFromChummer } from '../importer';
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
			character.identity.name = 'Test Runner';
			character.identity.alias = 'Shadow';
			character.identity.metatype = 'Elf';
			character.identity.sex = 'Female';

			const xml = exportToChummer({
				...character,
				identity: {
					...character.identity,
					name: 'Test Runner',
					alias: 'Shadow',
					metatype: 'Elf',
					sex: 'Female'
				}
			});

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
					{ id: 'ks1', name: 'History', category: 'Academic' as const, rating: 3, specialization: null },
					{ id: 'ks2', name: 'Urban Brawl', category: 'Interest' as const, rating: 2, specialization: null }
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

	/* ============================================
	 * Round-Trip Tests
	 * ============================================ */

	describe('Round-Trip Import/Export', () => {
		it('should preserve character identity through round-trip', () => {
			const original = {
				...createEmptyCharacter('test-id', 'user-123', 'bp'),
				identity: {
					name: 'Shadow Runner',
					alias: 'Ghost',
					playerName: 'Test Player',
					metatype: 'Elf',
					metavariant: null,
					sex: 'Female',
					age: '28',
					height: '1.85m',
					weight: '65kg',
					hair: 'Black',
					eyes: 'Green',
					skin: 'Fair',
					ethnicity: ''
				}
			};

			const xml = exportToChummer(original);
			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.identity.name).toBe('Shadow Runner');
			expect(result.character?.identity.alias).toBe('Ghost');
			expect(result.character?.identity.metatype).toBe('Elf');
			expect(result.character?.identity.sex).toBe('Female');
		});

		it('should preserve attributes through round-trip', () => {
			const original = {
				...createEmptyCharacter('test-id', 'user-123', 'bp'),
				attributes: {
					bod: { base: 4, bonus: 0, karma: 0 },
					agi: { base: 5, bonus: 1, karma: 0 },
					rea: { base: 3, bonus: 0, karma: 0 },
					str: { base: 4, bonus: 0, karma: 0 },
					cha: { base: 3, bonus: 0, karma: 0 },
					int: { base: 4, bonus: 0, karma: 0 },
					log: { base: 3, bonus: 0, karma: 0 },
					wil: { base: 3, bonus: 0, karma: 0 },
					edg: { base: 2, bonus: 0, karma: 0 },
					mag: null,
					res: null,
					ess: 5.5
				}
			};

			const xml = exportToChummer(original);
			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.attributes.bod.base).toBe(4);
			expect(result.character?.attributes.agi.base).toBe(5);
			expect(result.character?.attributes.agi.bonus).toBe(1);
		});

		it('should preserve skills through round-trip', () => {
			const original = {
				...createEmptyCharacter('test-id', 'user-123', 'bp'),
				skills: [
					{ name: 'Pistols', rating: 4, specialization: 'Semi-Automatics', bonus: 0, karmaSpent: 0 },
					{ name: 'Stealth', rating: 3, specialization: null, bonus: 0, karmaSpent: 0 },
					{ name: 'Electronics', rating: 2, specialization: null, bonus: 0, karmaSpent: 0 }
				],
				knowledgeSkills: [
					{ id: 'ks1', name: 'Corporate Security', category: 'Professional' as const, rating: 3, specialization: null },
					{ id: 'ks2', name: 'Seattle Gangs', category: 'Street' as const, rating: 4, specialization: null }
				]
			};

			const xml = exportToChummer(original);
			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.skills).toHaveLength(3);
			expect(result.character?.skills.find(s => s.name === 'Pistols')?.rating).toBe(4);
			expect(result.character?.skills.find(s => s.name === 'Pistols')?.specialization).toBe('Semi-Automatics');
			expect(result.character?.knowledgeSkills).toHaveLength(2);
		});

		it('should preserve contacts through round-trip', () => {
			const original = {
				...createEmptyCharacter('test-id', 'user-123', 'bp'),
				contacts: [
					{ id: 'c1', name: 'Fixer Mike', type: 'Fixer', loyalty: 4, connection: 3, notes: 'Good for gear' },
					{ id: 'c2', name: 'Street Doc', type: 'Doctor', loyalty: 3, connection: 2, notes: '' }
				]
			};

			const xml = exportToChummer(original);
			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.contacts).toHaveLength(2);
			expect(result.character?.contacts.find(c => c.name === 'Fixer Mike')?.loyalty).toBe(4);
			expect(result.character?.contacts.find(c => c.name === 'Fixer Mike')?.connection).toBe(3);
		});

		it('should preserve qualities through round-trip', () => {
			const original = {
				...createEmptyCharacter('test-id', 'user-123', 'bp'),
				qualities: [
					{ id: 'q1', name: 'Low-Light Vision', category: 'Positive' as const, bp: 10, rating: 1, notes: '' },
					{ id: 'q2', name: 'SINner', category: 'Negative' as const, bp: 5, rating: 1, notes: 'National' }
				]
			};

			const xml = exportToChummer(original);
			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.qualities).toHaveLength(2);
			expect(result.character?.qualities.find(q => q.name === 'Low-Light Vision')?.category).toBe('Positive');
			expect(result.character?.qualities.find(q => q.name === 'SINner')?.bp).toBe(5);
		});

		it('should preserve weapons through round-trip', () => {
			const original = {
				...createEmptyCharacter('test-id', 'user-123', 'bp'),
				equipment: {
					...createEmptyCharacter('test-id', 'user-123', 'bp').equipment,
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
							currentAmmo: 12,
							conceal: 0,
							cost: 350,
							accessories: [],
							notes: 'Primary sidearm'
						}
					]
				}
			};

			const xml = exportToChummer(original);
			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.equipment.weapons).toHaveLength(1);
			expect(result.character?.equipment.weapons[0].name).toBe('Ares Predator IV');
			expect(result.character?.equipment.weapons[0].damage).toBe('5P');
		});

		it('should preserve armor through round-trip', () => {
			const original = {
				...createEmptyCharacter('test-id', 'user-123', 'bp'),
				equipment: {
					...createEmptyCharacter('test-id', 'user-123', 'bp').equipment,
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

			const xml = exportToChummer(original);
			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.equipment.armor).toHaveLength(1);
			expect(result.character?.equipment.armor[0].ballistic).toBe(8);
			expect(result.character?.equipment.armor[0].impact).toBe(6);
		});

		it('should preserve cyberware through round-trip', () => {
			const original = {
				...createEmptyCharacter('test-id', 'user-123', 'bp'),
				equipment: {
					...createEmptyCharacter('test-id', 'user-123', 'bp').equipment,
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

			const xml = exportToChummer(original);
			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.equipment.cyberware).toHaveLength(1);
			expect(result.character?.equipment.cyberware[0].name).toBe('Wired Reflexes');
			expect(result.character?.equipment.cyberware[0].grade).toBe('Alphaware');
			expect(result.character?.equipment.cyberware[0].rating).toBe(2);
		});

		it('should preserve magic data through round-trip', () => {
			const original = {
				...createEmptyCharacter('test-id', 'user-123', 'bp'),
				magic: {
					tradition: 'Hermetic',
					mentor: null,
					initiateGrade: 1,
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

			const xml = exportToChummer(original);
			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.magic).not.toBeNull();
			expect(result.character?.magic?.tradition).toBe('Hermetic');
			expect(result.character?.magic?.initiateGrade).toBe(1);
			expect(result.character?.magic?.spells).toHaveLength(1);
			expect(result.character?.magic?.spells[0].name).toBe('Fireball');
		});

		it('should preserve adept powers through round-trip', () => {
			const original = {
				...createEmptyCharacter('test-id', 'user-123', 'bp'),
				magic: {
					tradition: '',
					mentor: null,
					initiateGrade: 0,
					powerPoints: 6,
					powerPointsUsed: 3.5,
					spells: [],
					powers: [
						{ id: 'p1', name: 'Improved Reflexes', points: 1.5, level: 2, notes: '' },
						{ id: 'p2', name: 'Combat Sense', points: 0.5, level: 1, notes: '' }
					],
					spirits: [],
					foci: [],
					metamagics: []
				}
			};

			const xml = exportToChummer(original);
			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.magic?.powers).toHaveLength(2);
			expect(result.character?.magic?.powers.find(p => p.name === 'Improved Reflexes')?.level).toBe(2);
		});

		it('should preserve career status through round-trip', () => {
			const original = {
				...createEmptyCharacter('test-id', 'user-123', 'bp'),
				status: 'career' as const,
				karma: 15,
				totalKarma: 25
			};

			const xml = exportToChummer(original);
			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.status).toBe('career');
			expect(result.character?.karma).toBe(15);
			expect(result.character?.totalKarma).toBe(25);
		});

		it('should handle complex character with all data types', () => {
			const original = {
				...createEmptyCharacter('test-id', 'user-123', 'bp'),
				identity: {
					name: 'Full Test Character',
					alias: 'Everything',
					playerName: 'Developer',
					metatype: 'Ork',
					metavariant: null,
					sex: 'Male',
					age: '35',
					height: '2m',
					weight: '120kg',
					hair: 'Brown',
					eyes: 'Brown',
					skin: 'Green',
					ethnicity: ''
				},
				attributes: {
					bod: { base: 5, bonus: 1, karma: 0 },
					agi: { base: 3, bonus: 0, karma: 0 },
					rea: { base: 4, bonus: 2, karma: 0 },
					str: { base: 6, bonus: 0, karma: 0 },
					cha: { base: 2, bonus: 0, karma: 0 },
					int: { base: 3, bonus: 0, karma: 0 },
					log: { base: 3, bonus: 0, karma: 0 },
					wil: { base: 4, bonus: 0, karma: 0 },
					edg: { base: 3, bonus: 0, karma: 0 },
					mag: { base: 4, bonus: 0, karma: 0 },
					res: null,
					ess: 4.2
				},
				skills: [
					{ name: 'Automatics', rating: 5, specialization: 'Assault Rifles', bonus: 0, karmaSpent: 0 },
					{ name: 'Blades', rating: 4, specialization: null, bonus: 0, karmaSpent: 0 }
				],
				knowledgeSkills: [
					{ id: 'ks1', name: 'Military Tactics', category: 'Professional' as const, rating: 4, specialization: null }
				],
				qualities: [
					{ id: 'q1', name: 'Magician', category: 'Positive' as const, bp: 15, rating: 1, notes: '' },
					{ id: 'q2', name: 'Bad Rep', category: 'Negative' as const, bp: 5, rating: 1, notes: '' }
				],
				contacts: [
					{ id: 'c1', name: 'Army Buddy', type: 'Contact', loyalty: 5, connection: 4, notes: '' }
				],
				equipment: {
					weapons: [{
						id: 'w1',
						name: 'AK-97',
						category: 'Assault Rifles',
						type: 'Ranged' as const,
						reach: 0,
						damage: '6P',
						ap: '-1',
						mode: 'SA/BF/FA',
						rc: '0',
						ammo: '38(c)',
						currentAmmo: 38,
						conceal: 0,
						cost: 950,
						accessories: [],
						notes: ''
					}],
					armor: [{
						id: 'a1',
						name: 'Military Armor',
						category: 'Armor',
						ballistic: 12,
						impact: 10,
						capacity: 8,
						capacityUsed: 0,
						equipped: true,
						cost: 5000,
						modifications: [],
						notes: ''
					}],
					cyberware: [{
						id: 'cy1',
						name: 'Cybereyes Basic System',
						category: 'Headware',
						grade: 'Standard' as const,
						rating: 1,
						essence: 0.5,
						cost: 500,
						capacity: 4,
						capacityUsed: 0,
						location: '',
						subsystems: [],
						notes: ''
					}],
					bioware: [],
					vehicles: [],
					gear: [],
					lifestyle: null,
					martialArts: []
				},
				magic: {
					tradition: 'Hermetic',
					mentor: null,
					initiateGrade: 0,
					powerPoints: 0,
					powerPointsUsed: 0,
					spells: [{
						id: 's1',
						name: 'Manabolt',
						category: 'Combat',
						type: 'Mana',
						range: 'LOS',
						damage: 'Physical',
						duration: 'Instant',
						dv: 'F/2+1',
						notes: ''
					}],
					powers: [],
					spirits: [],
					foci: [],
					metamagics: []
				}
			};

			const xml = exportToChummer(original);
			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.identity.name).toBe('Full Test Character');
			expect(result.character?.identity.metatype).toBe('Ork');
			expect(result.character?.attributes.str.base).toBe(6);
			expect(result.character?.skills).toHaveLength(2);
			expect(result.character?.qualities).toHaveLength(2);
			expect(result.character?.contacts).toHaveLength(1);
			expect(result.character?.equipment.weapons).toHaveLength(1);
			expect(result.character?.equipment.armor).toHaveLength(1);
			expect(result.character?.equipment.cyberware).toHaveLength(1);
			expect(result.character?.magic?.spells).toHaveLength(1);
		});
	});
});
