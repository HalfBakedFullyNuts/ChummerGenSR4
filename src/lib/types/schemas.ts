/**
 * Character Zod Schemas
 * =====================
 * Runtime validation schemas for character data loaded from Firestore.
 * Uses passthrough() on deeply nested objects for forward compatibility —
 * unknown fields are preserved rather than stripped.
 */

import { z } from 'zod';

/* ============================================
 * Sub-schemas
 * ============================================ */

const AttributeValueSchema = z
	.object({
		base: z.number(),
		bonus: z.number(),
		karma: z.number()
	})
	.passthrough();

const AttributeLimitSchema = z
	.object({
		min: z.number(),
		max: z.number(),
		aug: z.number()
	})
	.passthrough();

const IdentitySchema = z
	.object({
		name: z.string(),
		alias: z.string(),
		playerName: z.string(),
		metatype: z.string(),
		metavariant: z.string().nullable(),
		sex: z.string(),
		age: z.string(),
		height: z.string(),
		weight: z.string(),
		hair: z.string(),
		eyes: z.string(),
		skin: z.string()
	})
	.passthrough();

const BackgroundSchema = z
	.object({
		description: z.string(),
		background: z.string(),
		concept: z.string(),
		notes: z.string()
	})
	.passthrough();

const BuildPointAllocationSchema = z
	.object({
		metatype: z.number(),
		attributes: z.number(),
		skills: z.number(),
		skillGroups: z.number(),
		specializations: z.number(),
		knowledgeSkills: z.number(),
		qualities: z.number(),
		spells: z.number(),
		complexForms: z.number(),
		contacts: z.number(),
		resources: z.number(),
		mentor: z.number(),
		martialArts: z.number()
	})
	.passthrough();

const QualitySchema = z
	.object({
		id: z.string(),
		name: z.string(),
		category: z.enum(['Positive', 'Negative']),
		bp: z.number(),
		rating: z.number(),
		notes: z.string()
	})
	.passthrough();

const ContactSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		type: z.string(),
		loyalty: z.number(),
		connection: z.number(),
		notes: z.string()
	})
	.passthrough();

const ExpenseEntrySchema = z
	.object({
		id: z.string(),
		date: z.string(),
		type: z.enum(['karma', 'nuyen']),
		amount: z.number(),
		reason: z.string()
	})
	.passthrough();

const ReputationSchema = z
	.object({
		streetCred: z.number(),
		notoriety: z.number(),
		publicAwareness: z.number()
	})
	.passthrough();

const ConditionMonitorSchema = z
	.object({
		physicalMax: z.number(),
		physicalCurrent: z.number(),
		stunMax: z.number(),
		stunCurrent: z.number(),
		overflow: z.number(),
		edgeCurrent: z.number()
	})
	.passthrough();

const CharacterSettingsSchema = z
	.object({
		maxAvailability: z.number(),
		startingBP: z.number(),
		startingKarma: z.number(),
		startingNuyen: z.number(),
		ignoreRules: z.boolean()
	})
	.passthrough();

const AttributesSchema = z
	.object({
		bod: AttributeValueSchema,
		agi: AttributeValueSchema,
		rea: AttributeValueSchema,
		str: AttributeValueSchema,
		cha: AttributeValueSchema,
		int: AttributeValueSchema,
		log: AttributeValueSchema,
		wil: AttributeValueSchema,
		edg: AttributeValueSchema,
		mag: AttributeValueSchema.nullable(),
		res: AttributeValueSchema.nullable(),
		ess: z.number()
	})
	.passthrough();

/* ============================================
 * Main Character Schema
 * ============================================ */

/**
 * Top-level Character schema for runtime validation.
 * Validates structure from Firestore data. Uses passthrough()
 * for nested arrays (skills, equipment, magic, resonance) to
 * allow forward-compatible data without blocking on schema changes.
 */
export const CharacterSchema = z
	.object({
		/* Identity */
		id: z.string(),
		userId: z.string(),
		identity: IdentitySchema,
		background: BackgroundSchema,

		/* Status */
		status: z.enum(['creation', 'career']),
		buildMethod: z.enum(['bp', 'karma']),
		buildPoints: z.number(),
		buildPointsSpent: BuildPointAllocationSchema,

		/* Attributes */
		attributes: AttributesSchema,
		attributeLimits: z
			.object({
				bod: AttributeLimitSchema,
				agi: AttributeLimitSchema,
				rea: AttributeLimitSchema,
				str: AttributeLimitSchema,
				cha: AttributeLimitSchema,
				int: AttributeLimitSchema,
				log: AttributeLimitSchema,
				wil: AttributeLimitSchema,
				ini: AttributeLimitSchema,
				edg: AttributeLimitSchema,
				mag: AttributeLimitSchema,
				res: AttributeLimitSchema,
				ess: AttributeLimitSchema
			})
			.passthrough(),

		/* Skills — validated as arrays of objects, details passthrough */
		skills: z.array(z.object({}).passthrough()),
		skillGroups: z.array(z.object({}).passthrough()),
		knowledgeSkills: z.array(z.object({}).passthrough()),
		knowledgeSkillPoints: z.number(),

		/* Qualities */
		qualities: z.array(QualitySchema),

		/* Magic (null if mundane) */
		magic: z.object({}).passthrough().nullable(),

		/* Resonance (null if not technomancer) */
		resonance: z.object({}).passthrough().nullable(),

		/* Social */
		contacts: z.array(ContactSchema),

		/* Equipment — deeply nested, passthrough for now */
		equipment: z.object({}).passthrough(),

		/* Resources */
		nuyen: z.number(),
		startingNuyen: z.number(),
		karma: z.number(),
		totalKarma: z.number(),

		/* Reputation */
		reputation: ReputationSchema,

		/* Condition */
		condition: ConditionMonitorSchema,

		/* Career */
		expenseLog: z.array(ExpenseEntrySchema),

		/* Metadata */
		createdAt: z.string(),
		updatedAt: z.string(),
		settings: CharacterSettingsSchema
	})
	.passthrough();

/** Inferred type from the schema (should match Character interface). */
export type CharacterSchemaType = z.infer<typeof CharacterSchema>;
