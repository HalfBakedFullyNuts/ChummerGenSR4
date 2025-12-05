<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		COMBAT_MODIFIERS,
		CALLED_SHOTS,
		calculateCombatModifier,
		type CombatModifier,
		type CalledShot
	} from '$lib/utils/dice';

	/** Whether the weapon is ranged. */
	export let isRanged = true;

	/** Current total modifier to display. */
	export let totalModifier = 0;

	/** Dispatch events. */
	const dispatch = createEventDispatcher<{
		modifierChanged: { total: number; modifiers: string[]; calledShot: string | null };
	}>();

	/** Selected modifier keys. */
	let selectedModifiers: string[] = [];

	/** Selected called shot. */
	let selectedCalledShot: string | null = null;

	/** Group modifiers by category. */
	function getModifiersByCategory(category: CombatModifier['category']): [string, CombatModifier][] {
		return Object.entries(COMBAT_MODIFIERS).filter(([_, mod]) => mod.category === category);
	}

	/** Get applicable called shots. */
	function getApplicableCalledShots(): [string, CalledShot][] {
		return Object.entries(CALLED_SHOTS).filter(([_, shot]) => {
			if (shot.requiresRanged && !isRanged) return false;
			if (shot.requiresMelee && isRanged) return false;
			return true;
		});
	}

	/** Toggle a modifier. */
	function toggleModifier(key: string): void {
		if (selectedModifiers.includes(key)) {
			selectedModifiers = selectedModifiers.filter(m => m !== key);
		} else {
			selectedModifiers = [...selectedModifiers, key];
		}
		updateTotal();
	}

	/** Select a called shot. */
	function selectCalledShot(key: string | null): void {
		selectedCalledShot = selectedCalledShot === key ? null : key;
		updateTotal();
	}

	/** Clear all selections. */
	function clearAll(): void {
		selectedModifiers = [];
		selectedCalledShot = null;
		updateTotal();
	}

	/** Update and emit total. */
	function updateTotal(): void {
		totalModifier = calculateCombatModifier(selectedModifiers, selectedCalledShot || undefined);
		dispatch('modifierChanged', {
			total: totalModifier,
			modifiers: selectedModifiers,
			calledShot: selectedCalledShot
		});
	}

	/** Modifier categories. */
	const categories: { key: CombatModifier['category']; label: string }[] = [
		{ key: 'visibility', label: 'Visibility' },
		{ key: 'range', label: 'Range' },
		{ key: 'cover', label: 'Cover' },
		{ key: 'position', label: 'Position' }
	];
</script>

<div class="cw-card p-4">
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-text-primary font-medium">Combat Modifiers</h3>
		<div class="flex items-center gap-3">
			<div class="text-sm">
				<span class="text-text-muted">Total:</span>
				<span class="font-mono font-bold {totalModifier < 0 ? 'text-error-main' : totalModifier > 0 ? 'text-success-main' : 'text-text-primary'}">
					{totalModifier >= 0 ? '+' : ''}{totalModifier}
				</span>
			</div>
			{#if selectedModifiers.length > 0 || selectedCalledShot}
				<button class="cw-btn text-xs" on:click={clearAll}>Clear</button>
			{/if}
		</div>
	</div>

	<!-- Modifier Categories -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
		{#each categories as cat}
			<div class="space-y-1">
				<h4 class="text-xs text-text-muted uppercase tracking-wide">{cat.label}</h4>
				{#each getModifiersByCategory(cat.key) as [key, mod]}
					<button
						type="button"
						class="w-full text-left text-xs py-1 px-2 rounded transition-colors
							{selectedModifiers.includes(key)
								? 'bg-primary-main/20 text-primary-dark border border-primary-main/50'
								: 'bg-surface-variant text-text-secondary hover:bg-surface'}"
						on:click={() => toggleModifier(key)}
						title={mod.description}
					>
						<span class="truncate">{mod.name}</span>
						<span class="float-right font-mono {mod.modifier < 0 ? 'text-error-main' : 'text-success-main'}">
							{mod.modifier >= 0 ? '+' : ''}{mod.modifier}
						</span>
					</button>
				{/each}
			</div>
		{/each}
	</div>

	<!-- Called Shots -->
	<div class="border-t border-border pt-3">
		<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Called Shots</h4>
		<div class="flex flex-wrap gap-2">
			{#each getApplicableCalledShots() as [key, shot]}
				<button
					type="button"
					class="text-xs py-1 px-2 rounded transition-colors
						{selectedCalledShot === key
							? 'bg-warning-main/20 text-warning-main border border-warning-main/50'
							: 'bg-surface-variant text-text-secondary hover:bg-surface'}"
					on:click={() => selectCalledShot(key)}
					title={shot.effect}
				>
					{shot.name}
					<span class="font-mono text-error-main ml-1">{shot.modifier}</span>
				</button>
			{/each}
		</div>
		{#if selectedCalledShot}
			<p class="text-xs text-secondary-dark mt-2">
				Effect: {CALLED_SHOTS[selectedCalledShot].effect}
			</p>
		{/if}
	</div>

	<!-- Active Modifiers Summary -->
	{#if selectedModifiers.length > 0 || selectedCalledShot}
		<div class="mt-3 pt-3 border-t border-border">
			<div class="text-xs text-text-muted">
				Active:
				{#each selectedModifiers as mod, i}
					<span class="text-text-secondary">{COMBAT_MODIFIERS[mod].name}</span>{i < selectedModifiers.length - 1 ? ', ' : ''}
				{/each}
				{#if selectedCalledShot}
					{selectedModifiers.length > 0 ? ', ' : ''}
					<span class="text-warning-main">{CALLED_SHOTS[selectedCalledShot].name}</span>
				{/if}
			</div>
		</div>
	{/if}
</div>
