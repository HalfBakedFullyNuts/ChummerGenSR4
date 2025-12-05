/**
 * XML Importer Tests
 * ==================
 * Tests for Chummer XML import functionality.
 */

import { describe, it, expect } from 'vitest';
import { importFromChummer } from '../importer';

describe('XML Importer', () => {
	describe('importFromChummer', () => {
		it('should parse basic character XML', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test Runner</name>
	<alias>Shadow</alias>
	<metatype>Elf</metatype>
	<buildmethod>BP</buildmethod>
	<bp>400</bp>
	<created>False</created>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character).toBeDefined();
			expect(result.character?.identity.name).toBe('Test Runner');
			expect(result.character?.identity.alias).toBe('Shadow');
			expect(result.character?.identity.metatype).toBe('Elf');
		});

		it('should parse identity fields', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<sex>Female</sex>
	<age>25</age>
	<height>5'8"</height>
	<weight>130 lbs</weight>
	<hair>Black</hair>
	<eyes>Brown</eyes>
	<skin>Tan</skin>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.identity.sex).toBe('Female');
			expect(result.character?.identity.age).toBe('25');
			expect(result.character?.identity.height).toBe('5\'8"');
			expect(result.character?.identity.hair).toBe('Black');
		});

		it('should parse attributes', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<attributes>
		<attribute>
			<name>BOD</name>
			<value>4</value>
			<augmodifier>0</augmodifier>
			<metatypemin>1</metatypemin>
			<metatypemax>6</metatypemax>
			<metatypeaugmax>9</metatypeaugmax>
		</attribute>
		<attribute>
			<name>AGI</name>
			<value>5</value>
			<augmodifier>1</augmodifier>
			<metatypemin>2</metatypemin>
			<metatypemax>7</metatypemax>
			<metatypeaugmax>10</metatypeaugmax>
		</attribute>
	</attributes>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.attributes.bod.base).toBe(4);
			expect(result.character?.attributes.agi.base).toBe(5);
			expect(result.character?.attributes.agi.bonus).toBe(1);
			expect(result.character?.attributeLimits.agi.min).toBe(2);
			expect(result.character?.attributeLimits.agi.max).toBe(7);
		});

		it('should parse active skills', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<skills>
		<skill>
			<name>Pistols</name>
			<rating>4</rating>
			<knowledge>False</knowledge>
			<spec></spec>
		</skill>
		<skill>
			<name>Stealth</name>
			<rating>3</rating>
			<knowledge>False</knowledge>
			<spec>Urban</spec>
		</skill>
	</skills>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.skills).toHaveLength(2);
			expect(result.character?.skills[0]?.name).toBe('Pistols');
			expect(result.character?.skills[0]?.rating).toBe(4);
			expect(result.character?.skills[1]?.specialization).toBe('Urban');
		});

		it('should parse knowledge skills', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<skills>
		<skill>
			<name>History</name>
			<rating>3</rating>
			<knowledge>True</knowledge>
			<skillcategory>Academic</skillcategory>
			<spec></spec>
		</skill>
		<skill>
			<name>Urban Brawl</name>
			<rating>2</rating>
			<knowledge>True</knowledge>
			<skillcategory>Interest</skillcategory>
			<spec></spec>
		</skill>
	</skills>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.knowledgeSkills).toHaveLength(2);
			expect(result.character?.knowledgeSkills[0]?.name).toBe('History');
			expect(result.character?.knowledgeSkills[0]?.category).toBe('Academic');
			expect(result.character?.knowledgeSkills[1]?.category).toBe('Interest');
		});

		it('should parse skill groups', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<skillgroups>
		<skillgroup>
			<name>Firearms</name>
			<rating>3</rating>
			<broken>False</broken>
		</skillgroup>
	</skillgroups>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.skillGroups).toHaveLength(1);
			expect(result.character?.skillGroups[0]?.name).toBe('Firearms');
			expect(result.character?.skillGroups[0]?.rating).toBe(3);
		});

		it('should parse contacts', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<contacts>
		<contact>
			<name>Fixer Mike</name>
			<type>Fixer</type>
			<loyalty>4</loyalty>
			<connection>3</connection>
			<notes>Reliable contact</notes>
		</contact>
	</contacts>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.contacts).toHaveLength(1);
			expect(result.character?.contacts[0]?.name).toBe('Fixer Mike');
			expect(result.character?.contacts[0]?.loyalty).toBe(4);
			expect(result.character?.contacts[0]?.connection).toBe(3);
		});

		it('should parse qualities', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<qualities>
		<quality>
			<name>SINner</name>
			<qualitytype>Negative</qualitytype>
			<bp>5</bp>
			<notes></notes>
		</quality>
		<quality>
			<name>Ambidextrous</name>
			<qualitytype>Positive</qualitytype>
			<bp>5</bp>
			<notes></notes>
		</quality>
	</qualities>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.qualities).toHaveLength(2);
			expect(result.character?.qualities[0]?.name).toBe('SINner');
			expect(result.character?.qualities[0]?.category).toBe('Negative');
			expect(result.character?.qualities[1]?.category).toBe('Positive');
		});

		it('should parse weapons', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<weapons>
		<weapon>
			<name>Ares Predator IV</name>
			<category>Pistols</category>
			<type>Ranged</type>
			<reach>0</reach>
			<damage>5P</damage>
			<ap>-1</ap>
			<mode>SA</mode>
			<rc>0</rc>
			<ammo>15(c)</ammo>
			<ammoremaining>15</ammoremaining>
			<conceal>0</conceal>
			<cost>350</cost>
			<notes></notes>
		</weapon>
	</weapons>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.equipment.weapons).toHaveLength(1);
			expect(result.character?.equipment.weapons[0]?.name).toBe('Ares Predator IV');
			expect(result.character?.equipment.weapons[0]?.type).toBe('Ranged');
			expect(result.character?.equipment.weapons[0]?.damage).toBe('5P');
		});

		it('should handle melee weapons', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<weapons>
		<weapon>
			<name>Combat Knife</name>
			<category>Blades</category>
			<type>Melee</type>
			<reach>0</reach>
			<damage>3P</damage>
			<ap>-1</ap>
			<mode></mode>
			<rc></rc>
			<ammo></ammo>
			<cost>30</cost>
		</weapon>
	</weapons>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.equipment.weapons[0]?.type).toBe('Melee');
		});

		it('should parse armor', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<armors>
		<armor>
			<name>Armor Jacket</name>
			<category>Armor</category>
			<armor>8</armor>
			<armorimpact>6</armorimpact>
			<armorcapacity>4</armorcapacity>
			<equipped>True</equipped>
			<cost>900</cost>
			<notes></notes>
		</armor>
	</armors>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.equipment.armor).toHaveLength(1);
			expect(result.character?.equipment.armor[0]?.name).toBe('Armor Jacket');
			expect(result.character?.equipment.armor[0]?.ballistic).toBe(8);
			expect(result.character?.equipment.armor[0]?.impact).toBe(6);
			expect(result.character?.equipment.armor[0]?.equipped).toBe(true);
		});

		it('should parse cyberware', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<cyberwares>
		<cyberware>
			<name>Wired Reflexes</name>
			<category>Bodyware</category>
			<grade>Alphaware</grade>
			<rating>2</rating>
			<ess>1.6</ess>
			<cost>32000</cost>
			<capacity>0</capacity>
			<location></location>
			<notes></notes>
		</cyberware>
	</cyberwares>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.equipment.cyberware).toHaveLength(1);
			expect(result.character?.equipment.cyberware[0]?.name).toBe('Wired Reflexes');
			expect(result.character?.equipment.cyberware[0]?.grade).toBe('Alphaware');
			expect(result.character?.equipment.cyberware[0]?.rating).toBe(2);
			expect(result.character?.equipment.cyberware[0]?.essence).toBe(1.6);
		});

		it('should default unknown cyberware grade to Standard', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<cyberwares>
		<cyberware>
			<name>Datajack</name>
			<grade>Unknown</grade>
			<ess>0.1</ess>
		</cyberware>
	</cyberwares>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.equipment.cyberware[0]?.grade).toBe('Standard');
		});

		it('should parse magic data', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<magenabled>True</magenabled>
	<tradition>Hermetic</tradition>
	<initiategrade>2</initiategrade>
	<spells>
		<spell>
			<name>Fireball</name>
			<category>Combat</category>
			<type>Physical</type>
			<range>LOS (A)</range>
			<damage>Physical</damage>
			<duration>Instant</duration>
			<dv>F/2+3</dv>
			<notes></notes>
		</spell>
	</spells>
	<powers>
		<power>
			<name>Improved Reflexes</name>
			<pointsperlevel>1.5</pointsperlevel>
			<rating>2</rating>
			<notes></notes>
		</power>
	</powers>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.magic).not.toBeNull();
			expect(result.character?.magic?.tradition).toBe('Hermetic');
			expect(result.character?.magic?.initiateGrade).toBe(2);
			expect(result.character?.magic?.spells).toHaveLength(1);
			expect(result.character?.magic?.spells[0]?.name).toBe('Fireball');
			expect(result.character?.magic?.powers).toHaveLength(1);
			expect(result.character?.magic?.powers[0]?.name).toBe('Improved Reflexes');
		});

		it('should not create magic object when disabled', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<magenabled>False</magenabled>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.magic).toBeNull();
		});

		it('should parse resonance data', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<resenabled>True</resenabled>
	<stream>Cyberadept</stream>
	<submersiongrade>1</submersiongrade>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.resonance).not.toBeNull();
			expect(result.character?.resonance?.stream).toBe('Cyberadept');
			expect(result.character?.resonance?.submersionGrade).toBe(1);
		});

		it('should parse lifestyle', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<lifestyles>
		<lifestyle>
			<name>Downtown Apartment</name>
			<baselifestyle>Middle</baselifestyle>
			<cost>5000</cost>
			<months>1</months>
			<notes></notes>
		</lifestyle>
	</lifestyles>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.equipment.lifestyle).not.toBeNull();
			expect(result.character?.equipment.lifestyle?.name).toBe('Downtown Apartment');
			expect(result.character?.equipment.lifestyle?.level).toBe('Middle');
			expect(result.character?.equipment.lifestyle?.monthlyCost).toBe(5000);
		});

		it('should detect career mode characters', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<created>True</created>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.status).toBe('career');
		});

		it('should detect creation mode characters', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<created>False</created>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.status).toBe('creation');
		});

		it('should handle invalid XML gracefully', () => {
			const xml = `not valid xml at all`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should handle missing character element', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<other>
	<data>test</data>
</other>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(false);
			expect(result.error).toContain('missing character element');
		});

		it('should skip skills with 0 rating', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
	<skills>
		<skill>
			<name>Pistols</name>
			<rating>0</rating>
			<knowledge>False</knowledge>
		</skill>
		<skill>
			<name>Longarms</name>
			<rating>3</rating>
			<knowledge>False</knowledge>
		</skill>
	</skills>
</character>`;

			const result = importFromChummer(xml, 'user-123');

			expect(result.success).toBe(true);
			expect(result.character?.skills).toHaveLength(1);
			expect(result.character?.skills[0]?.name).toBe('Longarms');
		});

		it('should assign correct userId to imported character', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
<character>
	<name>Test</name>
</character>`;

			const result = importFromChummer(xml, 'my-user-id-123');

			expect(result.success).toBe(true);
			expect(result.character?.userId).toBe('my-user-id-123');
		});
	});
});
