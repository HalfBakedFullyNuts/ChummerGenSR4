<script lang="ts">
	import { character, setAttribute, KARMA_BUILD_COSTS, type AttributeValueKey } from '$stores/character';
	import type { AttributeValue } from '$types';
	import { ATTRIBUTE_NAMES } from '$types';

	/** Attribute codes for standard attributes. */
	const STANDARD_ATTRS: readonly AttributeValueKey[] = ['bod', 'agi', 'rea', 'str', 'cha', 'int', 'log', 'wil'];

	/** Special attributes shown separately. */
	const SPECIAL_ATTRS: readonly AttributeValueKey[] = ['edg'];

	/** BP cost per attribute point (standard is 10 BP per point). */
	const BP_PER_POINT = 10;

	/** Get attribute value from character. */
	function getAttrValue(
		char: typeof $character,
		code: AttributeValueKey
	): AttributeValue | null {
		if (!char) return null;
		const attr = char.attributes[code];
		if (typeof attr === 'number' || attr === null) return null;
		return attr;
	}

	/** Get attribute limits from character. */
	function getAttrLimits(
		char: typeof $character,
		code: AttributeValueKey
	): { min: number; max: number } | null {
		if (!char) return null;
		return char.attributeLimits[code] ?? null;
	}

	/** Increment attribute value. */
	function incrementAttr(code: AttributeValueKey): void {
		const attr = getAttrValue($character, code);
		const limits = getAttrLimits($character, code);
		if (!attr || !limits) return;

		const newValue = Math.min(attr.base + 1, limits.max);
		setAttribute(code, newValue);
	}

	/** Decrement attribute value. */
	function decrementAttr(code: AttributeValueKey): void {
		const attr = getAttrValue($character, code);
		const limits = getAttrLimits($character, code);
		if (!attr || !limits) return;

		const newValue = Math.max(attr.base - 1, limits.min);
		setAttribute(code, newValue);
	}

	/** Calculate total BP spent on attributes. */
	function calculateAttrBP(char: typeof $character): number {
		if (!char) return 0;

		let total = 0;
		for (const code of [...STANDARD_ATTRS, ...SPECIAL_ATTRS]) {
			const attr = getAttrValue(char, code);
			const limits = getAttrLimits(char, code);
			if (!attr || !limits) continue;

			/* BP cost is (current - minimum) * 10 */
			const pointsAboveMin = attr.base - limits.min;
			total += pointsAboveMin * BP_PER_POINT;
		}
		return total;
	}

	/** Calculate total Karma spent on attributes (Karma Build method). */
	function calculateAttrKarma(char: typeof $character): number {
		if (!char) return 0;

		let total = 0;
		for (const code of [...STANDARD_ATTRS, ...SPECIAL_ATTRS]) {
			const attr = getAttrValue(char, code);
			const limits = getAttrLimits(char, code);
			if (!attr || !limits) continue;

			/* Karma cost is sum of (rating × 5) for each point from min to current */
			for (let r = limits.min + 1; r <= attr.base; r++) {
				total += r * KARMA_BUILD_COSTS.ATTRIBUTE_MULTIPLIER;
			}
		}
		return total;
	}

	$: isKarmaBuild = $character?.buildMethod === 'karma';
	$: attrCost = isKarmaBuild ? calculateAttrKarma($character) : calculateAttrBP($character);
	$: costLabel = isKarmaBuild ? 'Karma' : 'BP';
</script>

<div class="space-y-6">
	<!-- Cost Summary -->
	<div class="cw-panel p-4">
		<div class="flex items-center justify-between">
			<span class="text-secondary-text">Attribute {costLabel} Spent:</span>
			<span class="font-mono text-xl {isKarmaBuild ? 'text-accent-cyan' : 'text-accent-primary'}">{attrCost}</span>
		</div>
		<p class="text-muted-text text-xs mt-2">
			{#if isKarmaBuild}
				Each point costs (new rating × 5) karma. Example: min 1 → 4 costs 10+15+20 = 45 karma.
			{:else}
				Each point above minimum costs 10 BP. Metatype sets min/max limits.
			{/if}
		</p>
	</div>

	<!-- Standard Attributes -->
	<div class="cw-card">
		<h3 class="cw-card-header mb-4">Physical & Mental Attributes</h3>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each STANDARD_ATTRS as code}
				{@const attr = getAttrValue($character, code)}
				{@const limits = getAttrLimits($character, code)}
				{@const isPhysical = ['bod', 'agi', 'rea', 'str'].includes(code)}

				<div class="flex items-center gap-4 p-3 bg-surface rounded">
					<!-- Label -->
					<div class="w-24">
						<span class="text-primary-text font-medium">
							{ATTRIBUTE_NAMES[code]}
						</span>
						<span class="text-muted-text text-xs block">
							{code.toUpperCase()}
						</span>
					</div>

					<!-- Controls -->
					<div class="flex items-center gap-2">
						<button
							class="w-8 h-8 rounded bg-surface-light text-secondary-text
								hover:bg-accent-primary hover:text-background
								disabled:opacity-30 disabled:cursor-not-allowed"
							on:click={() => decrementAttr(code)}
							disabled={!attr || !limits || attr.base <= limits.min}
						>
							-
						</button>

						<span class="w-12 text-center font-mono text-lg text-accent-primary">
							{attr?.base ?? 0}
						</span>

						<button
							class="w-8 h-8 rounded bg-surface-light text-secondary-text
								hover:bg-accent-primary hover:text-background
								disabled:opacity-30 disabled:cursor-not-allowed"
							on:click={() => incrementAttr(code)}
							disabled={!attr || !limits || attr.base >= limits.max}
						>
							+
						</button>
					</div>

					<!-- Range -->
					<div class="text-muted-text text-xs">
						{limits?.min ?? 0} - {limits?.max ?? 0}
					</div>

					<!-- Category Indicator -->
					<div class="ml-auto">
						<span
							class="cw-badge text-xs
								{isPhysical ? 'cw-badge-warning' : 'cw-badge-purple'}"
						>
							{isPhysical ? 'Physical' : 'Mental'}
						</span>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Special Attributes -->
	<div class="cw-card">
		<h3 class="cw-card-header mb-4">Special Attributes</h3>

		<div class="space-y-4">
			{#each SPECIAL_ATTRS as code}
				{@const attr = getAttrValue($character, code)}
				{@const limits = getAttrLimits($character, code)}

				<div class="flex items-center gap-4 p-3 bg-surface rounded">
					<!-- Label -->
					<div class="w-24">
						<span class="text-primary-text font-medium">
							{ATTRIBUTE_NAMES[code]}
						</span>
						<span class="text-muted-text text-xs block">
							{code.toUpperCase()}
						</span>
					</div>

					<!-- Controls -->
					<div class="flex items-center gap-2">
						<button
							class="w-8 h-8 rounded bg-surface-light text-secondary-text
								hover:bg-accent-primary hover:text-background
								disabled:opacity-30 disabled:cursor-not-allowed"
							on:click={() => decrementAttr(code)}
							disabled={!attr || !limits || attr.base <= limits.min}
						>
							-
						</button>

						<span class="w-12 text-center font-mono text-lg text-accent-cyan">
							{attr?.base ?? 0}
						</span>

						<button
							class="w-8 h-8 rounded bg-surface-light text-secondary-text
								hover:bg-accent-primary hover:text-background
								disabled:opacity-30 disabled:cursor-not-allowed"
							on:click={() => incrementAttr(code)}
							disabled={!attr || !limits || attr.base >= limits.max}
						>
							+
						</button>
					</div>

					<!-- Range -->
					<div class="text-muted-text text-xs">
						{limits?.min ?? 0} - {limits?.max ?? 0}
					</div>

					<!-- Badge -->
					<div class="ml-auto">
						<span class="cw-badge cw-badge-success">Special</span>
					</div>
				</div>
			{/each}

			<!-- Essence (display only) -->
			<div class="flex items-center gap-4 p-3 bg-surface rounded opacity-60">
				<div class="w-24">
					<span class="text-primary-text font-medium">Essence</span>
					<span class="text-muted-text text-xs block">ESS</span>
				</div>
				<span class="w-12 text-center font-mono text-lg text-accent-purple">
					{$character?.attributes.ess ?? 6.0}
				</span>
				<span class="text-muted-text text-xs">
					Reduced by cyberware/bioware
				</span>
			</div>
		</div>
	</div>

	<!-- Help Text -->
	<div class="cw-panel p-4 text-sm">
		<h4 class="text-accent-primary mb-2">Attribute Tips</h4>
		<ul class="text-secondary-text space-y-1 list-disc list-inside">
			<li>Your metatype determines minimum and maximum values</li>
			<li>Magic and Resonance are set in the Magic/Resonance step</li>
			<li>Edge is your luck stat - useful for all characters</li>
			<li>Consider your character concept when allocating points</li>
		</ul>
	</div>
</div>
