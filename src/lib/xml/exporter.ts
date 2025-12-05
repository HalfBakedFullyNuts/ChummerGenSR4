/**
 * Chummer XML Export Module
 * =========================
 * Converts internal Character format to Chummer SR4 XML format.
 */

import type { Character } from '$types';

/**
 * Export a character to Chummer XML format.
 * Returns XML string compatible with desktop Chummer.
 */
export function exportToChummer(character: Character): string {
	const lines: string[] = [];

	lines.push('<?xml version="1.0" encoding="utf-8"?>');
	lines.push('<character>');

	/* Basic Info */
	lines.push(`\t<settings>default.xml</settings>`);
	lines.push(`\t<metatype>${escapeXml(character.identity.metatype || 'Human')}</metatype>`);
	lines.push(`\t<metatypebp>${character.buildPointsSpent.metatype}</metatypebp>`);
	lines.push(`\t<metavariant>${escapeXml(character.identity.metavariant || '')}</metavariant>`);
	lines.push(`\t<metatypecategory />`);
	lines.push(`\t<movement>10/25, Swim 5</movement>`);
	lines.push(`\t<mutantcritterbaseskills>0</mutantcritterbaseskills>`);

	/* Identity */
	lines.push(`\t<name>${escapeXml(character.identity.name)}</name>`);
	lines.push(`\t<mugshot />`);
	lines.push(`\t<sex>${escapeXml(character.identity.sex)}</sex>`);
	lines.push(`\t<age>${escapeXml(character.identity.age)}</age>`);
	lines.push(`\t<eyes>${escapeXml(character.identity.eyes)}</eyes>`);
	lines.push(`\t<height>${escapeXml(character.identity.height)}</height>`);
	lines.push(`\t<weight>${escapeXml(character.identity.weight)}</weight>`);
	lines.push(`\t<skin>${escapeXml(character.identity.skin)}</skin>`);
	lines.push(`\t<hair>${escapeXml(character.identity.hair)}</hair>`);
	lines.push(`\t<description>${escapeXml(character.background.description)}</description>`);
	lines.push(`\t<background>${escapeXml(character.background.background)}</background>`);
	lines.push(`\t<concept>${escapeXml(character.background.concept)}</concept>`);
	lines.push(`\t<notes>${escapeXml(character.background.notes)}</notes>`);
	lines.push(`\t<alias>${escapeXml(character.identity.alias)}</alias>`);
	lines.push(`\t<playername>${escapeXml(character.identity.playerName)}</playername>`);

	/* Career Info */
	lines.push(`\t<karma>${character.karma}</karma>`);
	lines.push(`\t<totalkarma>${character.totalKarma}</totalkarma>`);
	lines.push(`\t<streetcred>${character.reputation.streetCred}</streetcred>`);
	lines.push(`\t<notoriety>${character.reputation.notoriety}</notoriety>`);
	lines.push(`\t<publicawareness>${character.reputation.publicAwareness}</publicawareness>`);

	/* Build Info */
	lines.push(`\t<created>${character.status === 'career' ? 'True' : 'False'}</created>`);
	lines.push(`\t<maxavail>${character.settings.maxAvailability}</maxavail>`);
	lines.push(`\t<nuyen>${Math.floor(character.nuyen)}</nuyen>`);
	lines.push(`\t<bp>${character.buildPoints}</bp>`);
	lines.push(`\t<buildkarma>0</buildkarma>`);
	lines.push(`\t<buildmethod>${character.buildMethod === 'bp' ? 'BP' : 'Karma'}</buildmethod>`);
	lines.push(`\t<knowpts>${character.knowledgeSkillPoints}</knowpts>`);
	lines.push(`\t<nuyenbp>${character.buildPointsSpent.resources}</nuyenbp>`);
	lines.push(`\t<nuyenmaxbp>50</nuyenmaxbp>`);

	/* Magic Flags */
	const hasMagic = character.magic !== null;
	const hasResonance = character.resonance !== null;
	lines.push(`\t<adept>${hasMagic && character.qualities.some((q) => q.name === 'Adept') ? 'True' : 'False'}</adept>`);
	lines.push(`\t<magician>${hasMagic && character.qualities.some((q) => q.name === 'Magician') ? 'True' : 'False'}</magician>`);
	lines.push(`\t<technomancer>${hasResonance ? 'True' : 'False'}</technomancer>`);
	lines.push(`\t<initiationoverride>False</initiationoverride>`);
	lines.push(`\t<critter>False</critter>`);
	lines.push(`\t<uneducated>False</uneducated>`);
	lines.push(`\t<uncouth>False</uncouth>`);
	lines.push(`\t<infirm>False</infirm>`);

	/* Attributes */
	lines.push(`\t<attributes>`);
	exportAttribute(lines, 'BOD', character.attributes.bod, character.attributeLimits.bod);
	exportAttribute(lines, 'AGI', character.attributes.agi, character.attributeLimits.agi);
	exportAttribute(lines, 'REA', character.attributes.rea, character.attributeLimits.rea);
	exportAttribute(lines, 'STR', character.attributes.str, character.attributeLimits.str);
	exportAttribute(lines, 'CHA', character.attributes.cha, character.attributeLimits.cha);
	exportAttribute(lines, 'INT', character.attributes.int, character.attributeLimits.int);
	exportAttribute(lines, 'LOG', character.attributes.log, character.attributeLimits.log);
	exportAttribute(lines, 'WIL', character.attributes.wil, character.attributeLimits.wil);
	exportAttributeSimple(lines, 'INI', character.attributeLimits.ini);
	exportAttribute(lines, 'EDG', character.attributes.edg, character.attributeLimits.edg);
	exportAttributeMagRes(lines, 'MAG', character.attributes.mag, character.attributeLimits.mag);
	exportAttributeMagRes(lines, 'RES', character.attributes.res, character.attributeLimits.res);
	exportAttributeEss(lines, character.attributes.ess);
	lines.push(`\t</attributes>`);

	/* Magic/Resonance */
	lines.push(`\t<magenabled>${hasMagic ? 'True' : 'False'}</magenabled>`);
	lines.push(`\t<initiategrade>${character.magic?.initiateGrade ?? 0}</initiategrade>`);
	lines.push(`\t<resenabled>${hasResonance ? 'True' : 'False'}</resenabled>`);
	lines.push(`\t<submersiongrade>${character.resonance?.submersionGrade ?? 0}</submersiongrade>`);
	lines.push(`\t<groupmember>False</groupmember>`);
	lines.push(`\t<totaless>${character.attributes.ess.toFixed(2)}</totaless>`);
	lines.push(`\t<tradition>${escapeXml(character.magic?.tradition ?? '')}</tradition>`);
	lines.push(`\t<stream>${escapeXml(character.resonance?.stream ?? '')}</stream>`);

	/* Condition */
	lines.push(`\t<physicalcmfilled>${character.condition.physicalCurrent}</physicalcmfilled>`);
	lines.push(`\t<stuncmfilled>${character.condition.stunCurrent}</stuncmfilled>`);

	/* Skill Groups */
	lines.push(`\t<skillgroups>`);
	for (const group of character.skillGroups) {
		lines.push(`\t\t<skillgroup>`);
		lines.push(`\t\t\t<name>${escapeXml(group.name)}</name>`);
		lines.push(`\t\t\t<rating>${group.rating}</rating>`);
		lines.push(`\t\t\t<ratingmax>4</ratingmax>`);
		lines.push(`\t\t\t<broken>False</broken>`);
		lines.push(`\t\t</skillgroup>`);
	}
	lines.push(`\t</skillgroups>`);

	/* Skills */
	lines.push(`\t<skills>`);
	for (const skill of character.skills) {
		lines.push(`\t\t<skill>`);
		lines.push(`\t\t\t<name>${escapeXml(skill.name)}</name>`);
		lines.push(`\t\t\t<skillgroup />`);
		lines.push(`\t\t\t<skillcategory>Active</skillcategory>`);
		lines.push(`\t\t\t<grouped>False</grouped>`);
		lines.push(`\t\t\t<default>True</default>`);
		lines.push(`\t\t\t<rating>${skill.rating}</rating>`);
		lines.push(`\t\t\t<ratingmax>6</ratingmax>`);
		lines.push(`\t\t\t<knowledge>False</knowledge>`);
		lines.push(`\t\t\t<exotic>False</exotic>`);
		lines.push(`\t\t\t<spec>${escapeXml(skill.specialization ?? '')}</spec>`);
		lines.push(`\t\t\t<allowdelete>True</allowdelete>`);
		lines.push(`\t\t\t<attribute>AGI</attribute>`);
		lines.push(`\t\t\t<totalvalue>${skill.rating + skill.bonus}</totalvalue>`);
		lines.push(`\t\t</skill>`);
	}
	/* Knowledge Skills */
	for (const skill of character.knowledgeSkills) {
		/* Derive attribute from category */
		const attribute = skill.category === 'Academic' || skill.category === 'Professional' ? 'LOG' : 'INT';
		lines.push(`\t\t<skill>`);
		lines.push(`\t\t\t<name>${escapeXml(skill.name)}</name>`);
		lines.push(`\t\t\t<skillgroup />`);
		lines.push(`\t\t\t<skillcategory>${escapeXml(skill.category)}</skillcategory>`);
		lines.push(`\t\t\t<grouped>False</grouped>`);
		lines.push(`\t\t\t<default>True</default>`);
		lines.push(`\t\t\t<rating>${skill.rating}</rating>`);
		lines.push(`\t\t\t<ratingmax>6</ratingmax>`);
		lines.push(`\t\t\t<knowledge>True</knowledge>`);
		lines.push(`\t\t\t<exotic>False</exotic>`);
		lines.push(`\t\t\t<spec>${escapeXml(skill.specialization ?? '')}</spec>`);
		lines.push(`\t\t\t<allowdelete>True</allowdelete>`);
		lines.push(`\t\t\t<attribute>${attribute}</attribute>`);
		lines.push(`\t\t\t<totalvalue>${skill.rating}</totalvalue>`);
		lines.push(`\t\t</skill>`);
	}
	lines.push(`\t</skills>`);

	/* Contacts */
	lines.push(`\t<contacts>`);
	for (const contact of character.contacts) {
		lines.push(`\t\t<contact>`);
		lines.push(`\t\t\t<name>${escapeXml(contact.name)}</name>`);
		lines.push(`\t\t\t<connection>${contact.connection}</connection>`);
		lines.push(`\t\t\t<loyalty>${contact.loyalty}</loyalty>`);
		lines.push(`\t\t\t<membership>0</membership>`);
		lines.push(`\t\t\t<areaofinfluence>0</areaofinfluence>`);
		lines.push(`\t\t\t<magicalresources>0</magicalresources>`);
		lines.push(`\t\t\t<matrixresources>0</matrixresources>`);
		lines.push(`\t\t\t<type>${escapeXml(contact.type)}</type>`);
		lines.push(`\t\t\t<file />`);
		lines.push(`\t\t\t<notes>${escapeXml(contact.notes)}</notes>`);
		lines.push(`\t\t\t<groupname />`);
		lines.push(`\t\t\t<colour>0</colour>`);
		lines.push(`\t\t\t<free>False</free>`);
		lines.push(`\t\t</contact>`);
	}
	lines.push(`\t</contacts>`);

	/* Weapons */
	lines.push(`\t<weapons>`);
	for (const weapon of character.equipment.weapons) {
		lines.push(`\t\t<weapon>`);
		lines.push(`\t\t\t<guid>${generateGuid()}</guid>`);
		lines.push(`\t\t\t<name>${escapeXml(weapon.name)}</name>`);
		lines.push(`\t\t\t<category>${escapeXml(weapon.category)}</category>`);
		lines.push(`\t\t\t<type>${escapeXml(weapon.type)}</type>`);
		lines.push(`\t\t\t<reach>${weapon.reach}</reach>`);
		lines.push(`\t\t\t<damage>${escapeXml(weapon.damage)}</damage>`);
		lines.push(`\t\t\t<ap>${weapon.ap}</ap>`);
		lines.push(`\t\t\t<mode>${escapeXml(weapon.mode)}</mode>`);
		lines.push(`\t\t\t<rc>${weapon.rc}</rc>`);
		lines.push(`\t\t\t<ammo>${escapeXml(weapon.ammo)}</ammo>`);
		lines.push(`\t\t\t<ammocategory />`);
		lines.push(`\t\t\t<ammoremaining>${weapon.currentAmmo}</ammoremaining>`);
		lines.push(`\t\t\t<ammoloaded>00000000-0000-0000-0000-000000000000</ammoloaded>`);
		lines.push(`\t\t\t<conceal>${weapon.conceal}</conceal>`);
		lines.push(`\t\t\t<avail>0</avail>`);
		lines.push(`\t\t\t<cost>${weapon.cost}</cost>`);
		lines.push(`\t\t\t<range />`);
		lines.push(`\t\t\t<rangemultiply>1</rangemultiply>`);
		lines.push(`\t\t\t<fullburst>10</fullburst>`);
		lines.push(`\t\t\t<suppressive>20</suppressive>`);
		lines.push(`\t\t\t<source>SR4</source>`);
		lines.push(`\t\t\t<page />`);
		lines.push(`\t\t\t<weaponname />`);
		lines.push(`\t\t\t<accessories />`);
		lines.push(`\t\t\t<clips />`);
		lines.push(`\t\t\t<notes>${escapeXml(weapon.notes)}</notes>`);
		lines.push(`\t\t</weapon>`);
	}
	lines.push(`\t</weapons>`);

	/* Armor */
	lines.push(`\t<armors>`);
	for (const armor of character.equipment.armor) {
		lines.push(`\t\t<armor>`);
		lines.push(`\t\t\t<guid>${generateGuid()}</guid>`);
		lines.push(`\t\t\t<name>${escapeXml(armor.name)}</name>`);
		lines.push(`\t\t\t<category>${escapeXml(armor.category)}</category>`);
		lines.push(`\t\t\t<armor>${armor.ballistic}</armor>`);
		lines.push(`\t\t\t<armorimpact>${armor.impact}</armorimpact>`);
		lines.push(`\t\t\t<armorcapacity>${armor.capacity}</armorcapacity>`);
		lines.push(`\t\t\t<equipped>${armor.equipped ? 'True' : 'False'}</equipped>`);
		lines.push(`\t\t\t<avail>0</avail>`);
		lines.push(`\t\t\t<cost>${armor.cost}</cost>`);
		lines.push(`\t\t\t<source>SR4</source>`);
		lines.push(`\t\t\t<page />`);
		lines.push(`\t\t\t<armormods />`);
		lines.push(`\t\t\t<notes>${escapeXml(armor.notes)}</notes>`);
		lines.push(`\t\t</armor>`);
	}
	lines.push(`\t</armors>`);

	/* Cyberware */
	lines.push(`\t<cyberwares>`);
	for (const cyber of character.equipment.cyberware) {
		lines.push(`\t\t<cyberware>`);
		lines.push(`\t\t\t<guid>${generateGuid()}</guid>`);
		lines.push(`\t\t\t<name>${escapeXml(cyber.name)}</name>`);
		lines.push(`\t\t\t<category>${escapeXml(cyber.category)}</category>`);
		lines.push(`\t\t\t<limbslot />`);
		lines.push(`\t\t\t<ess>${cyber.essence}</ess>`);
		lines.push(`\t\t\t<capacity>${cyber.capacity}</capacity>`);
		lines.push(`\t\t\t<avail>0</avail>`);
		lines.push(`\t\t\t<cost>${cyber.cost}</cost>`);
		lines.push(`\t\t\t<source>SR4</source>`);
		lines.push(`\t\t\t<page />`);
		lines.push(`\t\t\t<rating>${cyber.rating}</rating>`);
		lines.push(`\t\t\t<minrating>0</minrating>`);
		lines.push(`\t\t\t<maxrating>0</maxrating>`);
		lines.push(`\t\t\t<subsystems />`);
		lines.push(`\t\t\t<grade>${escapeXml(cyber.grade)}</grade>`);
		lines.push(`\t\t\t<location>${escapeXml(cyber.location)}</location>`);
		lines.push(`\t\t\t<suite>False</suite>`);
		lines.push(`\t\t\t<bonus />`);
		lines.push(`\t\t\t<improvementsource>Cyberware</improvementsource>`);
		lines.push(`\t\t\t<children />`);
		lines.push(`\t\t\t<notes>${escapeXml(cyber.notes)}</notes>`);
		lines.push(`\t\t</cyberware>`);
	}
	lines.push(`\t</cyberwares>`);

	/* Qualities */
	lines.push(`\t<qualities>`);
	for (const quality of character.qualities) {
		lines.push(`\t\t<quality>`);
		lines.push(`\t\t\t<guid>${generateGuid()}</guid>`);
		lines.push(`\t\t\t<name>${escapeXml(quality.name)}</name>`);
		lines.push(`\t\t\t<extra />`);
		lines.push(`\t\t\t<bp>${quality.bp}</bp>`);
		lines.push(`\t\t\t<contributetolimit>True</contributetolimit>`);
		lines.push(`\t\t\t<print>True</print>`);
		lines.push(`\t\t\t<qualitytype>${quality.category}</qualitytype>`);
		lines.push(`\t\t\t<qualitysource>Selected</qualitysource>`);
		lines.push(`\t\t\t<source>SR4</source>`);
		lines.push(`\t\t\t<page />`);
		lines.push(`\t\t\t<bonus />`);
		lines.push(`\t\t\t<notes>${escapeXml(quality.notes)}</notes>`);
		lines.push(`\t\t</quality>`);
	}
	lines.push(`\t</qualities>`);

	/* Spells */
	if (character.magic && character.magic.spells.length > 0) {
		lines.push(`\t<spells>`);
		for (const spell of character.magic.spells) {
			lines.push(`\t\t<spell>`);
			lines.push(`\t\t\t<guid>${generateGuid()}</guid>`);
			lines.push(`\t\t\t<name>${escapeXml(spell.name)}</name>`);
			lines.push(`\t\t\t<category>${escapeXml(spell.category)}</category>`);
			lines.push(`\t\t\t<type>${escapeXml(spell.type)}</type>`);
			lines.push(`\t\t\t<range>${escapeXml(spell.range)}</range>`);
			lines.push(`\t\t\t<damage>${escapeXml(spell.damage)}</damage>`);
			lines.push(`\t\t\t<duration>${escapeXml(spell.duration)}</duration>`);
			lines.push(`\t\t\t<dv>${escapeXml(spell.dv)}</dv>`);
			lines.push(`\t\t\t<source>SR4</source>`);
			lines.push(`\t\t\t<page />`);
			lines.push(`\t\t\t<notes>${escapeXml(spell.notes)}</notes>`);
			lines.push(`\t\t</spell>`);
		}
		lines.push(`\t</spells>`);
	} else {
		lines.push(`\t<spells />`);
	}

	/* Gear */
	lines.push(`\t<gears>`);
	for (const gear of character.equipment.gear) {
		lines.push(`\t\t<gear>`);
		lines.push(`\t\t\t<guid>${generateGuid()}</guid>`);
		lines.push(`\t\t\t<name>${escapeXml(gear.name)}</name>`);
		lines.push(`\t\t\t<category>${escapeXml(gear.category)}</category>`);
		lines.push(`\t\t\t<rating>${gear.rating}</rating>`);
		lines.push(`\t\t\t<qty>${gear.quantity}</qty>`);
		lines.push(`\t\t\t<avail>0</avail>`);
		lines.push(`\t\t\t<cost>${gear.cost}</cost>`);
		lines.push(`\t\t\t<source>SR4</source>`);
		lines.push(`\t\t\t<page />`);
		lines.push(`\t\t\t<location>${escapeXml(gear.location)}</location>`);
		lines.push(`\t\t\t<children />`);
		lines.push(`\t\t\t<notes>${escapeXml(gear.notes)}</notes>`);
		lines.push(`\t\t</gear>`);
	}
	lines.push(`\t</gears>`);

	/* Lifestyle */
	lines.push(`\t<lifestyles>`);
	if (character.equipment.lifestyle) {
		const ls = character.equipment.lifestyle;
		lines.push(`\t\t<lifestyle>`);
		lines.push(`\t\t\t<guid>${generateGuid()}</guid>`);
		lines.push(`\t\t\t<name>${escapeXml(ls.name)}</name>`);
		lines.push(`\t\t\t<cost>${ls.monthlyCost}</cost>`);
		lines.push(`\t\t\t<dice>0</dice>`);
		lines.push(`\t\t\t<months>${ls.monthsPrepaid}</months>`);
		lines.push(`\t\t\t<purchased>True</purchased>`);
		lines.push(`\t\t\t<baselifestyle>${escapeXml(ls.level)}</baselifestyle>`);
		lines.push(`\t\t\t<comforts>0</comforts>`);
		lines.push(`\t\t\t<comfortsentertainment>0</comfortsentertainment>`);
		lines.push(`\t\t\t<security>0</security>`);
		lines.push(`\t\t\t<securityentertainment>0</securityentertainment>`);
		lines.push(`\t\t\t<area>0</area>`);
		lines.push(`\t\t\t<areaentertainment>0</areaentertainment>`);
		lines.push(`\t\t\t<source>SR4</source>`);
		lines.push(`\t\t\t<page />`);
		lines.push(`\t\t\t<qualities />`);
		lines.push(`\t\t\t<notes>${escapeXml(ls.notes)}</notes>`);
		lines.push(`\t\t</lifestyle>`);
	}
	lines.push(`\t</lifestyles>`);

	/* Empty sections */
	lines.push(`\t<improvements />`);
	lines.push(`\t<expenses />`);
	lines.push(`\t<locations />`);
	lines.push(`\t<critterpowers />`);
	lines.push(`\t<metamagics />`);
	lines.push(`\t<arts />`);
	lines.push(`\t<enhancements />`);
	lines.push(`\t<spirits />`);
	lines.push(`\t<complexforms />`);
	lines.push(`\t<martialarts />`);
	lines.push(`\t<martialartmaneuvers />`);
	lines.push(`\t<programs />`);
	lines.push(`\t<vehicles />`);

	/* Adept Powers */
	if (character.magic && character.magic.powers.length > 0) {
		lines.push(`\t<powers>`);
		for (const power of character.magic.powers) {
			lines.push(`\t\t<power>`);
			lines.push(`\t\t\t<guid>${generateGuid()}</guid>`);
			lines.push(`\t\t\t<name>${escapeXml(power.name)}</name>`);
			lines.push(`\t\t\t<extra />`);
			lines.push(`\t\t\t<pointsperlevel>${power.points}</pointsperlevel>`);
			lines.push(`\t\t\t<rating>${power.level}</rating>`);
			lines.push(`\t\t\t<source>SR4</source>`);
			lines.push(`\t\t\t<page />`);
			lines.push(`\t\t\t<bonus />`);
			lines.push(`\t\t\t<notes>${escapeXml(power.notes)}</notes>`);
			lines.push(`\t\t</power>`);
		}
		lines.push(`\t</powers>`);
	} else {
		lines.push(`\t<powers />`);
	}

	lines.push(`</character>`);

	return lines.join('\n');
}

/**
 * Export a single attribute to XML lines.
 */
function exportAttribute(
	lines: string[],
	name: string,
	attr: { base: number; bonus: number; karma: number } | null,
	limits: { min: number; max: number; aug: number }
): void {
	const value = attr?.base ?? limits.min;
	const augmod = attr?.bonus ?? 0;
	const total = value + augmod;

	lines.push(`\t\t<attribute>`);
	lines.push(`\t\t\t<name>${name}</name>`);
	lines.push(`\t\t\t<metatypemin>${limits.min}</metatypemin>`);
	lines.push(`\t\t\t<metatypemax>${limits.max}</metatypemax>`);
	lines.push(`\t\t\t<metatypeaugmax>${limits.aug}</metatypeaugmax>`);
	lines.push(`\t\t\t<value>${value}</value>`);
	lines.push(`\t\t\t<augmodifier>${augmod}</augmodifier>`);
	lines.push(`\t\t\t<totalvalue>${total}</totalvalue>`);
	lines.push(`\t\t</attribute>`);
}

/**
 * Export a simple attribute (INI) to XML lines.
 */
function exportAttributeSimple(
	lines: string[],
	name: string,
	limits: { min: number; max: number; aug: number }
): void {
	lines.push(`\t\t<attribute>`);
	lines.push(`\t\t\t<name>${name}</name>`);
	lines.push(`\t\t\t<metatypemin>${limits.min}</metatypemin>`);
	lines.push(`\t\t\t<metatypemax>${limits.max}</metatypemax>`);
	lines.push(`\t\t\t<metatypeaugmax>${limits.aug}</metatypeaugmax>`);
	lines.push(`\t\t\t<value>${limits.min}</value>`);
	lines.push(`\t\t\t<augmodifier>0</augmodifier>`);
	lines.push(`\t\t\t<totalvalue>${limits.min}</totalvalue>`);
	lines.push(`\t\t</attribute>`);
}

/**
 * Export MAG/RES attribute to XML lines.
 */
function exportAttributeMagRes(
	lines: string[],
	name: string,
	attr: { base: number; bonus: number; karma: number } | null,
	limits: { min: number; max: number; aug: number }
): void {
	const value = attr?.base ?? 0;
	const augmod = attr?.bonus ?? 0;
	const total = value + augmod;

	lines.push(`\t\t<attribute>`);
	lines.push(`\t\t\t<name>${name}</name>`);
	lines.push(`\t\t\t<metatypemin>0</metatypemin>`);
	lines.push(`\t\t\t<metatypemax>${limits.max}</metatypemax>`);
	lines.push(`\t\t\t<metatypeaugmax>${limits.aug}</metatypeaugmax>`);
	lines.push(`\t\t\t<value>${value}</value>`);
	lines.push(`\t\t\t<augmodifier>${augmod}</augmodifier>`);
	lines.push(`\t\t\t<totalvalue>${total}</totalvalue>`);
	lines.push(`\t\t</attribute>`);
}

/**
 * Export ESS attribute to XML lines.
 */
function exportAttributeEss(lines: string[], ess: number): void {
	lines.push(`\t\t<attribute>`);
	lines.push(`\t\t\t<name>ESS</name>`);
	lines.push(`\t\t\t<metatypemin>0</metatypemin>`);
	lines.push(`\t\t\t<metatypemax>6</metatypemax>`);
	lines.push(`\t\t\t<metatypeaugmax>6</metatypeaugmax>`);
	lines.push(`\t\t\t<value>6</value>`);
	lines.push(`\t\t\t<augmodifier>0</augmodifier>`);
	lines.push(`\t\t\t<totalvalue>${ess.toFixed(2)}</totalvalue>`);
	lines.push(`\t\t</attribute>`);
}

/**
 * Escape special XML characters.
 */
function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/**
 * Generate a random GUID for XML elements.
 */
function generateGuid(): string {
	const hex = '0123456789abcdef';
	let guid = '';
	for (let i = 0; i < 36; i++) {
		if (i === 8 || i === 13 || i === 18 || i === 23) {
			guid += '-';
		} else {
			guid += hex[Math.floor(Math.random() * 16)];
		}
	}
	return guid;
}

/**
 * Download character as .chum file.
 */
export function downloadAsChum(character: Character): void {
	const xml = exportToChummer(character);
	const blob = new Blob([xml], { type: 'application/xml' });
	const url = URL.createObjectURL(blob);

	const filename = `${character.identity.name || character.identity.alias || 'character'}.chum`;

	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
