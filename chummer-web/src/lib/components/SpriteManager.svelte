<script lang="ts">
	/**
	 * Sprite Manager Component
	 * ========================
	 * Manages compiled and registered sprites for technomancers.
	 */

	import {
		character,
		addSprite,
		removeSprite,
		useSpriteTask,
		updateSpriteTasks
	} from '$stores/character';
	import { SPRITE_TYPES, type SpriteType, type SpriteAbility } from '$lib/utils/dice';

	/** Error message. */
	let error = '';

	/** Selected sprite type for compilation. */
	let selectedType: SpriteType = 'Crack';

	/** Selected rating. */
	let selectedRating = 4;

	/** Number of tasks. */
	let selectedTasks = 1;

	/** Whether registering. */
	let registering = false;

	/** Sprite type keys. */
	const spriteTypeKeys: SpriteType[] = ['Courier', 'Crack', 'Data', 'Fault', 'Machine', 'Paladin', 'Probe'];

	/** Add a compiled sprite. */
	function handleCompile(): void {
		error = '';

		const result = addSprite(selectedType, selectedRating, selectedTasks, registering);
		if (!result.success) {
			error = result.error || 'Failed to compile sprite';
		} else {
			/* Reset for next */
			selectedTasks = 1;
			registering = false;
		}
	}

	/** Use a task from a sprite. */
	function handleUseTask(spriteId: string): void {
		const result = useSpriteTask(spriteId);
		if (!result.success) {
			error = result.error || 'Failed to use task';
		}
	}

	/** Decompile a sprite. */
	function handleDecompile(spriteId: string): void {
		removeSprite(spriteId);
	}

	/** Update sprite tasks. */
	function handleAddTasks(spriteId: string, current: number): void {
		const newTasks = prompt('Enter new task total:', String(current));
		if (newTasks !== null) {
			const num = parseInt(newTasks, 10);
			if (!isNaN(num) && num >= 0) {
				updateSpriteTasks(spriteId, num);
			}
		}
	}

	/** Get sprite type info safely. */
	function getSpriteInfo(type: string): { name: string; abilities: SpriteAbility[] } | undefined {
		return SPRITE_TYPES[type as SpriteType];
	}

	$: sprites = $character?.resonance?.sprites ?? [];
	$: resonanceRating = $character?.attributes.res?.base ?? 0;
</script>

<div class="space-y-4">
	<h3 class="text-lg font-medium text-accent-cyan">Compiled Sprites</h3>

	<!-- Current Sprites List -->
	{#if sprites.length > 0}
		<div class="space-y-2">
			{#each sprites as sprite}
				{@const spriteInfo = getSpriteInfo(sprite.type)}
				<div
					class="cw-panel p-3 flex items-center justify-between
						{sprite.registered ? 'border-accent-cyan/50' : 'border-accent-warning/50'}"
				>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<span class="font-medium text-primary-text">{spriteInfo?.name || sprite.type}</span>
							<span class="cw-badge text-xs {sprite.registered ? 'cw-badge-primary' : 'cw-badge-warning'}">
								{sprite.registered ? 'Registered' : 'Compiled'}
							</span>
						</div>
						<div class="flex items-center gap-4 text-xs text-muted-text mt-1">
							<span>Rating {sprite.rating}</span>
							<span class="text-accent-cyan">
								{sprite.tasks} task{sprite.tasks !== 1 ? 's' : ''} remaining
							</span>
						</div>
						{#if spriteInfo}
							<div class="text-xs text-muted-text mt-1">
								Abilities: {spriteInfo.abilities.map(a => a.name).join(', ')}
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<button
							class="cw-btn cw-btn-secondary text-xs"
							disabled={sprite.tasks <= 0}
							on:click={() => handleUseTask(sprite.id)}
							title="Use one task"
						>
							Use
						</button>
						{#if sprite.registered}
							<button
								class="cw-btn text-xs"
								on:click={() => handleAddTasks(sprite.id, sprite.tasks)}
								title="Add tasks (after additional compiling)"
							>
								+Task
							</button>
						{/if}
						<button
							class="cw-btn cw-btn-danger text-xs"
							on:click={() => handleDecompile(sprite.id)}
							title="Decompile sprite"
						>
							Decompile
						</button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-muted-text text-sm">No sprites compiled or registered.</p>
	{/if}

	<!-- Compile New Sprite -->
	<div class="cw-card">
		<h4 class="cw-card-header mb-3">Compile Sprite</h4>

		{#if error}
			<div class="text-accent-danger text-sm mb-3">{error}</div>
		{/if}

		<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
			<div>
				<label class="text-xs text-muted-text block mb-1" for="sprite-type">Sprite Type</label>
				<select id="sprite-type" class="cw-input text-sm w-full" bind:value={selectedType}>
					{#each spriteTypeKeys as spriteType}
						<option value={spriteType}>{SPRITE_TYPES[spriteType].name}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="text-xs text-muted-text block mb-1" for="sprite-rating">Rating</label>
				<input
					id="sprite-rating"
					type="number"
					class="cw-input text-sm w-full"
					bind:value={selectedRating}
					min="1"
					max="12"
				/>
			</div>
			<div>
				<label class="text-xs text-muted-text block mb-1" for="sprite-tasks">Tasks</label>
				<input
					id="sprite-tasks"
					type="number"
					class="cw-input text-sm w-full"
					bind:value={selectedTasks}
					min="0"
					max="20"
				/>
			</div>
			<div class="flex items-end">
				<label class="flex items-center gap-2 cursor-pointer py-2">
					<input
						type="checkbox"
						class="w-4 h-4 accent-accent-cyan"
						bind:checked={registering}
					/>
					<span class="text-sm text-secondary-text">Registering</span>
				</label>
			</div>
		</div>

		<!-- Sprite Info -->
		<div class="p-2 bg-surface-light rounded mb-4">
			<div class="text-sm text-secondary-text">{SPRITE_TYPES[selectedType].name}</div>
			<div class="text-xs text-muted-text mt-1">
				Abilities:
				{#each SPRITE_TYPES[selectedType].abilities as ability, i}
					<span class="text-accent-cyan">{ability.name}</span>{i < SPRITE_TYPES[selectedType].abilities.length - 1 ? ', ' : ''}
				{/each}
			</div>
		</div>

		{#if selectedRating > resonanceRating}
			<p class="text-accent-warning text-xs mb-3">
				Warning: Rating exceeds Resonance ({resonanceRating}). Fading will be Physical!
			</p>
		{/if}

		<button class="cw-btn w-full" on:click={handleCompile}>
			{registering ? 'Register' : 'Compile'} {SPRITE_TYPES[selectedType].name}
		</button>

		<p class="text-muted-text text-xs mt-2">
			Compiling: RES + Compiling vs Rating. Net hits = tasks.
			{#if registering}
				Registering: RES + Registering vs Rating × 2.
			{/if}
		</p>
	</div>
</div>
