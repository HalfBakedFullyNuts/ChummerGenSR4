/**
 * Dice rolling utilities for Shadowrun 4th Edition.
 *
 * SR4 uses a dice pool system where you roll a number of d6s,
 * counting successes (5 or 6) and checking for glitches (more than half 1s).
 */

/** Result of a dice roll. */
export interface RollResult {
	/** Individual die results. */
	dice: number[];
	/** Number of hits (5s and 6s by default). */
	hits: number;
	/** Number of 1s rolled. */
	ones: number;
	/** True if more than half of dice are 1s. */
	isGlitch: boolean;
	/** True if glitch with 0 hits. */
	isCriticalGlitch: boolean;
	/** Whether Edge was used (exploding 6s). */
	edgeUsed: boolean;
	/** Original pool size. */
	pool: number;
}

/** Options for rolling dice. */
export interface RollOptions {
	/** Number of dice in the pool. */
	pool: number;
	/** Use Edge (exploding 6s). */
	edge?: boolean;
	/** Threshold for a hit (default 5). */
	threshold?: number;
	/** Custom RNG function for testing. */
	rng?: () => number;
}

/**
 * Roll a single d6.
 * @param rng - Optional RNG function for testing.
 * @returns A number between 1 and 6.
 */
export function rollD6(rng?: () => number): number {
	const random = rng ? rng() : Math.random();
	return Math.floor(random * 6) + 1;
}

/**
 * Roll a dice pool and calculate results.
 * @param options - Roll options.
 * @returns The roll result.
 */
export function rollDicePool(options: RollOptions): RollResult {
	const { pool, edge = false, threshold = 5, rng } = options;

	const dice: number[] = [];
	let extraDice = 0;

	// Roll initial pool
	for (let i = 0; i < pool; i++) {
		const result = rollD6(rng);
		dice.push(result);

		// Edge: 6s explode (roll again)
		if (edge && result === 6) {
			extraDice++;
		}
	}

	// Roll exploding dice (with safety limit to prevent infinite loops)
	let explosions = 0;
	const maxExplosions = 100;
	while (extraDice > 0 && explosions < maxExplosions) {
		const result = rollD6(rng);
		dice.push(result);
		extraDice--;
		explosions++;

		if (edge && result === 6) {
			extraDice++;
		}
	}

	// Count results
	const hits = dice.filter(d => d >= threshold).length;
	const ones = dice.filter(d => d === 1).length;

	// Glitch: more than half are 1s
	const isGlitch = ones > dice.length / 2;
	const isCriticalGlitch = isGlitch && hits === 0;

	return {
		dice,
		hits,
		ones,
		isGlitch,
		isCriticalGlitch,
		edgeUsed: edge,
		pool
	};
}

/**
 * Calculate the probability of getting at least N hits.
 * @param pool - Dice pool size.
 * @param targetHits - Minimum hits needed.
 * @param threshold - Hit threshold (default 5).
 * @returns Probability as a decimal (0-1).
 */
export function calculateHitProbability(pool: number, targetHits: number, threshold = 5): number {
	// Probability of a single die being a hit
	const hitProb = (7 - threshold) / 6;
	const missProb = 1 - hitProb;

	// Use binomial distribution
	let probability = 0;
	for (let k = targetHits; k <= pool; k++) {
		probability += binomial(pool, k) * Math.pow(hitProb, k) * Math.pow(missProb, pool - k);
	}

	return probability;
}

/**
 * Calculate binomial coefficient (n choose k).
 */
function binomial(n: number, k: number): number {
	if (k < 0 || k > n) return 0;
	if (k === 0 || k === n) return 1;

	let result = 1;
	for (let i = 1; i <= k; i++) {
		result = result * (n - k + i) / i;
	}
	return result;
}

/**
 * Calculate expected hits for a pool.
 * @param pool - Dice pool size.
 * @param threshold - Hit threshold (default 5).
 * @returns Expected number of hits.
 */
export function expectedHits(pool: number, threshold = 5): number {
	const hitProb = (7 - threshold) / 6;
	return pool * hitProb;
}

/**
 * Calculate glitch probability for a pool.
 * @param pool - Dice pool size.
 * @returns Probability of a glitch as a decimal (0-1).
 */
export function glitchProbability(pool: number): number {
	const oneProb = 1 / 6;
	const notOneProb = 5 / 6;
	const halfPool = Math.floor(pool / 2) + 1;

	// Sum probability of getting more than half 1s
	let probability = 0;
	for (let k = halfPool; k <= pool; k++) {
		probability += binomial(pool, k) * Math.pow(oneProb, k) * Math.pow(notOneProb, pool - k);
	}

	return probability;
}

/** Result of an initiative roll. */
export interface InitiativeResult {
	/** Base initiative (REA + INT). */
	base: number;
	/** Dice rolled for initiative. */
	dice: number[];
	/** Total initiative score. */
	total: number;
	/** Number of initiative passes this combat turn. */
	passes: number;
}

/** Options for rolling initiative. */
export interface InitiativeOptions {
	/** Base initiative (REA + INT). */
	base: number;
	/** Number of initiative dice (default 1, increased by certain abilities). */
	dice?: number;
	/** Custom RNG function for testing. */
	rng?: () => number;
}

/**
 * Roll initiative for SR4.
 * Initiative = REA + INT + Xd6 (typically 1d6 for mundanes).
 * @param options - Initiative roll options.
 * @returns The initiative result.
 */
export function rollInitiative(options: InitiativeOptions): InitiativeResult {
	const { base, dice = 1, rng } = options;

	const diceResults: number[] = [];
	let diceTotal = 0;

	for (let i = 0; i < dice; i++) {
		const result = rollD6(rng);
		diceResults.push(result);
		diceTotal += result;
	}

	const total = base + diceTotal;

	// Calculate initiative passes
	// Pass 1: everyone with Init >= 1
	// Pass 2: everyone with Init >= 11
	// Pass 3: everyone with Init >= 21
	// Pass 4: everyone with Init >= 31
	const passes = Math.min(4, Math.max(1, Math.ceil(total / 10)));

	return {
		base,
		dice: diceResults,
		total,
		passes
	};
}

/**
 * Calculate remaining initiative for subsequent passes.
 * Each pass reduces initiative by 10.
 * @param total - Current initiative total.
 * @param passNumber - Which pass (1-4).
 * @returns Initiative score for this pass, or 0 if no action.
 */
export function getInitiativeForPass(total: number, passNumber: number): number {
	const reduction = (passNumber - 1) * 10;
	return Math.max(0, total - reduction);
}
