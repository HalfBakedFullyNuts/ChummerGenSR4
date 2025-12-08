<script lang="ts">
	import { character, setAttribute, KARMA_BUILD_COSTS, type AttributeValueKey, attributeValidation } from '$stores/character';
	import type { AttributeValue } from '$types';
	import { ATTRIBUTE_NAMES } from '$types';

	// Ordered by category: Physical > Mental > Special
	const PHYSICAL_ATTRS: readonly AttributeValueKey[] = ['bod', 'agi', 'rea', 'str'];
	const MENTAL_ATTRS: readonly AttributeValueKey[] = ['cha', 'int', 'log', 'wil'];
	const SPECIAL_ATTRS: readonly AttributeValueKey[] = ['edg'];

	// Combined ordered list for rendering
	const ALL_ATTRS: readonly AttributeValueKey[] = [...PHYSICAL_ATTRS, ...MENTAL_ATTRS, ...SPECIAL_ATTRS];

	const BP_PER_POINT = 10;

	function getAttrValue(
		char: typeof $character,
		code: AttributeValueKey
	): AttributeValue | null {
		if (!char) return null;
		const attr = char.attributes[code];
		if (typeof attr === 'number' || attr === null) return null;
		return attr;
	}

	function getAttrLimits(
		char: typeof $character,
		code: AttributeValueKey
	): { min: number; max: number } | null {
		if (!char) return null;
		return char.attributeLimits[code] ?? null;
	}

	function getAugmentedLimit(naturalMax: number): number {
		return naturalMax + Math.floor(naturalMax / 2);
	}

	function formatRange(min: number, max: number, augmented: number): string {
		// Format: "X - XX (XX)" with right-aligned components
		const minStr = String(min);
		const maxStr = String(max).padStart(2, ' ');
		const augPart = `(${augmented})`.padStart(4, ' '); // Right-align closing bracket
		return `${minStr} - ${maxStr} ${augPart}`;
	}

	function incrementAttr(code: AttributeValueKey): void {
		const attr = getAttrValue($character, code);
		const limits = getAttrLimits($character, code);
		if (!attr || !limits) return;
		const newValue = Math.min(attr.base + 1, limits.max);
		setAttribute(code, newValue);
	}

	function decrementAttr(code: AttributeValueKey): void {
		const attr = getAttrValue($character, code);
		const limits = getAttrLimits($character, code);
		if (!attr || !limits) return;
		const newValue = Math.max(attr.base - 1, limits.min);
		setAttribute(code, newValue);
	}

	function calculateAttrBP(char: typeof $character): number {
		if (!char) return 0;
		let total = 0;
		for (const code of ALL_ATTRS) {
			const attr = getAttrValue(char, code);
			const limits = getAttrLimits(char, code);
			if (!attr || !limits) continue;
			const pointsAboveMin = attr.base - limits.min;
			total += pointsAboveMin * BP_PER_POINT;
		}
		return total;
	}

	function calculateAttrKarma(char: typeof $character): number {
		if (!char) return 0;
		let total = 0;
		for (const code of ALL_ATTRS) {
			const attr = getAttrValue(char, code);
			const limits = getAttrLimits(char, code);
			if (!attr || !limits) continue;
			for (let r = limits.min + 1; r <= attr.base; r++) {
				total += r * KARMA_BUILD_COSTS.ATTRIBUTE_MULTIPLIER;
			}
		}
		return total;
	}

	/** Check if a specific attribute is at its natural maximum. */
	function isAtMax(code: AttributeValueKey): boolean {
		const attr = getAttrValue($character, code);
		const limits = getAttrLimits($character, code);
		if (!attr || !limits) return false;
		return attr.base === limits.max;
	}

	/** Check if incrementing this attribute would exceed limits. */
	function wouldExceedMaxLimit(code: AttributeValueKey): boolean {
		if (isKarmaBuild) return false;
		const attr = getAttrValue($character, code);
		const limits = getAttrLimits($character, code);
		if (!attr || !limits) return false;
		// If we're not at max yet but incrementing would put us at max,
		// and another attribute is already at max, block it
		const wouldBeAtMax = attr.base + 1 === limits.max;
		return wouldBeAtMax && $attributeValidation.maxedAttributeCount >= 1;
	}

	// Compound test calculations (reactive to attribute changes)
	$: bodValue = getAttrValue($character, 'bod')?.base ?? 0;
	$: agiValue = getAttrValue($character, 'agi')?.base ?? 0;
	$: reaValue = getAttrValue($character, 'rea')?.base ?? 0;
	$: strValue = getAttrValue($character, 'str')?.base ?? 0;
	$: chaValue = getAttrValue($character, 'cha')?.base ?? 0;
	$: intValue = getAttrValue($character, 'int')?.base ?? 0;
	$: logValue = getAttrValue($character, 'log')?.base ?? 0;
	$: wilValue = getAttrValue($character, 'wil')?.base ?? 0;
	$: edgValue = getAttrValue($character, 'edg')?.base ?? 0;

	// Condition Monitors
	$: physicalCM = 8 + Math.ceil(bodValue / 2);
	$: stunCM = 8 + Math.ceil(wilValue / 2);
	$: initiative = reaValue + intValue;
	$: initiativePasses = 1; // Base passes, can be modified by augmentations

	// Compound tests
	$: composure = chaValue + wilValue;
	$: judgeIntentions = chaValue + intValue;
	$: memory = logValue + wilValue;
	$: liftCarry = bodValue + strValue;

	$: isKarmaBuild = $character?.buildMethod === 'karma';
	$: attrCost = isKarmaBuild ? calculateAttrKarma($character) : calculateAttrBP($character);
	$: costLabel = isKarmaBuild ? 'Karma' : 'BP';
	
	// BP limit progress (for non-karma builds)
	$: bpLimitPercent = $attributeValidation.maxNonSpecialBP > 0 
		? Math.min(100, ($attributeValidation.nonSpecialBP / $attributeValidation.maxNonSpecialBP) * 100)
		: 0;
</script>

<div class="space-y-4">
	<!-- Cost Summary (centered) -->
	<div class="flex justify-center">
		<div class="bg-white border border-gray-200 rounded-lg shadow-md p-4 inline-block min-w-[300px]">
			<div class="flex items-center gap-4">
				<span class="text-black flex items-center gap-2">
					<span class="material-icons text-sm">analytics</span>
					Attribute {costLabel} Spent
				</span>
				<span class="cw-bp-cost text-lg">{attrCost}</span>
			</div>
			<p class="text-gray-600 text-xs mt-1 text-center">
				{#if isKarmaBuild}
					Each point costs (new rating × 5) karma
				{:else}
					Each point above minimum costs 10 BP (25 BP for max)
				{/if}
			</p>
			
			<!-- BP Limit Progress (non-karma only) -->
			{#if !isKarmaBuild}
				<div class="mt-3 pt-3 border-t border-gray-100">
					<div class="flex justify-between text-xs mb-1">
						<span class="text-gray-600">Non-Special Attributes</span>
						<span class="{$attributeValidation.isOverBPLimit ? 'text-red-600 font-semibold' : 'text-gray-600'}">
							{$attributeValidation.nonSpecialBP} / {$attributeValidation.maxNonSpecialBP} BP (50% max)
						</span>
					</div>
					<div class="h-2 bg-gray-200 rounded-full overflow-hidden">
						<div 
							class="h-full transition-all duration-300 {$attributeValidation.isOverBPLimit ? 'bg-red-500' : bpLimitPercent > 80 ? 'bg-amber-500' : 'bg-green-500'}"
							style="width: {bpLimitPercent}%"
						></div>
					</div>
					
					<!-- Maxed Attribute Warning -->
					{#if $attributeValidation.maxedAttributeCount > 0}
						<div class="mt-2 flex items-center gap-1 text-xs {$attributeValidation.isOverMaxLimit ? 'text-red-600' : 'text-amber-600'}">
							<span class="material-icons text-sm">{$attributeValidation.isOverMaxLimit ? 'error' : 'info'}</span>
							{#if $attributeValidation.isOverMaxLimit}
								Only 1 attribute may be at natural max (you have {$attributeValidation.maxedAttributeCount})
							{:else}
								{ATTRIBUTE_NAMES[$attributeValidation.maxedAttribute ?? 'bod']} is at natural max (1 allowed)
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Main Content: Attributes + Derived Stats -->
	<div class="flex gap-4">
		<!-- Left Side: Attribute List (50% width) -->
		<div class="w-1/2 flex flex-col gap-4">
			<!-- Physical Attributes -->
			<div class="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
				<div class="bg-amber-50 px-4 py-2 border-b border-gray-200">
					<h3 class="text-sm font-semibold text-amber-800 uppercase tracking-wide flex items-center gap-2">
						<span class="material-icons text-sm">fitness_center</span>
						Physical
					</h3>
				</div>

				{#each PHYSICAL_ATTRS as code, idx}
					{@const attr = getAttrValue($character, code)}
					{@const limits = getAttrLimits($character, code)}
					{@const augmented = limits ? getAugmentedLimit(limits.max) : 0}
					<div class="flex items-center px-4 py-3 border-b border-gray-100 {idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}">
						<div class="flex-1">
							<span class="text-black font-medium">{ATTRIBUTE_NAMES[code]}</span>
						</div>
						<div class="flex items-center gap-1">
							<button
								class="cw-btn-inc-dec"
								on:click={() => decrementAttr(code)}
								disabled={!attr || !limits || attr.base <= limits.min}
							>
								<span class="material-icons text-xs">remove</span>
							</button>
							<span class="w-10 text-center font-mono text-lg text-black font-bold">
								{attr?.base ?? 0}
							</span>
							<button
								class="cw-btn-inc-dec"
								on:click={() => incrementAttr(code)}
								disabled={!attr || !limits || attr.base >= limits.max}
							>
								<span class="material-icons text-xs">add</span>
							</button>
						</div>
						<div class="text-gray-500 text-xs ml-4 font-mono whitespace-pre">
							{formatRange(limits?.min ?? 0, limits?.max ?? 0, augmented)}
						</div>
					</div>
				{/each}
			</div>

			<!-- Mental Attributes -->
			<div class="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
				<div class="bg-blue-50 px-4 py-2 border-b border-gray-200">
					<h3 class="text-sm font-semibold text-blue-800 uppercase tracking-wide flex items-center gap-2">
						<span class="material-icons text-sm">psychology</span>
						Mental
					</h3>
				</div>

				{#each MENTAL_ATTRS as code, idx}
					{@const attr = getAttrValue($character, code)}
					{@const limits = getAttrLimits($character, code)}
					{@const augmented = limits ? getAugmentedLimit(limits.max) : 0}
					<div class="flex items-center px-4 py-3 border-b border-gray-100 {idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}">
						<div class="flex-1">
							<span class="text-black font-medium">{ATTRIBUTE_NAMES[code]}</span>
						</div>
						<div class="flex items-center gap-1">
							<button
								class="cw-btn-inc-dec"
								on:click={() => decrementAttr(code)}
								disabled={!attr || !limits || attr.base <= limits.min}
							>
								<span class="material-icons text-xs">remove</span>
							</button>
							<span class="w-10 text-center font-mono text-lg text-black font-bold">
								{attr?.base ?? 0}
							</span>
							<button
								class="cw-btn-inc-dec"
								on:click={() => incrementAttr(code)}
								disabled={!attr || !limits || attr.base >= limits.max}
							>
								<span class="material-icons text-xs">add</span>
							</button>
						</div>
						<div class="text-gray-500 text-xs ml-4 font-mono whitespace-pre">
							{formatRange(limits?.min ?? 0, limits?.max ?? 0, augmented)}
						</div>
					</div>
				{/each}
			</div>

			<!-- Special Attributes -->
			<div class="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
				<div class="bg-green-50 px-4 py-2 border-b border-gray-200">
					<h3 class="text-sm font-semibold text-green-800 uppercase tracking-wide flex items-center gap-2">
						<span class="material-icons text-sm">auto_awesome</span>
						Special
					</h3>
				</div>

				{#each SPECIAL_ATTRS as code, idx}
					{@const attr = getAttrValue($character, code)}
					{@const limits = getAttrLimits($character, code)}
					{@const augmented = limits ? getAugmentedLimit(limits.max) : 0}
					<div class="flex items-center px-4 py-3 border-b border-gray-100 {idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}">
						<div class="flex-1">
							<span class="text-black font-medium">{ATTRIBUTE_NAMES[code]}</span>
						</div>
						<div class="flex items-center gap-1">
							<button
								class="cw-btn-inc-dec"
								on:click={() => decrementAttr(code)}
								disabled={!attr || !limits || attr.base <= limits.min}
							>
								<span class="material-icons text-xs">remove</span>
							</button>
							<span class="w-10 text-center font-mono text-lg text-black font-bold">
								{attr?.base ?? 0}
							</span>
							<button
								class="cw-btn-inc-dec"
								on:click={() => incrementAttr(code)}
								disabled={!attr || !limits || attr.base >= limits.max}
							>
								<span class="material-icons text-xs">add</span>
							</button>
						</div>
						<div class="text-gray-500 text-xs ml-4 font-mono whitespace-pre">
							{formatRange(limits?.min ?? 0, limits?.max ?? 0, augmented)}
						</div>
					</div>
				{/each}

				<!-- Essence (display only) -->
				<div class="flex items-center px-4 py-3 bg-gray-50">
					<div class="flex-1">
						<span class="text-black font-medium">Essence</span>
					</div>
					<span class="w-10 text-center font-mono text-lg text-black font-bold mr-4">
						{$character?.attributes.ess ?? 6.0}
					</span>
					<span class="text-gray-500 text-xs flex items-center gap-1">
						<span class="material-icons text-xs">info</span>
						Reduced by augmentations
					</span>
				</div>
			</div>
		</div>

		<!-- Right Side: Condition Monitors + Compound Tests (50% width) -->
		<div class="w-1/2 flex flex-col gap-4">
			<!-- Condition Monitors (aligned with Physical) -->
			<div class="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
				<div class="bg-amber-50 px-4 py-2 border-b border-gray-200">
					<h3 class="text-sm font-semibold text-amber-800 uppercase tracking-wide flex items-center gap-2">
						<span class="material-icons text-sm">monitor_heart</span>
						Condition Monitors
					</h3>
				</div>

				<div class="flex items-center px-4 py-3 min-h-[52px] border-b border-gray-100 bg-white">
					<div class="flex-1">
						<span class="text-black font-medium cursor-help" title="8 + ⌈Body / 2⌉">Physical</span>
					</div>
					<span class="w-10 text-center font-mono text-lg text-black font-bold">{physicalCM}</span>
				</div>

				<div class="flex items-center px-4 py-3 min-h-[52px] border-b border-gray-100 bg-gray-50">
					<div class="flex-1">
						<span class="text-black font-medium cursor-help" title="8 + ⌈Willpower / 2⌉">Stun</span>
					</div>
					<span class="w-10 text-center font-mono text-lg text-black font-bold">{stunCM}</span>
				</div>

				<div class="flex items-center px-4 py-3 min-h-[52px] border-b border-gray-100 bg-white">
					<div class="flex-1">
						<span class="text-black font-medium cursor-help" title="Reaction + Intuition">Initiative</span>
						<span class="text-gray-500 text-sm ml-1">({initiativePasses} {initiativePasses === 1 ? 'pass' : 'passes'})</span>
					</div>
					<span class="w-10 text-center font-mono text-lg text-black font-bold">{initiative}</span>
				</div>

				<!-- Spacer row to match Physical's 4 rows -->
				<div class="flex items-center px-4 py-3 min-h-[52px] bg-gray-50">
					<div class="flex-1">&nbsp;</div>
					<span class="w-10">&nbsp;</span>
				</div>
			</div>

			<!-- Compound Tests (aligned with Mental) -->
			<div class="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
				<div class="bg-blue-50 px-4 py-2 border-b border-gray-200">
					<h3 class="text-sm font-semibold text-blue-800 uppercase tracking-wide flex items-center gap-2">
						<span class="material-icons text-sm">calculate</span>
						Compound Tests
					</h3>
				</div>

				<div class="flex items-center px-4 py-3 min-h-[52px] border-b border-gray-100 bg-white">
					<div class="flex-1">
						<span class="text-black font-medium cursor-help" title="Charisma + Willpower">Composure</span>
					</div>
					<span class="w-10 text-center font-mono text-lg text-black font-bold">{composure}</span>
				</div>

				<div class="flex items-center px-4 py-3 min-h-[52px] border-b border-gray-100 bg-gray-50">
					<div class="flex-1">
						<span class="text-black font-medium cursor-help" title="Charisma + Intuition">Judge Intentions</span>
					</div>
					<span class="w-10 text-center font-mono text-lg text-black font-bold">{judgeIntentions}</span>
				</div>

				<div class="flex items-center px-4 py-3 min-h-[52px] border-b border-gray-100 bg-white">
					<div class="flex-1">
						<span class="text-black font-medium cursor-help" title="Logic + Willpower">Memory</span>
					</div>
					<span class="w-10 text-center font-mono text-lg text-black font-bold">{memory}</span>
				</div>

				<div class="flex items-center px-4 py-3 min-h-[52px] bg-gray-50">
					<div class="flex-1">
						<span class="text-black font-medium cursor-help" title="Body + Strength">Lift/Carry</span>
					</div>
					<span class="w-10 text-center font-mono text-lg text-black font-bold">{liftCarry}</span>
				</div>
			</div>
		</div>
	</div>
</div>
