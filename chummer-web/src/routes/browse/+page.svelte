<script lang="ts">
	import { onMount } from 'svelte';
	import {
		gameData,
		loadGameData,
		qualities,
		spells,
		powers,
		programs,
		martialArts,
		echoes,
		mentors,
		traditions,
		streams
	} from '$stores/gamedata';

	/** Current category tab. */
	type Category = 'qualities' | 'spells' | 'powers' | 'programs' | 'martial' | 'echoes' | 'mentors' | 'traditions' | 'streams' | 'cyberware' | 'bioware' | 'gear';
	let currentCategory: Category = 'qualities';

	/** Search query. */
	let search = '';

	/** Quality filter. */
	let qualityType: 'all' | 'Positive' | 'Negative' = 'all';

	/** Spell category filter. */
	let spellCategory = '';

	/** Loading state. */
	let loading = true;

	onMount(async () => {
		await loadGameData();
		loading = false;
	});

	/** Get unique spell categories. */
	$: spellCategories = $spells
		? [...new Set($spells.map((s) => s.category))].sort()
		: [];

	/** Get unique gear categories. */
	$: gearCategories = $gameData.gearCategories ?? [];

	/** Filter qualities by search and type. */
	$: filteredQualities = ($qualities ?? []).filter((q) => {
		const matchesSearch = !search || q.name.toLowerCase().includes(search.toLowerCase());
		const matchesType = qualityType === 'all' || q.category === qualityType;
		return matchesSearch && matchesType;
	});

	/** Filter spells by search and category. */
	$: filteredSpells = ($spells ?? []).filter((s) => {
		const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
		const matchesCategory = !spellCategory || s.category === spellCategory;
		return matchesSearch && matchesCategory;
	});

	/** Filter powers by search. */
	$: filteredPowers = ($powers ?? []).filter((p) =>
		!search || p.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Filter programs by search. */
	$: filteredPrograms = ($programs ?? []).filter((p) =>
		!search || p.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Filter martial arts by search. */
	$: filteredMartialArts = ($martialArts ?? []).filter((m) =>
		!search || m.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Filter echoes by search. */
	$: filteredEchoes = ($echoes ?? []).filter((e) =>
		!search || e.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Filter mentors by search. */
	$: filteredMentors = ($mentors ?? []).filter((m) =>
		!search || m.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Filter cyberware by search. */
	$: filteredCyberware = ($gameData.cyberware ?? []).filter((c) =>
		!search || c.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Filter bioware by search. */
	$: filteredBioware = ($gameData.bioware ?? []).filter((b) =>
		!search || b.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Filter gear by search. */
	$: filteredGear = ($gameData.gear ?? []).filter((g) =>
		!search || g.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Category tabs. */
	const categories: { id: Category; label: string }[] = [
		{ id: 'qualities', label: 'Qualities' },
		{ id: 'spells', label: 'Spells' },
		{ id: 'powers', label: 'Adept Powers' },
		{ id: 'programs', label: 'Programs' },
		{ id: 'martial', label: 'Martial Arts' },
		{ id: 'echoes', label: 'Echoes' },
		{ id: 'mentors', label: 'Mentors' },
		{ id: 'traditions', label: 'Traditions' },
		{ id: 'streams', label: 'Streams' },
		{ id: 'cyberware', label: 'Cyberware' },
		{ id: 'bioware', label: 'Bioware' },
		{ id: 'gear', label: 'Gear' }
	];

	/** Format nuyen. */
	function formatNuyen(amount: number): string {
		return amount.toLocaleString() + '¥';
	}
</script>

<svelte:head>
	<title>Browse Data - ChummerWeb</title>
</svelte:head>

<main class="container mx-auto px-4 py-6 max-w-6xl">
	<header class="mb-6">
		<div class="flex items-center justify-between mb-4">
			<div>
				<h1 class="font-heading text-2xl text-accent-primary text-glow-primary">Browse Data</h1>
				<p class="text-secondary-text text-sm">Explore SR4 rulebook content</p>
			</div>
			<a href="/" class="cw-btn cw-btn-secondary text-sm">Back to Home</a>
		</div>

		<!-- Search -->
		<input
			type="text"
			class="cw-input w-full"
			placeholder="Search..."
			bind:value={search}
		/>
	</header>

	{#if loading}
		<div class="flex items-center justify-center h-64">
			<span class="text-accent-primary animate-pulse">Loading game data...</span>
		</div>
	{:else}
		<!-- Category Tabs -->
		<nav class="flex flex-wrap gap-1 mb-6 overflow-x-auto pb-2">
			{#each categories as cat}
				<button
					class="px-3 py-1.5 rounded text-sm transition-colors whitespace-nowrap
						{currentCategory === cat.id
							? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
							: 'bg-surface text-secondary-text hover:bg-surface-light'}"
					on:click={() => { currentCategory = cat.id; search = ''; }}
				>
					{cat.label}
				</button>
			{/each}
		</nav>

		<!-- Qualities -->
		{#if currentCategory === 'qualities'}
			<div class="mb-4">
				<select class="cw-input" bind:value={qualityType}>
					<option value="all">All Qualities</option>
					<option value="Positive">Positive</option>
					<option value="Negative">Negative</option>
				</select>
			</div>
			<div class="grid gap-2">
				{#each filteredQualities as quality}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<div>
								<span class="font-medium {quality.category === 'Positive' ? 'text-accent-success' : 'text-accent-danger'}">
									{quality.name}
								</span>
								{#if quality.rating}
									<span class="text-muted-text text-xs ml-1">(Rating)</span>
								{/if}
							</div>
							<span class="text-sm font-mono {quality.bp > 0 ? 'text-accent-danger' : 'text-accent-success'}">
								{quality.bp > 0 ? '+' : ''}{quality.bp} BP
							</span>
						</div>
						<p class="text-secondary-text text-sm mt-1">{quality.source} p.{quality.page}</p>
					</div>
				{/each}
				{#if filteredQualities.length === 0}
					<p class="text-muted-text text-center py-4">No qualities found.</p>
				{/if}
			</div>
		{/if}

		<!-- Spells -->
		{#if currentCategory === 'spells'}
			<div class="mb-4">
				<select class="cw-input" bind:value={spellCategory}>
					<option value="">All Categories</option>
					{#each spellCategories as cat}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
			</div>
			<div class="grid gap-2">
				{#each filteredSpells as spell}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-primary-text">{spell.name}</span>
							<span class="text-accent-magenta text-sm">{spell.category}</span>
						</div>
						<div class="flex flex-wrap gap-3 text-xs text-muted-text mt-1">
							<span>Type: <span class="text-secondary-text">{spell.type}</span></span>
							<span>Range: <span class="text-secondary-text">{spell.range}</span></span>
							<span>Duration: <span class="text-secondary-text">{spell.duration}</span></span>
							<span>DV: <span class="text-secondary-text">{spell.dv}</span></span>
						</div>
						<p class="text-muted-text text-xs mt-1">{spell.source} p.{spell.page}</p>
					</div>
				{/each}
				{#if filteredSpells.length === 0}
					<p class="text-muted-text text-center py-4">No spells found.</p>
				{/if}
			</div>
		{/if}

		<!-- Adept Powers -->
		{#if currentCategory === 'powers'}
			<div class="grid gap-2">
				{#each filteredPowers as power}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-primary-text">{power.name}</span>
							<span class="text-accent-magenta text-sm font-mono">{power.points} PP</span>
						</div>
						<div class="flex flex-wrap gap-3 text-xs text-muted-text mt-1">
							{#if power.maxlevels > 1}
								<span>Max Levels: <span class="text-secondary-text">{power.maxlevels}</span></span>
							{/if}
							<span>{power.source} p.{power.page}</span>
						</div>
					</div>
				{/each}
				{#if filteredPowers.length === 0}
					<p class="text-muted-text text-center py-4">No powers found.</p>
				{/if}
			</div>
		{/if}

		<!-- Programs -->
		{#if currentCategory === 'programs'}
			<div class="grid gap-2">
				{#each filteredPrograms as program}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-primary-text">{program.name}</span>
							<span class="text-accent-cyan text-sm">{program.category}</span>
						</div>
						<p class="text-muted-text text-xs mt-1">{program.source} p.{program.page}</p>
					</div>
				{/each}
				{#if filteredPrograms.length === 0}
					<p class="text-muted-text text-center py-4">No programs found.</p>
				{/if}
			</div>
		{/if}

		<!-- Martial Arts -->
		{#if currentCategory === 'martial'}
			<div class="grid gap-2">
				{#each filteredMartialArts as art}
					<div class="cw-card p-3">
						<div class="font-medium text-primary-text">{art.name}</div>
						{#if art.techniques && art.techniques.length > 0}
							<div class="flex flex-wrap gap-1 mt-2">
								{#each art.techniques as technique}
									<span class="px-2 py-0.5 bg-accent-primary/20 text-accent-primary text-xs rounded">
										{technique}
									</span>
								{/each}
							</div>
						{/if}
						<p class="text-muted-text text-xs mt-2">{art.source} p.{art.page}</p>
					</div>
				{/each}
				{#if filteredMartialArts.length === 0}
					<p class="text-muted-text text-center py-4">No martial arts found.</p>
				{/if}
			</div>
		{/if}

		<!-- Echoes -->
		{#if currentCategory === 'echoes'}
			<div class="grid gap-2">
				{#each filteredEchoes as echo}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-primary-text">{echo.name}</span>
							{#if echo.limit > 1}
								<span class="text-muted-text text-xs">Max: {echo.limit}</span>
							{/if}
						</div>
						{#if echo.bonus}
							<p class="text-secondary-text text-sm mt-1">{echo.bonus}</p>
						{/if}
						<p class="text-muted-text text-xs mt-1">{echo.source} p.{echo.page}</p>
					</div>
				{/each}
				{#if filteredEchoes.length === 0}
					<p class="text-muted-text text-center py-4">No echoes found.</p>
				{/if}
			</div>
		{/if}

		<!-- Mentors -->
		{#if currentCategory === 'mentors'}
			<div class="grid gap-2">
				{#each filteredMentors as mentor}
					<div class="cw-card p-3">
						<div class="font-medium text-accent-purple">{mentor.name}</div>
						<div class="text-sm mt-2 space-y-1">
							<p>
								<span class="text-accent-success">Advantage:</span>
								<span class="text-secondary-text">{mentor.advantage}</span>
							</p>
							<p>
								<span class="text-accent-danger">Disadvantage:</span>
								<span class="text-secondary-text">{mentor.disadvantage}</span>
							</p>
						</div>
						<p class="text-muted-text text-xs mt-2">{mentor.source} p.{mentor.page}</p>
					</div>
				{/each}
				{#if filteredMentors.length === 0}
					<p class="text-muted-text text-center py-4">No mentors found.</p>
				{/if}
			</div>
		{/if}

		<!-- Traditions -->
		{#if currentCategory === 'traditions'}
			<div class="grid gap-2">
				{#each $traditions ?? [] as tradition}
					<div class="cw-card p-3">
						<div class="font-medium text-primary-text">{tradition.name}</div>
						<div class="text-sm mt-1">
							<span class="text-muted-text">Drain:</span>
							<span class="text-secondary-text ml-1">{tradition.drain}</span>
						</div>
						{#if tradition.spirits && tradition.spirits.length > 0}
							<div class="flex flex-wrap gap-1 mt-2">
								{#each tradition.spirits as spirit}
									<span class="px-2 py-0.5 bg-accent-magenta/20 text-accent-magenta text-xs rounded">
										{spirit}
									</span>
								{/each}
							</div>
						{/if}
						<p class="text-muted-text text-xs mt-2">{tradition.source} p.{tradition.page}</p>
					</div>
				{/each}
				{#if !$traditions?.length}
					<p class="text-muted-text text-center py-4">No traditions found.</p>
				{/if}
			</div>
		{/if}

		<!-- Streams -->
		{#if currentCategory === 'streams'}
			<div class="grid gap-2">
				{#each $streams ?? [] as stream}
					<div class="cw-card p-3">
						<div class="font-medium text-accent-cyan">{stream.name}</div>
						<div class="text-sm mt-1">
							<span class="text-muted-text">Drain:</span>
							<span class="text-secondary-text ml-1">{stream.drain}</span>
						</div>
						{#if stream.sprites && stream.sprites.length > 0}
							<div class="flex flex-wrap gap-1 mt-2">
								{#each stream.sprites as sprite}
									<span class="px-2 py-0.5 bg-accent-cyan/20 text-accent-cyan text-xs rounded">
										{sprite}
									</span>
								{/each}
							</div>
						{/if}
						<p class="text-muted-text text-xs mt-2">{stream.source} p.{stream.page}</p>
					</div>
				{/each}
				{#if !$streams?.length}
					<p class="text-muted-text text-center py-4">No streams found.</p>
				{/if}
			</div>
		{/if}

		<!-- Cyberware -->
		{#if currentCategory === 'cyberware'}
			<div class="grid gap-2">
				{#each filteredCyberware.slice(0, 100) as cyber}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-primary-text">{cyber.name}</span>
							<span class="text-accent-danger text-sm">{cyber.ess} ESS</span>
						</div>
						<div class="flex flex-wrap gap-3 text-xs text-muted-text mt-1">
							<span>Category: <span class="text-secondary-text">{cyber.category}</span></span>
							<span>Cost: <span class="text-accent-cyan">{formatNuyen(cyber.cost)}</span></span>
							<span>Avail: <span class="text-secondary-text">{cyber.avail}</span></span>
						</div>
					</div>
				{/each}
				{#if filteredCyberware.length > 100}
					<p class="text-muted-text text-center py-2">Showing first 100 of {filteredCyberware.length} items. Use search to narrow results.</p>
				{/if}
				{#if filteredCyberware.length === 0}
					<p class="text-muted-text text-center py-4">No cyberware found.</p>
				{/if}
			</div>
		{/if}

		<!-- Bioware -->
		{#if currentCategory === 'bioware'}
			<div class="grid gap-2">
				{#each filteredBioware.slice(0, 100) as bio}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-primary-text">{bio.name}</span>
							<span class="text-accent-purple text-sm">{bio.ess} ESS</span>
						</div>
						<div class="flex flex-wrap gap-3 text-xs text-muted-text mt-1">
							<span>Category: <span class="text-secondary-text">{bio.category}</span></span>
							<span>Cost: <span class="text-accent-cyan">{formatNuyen(bio.cost)}</span></span>
							<span>Avail: <span class="text-secondary-text">{bio.avail}</span></span>
						</div>
					</div>
				{/each}
				{#if filteredBioware.length > 100}
					<p class="text-muted-text text-center py-2">Showing first 100 of {filteredBioware.length} items. Use search to narrow results.</p>
				{/if}
				{#if filteredBioware.length === 0}
					<p class="text-muted-text text-center py-4">No bioware found.</p>
				{/if}
			</div>
		{/if}

		<!-- Gear -->
		{#if currentCategory === 'gear'}
			<div class="grid gap-2">
				{#each filteredGear.slice(0, 100) as item}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-primary-text">{item.name}</span>
							<span class="text-accent-cyan text-sm">{formatNuyen(item.cost)}</span>
						</div>
						<div class="flex flex-wrap gap-3 text-xs text-muted-text mt-1">
							<span>Category: <span class="text-secondary-text">{item.category}</span></span>
							{#if item.avail}
								<span>Avail: <span class="text-secondary-text">{item.avail}</span></span>
							{/if}
						</div>
					</div>
				{/each}
				{#if filteredGear.length > 100}
					<p class="text-muted-text text-center py-2">Showing first 100 of {filteredGear.length} items. Use search to narrow results.</p>
				{/if}
				{#if filteredGear.length === 0}
					<p class="text-muted-text text-center py-4">No gear found.</p>
				{/if}
			</div>
		{/if}
	{/if}
</main>
