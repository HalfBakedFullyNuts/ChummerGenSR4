<script lang="ts">
	import type { Character } from '$types';
	import { setAttribute } from '$stores/character';

	export let character: Character;

	type AttributeKey = 'bod' | 'agi' | 'rea' | 'str' | 'cha' | 'int' | 'log' | 'wil' | 'edg';

	interface AttributeInfo {
		key: AttributeKey;
		name: string;
		shortName: string;
	}

	const physicalAttrs: AttributeInfo[] = [
		{ key: 'bod', name: 'Body', shortName: 'BOD' },
		{ key: 'agi', name: 'Agility', shortName: 'AGI' },
		{ key: 'rea', name: 'Reaction', shortName: 'REA' },
		{ key: 'str', name: 'Strength', shortName: 'STR' }
	];

	const mentalAttrs: AttributeInfo[] = [
		{ key: 'cha', name: 'Charisma', shortName: 'CHA' },
		{ key: 'int', name: 'Intuition', shortName: 'INT' },
		{ key: 'log', name: 'Logic', shortName: 'LOG' },
		{ key: 'wil', name: 'Willpower', shortName: 'WIL' }
	];

	function getAttrValue(key: AttributeKey): number {
		return character.attributes[key]?.base ?? 1;
	}

	function getAttrLimit(key: AttributeKey): { min: number; max: number } {
		const limit = character.attributeLimits[key];
		return limit ? { min: limit.min, max: limit.max } : { min: 1, max: 6 };
	}

	function handleChange(key: AttributeKey, value: number): void {
		setAttribute(key, value);
	}

	/* Edge values (computed) */
	$: edgeValue = getAttrValue('edg');
	$: edgeLimits = getAttrLimit('edg');
</script>

<div class="space-y-6">
	<!-- Physical Attributes -->
	<div>
		<h3 class="text-text-secondary text-sm font-medium mb-3">Physical Attributes</h3>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			{#each physicalAttrs as attr}
				{@const value = getAttrValue(attr.key)}
				{@const limits = getAttrLimit(attr.key)}
				<div class="cw-data-row flex-col items-start">
					<label for={attr.key} class="text-text-primary text-sm font-medium">
						{attr.name}
						<span class="text-text-muted">({attr.shortName})</span>
					</label>
					<div class="flex items-center gap-2 mt-1 w-full">
						<input
							id={attr.key}
							type="number"
							min={limits.min}
							max={limits.max}
							value={value}
							on:input={(e) => handleChange(attr.key, parseInt(e.currentTarget.value) || limits.min)}
							class="cw-input w-16 text-center"
						/>
						<span class="text-text-muted text-xs">
							({limits.min}-{limits.max})
						</span>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Mental Attributes -->
	<div>
		<h3 class="text-text-secondary text-sm font-medium mb-3">Mental Attributes</h3>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			{#each mentalAttrs as attr}
				{@const value = getAttrValue(attr.key)}
				{@const limits = getAttrLimit(attr.key)}
				<div class="cw-data-row flex-col items-start">
					<label for={attr.key} class="text-text-primary text-sm font-medium">
						{attr.name}
						<span class="text-text-muted">({attr.shortName})</span>
					</label>
					<div class="flex items-center gap-2 mt-1 w-full">
						<input
							id={attr.key}
							type="number"
							min={limits.min}
							max={limits.max}
							value={value}
							on:input={(e) => handleChange(attr.key, parseInt(e.currentTarget.value) || limits.min)}
							class="cw-input w-16 text-center"
						/>
						<span class="text-text-muted text-xs">
							({limits.min}-{limits.max})
						</span>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Special Attributes -->
	<div>
		<h3 class="text-text-secondary text-sm font-medium mb-3">Special Attributes</h3>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<!-- Edge -->
			<div class="cw-data-row flex-col items-start">
				<label for="edg" class="text-text-primary text-sm font-medium">
					Edge
					<span class="text-text-muted">(EDG)</span>
				</label>
				<div class="flex items-center gap-2 mt-1 w-full">
					<input
						id="edg"
						type="number"
						min={edgeLimits.min}
						max={edgeLimits.max}
						value={edgeValue}
						on:input={(e) => handleChange('edg', parseInt(e.currentTarget.value) || edgeLimits.min)}
						class="cw-input w-16 text-center"
					/>
					<span class="text-text-muted text-xs">
						({edgeLimits.min}-{edgeLimits.max})
					</span>
				</div>
			</div>

			<!-- Essence (display only) -->
			<div class="cw-data-row flex-col items-start">
				<span class="text-text-primary text-sm font-medium">
					Essence
					<span class="text-text-muted">(ESS)</span>
				</span>
				<div class="flex items-center gap-2 mt-1 w-full">
					<span class="text-lg font-mono text-primary-dark">
						{character.attributes.ess.toFixed(2)}
					</span>
				</div>
			</div>

			<!-- Magic (if applicable) -->
			{#if character.attributes.mag}
				<div class="cw-data-row flex-col items-start">
					<label for="mag" class="text-text-primary text-sm font-medium">
						Magic
						<span class="text-text-muted">(MAG)</span>
					</label>
					<div class="flex items-center gap-2 mt-1 w-full">
						<input
							id="mag"
							type="number"
							min={1}
							max={6}
							value={character.attributes.mag.base}
							class="cw-input w-16 text-center"
						/>
					</div>
				</div>
			{/if}

			<!-- Resonance (if applicable) -->
			{#if character.attributes.res}
				<div class="cw-data-row flex-col items-start">
					<label for="res" class="text-text-primary text-sm font-medium">
						Resonance
						<span class="text-text-muted">(RES)</span>
					</label>
					<div class="flex items-center gap-2 mt-1 w-full">
						<input
							id="res"
							type="number"
							min={1}
							max={6}
							value={character.attributes.res.base}
							class="cw-input w-16 text-center"
						/>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
