<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		SPRITE_TYPES,
		calculateThreadingPool,
		calculateFadingValue,
		calculateFadingResistance,
		isFadingPhysical,
		calculateCompilingSpritePool,
		calculateSpriteResistance,
		calculateSpriteTasks,
		calculateRegisteringSpritePool,
		type SpriteType
	} from '$lib/utils/dice';

	/** Character's Resonance attribute. */
	export let resonance = 4;

	/** Character's Willpower attribute. */
	export let willpower = 3;

	/** Character's relevant skill ratings. */
	export let skills: Record<string, number> = {};

	/** Dispatch events. */
	const dispatch = createEventDispatcher<{
		rollCompiling: { pool: number; spriteType: SpriteType; rating: number; resistPool: number };
		rollRegistering: { pool: number; spriteType: SpriteType; rating: number; resistPool: number };
		rollThreading: { pool: number; formName: string; rating: number; fadingValue: number };
		rollFading: { pool: number; fadingValue: number; isPhysical: boolean };
	}>();

	/** Get skill rating by name. */
	function getSkillRating(skillName: string): number {
		return skills[skillName] || 0;
	}

	/** Calculated pools. */
	$: compilingPool = calculateCompilingSpritePool(resonance, getSkillRating('Compiling'));
	$: registeringPool = calculateRegisteringSpritePool(resonance, getSkillRating('Registering'));
	$: threadingPool = calculateThreadingPool(resonance, getSkillRating('Software'));
	$: fadingResistPool = calculateFadingResistance(resonance, willpower);

	/** Selected sprite type. */
	let selectedSpriteType: SpriteType = 'Crack';

	/** Sprite/complex form rating. */
	let spriteRating = 4;
	let formRating = 4;
	let formName = 'Browse';

	/** Calculate fading for current form rating. */
	$: currentFading = calculateFadingValue(formRating, resonance);
	$: fadingIsPhysical = isFadingPhysical(currentFading, resonance);

	/** Handle sprite compilation. */
	function handleCompiling(): void {
		const resistPool = calculateSpriteResistance(spriteRating);
		dispatch('rollCompiling', {
			pool: compilingPool,
			spriteType: selectedSpriteType,
			rating: spriteRating,
			resistPool
		});
	}

	/** Handle sprite registration. */
	function handleRegistering(): void {
		const resistPool = calculateSpriteResistance(spriteRating);
		dispatch('rollRegistering', {
			pool: registeringPool,
			spriteType: selectedSpriteType,
			rating: spriteRating,
			resistPool
		});
	}

	/** Handle threading. */
	function handleThreading(): void {
		dispatch('rollThreading', {
			pool: threadingPool,
			formName,
			rating: formRating,
			fadingValue: currentFading
		});
	}

	/** Handle fading resist. */
	function handleFadingResist(fadingValue: number): void {
		dispatch('rollFading', {
			pool: fadingResistPool,
			fadingValue,
			isPhysical: isFadingPhysical(fadingValue, resonance)
		});
	}

	/** Sprite types list. */
	const spriteTypesList: SpriteType[] = ['Courier', 'Crack', 'Data', 'Fault', 'Machine', 'Paladin', 'Probe'];

	/** Common complex forms. */
	const complexForms = [
		'Analyze', 'Armor', 'Attack', 'Browse', 'Command', 'Decrypt', 'Defuse',
		'Edit', 'Encrypt', 'Exploit', 'Scan', 'Sniffer', 'Spoof', 'Stealth', 'Track'
	];
</script>

<div class="cw-card p-4">
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-text-primary font-medium">Technomancer</h3>
		<span class="text-xs text-secondary-dark py-1 px-2 bg-secondary-main/10 rounded">
			RES {resonance}
		</span>
	</div>

	<!-- Resonance Stats -->
	<div class="grid grid-cols-4 gap-2 mb-4 p-2 bg-surface-variant rounded text-center">
		<div>
			<div class="text-xs text-text-muted">Compiling</div>
			<div class="font-mono text-secondary-dark">{compilingPool}d6</div>
		</div>
		<div>
			<div class="text-xs text-text-muted">Register</div>
			<div class="font-mono text-secondary-dark">{registeringPool}d6</div>
		</div>
		<div>
			<div class="text-xs text-text-muted">Threading</div>
			<div class="font-mono text-info-main">{threadingPool}d6</div>
		</div>
		<div>
			<div class="text-xs text-text-muted">Fading</div>
			<div class="font-mono text-success-main">{fadingResistPool}d6</div>
		</div>
	</div>

	<!-- Sprite Compilation -->
	<div class="mb-4">
		<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Sprite Compilation</h4>

		<div class="grid grid-cols-2 gap-3 mb-3">
			<div>
				<label for="sprite-type" class="text-xs text-text-muted block mb-1">Sprite Type</label>
				<select
					id="sprite-type"
					class="cw-input text-sm w-full"
					bind:value={selectedSpriteType}
				>
					{#each spriteTypesList as spriteType}
						<option value={spriteType}>{SPRITE_TYPES[spriteType].name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="sprite-rating" class="text-xs text-text-muted block mb-1">Rating</label>
				<input
					id="sprite-rating"
					type="number"
					class="cw-input text-sm w-full"
					bind:value={spriteRating}
					min="1"
					max="12"
				/>
			</div>
		</div>

		<!-- Sprite Info -->
		<div class="p-2 bg-surface-variant rounded mb-3">
			<div class="text-sm text-text-secondary">{SPRITE_TYPES[selectedSpriteType].name}</div>
			<div class="text-xs text-text-muted mt-1">
				Abilities:
				{#each SPRITE_TYPES[selectedSpriteType].abilities as ability, i}
					<span class="text-secondary-dark">{ability.name}</span>{i < SPRITE_TYPES[selectedSpriteType].abilities.length - 1 ? ', ' : ''}
				{/each}
			</div>
		</div>

		<div class="flex items-center justify-between p-2 bg-surface-variant rounded mb-3">
			<div>
				<span class="text-sm text-text-secondary">Your Pool</span>
				<span class="font-mono text-secondary-dark ml-2">{compilingPool}d6</span>
			</div>
			<div>
				<span class="text-xs text-text-muted">Sprite Resists</span>
				<span class="font-mono text-warning-main ml-1">{calculateSpriteResistance(spriteRating)}d6</span>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				class="cw-btn text-xs"
				on:click={handleCompiling}
			>
				Compile Sprite
			</button>
			<button
				type="button"
				class="cw-btn text-xs"
				on:click={handleRegistering}
			>
				Register Sprite
			</button>
		</div>

		<p class="text-xs text-text-muted mt-2">
			Fading: (Rating x 2) - RES = {calculateFadingValue(spriteRating, resonance)}
			{#if isFadingPhysical(calculateFadingValue(spriteRating, resonance), resonance)}
				<span class="text-error-main">(Physical!)</span>
			{:else}
				<span class="text-warning-main">(Stun)</span>
			{/if}
		</p>
	</div>

	<!-- Threading -->
	<div class="border-t border-border pt-3 mb-4">
		<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Threading Complex Forms</h4>

		<div class="grid grid-cols-2 gap-3 mb-3">
			<div>
				<label for="complex-form" class="text-xs text-text-muted block mb-1">Complex Form</label>
				<select
					id="complex-form"
					class="cw-input text-sm w-full"
					bind:value={formName}
				>
					{#each complexForms as form}
						<option value={form}>{form}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="form-rating" class="text-xs text-text-muted block mb-1">Target Rating</label>
				<input
					id="form-rating"
					type="number"
					class="cw-input text-sm w-full"
					bind:value={formRating}
					min="1"
					max="12"
				/>
			</div>
		</div>

		<div class="flex items-center justify-between p-2 bg-surface-variant rounded mb-3">
			<div>
				<span class="text-sm text-text-secondary">Threading Pool</span>
				<span class="font-mono text-info-main ml-2">{threadingPool}d6</span>
			</div>
			<div>
				<span class="text-xs text-text-muted">Fading Value</span>
				<span class="font-mono {fadingIsPhysical ? 'text-error-main' : 'text-warning-main'} ml-1">
					{currentFading} {fadingIsPhysical ? '(P)' : '(S)'}
				</span>
			</div>
		</div>

		<button
			type="button"
			class="cw-btn text-xs w-full"
			on:click={handleThreading}
		>
			Thread {formName}
		</button>

		<p class="text-xs text-text-muted mt-2">
			Each hit increases form's effective rating by 1.
			{#if formRating > resonance}
				<span class="text-error-main">Warning: Threading above RES causes Physical fading!</span>
			{/if}
		</p>
	</div>

	<!-- Fading Resistance -->
	<div class="border-t border-border pt-3">
		<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Fading Resistance</h4>

		<div class="flex items-center justify-between p-2 bg-surface-variant rounded mb-3">
			<div>
				<span class="text-sm text-text-secondary">Resist Pool (RES + WIL)</span>
				<span class="font-mono text-success-main ml-2">{fadingResistPool}d6</span>
			</div>
		</div>

		<div class="grid grid-cols-3 gap-2">
			<button
				type="button"
				class="cw-btn cw-btn-secondary text-xs"
				on:click={() => handleFadingResist(2)}
			>
				Resist 2
			</button>
			<button
				type="button"
				class="cw-btn cw-btn-secondary text-xs"
				on:click={() => handleFadingResist(currentFading)}
			>
				Resist {currentFading}
			</button>
			<button
				type="button"
				class="cw-btn cw-btn-secondary text-xs"
				on:click={() => handleFadingResist(calculateFadingValue(spriteRating, resonance))}
			>
				Resist Sprite
			</button>
		</div>

		<p class="text-xs text-text-muted mt-2">
			Fading &gt; RES ({resonance}) = Physical damage. Each unresisted hit = 1 box.
		</p>
	</div>

	<!-- Registered Sprites (placeholder for actual sprite tracking) -->
	<div class="border-t border-border pt-3 mt-4">
		<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Quick Reference</h4>
		<div class="text-xs text-text-muted space-y-1">
			<p><span class="text-text-secondary">Tasks from Compiling:</span> Net hits</p>
			<p><span class="text-text-secondary">Services from Registering:</span> Net hits</p>
			<p><span class="text-text-secondary">Threading Duration:</span> Sustaining penalty (-2 per form)</p>
		</div>
	</div>
</div>
