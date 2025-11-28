/**
 * Validation Engine
 * =================
 * Validates SR4 character builds against the rules.
 * Returns detailed validation results with errors and warnings.
 */

import type { Character, CharacterQuality } from '$types';
import { getAttributeTotal, getMagicTotal, getResonanceTotal } from './calculations';

/* ============================================
 * Validation Types
 * ============================================ */

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
	readonly code: string;
	readonly severity: ValidationSeverity;
	readonly category: string;
	readonly message: string;
	readonly details?: string;
}

export interface ValidationResult {
	readonly valid: boolean;
	readonly issues: readonly ValidationIssue[];
	readonly summary: {
		readonly errors: number;
		readonly warnings: number;
		readonly info: number;
	};
}

/* ============================================
 * BP Limits (Standard SR4 Rules)
 * ============================================ */

const BP_LIMITS = {
	TOTAL: 400,
	POSITIVE_QUALITIES: 35,
	NEGATIVE_QUALITIES: 35,
	ATTRIBUTES_MAX: 200,
	SKILLS_MAX: 150,
	RESOURCES_MAX: 50,
	CONTACTS_MIN: 0
} as const;

/* ============================================
 * Validation Functions
 * ============================================ */

/** Validate BP spending limits. */
function validateBPLimits(char: Character): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const spent = char.buildPointsSpent;

	// Total BP
	const totalSpent = Object.values(spent).reduce((a, b) => a + b, 0);
	if (totalSpent > char.buildPoints) {
		issues.push({
			code: 'BP_OVERSPENT',
			severity: 'error',
			category: 'Build Points',
			message: `Overspent by ${totalSpent - char.buildPoints} BP`,
			details: `Total spent: ${totalSpent}, Available: ${char.buildPoints}`
		});
	}

	// Positive qualities cap
	const positiveQualityBP = char.qualities
		.filter((q) => q.category === 'Positive')
		.reduce((sum, q) => sum + q.bp, 0);

	if (positiveQualityBP > BP_LIMITS.POSITIVE_QUALITIES) {
		issues.push({
			code: 'POSITIVE_QUALITY_CAP',
			severity: 'error',
			category: 'Qualities',
			message: `Positive qualities exceed ${BP_LIMITS.POSITIVE_QUALITIES} BP limit`,
			details: `Current: ${positiveQualityBP} BP`
		});
	}

	// Negative qualities cap
	const negativeQualityBP = Math.abs(
		char.qualities
			.filter((q) => q.category === 'Negative')
			.reduce((sum, q) => sum + q.bp, 0)
	);

	if (negativeQualityBP > BP_LIMITS.NEGATIVE_QUALITIES) {
		issues.push({
			code: 'NEGATIVE_QUALITY_CAP',
			severity: 'error',
			category: 'Qualities',
			message: `Negative qualities exceed ${BP_LIMITS.NEGATIVE_QUALITIES} BP limit`,
			details: `Current: ${negativeQualityBP} BP`
		});
	}

	// Resources cap
	if (spent.resources > BP_LIMITS.RESOURCES_MAX) {
		issues.push({
			code: 'RESOURCES_CAP',
			severity: 'error',
			category: 'Resources',
			message: `Resources exceed ${BP_LIMITS.RESOURCES_MAX} BP maximum`,
			details: `Current: ${spent.resources} BP`
		});
	}

	return issues;
}

/** Validate attributes are within limits. */
function validateAttributes(char: Character): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	const attrCodes = ['bod', 'agi', 'rea', 'str', 'cha', 'int', 'log', 'wil', 'edg'] as const;

	for (const code of attrCodes) {
		const attr = char.attributes[code];
		const limits = char.attributeLimits[code];
		const total = attr.base + attr.bonus;

		if (attr.base < limits.min) {
			issues.push({
				code: 'ATTR_BELOW_MIN',
				severity: 'error',
				category: 'Attributes',
				message: `${code.toUpperCase()} below minimum`,
				details: `Current: ${attr.base}, Minimum: ${limits.min}`
			});
		}

		if (attr.base > limits.max) {
			issues.push({
				code: 'ATTR_ABOVE_MAX',
				severity: 'error',
				category: 'Attributes',
				message: `${code.toUpperCase()} exceeds natural maximum`,
				details: `Current: ${attr.base}, Maximum: ${limits.max}`
			});
		}

		if (total > limits.aug) {
			issues.push({
				code: 'ATTR_ABOVE_AUG',
				severity: 'error',
				category: 'Attributes',
				message: `${code.toUpperCase()} exceeds augmented maximum`,
				details: `Current total: ${total}, Augmented max: ${limits.aug}`
			});
		}
	}

	// Special attributes
	if (char.attributes.mag) {
		const limits = char.attributeLimits.mag;
		const mag = getMagicTotal(char);
		if (mag > limits.aug) {
			issues.push({
				code: 'MAG_ABOVE_MAX',
				severity: 'error',
				category: 'Attributes',
				message: 'Magic exceeds maximum',
				details: `Current: ${mag}, Maximum: ${limits.aug}`
			});
		}
	}

	if (char.attributes.res) {
		const limits = char.attributeLimits.res;
		const res = getResonanceTotal(char);
		if (res > limits.aug) {
			issues.push({
				code: 'RES_ABOVE_MAX',
				severity: 'error',
				category: 'Attributes',
				message: 'Resonance exceeds maximum',
				details: `Current: ${res}, Maximum: ${limits.aug}`
			});
		}
	}

	// Check essence
	if (char.attributes.ess < 0) {
		issues.push({
			code: 'ESSENCE_NEGATIVE',
			severity: 'error',
			category: 'Attributes',
			message: 'Essence cannot be negative',
			details: `Current: ${char.attributes.ess.toFixed(2)}`
		});
	}

	// Essence affects Magic/Resonance
	if (char.attributes.mag && char.attributes.ess < 6) {
		const maxMag = Math.floor(char.attributes.ess);
		const currentMag = getMagicTotal(char);
		if (currentMag > maxMag) {
			issues.push({
				code: 'MAG_EXCEEDS_ESSENCE',
				severity: 'error',
				category: 'Attributes',
				message: 'Magic cannot exceed Essence',
				details: `Magic: ${currentMag}, Max (floor of Essence): ${maxMag}`
			});
		}
	}

	return issues;
}

/** Validate skills. */
function validateSkills(char: Character): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// Check skill ratings
	for (const skill of char.skills) {
		if (skill.rating > 6 && char.status === 'creation') {
			issues.push({
				code: 'SKILL_ABOVE_MAX',
				severity: 'error',
				category: 'Skills',
				message: `${skill.name} exceeds maximum rating of 6`,
				details: `Current rating: ${skill.rating}`
			});
		}

		if (skill.rating < 0) {
			issues.push({
				code: 'SKILL_NEGATIVE',
				severity: 'error',
				category: 'Skills',
				message: `${skill.name} has negative rating`,
				details: `Current rating: ${skill.rating}`
			});
		}
	}

	// Check for required skills (warning only)
	const hasPerception = char.skills.some(
		(s) => s.name.toLowerCase() === 'perception'
	);
	if (!hasPerception) {
		issues.push({
			code: 'NO_PERCEPTION',
			severity: 'warning',
			category: 'Skills',
			message: 'No Perception skill',
			details: 'Consider adding Perception for awareness tests'
		});
	}

	return issues;
}

/** Validate qualities for conflicts and requirements. */
function validateQualities(char: Character): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const qualityNames = char.qualities.map((q) => q.name.toLowerCase());

	// Check for mutually exclusive qualities
	const exclusivePairs: [string, string][] = [
		['magician', 'technomancer'],
		['adept', 'technomancer'],
		['mystic adept', 'technomancer'],
		['immunity (natural)', 'allergy'],
		['lucky', 'unlucky']
	];

	for (const [a, b] of exclusivePairs) {
		if (qualityNames.includes(a) && qualityNames.includes(b)) {
			issues.push({
				code: 'QUALITY_EXCLUSIVE',
				severity: 'error',
				category: 'Qualities',
				message: `Cannot have both ${a} and ${b}`,
				details: 'These qualities are mutually exclusive'
			});
		}
	}

	// Check awakened quality requirements
	const isMagical = qualityNames.some((n) =>
		['magician', 'adept', 'mystic adept'].includes(n) ||
		n.startsWith('aspected magician')
	);

	if (isMagical && !char.attributes.mag) {
		issues.push({
			code: 'MAGIC_NOT_INITIALIZED',
			severity: 'warning',
			category: 'Magic',
			message: 'Awakened quality selected but Magic not initialized',
			details: 'Select a tradition in the Magic step'
		});
	}

	// Check technomancer requirements
	const isTechnomancer = qualityNames.some((n) =>
		n.includes('technomancer')
	);

	if (isTechnomancer && !char.attributes.res) {
		issues.push({
			code: 'RESONANCE_NOT_INITIALIZED',
			severity: 'warning',
			category: 'Resonance',
			message: 'Technomancer quality selected but Resonance not initialized',
			details: 'Select a stream in the Magic step'
		});
	}

	return issues;
}

/** Validate magic configuration. */
function validateMagic(char: Character): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	if (!char.magic) return issues;

	// Check tradition selected
	if (!char.magic.tradition) {
		issues.push({
			code: 'NO_TRADITION',
			severity: 'warning',
			category: 'Magic',
			message: 'No magical tradition selected',
			details: 'Select a tradition for your awakened character'
		});
	}

	// Check power point usage for adepts
	if (char.magic.powerPoints > 0) {
		if (char.magic.powerPointsUsed > char.magic.powerPoints) {
			issues.push({
				code: 'POWER_POINTS_OVERSPENT',
				severity: 'error',
				category: 'Magic',
				message: 'Power points exceeded',
				details: `Used: ${char.magic.powerPointsUsed}, Available: ${char.magic.powerPoints}`
			});
		}

		if (char.magic.powerPointsUsed === 0 && char.magic.powers.length === 0) {
			issues.push({
				code: 'NO_POWERS',
				severity: 'info',
				category: 'Magic',
				message: 'No adept powers selected',
				details: 'Consider selecting powers to use your power points'
			});
		}
	}

	return issues;
}

/** Validate resonance/technomancer configuration. */
function validateResonance(char: Character): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	if (!char.resonance) return issues;

	// Check stream selected
	if (!char.resonance.stream) {
		issues.push({
			code: 'NO_STREAM',
			severity: 'warning',
			category: 'Resonance',
			message: 'No technomancer stream selected',
			details: 'Select a stream for your technomancer'
		});
	}

	// Check complex forms
	if (char.resonance.complexForms.length === 0) {
		issues.push({
			code: 'NO_COMPLEX_FORMS',
			severity: 'info',
			category: 'Resonance',
			message: 'No complex forms selected',
			details: 'Consider selecting complex forms for Matrix interactions'
		});
	}

	return issues;
}

/** Validate equipment. */
function validateEquipment(char: Character): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// Check for basic necessities
	if (char.equipment.weapons.length === 0) {
		issues.push({
			code: 'NO_WEAPONS',
			severity: 'info',
			category: 'Equipment',
			message: 'No weapons purchased',
			details: 'Consider acquiring weapons for self-defense'
		});
	}

	if (char.equipment.armor.length === 0) {
		issues.push({
			code: 'NO_ARMOR',
			severity: 'warning',
			category: 'Equipment',
			message: 'No armor purchased',
			details: 'Armor is recommended for survival'
		});
	}

	if (!char.equipment.lifestyle) {
		issues.push({
			code: 'NO_LIFESTYLE',
			severity: 'warning',
			category: 'Equipment',
			message: 'No lifestyle selected',
			details: 'A lifestyle is required for between-run survival'
		});
	}

	// Check availability (12 max at creation)
	const maxAvail = char.settings.maxAvailability;
	// Note: We'd need availability data on items to validate this fully

	// Check for negative nuyen
	if (char.nuyen < 0) {
		issues.push({
			code: 'NEGATIVE_NUYEN',
			severity: 'error',
			category: 'Equipment',
			message: 'Negative nuyen balance',
			details: `Current: ${char.nuyen}¥`
		});
	}

	return issues;
}

/** Validate contacts. */
function validateContacts(char: Character): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	if (char.contacts.length === 0 && char.status === 'creation') {
		issues.push({
			code: 'NO_CONTACTS',
			severity: 'info',
			category: 'Contacts',
			message: 'No contacts defined',
			details: 'Contacts are useful for gathering information and acquiring items'
		});
	}

	// Validate contact ratings
	for (const contact of char.contacts) {
		if (contact.loyalty < 1 || contact.loyalty > 6) {
			issues.push({
				code: 'CONTACT_LOYALTY_INVALID',
				severity: 'error',
				category: 'Contacts',
				message: `${contact.name} has invalid loyalty rating`,
				details: `Current: ${contact.loyalty}, Valid: 1-6`
			});
		}

		if (contact.connection < 1 || contact.connection > 6) {
			issues.push({
				code: 'CONTACT_CONNECTION_INVALID',
				severity: 'error',
				category: 'Contacts',
				message: `${contact.name} has invalid connection rating`,
				details: `Current: ${contact.connection}, Valid: 1-6`
			});
		}
	}

	return issues;
}

/** Validate character identity. */
function validateIdentity(char: Character): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	if (!char.identity.name) {
		issues.push({
			code: 'NO_NAME',
			severity: 'warning',
			category: 'Identity',
			message: 'Character has no name',
			details: 'Give your character a name'
		});
	}

	if (!char.identity.metatype) {
		issues.push({
			code: 'NO_METATYPE',
			severity: 'error',
			category: 'Identity',
			message: 'No metatype selected',
			details: 'Select a metatype to continue'
		});
	}

	return issues;
}

/* ============================================
 * Main Validation Function
 * ============================================ */

/** Run all validations on a character. */
export function validateCharacter(char: Character): ValidationResult {
	const allIssues: ValidationIssue[] = [];

	// Run all validation checks
	allIssues.push(...validateIdentity(char));
	allIssues.push(...validateBPLimits(char));
	allIssues.push(...validateAttributes(char));
	allIssues.push(...validateSkills(char));
	allIssues.push(...validateQualities(char));
	allIssues.push(...validateMagic(char));
	allIssues.push(...validateResonance(char));
	allIssues.push(...validateEquipment(char));
	allIssues.push(...validateContacts(char));

	// Count by severity
	const errors = allIssues.filter((i) => i.severity === 'error').length;
	const warnings = allIssues.filter((i) => i.severity === 'warning').length;
	const info = allIssues.filter((i) => i.severity === 'info').length;

	return {
		valid: errors === 0,
		issues: allIssues,
		summary: { errors, warnings, info }
	};
}

/** Get only errors from validation. */
export function getValidationErrors(char: Character): ValidationIssue[] {
	return validateCharacter(char).issues.filter((i) => i.severity === 'error');
}

/** Get only warnings from validation. */
export function getValidationWarnings(char: Character): ValidationIssue[] {
	return validateCharacter(char).issues.filter((i) => i.severity === 'warning');
}

/** Check if character is valid for completion. */
export function isCharacterComplete(char: Character): boolean {
	const result = validateCharacter(char);
	return result.valid;
}
