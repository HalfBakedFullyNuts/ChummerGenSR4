<script lang="ts">
	import {
		traditions,
		mentors,
		spells,
		powers,
		programs,
		programCategories,
		streams,
		type GameSpell,
		type GamePower,
		type GameProgram,
		type GameStream
	} from '$stores/gamedata';
	import {
		character,
		magicType,
		initializeMagic,
		setTradition,
		setMentor,
		addSpell,
		removeSpell,
		addPower,
		removePower,
		initializeResonance,
		addComplexForm,
		removeComplexForm
	} from '$stores/character';

	/** Currently active tab for magicians. */
	let activeTab: 'tradition' | 'spells' | 'powers' = 'tradition';

	/** Currently active tab for technomancers. */
	let techTab: 'stream' | 'forms' = 'stream';

	/** Complex form category filter. */
	let formCategory = 'Common Use';

	/** Complex form search query. */
	let formSearch = '';

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

	/** Handle stream selection for technomancer. */
	function selectStream(name: string): void {
		if (!$character?.resonance) {
			initializeResonance(name);
		}
		/* Stream is set during initialization */
	}

	/** Filter complex forms by category and search. */
	function filterForms(
		allPrograms: readonly GameProgram[],
		category: string,
		search: string
	): GameProgram[] {
		return allPrograms.filter((p) => {
			const matchesCat = category === 'All' || p.category === category;
			const matchesSearch =
				search === '' || p.name.toLowerCase().includes(search.toLowerCase());
			return matchesCat && matchesSearch;
		});
	}

	/** Check if complex form is already learned. */
	function hasComplexForm(name: string): boolean {
		return $character?.resonance?.complexForms.some((f) => f.name === name) ?? false;
	}

	/** Handle complex form toggle. */
	function toggleComplexForm(program: GameProgram): void {
		if (hasComplexForm(program.name)) {
			const form = $character?.resonance?.complexForms.find((f) => f.name === program.name);
			if (form) removeComplexForm(form.id);
		} else {
			/* Convert program to complex form with default values */
			addComplexForm({
				name: program.name,
				target: 'Self', /* Default - most forms target self or device */
				duration: 'Sustained', /* Default for most complex forms */
				fv: 'Rating' /* Default fading value */
			});
		}
	}

	$: spellCategories = $spells ? getSpellCategories($spells) : [];
	$: filteredSpells = $spells ? filterSpells($spells, spellCategory, spellSearch) : [];
	$: filteredPowers = $powers ? filterPowers($powers, powerSearch) : [];
	$: selectedTradition = $character?.magic?.tradition ?? null;
	$: selectedMentor = $character?.magic?.mentor ?? null;
	$: selectedMentorData = selectedMentor ? $mentors?.find((m) => m.name === selectedMentor) ?? null : null;
	$: spellCount = $character?.magic?.spells.length ?? 0;
	$: spellBP = spellCount * 5;
	$: powerPointsUsed = $character?.magic?.powerPointsUsed ?? 0;
	$: powerPointsTotal = $character?.magic?.powerPoints ?? 0;
	$: canHaveSpells = $magicType === 'magician' || $magicType === 'mystic_adept' || $magicType === 'aspected';
	$: canHavePowers = $magicType === 'adept' || $magicType === 'mystic_adept';

	/** Mentor spirit search. */
	let mentorSearch = '';

	/** Filter mentors by search. */
	$: filteredMentors = ($mentors ?? []).filter(
		(m) => !mentorSearch || m.name.toLowerCase().includes(mentorSearch.toLowerCase())
	);

	/* Technomancer reactive statements */
	$: filteredForms = $programs ? filterForms($programs, formCategory, formSearch) : [];
	$: selectedStream = $character?.resonance?.stream ?? null;
	$: formCount = $character?.resonance?.complexForms.length ?? 0;
	$: formBP = formCount * 5;
	$: resonanceAttr = $character?.attributes.res?.base ?? 0;
</script>

<div class="space-y-6">
	{#if $magicType === 'mundane'}
		<!-- Mundane Character -->
		<div class="cw-card text-center py-8">
			<h2 class="text-xl text-primary-dark mb-4">Mundane Character</h2>
			<p class="text-text-secondary mb-4">
				You haven't selected any magical or technomancer qualities.
			</p>
			<p class="text-text-muted text-sm">
				Go back to the Qualities step to add Magician, Adept, Mystic Adept, or Technomancer
				if you want magical abilities.
			</p>
			<p class="text-primary-dark mt-4">
				You can skip this step.
			</p>
		</div>
	{:else if $magicType === 'technomancer'}
		<!-- Technomancer -->
		<div class="cw-panel p-4">
			<div class="flex items-center justify-between">
				<div>
					<span class="text-primary-dark font-medium">Technomancer</span>
					<span class="text-text-muted text-sm ml-2">
						Resonance: {resonanceAttr}
					</span>
				</div>
				<div class="flex gap-4">
					<span class="text-text-secondary">
						Complex Forms: <span class="text-primary-dark">{formCount}</span>
						<span class="text-text-muted">({formBP} BP)</span>
					</span>
				</div>
			</div>
		</div>

		<!-- Tab Navigation -->
		<div class="flex gap-1">
			<button
				class="px-4 py-2 rounded transition-colors
					{techTab === 'stream'
						? 'bg-primary-main text-white'
						: 'bg-surface text-text-secondary hover:bg-surface-variant'}"
				on:click={() => (techTab = 'stream')}
			>
				Stream
			</button>
			<button
				class="px-4 py-2 rounded transition-colors
					{techTab === 'forms'
						? 'bg-primary-main text-white'
						: 'bg-surface text-text-secondary hover:bg-surface-variant'}"
				on:click={() => (techTab = 'forms')}
			>
				Complex Forms ({formCount})
			</button>
		</div>

		<!-- Stream Tab -->
		{#if techTab === 'stream'}
			<div class="cw-card">
				<h3 class="cw-card-header mb-4">Select Stream</h3>
				<p class="text-text-muted text-sm mb-4">
					Your stream defines your approach to the Resonance and influences your abilities.
				</p>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
					{#each $streams ?? [] as stream}
						{@const isSelected = selectedStream === stream.name}
						<button
							class="p-3 rounded text-left transition-all
								{isSelected
									? 'bg-primary-main/20 border border-primary-dark'
									: 'bg-surface hover:bg-surface-variant border border-transparent'}"
							on:click={() => selectStream(stream.name)}
						>
							<div class="font-medium text-text-primary">
								{stream.name}
							</div>
							<div class="text-text-muted text-xs mt-1">
								Drain: {stream.drain}
							</div>
							<div class="text-text-secondary text-xs mt-1 line-clamp-1">
								Sprites: {stream.sprites.slice(0, 3).join(', ')}{stream.sprites.length > 3 ? '...' : ''}
							</div>
							<div class="text-text-muted text-xs mt-1">
								{stream.source} p.{stream.page}
							</div>
						</button>
					{/each}
				</div>
				{#if !$streams?.length}
					<div class="text-center text-text-muted py-4">
						Loading streams data...
					</div>
				{/if}
			</div>
		{/if}

		<!-- Complex Forms Tab -->
		{#if techTab === 'forms'}
			<div class="space-y-4">
				<!-- Selected Complex Forms -->
				{#if $character?.resonance?.complexForms.length}
					<div class="cw-card">
						<h3 class="cw-card-header mb-3">Compiled Forms</h3>
						<div class="flex flex-wrap gap-2">
							{#each $character.resonance.complexForms as form}
								<button
									class="px-3 py-1 rounded bg-primary-main/20 text-primary-dark
										border border-primary-dark/30 text-sm flex items-center gap-2"
									on:click={() => removeComplexForm(form.id)}
								>
									{form.name}
									<span class="text-xs opacity-50">×</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Category Filters -->
				<div class="flex flex-wrap gap-4">
					<div class="flex gap-1 overflow-x-auto">
						<button
							class="px-3 py-1 rounded text-sm whitespace-nowrap transition-colors
								{formCategory === 'All'
									? 'bg-primary-main text-white'
									: 'bg-surface text-text-secondary hover:bg-surface-variant'}"
							on:click={() => (formCategory = 'All')}
						>
							All
						</button>
						{#each $programCategories ?? [] as cat}
							<button
								class="px-3 py-1 rounded text-sm whitespace-nowrap transition-colors
									{formCategory === cat
										? 'bg-primary-main text-white'
										: 'bg-surface text-text-secondary hover:bg-surface-variant'}"
								on:click={() => (formCategory = cat)}
							>
								{cat}
							</button>
						{/each}
					</div>
					<input
						type="text"
						placeholder="Search forms..."
						class="cw-input flex-1 min-w-[200px]"
						bind:value={formSearch}
					/>
				</div>

				<!-- Complex Form List -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
					{#each filteredForms as program}
						{@const selected = hasComplexForm(program.name)}
						<button
							class="p-3 rounded text-left transition-all
								{selected
									? 'bg-primary-main/20 border border-primary-dark'
									: 'bg-surface hover:bg-surface-variant border border-transparent'}"
							on:click={() => toggleComplexForm(program)}
						>
							<div class="flex items-center justify-between">
								<span class="font-medium {selected ? 'text-primary-dark' : 'text-text-primary'}">
									{program.name}
								</span>
								<span class="cw-badge cw-badge-ghost text-xs">{program.category}</span>
							</div>
							<div class="text-text-muted text-xs mt-1">
								{program.source} p.{program.page}
							</div>
						</button>
					{/each}
				</div>

				{#if filteredForms.length === 0}
					<div class="text-center text-text-muted py-8">
						No complex forms match your filter.
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<!-- Awakened Character (Magician, Adept, Mystic Adept, Aspected) -->
		<div class="cw-panel p-4">
			<div class="flex items-center justify-between">
				<div>
					<span class="text-primary-dark font-medium capitalize">
						{$magicType.replace('_', ' ')}
					</span>
					<span class="text-text-muted text-sm ml-2">
						Magic: {$character?.attributes.mag?.base ?? 0}
					</span>
				</div>
				<div class="flex gap-4">
					{#if canHaveSpells}
						<span class="text-text-secondary">
							Spells: <span class="text-primary-dark">{spellCount}</span>
							<span class="text-text-muted">({spellBP} BP)</span>
						</span>
					{/if}
					{#if canHavePowers}
						<span class="text-text-secondary">
							Powers: <span class="text-primary-dark">{powerPointsUsed.toFixed(2)}</span>
							<span class="text-text-muted">/ {powerPointsTotal} PP</span>
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
						? 'bg-primary-main text-white'
						: 'bg-surface text-text-secondary hover:bg-surface-variant'}"
				on:click={() => (activeTab = 'tradition')}
			>
				Tradition
			</button>
			{#if canHaveSpells}
				<button
					class="px-4 py-2 rounded transition-colors
						{activeTab === 'spells'
							? 'bg-primary-main text-white'
							: 'bg-surface text-text-secondary hover:bg-surface-variant'}"
					on:click={() => (activeTab = 'spells')}
				>
					Spells ({spellCount})
				</button>
			{/if}
			{#if canHavePowers}
				<button
					class="px-4 py-2 rounded transition-colors
						{activeTab === 'powers'
							? 'bg-primary-main text-white'
							: 'bg-surface text-text-secondary hover:bg-surface-variant'}"
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
									? 'bg-primary-main/20 border border-primary-dark'
									: 'bg-surface hover:bg-surface-variant border border-transparent'}"
							on:click={() => selectTradition(tradition.name)}
						>
							<div class="font-medium text-text-primary">
								{tradition.name}
							</div>
							<div class="text-text-muted text-xs mt-1">
								Drain: {tradition.drain}
							</div>
							<div class="text-text-secondary text-xs mt-1 line-clamp-1">
								{tradition.spirits.slice(0, 3).join(', ')}...
							</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Mentor Spirit Section -->
			<div class="cw-card mt-4">
				<h3 class="cw-card-header mb-4">
					Mentor Spirit
					<span class="text-text-muted font-normal text-sm ml-2">(Optional, 5 BP)</span>
				</h3>
				<p class="text-text-secondary text-sm mb-4">
					A mentor spirit provides bonuses and disadvantages based on your relationship with a spiritual guide.
				</p>

				{#if selectedMentor}
					<div class="cw-panel p-3 mb-4 border-info-dark/50">
						<div class="flex items-center justify-between">
							<div>
								<span class="text-info-dark font-medium">{selectedMentor}</span>
								{#if selectedMentorData}
									<div class="text-text-secondary text-xs mt-1">
										<span class="text-primary-dark">Advantage:</span> {selectedMentorData.advantage}
									</div>
									<div class="text-text-secondary text-xs mt-1">
										<span class="text-error-dark">Disadvantage:</span> {selectedMentorData.disadvantage}
									</div>
								{/if}
							</div>
							<button
								class="cw-btn cw-btn-danger text-xs"
								on:click={() => setMentor(null)}
							>
								Remove
							</button>
						</div>
					</div>
				{/if}

				<div class="flex gap-2 mb-4">
					<input
						type="text"
						placeholder="Search mentor spirits..."
						class="cw-input flex-1"
						bind:value={mentorSearch}
					/>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
					{#each filteredMentors as mentor}
						{@const isSelected = selectedMentor === mentor.name}
						<button
							class="p-3 rounded text-left transition-all
								{isSelected
									? 'bg-info-main/20 border border-info-dark'
									: 'bg-surface hover:bg-surface-variant border border-transparent'}"
							on:click={() => setMentor(isSelected ? null : mentor.name)}
						>
							<div class="font-medium {isSelected ? 'text-info-dark' : 'text-text-primary'}">
								{mentor.name}
							</div>
							<div class="text-text-secondary text-xs mt-1 line-clamp-2">
								{mentor.advantage}
							</div>
							<div class="text-text-muted text-xs mt-1">
								{mentor.source} p.{mentor.page}
							</div>
						</button>
					{/each}
				</div>

				{#if filteredMentors.length === 0}
					<div class="text-center text-text-muted py-4">
						No mentor spirits match your search.
					</div>
				{/if}
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
									class="px-3 py-1 rounded bg-info-main/20 text-info-dark
										border border-info-dark/30 text-sm flex items-center gap-2"
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
										? 'bg-info-main text-white'
										: 'bg-surface text-text-secondary hover:bg-surface-variant'}"
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
									? 'bg-info-main/20 border border-info-dark'
									: 'bg-surface hover:bg-surface-variant border border-transparent'}"
							on:click={() => toggleSpell(spell)}
						>
							<div class="flex items-center justify-between">
								<span class="font-medium {selected ? 'text-info-dark' : 'text-text-primary'}">
									{spell.name}
								</span>
								<span class="cw-badge cw-badge-ghost text-xs">{spell.type}</span>
							</div>
							<div class="text-text-muted text-xs mt-1">
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
									class="px-3 py-1 rounded bg-primary-main/20 text-primary-dark
										border border-primary-dark/30 text-sm flex items-center gap-2"
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
						<span class="text-text-secondary">Power Points</span>
						<span class="font-mono text-primary-dark">
							{powerPointsUsed.toFixed(2)} / {powerPointsTotal}
						</span>
					</div>
					<div class="w-full bg-surface rounded-full h-2">
						<div
							class="bg-primary-main h-2 rounded-full transition-all"
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
									? 'bg-primary-main/20 border border-primary-dark'
									: canAfford
										? 'bg-surface hover:bg-surface-variant border border-transparent'
										: 'bg-surface opacity-50 border border-transparent cursor-not-allowed'}"
							on:click={() => (selected || canAfford) && togglePower(power)}
							disabled={!selected && !canAfford}
						>
							<div class="flex items-center justify-between">
								<span class="font-medium {selected ? 'text-primary-dark' : 'text-text-primary'}">
									{power.name}
								</span>
								<span class="cw-badge cw-badge-primary text-xs">
									{power.points} PP
								</span>
							</div>
							<div class="text-text-muted text-xs mt-1">
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
