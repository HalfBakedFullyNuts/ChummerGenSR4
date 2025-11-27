<script lang="ts">
	import { traditions, spells, powers, type GameSpell, type GamePower } from '$stores/gamedata';
	import {
		character,
		magicType,
		initializeMagic,
		setTradition,
		addSpell,
		removeSpell,
		addPower,
		removePower
	} from '$stores/character';

	/** Currently active tab for magicians. */
	let activeTab: 'tradition' | 'spells' | 'powers' = 'tradition';

	/** Spell category filter. */
	let spellCategory = 'Combat';

	/** Spell search query. */
	let spellSearch = '';

	/** Power search query. */
	let powerSearch = '';

	/** Get unique spell categories. */
	function getSpellCategories(allSpells: readonly GameSpell[]): string[] {
		const cats = new Set(allSpells.map((s) => s.category));
		return Array.from(cats).sort();
	}

	/** Filter spells by category and search. */
	function filterSpells(
		allSpells: readonly GameSpell[],
		category: string,
		search: string
	): GameSpell[] {
		return allSpells.filter((s) => {
			const matchesCat = s.category === category;
			const matchesSearch =
				search === '' || s.name.toLowerCase().includes(search.toLowerCase());
			return matchesCat && matchesSearch;
		});
	}

	/** Filter powers by search. */
	function filterPowers(allPowers: readonly GamePower[], search: string): GamePower[] {
		if (!search) return [...allPowers];
		const lower = search.toLowerCase();
		return allPowers.filter((p) => p.name.toLowerCase().includes(lower));
	}

	/** Check if spell is already learned. */
	function hasSpell(name: string): boolean {
		return $character?.magic?.spells.some((s) => s.name === name) ?? false;
	}

	/** Check if power is already taken. */
	function hasPower(name: string): boolean {
		return $character?.magic?.powers.some((p) => p.name === name) ?? false;
	}

	/** Handle tradition selection. */
	function selectTradition(name: string): void {
		if (!$character?.magic) {
			initializeMagic(name);
		} else {
			setTradition(name);
		}
	}

	/** Handle spell toggle. */
	function toggleSpell(spell: GameSpell): void {
		if (hasSpell(spell.name)) {
			const charSpell = $character?.magic?.spells.find((s) => s.name === spell.name);
			if (charSpell) removeSpell(charSpell.id);
		} else {
			addSpell({
				name: spell.name,
				category: spell.category,
				type: spell.type,
				range: spell.range,
				damage: spell.damage,
				duration: spell.duration,
				dv: spell.dv
			});
		}
	}

	/** Handle power toggle. */
	function togglePower(power: GamePower): void {
		if (hasPower(power.name)) {
			const charPower = $character?.magic?.powers.find((p) => p.name === power.name);
			if (charPower) removePower(charPower.id);
		} else {
			addPower({
				name: power.name,
				points: power.points,
				level: power.levels ? 1 : 0
			});
		}
	}

	$: spellCategories = $spells ? getSpellCategories($spells) : [];
	$: filteredSpells = $spells ? filterSpells($spells, spellCategory, spellSearch) : [];
	$: filteredPowers = $powers ? filterPowers($powers, powerSearch) : [];
	$: selectedTradition = $character?.magic?.tradition ?? null;
	$: spellCount = $character?.magic?.spells.length ?? 0;
	$: spellBP = spellCount * 5;
	$: powerPointsUsed = $character?.magic?.powerPointsUsed ?? 0;
	$: powerPointsTotal = $character?.magic?.powerPoints ?? 0;
	$: canHaveSpells = $magicType === 'magician' || $magicType === 'mystic_adept' || $magicType === 'aspected';
	$: canHavePowers = $magicType === 'adept' || $magicType === 'mystic_adept';
</script>

<div class="space-y-6">
	{#if $magicType === 'mundane'}
		<!-- Mundane Character -->
		<div class="cw-card text-center py-8">
			<h2 class="text-xl text-accent-primary mb-4">Mundane Character</h2>
			<p class="text-secondary-text mb-4">
				You haven't selected any magical or technomancer qualities.
			</p>
			<p class="text-muted-text text-sm">
				Go back to the Qualities step to add Magician, Adept, Mystic Adept, or Technomancer
				if you want magical abilities.
			</p>
			<p class="text-accent-cyan mt-4">
				You can skip this step.
			</p>
		</div>
	{:else if $magicType === 'technomancer'}
		<!-- Technomancer -->
		<div class="cw-card">
			<h2 class="cw-card-header">Technomancer</h2>
			<p class="text-secondary-text mb-4">
				Technomancer configuration coming soon. You can proceed for now.
			</p>
		</div>
	{:else}
		<!-- Awakened Character (Magician, Adept, Mystic Adept, Aspected) -->
		<div class="cw-panel p-4">
			<div class="flex items-center justify-between">
				<div>
					<span class="text-accent-primary font-medium capitalize">
						{$magicType.replace('_', ' ')}
					</span>
					<span class="text-muted-text text-sm ml-2">
						Magic: {$character?.attributes.mag?.base ?? 0}
					</span>
				</div>
				<div class="flex gap-4">
					{#if canHaveSpells}
						<span class="text-secondary-text">
							Spells: <span class="text-accent-primary">{spellCount}</span>
							<span class="text-muted-text">({spellBP} BP)</span>
						</span>
					{/if}
					{#if canHavePowers}
						<span class="text-secondary-text">
							Powers: <span class="text-accent-cyan">{powerPointsUsed.toFixed(2)}</span>
							<span class="text-muted-text">/ {powerPointsTotal} PP</span>
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Tab Navigation -->
		<div class="flex gap-1">
			<button
				class="px-4 py-2 rounded transition-colors
					{activeTab === 'tradition'
						? 'bg-accent-primary text-background'
						: 'bg-surface text-secondary-text hover:bg-surface-light'}"
				on:click={() => (activeTab = 'tradition')}
			>
				Tradition
			</button>
			{#if canHaveSpells}
				<button
					class="px-4 py-2 rounded transition-colors
						{activeTab === 'spells'
							? 'bg-accent-primary text-background'
							: 'bg-surface text-secondary-text hover:bg-surface-light'}"
					on:click={() => (activeTab = 'spells')}
				>
					Spells ({spellCount})
				</button>
			{/if}
			{#if canHavePowers}
				<button
					class="px-4 py-2 rounded transition-colors
						{activeTab === 'powers'
							? 'bg-accent-cyan text-background'
							: 'bg-surface text-secondary-text hover:bg-surface-light'}"
					on:click={() => (activeTab = 'powers')}
				>
					Powers
				</button>
			{/if}
		</div>

		<!-- Tradition Tab -->
		{#if activeTab === 'tradition'}
			<div class="cw-card">
				<h3 class="cw-card-header mb-4">Select Tradition</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{#each $traditions ?? [] as tradition}
						{@const isSelected = selectedTradition === tradition.name}
						<button
							class="p-3 rounded text-left transition-all
								{isSelected
									? 'bg-accent-primary/20 border border-accent-primary'
									: 'bg-surface hover:bg-surface-light border border-transparent'}"
							on:click={() => selectTradition(tradition.name)}
						>
							<div class="font-medium text-primary-text">
								{tradition.name}
							</div>
							<div class="text-muted-text text-xs mt-1">
								Drain: {tradition.drain}
							</div>
							<div class="text-secondary-text text-xs mt-1 line-clamp-1">
								{tradition.spirits.slice(0, 3).join(', ')}...
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Spells Tab -->
		{#if activeTab === 'spells' && canHaveSpells}
			<div class="space-y-4">
				<!-- Selected Spells -->
				{#if $character?.magic?.spells.length}
					<div class="cw-card">
						<h3 class="cw-card-header mb-3">Learned Spells</h3>
						<div class="flex flex-wrap gap-2">
							{#each $character.magic.spells as spell}
								<button
									class="px-3 py-1 rounded bg-accent-purple/20 text-accent-purple
										border border-accent-purple/30 text-sm flex items-center gap-2"
									on:click={() => removeSpell(spell.id)}
								>
									{spell.name}
									<span class="text-xs opacity-50">×</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Filters -->
				<div class="flex flex-wrap gap-4">
					<div class="flex gap-1 overflow-x-auto">
						{#each spellCategories as cat}
							<button
								class="px-3 py-1 rounded text-sm whitespace-nowrap transition-colors
									{spellCategory === cat
										? 'bg-accent-purple text-background'
										: 'bg-surface text-secondary-text hover:bg-surface-light'}"
								on:click={() => (spellCategory = cat)}
							>
								{cat}
							</button>
						{/each}
					</div>
					<input
						type="text"
						placeholder="Search spells..."
						class="cw-input flex-1 min-w-[200px]"
						bind:value={spellSearch}
					/>
				</div>

				<!-- Spell List -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
					{#each filteredSpells as spell}
						{@const selected = hasSpell(spell.name)}
						<button
							class="p-3 rounded text-left transition-all
								{selected
									? 'bg-accent-purple/20 border border-accent-purple'
									: 'bg-surface hover:bg-surface-light border border-transparent'}"
							on:click={() => toggleSpell(spell)}
						>
							<div class="flex items-center justify-between">
								<span class="font-medium {selected ? 'text-accent-purple' : 'text-primary-text'}">
									{spell.name}
								</span>
								<span class="cw-badge cw-badge-ghost text-xs">{spell.type}</span>
							</div>
							<div class="text-muted-text text-xs mt-1">
								{spell.range} • {spell.duration} • DV: {spell.dv}
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Powers Tab -->
		{#if activeTab === 'powers' && canHavePowers}
			<div class="space-y-4">
				<!-- Selected Powers -->
				{#if $character?.magic?.powers.length}
					<div class="cw-card">
						<h3 class="cw-card-header mb-3">Active Powers</h3>
						<div class="flex flex-wrap gap-2">
							{#each $character.magic.powers as power}
								<button
									class="px-3 py-1 rounded bg-accent-cyan/20 text-accent-cyan
										border border-accent-cyan/30 text-sm flex items-center gap-2"
									on:click={() => removePower(power.id)}
								>
									{power.name}
									<span class="opacity-70">{power.points} PP</span>
									<span class="text-xs opacity-50">×</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Power Point Bar -->
				<div class="cw-panel p-3">
					<div class="flex items-center justify-between mb-2">
						<span class="text-secondary-text">Power Points</span>
						<span class="font-mono text-accent-cyan">
							{powerPointsUsed.toFixed(2)} / {powerPointsTotal}
						</span>
					</div>
					<div class="w-full bg-surface rounded-full h-2">
						<div
							class="bg-accent-cyan h-2 rounded-full transition-all"
							style="width: {Math.min((powerPointsUsed / powerPointsTotal) * 100, 100)}%"
						></div>
					</div>
				</div>

				<!-- Search -->
				<input
					type="text"
					placeholder="Search powers..."
					class="cw-input w-full"
					bind:value={powerSearch}
				/>

				<!-- Power List -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
					{#each filteredPowers as power}
						{@const selected = hasPower(power.name)}
						{@const canAfford = powerPointsUsed + power.points <= powerPointsTotal}
						<button
							class="p-3 rounded text-left transition-all
								{selected
									? 'bg-accent-cyan/20 border border-accent-cyan'
									: canAfford
										? 'bg-surface hover:bg-surface-light border border-transparent'
										: 'bg-surface opacity-50 border border-transparent cursor-not-allowed'}"
							on:click={() => (selected || canAfford) && togglePower(power)}
							disabled={!selected && !canAfford}
						>
							<div class="flex items-center justify-between">
								<span class="font-medium {selected ? 'text-accent-cyan' : 'text-primary-text'}">
									{power.name}
								</span>
								<span class="cw-badge cw-badge-primary text-xs">
									{power.points} PP
								</span>
							</div>
							<div class="text-muted-text text-xs mt-1">
								{power.levels ? 'Has Levels' : 'Single Level'}
								{#if power.action}
									• {power.action}
								{/if}
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
