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
	type Category = 'metatypes' | 'skills' | 'qualities' | 'spells' | 'powers' | 'programs' | 'martial' | 'echoes' | 'mentors' | 'traditions' | 'streams' | 'weapons' | 'armor' | 'cyberware' | 'bioware' | 'vehicles' | 'gear';
	let currentCategory: Category = 'metatypes';

	/** Search query. */
	let search = '';

	/** Quality filter. */
	let qualityType: 'all' | 'Positive' | 'Negative' = 'all';

	/** Spell category filter. */
	let spellCategory = '';

	/** Weapon category filter. */
	let weaponCategory = '';

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

	/** Get unique weapon categories. */
	$: weaponCategories = $gameData.weapons
		? [...new Set($gameData.weapons.map((w) => w.category))].sort()
		: [];

	/** Filter metatypes by search. */
	$: filteredMetatypes = ($gameData.metatypes ?? []).filter((m) =>
		!search || m.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Filter skills by search. */
	$: filteredSkills = ($gameData.skills ?? []).filter((s) =>
		!search || s.name.toLowerCase().includes(search.toLowerCase())
	);

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

	/** Filter weapons by search and category. */
	$: filteredWeapons = ($gameData.weapons ?? []).filter((w) => {
		const matchesSearch = !search || w.name.toLowerCase().includes(search.toLowerCase());
		const matchesCategory = !weaponCategory || w.category === weaponCategory;
		return matchesSearch && matchesCategory;
	});

	/** Filter armor by search. */
	$: filteredArmor = ($gameData.armor ?? []).filter((a) =>
		!search || a.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Filter cyberware by search. */
	$: filteredCyberware = ($gameData.cyberware ?? []).filter((c) =>
		!search || c.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Filter bioware by search. */
	$: filteredBioware = ($gameData.bioware ?? []).filter((b) =>
		!search || b.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Filter vehicles by search. */
	$: filteredVehicles = ($gameData.vehicles ?? []).filter((v) =>
		!search || v.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Filter gear by search. */
	$: filteredGear = ($gameData.gear ?? []).filter((g) =>
		!search || g.name.toLowerCase().includes(search.toLowerCase())
	);

	/** Category tabs. */
	const categories: { id: Category; label: string }[] = [
		{ id: 'metatypes', label: 'Metatypes' },
		{ id: 'skills', label: 'Skills' },
		{ id: 'qualities', label: 'Qualities' },
		{ id: 'spells', label: 'Spells' },
		{ id: 'powers', label: 'Adept Powers' },
		{ id: 'programs', label: 'Programs' },
		{ id: 'martial', label: 'Martial Arts' },
		{ id: 'echoes', label: 'Echoes' },
		{ id: 'mentors', label: 'Mentors' },
		{ id: 'traditions', label: 'Traditions' },
		{ id: 'streams', label: 'Streams' },
		{ id: 'weapons', label: 'Weapons' },
		{ id: 'armor', label: 'Armor' },
		{ id: 'cyberware', label: 'Cyberware' },
		{ id: 'bioware', label: 'Bioware' },
		{ id: 'vehicles', label: 'Vehicles' },
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
				<h1 class="font-heading text-2xl text-primary-dark">Browse Data</h1>
				<p class="text-text-secondary text-sm">Explore SR4 rulebook content</p>
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
			<span class="text-primary-dark animate-pulse">Loading game data...</span>
		</div>
	{:else}
		<!-- Category Tabs -->
		<nav class="flex flex-wrap gap-1 mb-6 overflow-x-auto pb-2">
			{#each categories as cat}
				<button
					class="px-3 py-1.5 rounded text-sm transition-colors whitespace-nowrap
						{currentCategory === cat.id
							? 'bg-primary-main/20 text-primary-dark border border-primary-dark/50'
							: 'bg-surface text-text-secondary hover:bg-surface-variant'}"
					on:click={() => { currentCategory = cat.id; search = ''; }}
				>
					{cat.label}
				</button>
			{/each}
		</nav>

		<!-- Metatypes -->
		{#if currentCategory === 'metatypes'}
			<div class="grid gap-2">
				{#each filteredMetatypes as meta}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-text-primary">{meta.name}</span>
							<span class="text-primary-dark text-sm font-mono">{meta.bp} BP</span>
						</div>
						<div class="grid grid-cols-4 md:grid-cols-8 gap-2 text-xs text-text-muted mt-2">
							<span>BOD: <span class="text-text-secondary">{meta.bodmin}-{meta.bodmax}</span></span>
							<span>AGI: <span class="text-text-secondary">{meta.agimin}-{meta.agimax}</span></span>
							<span>REA: <span class="text-text-secondary">{meta.reamin}-{meta.reamax}</span></span>
							<span>STR: <span class="text-text-secondary">{meta.strmin}-{meta.strmax}</span></span>
							<span>CHA: <span class="text-text-secondary">{meta.chamin}-{meta.chamax}</span></span>
							<span>INT: <span class="text-text-secondary">{meta.intmin}-{meta.intmax}</span></span>
							<span>LOG: <span class="text-text-secondary">{meta.logmin}-{meta.logmax}</span></span>
							<span>WIL: <span class="text-text-secondary">{meta.wilmin}-{meta.wilmax}</span></span>
						</div>
						<div class="flex gap-4 text-xs text-text-muted mt-1">
							<span>EDG: <span class="text-primary-dark">{meta.edgmin}-{meta.edgmax}</span></span>
							<span>ESS: <span class="text-primary-dark">{meta.essmax}</span></span>
						</div>
						<p class="text-text-muted text-xs mt-1">{meta.source} p.{meta.page}</p>
					</div>
				{/each}
				{#if filteredMetatypes.length === 0}
					<p class="text-text-muted text-center py-4">No metatypes found.</p>
				{/if}
			</div>
		{/if}

		<!-- Skills -->
		{#if currentCategory === 'skills'}
			<div class="grid gap-2">
				{#each filteredSkills as skill}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-text-primary">{skill.name}</span>
							<span class="text-primary-dark text-sm">{skill.attribute}</span>
						</div>
						<div class="flex flex-wrap gap-2 text-xs text-text-muted mt-1">
							<span>Category: <span class="text-text-secondary">{skill.category}</span></span>
							{#if skill.group}
								<span>Group: <span class="text-primary-dark">{skill.group}</span></span>
							{/if}
							{#if skill.default}
								<span class="text-success-dark">Defaultable</span>
							{/if}
						</div>
						{#if skill.specs && skill.specs.length > 0}
							<div class="flex flex-wrap gap-1 mt-2">
								{#each skill.specs.slice(0, 5) as spec}
									<span class="px-1.5 py-0.5 bg-surface-variant text-text-muted text-xs rounded">
										{spec}
									</span>
								{/each}
								{#if skill.specs.length > 5}
									<span class="text-text-muted text-xs">+{skill.specs.length - 5} more</span>
								{/if}
							</div>
						{/if}
						<p class="text-text-muted text-xs mt-1">{skill.source} p.{skill.page}</p>
					</div>
				{/each}
				{#if filteredSkills.length === 0}
					<p class="text-text-muted text-center py-4">No skills found.</p>
				{/if}
			</div>
		{/if}

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
								<span class="font-medium {quality.category === 'Positive' ? 'text-success-dark' : 'text-error-dark'}">
									{quality.name}
								</span>
								{#if quality.rating}
									<span class="text-text-muted text-xs ml-1">(Rating)</span>
								{/if}
							</div>
							<span class="text-sm font-mono {quality.bp > 0 ? 'text-error-dark' : 'text-success-dark'}">
								{quality.bp > 0 ? '+' : ''}{quality.bp} BP
							</span>
						</div>
						<p class="text-text-secondary text-sm mt-1">{quality.source} p.{quality.page}</p>
					</div>
				{/each}
				{#if filteredQualities.length === 0}
					<p class="text-text-muted text-center py-4">No qualities found.</p>
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
							<span class="font-medium text-text-primary">{spell.name}</span>
							<span class="text-info-dark text-sm">{spell.category}</span>
						</div>
						<div class="flex flex-wrap gap-3 text-xs text-text-muted mt-1">
							<span>Type: <span class="text-text-secondary">{spell.type}</span></span>
							<span>Range: <span class="text-text-secondary">{spell.range}</span></span>
							<span>Duration: <span class="text-text-secondary">{spell.duration}</span></span>
							<span>DV: <span class="text-text-secondary">{spell.dv}</span></span>
						</div>
						<p class="text-text-muted text-xs mt-1">{spell.source} p.{spell.page}</p>
					</div>
				{/each}
				{#if filteredSpells.length === 0}
					<p class="text-text-muted text-center py-4">No spells found.</p>
				{/if}
			</div>
		{/if}

		<!-- Adept Powers -->
		{#if currentCategory === 'powers'}
			<div class="grid gap-2">
				{#each filteredPowers as power}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-text-primary">{power.name}</span>
							<span class="text-info-dark text-sm font-mono">{power.points} PP</span>
						</div>
						<div class="flex flex-wrap gap-3 text-xs text-text-muted mt-1">
							{#if power.maxlevels > 1}
								<span>Max Levels: <span class="text-text-secondary">{power.maxlevels}</span></span>
							{/if}
							<span>{power.source} p.{power.page}</span>
						</div>
					</div>
				{/each}
				{#if filteredPowers.length === 0}
					<p class="text-text-muted text-center py-4">No powers found.</p>
				{/if}
			</div>
		{/if}

		<!-- Programs -->
		{#if currentCategory === 'programs'}
			<div class="grid gap-2">
				{#each filteredPrograms as program}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-text-primary">{program.name}</span>
							<span class="text-primary-dark text-sm">{program.category}</span>
						</div>
						<p class="text-text-muted text-xs mt-1">{program.source} p.{program.page}</p>
					</div>
				{/each}
				{#if filteredPrograms.length === 0}
					<p class="text-text-muted text-center py-4">No programs found.</p>
				{/if}
			</div>
		{/if}

		<!-- Martial Arts -->
		{#if currentCategory === 'martial'}
			<div class="grid gap-2">
				{#each filteredMartialArts as art}
					<div class="cw-card p-3">
						<div class="font-medium text-text-primary">{art.name}</div>
						{#if art.techniques && art.techniques.length > 0}
							<div class="flex flex-wrap gap-1 mt-2">
								{#each art.techniques as technique}
									<span class="px-2 py-0.5 bg-primary-main/20 text-primary-dark text-xs rounded">
										{technique}
									</span>
								{/each}
							</div>
						{/if}
						<p class="text-text-muted text-xs mt-2">{art.source} p.{art.page}</p>
					</div>
				{/each}
				{#if filteredMartialArts.length === 0}
					<p class="text-text-muted text-center py-4">No martial arts found.</p>
				{/if}
			</div>
		{/if}

		<!-- Echoes -->
		{#if currentCategory === 'echoes'}
			<div class="grid gap-2">
				{#each filteredEchoes as echo}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-text-primary">{echo.name}</span>
							{#if echo.limit > 1}
								<span class="text-text-muted text-xs">Max: {echo.limit}</span>
							{/if}
						</div>
						{#if echo.bonus}
							<p class="text-text-secondary text-sm mt-1">{echo.bonus}</p>
						{/if}
						<p class="text-text-muted text-xs mt-1">{echo.source} p.{echo.page}</p>
					</div>
				{/each}
				{#if filteredEchoes.length === 0}
					<p class="text-text-muted text-center py-4">No echoes found.</p>
				{/if}
			</div>
		{/if}

		<!-- Mentors -->
		{#if currentCategory === 'mentors'}
			<div class="grid gap-2">
				{#each filteredMentors as mentor}
					<div class="cw-card p-3">
						<div class="font-medium text-info-dark">{mentor.name}</div>
						<div class="text-sm mt-2 space-y-1">
							<p>
								<span class="text-success-dark">Advantage:</span>
								<span class="text-text-secondary">{mentor.advantage}</span>
							</p>
							<p>
								<span class="text-error-dark">Disadvantage:</span>
								<span class="text-text-secondary">{mentor.disadvantage}</span>
							</p>
						</div>
						<p class="text-text-muted text-xs mt-2">{mentor.source} p.{mentor.page}</p>
					</div>
				{/each}
				{#if filteredMentors.length === 0}
					<p class="text-text-muted text-center py-4">No mentors found.</p>
				{/if}
			</div>
		{/if}

		<!-- Traditions -->
		{#if currentCategory === 'traditions'}
			<div class="grid gap-2">
				{#each $traditions ?? [] as tradition}
					<div class="cw-card p-3">
						<div class="font-medium text-text-primary">{tradition.name}</div>
						<div class="text-sm mt-1">
							<span class="text-text-muted">Drain:</span>
							<span class="text-text-secondary ml-1">{tradition.drain}</span>
						</div>
						{#if tradition.spirits && tradition.spirits.length > 0}
							<div class="flex flex-wrap gap-1 mt-2">
								{#each tradition.spirits as spirit}
									<span class="px-2 py-0.5 bg-info-main/20 text-info-dark text-xs rounded">
										{spirit}
									</span>
								{/each}
							</div>
						{/if}
						<p class="text-text-muted text-xs mt-2">{tradition.source} p.{tradition.page}</p>
					</div>
				{/each}
				{#if !$traditions?.length}
					<p class="text-text-muted text-center py-4">No traditions found.</p>
				{/if}
			</div>
		{/if}

		<!-- Streams -->
		{#if currentCategory === 'streams'}
			<div class="grid gap-2">
				{#each $streams ?? [] as stream}
					<div class="cw-card p-3">
						<div class="font-medium text-primary-dark">{stream.name}</div>
						<div class="text-sm mt-1">
							<span class="text-text-muted">Drain:</span>
							<span class="text-text-secondary ml-1">{stream.drain}</span>
						</div>
						{#if stream.sprites && stream.sprites.length > 0}
							<div class="flex flex-wrap gap-1 mt-2">
								{#each stream.sprites as sprite}
									<span class="px-2 py-0.5 bg-primary-main/20 text-primary-dark text-xs rounded">
										{sprite}
									</span>
								{/each}
							</div>
						{/if}
						<p class="text-text-muted text-xs mt-2">{stream.source} p.{stream.page}</p>
					</div>
				{/each}
				{#if !$streams?.length}
					<p class="text-text-muted text-center py-4">No streams found.</p>
				{/if}
			</div>
		{/if}

		<!-- Weapons -->
		{#if currentCategory === 'weapons'}
			<div class="mb-4">
				<select class="cw-input" bind:value={weaponCategory}>
					<option value="">All Categories</option>
					{#each weaponCategories as cat}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
			</div>
			<div class="grid gap-2">
				{#each filteredWeapons.slice(0, 100) as weapon}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-text-primary">{weapon.name}</span>
							<span class="text-primary-dark text-sm">{formatNuyen(weapon.cost)}</span>
						</div>
						<div class="flex flex-wrap gap-3 text-xs text-text-muted mt-1">
							<span>Category: <span class="text-text-secondary">{weapon.category}</span></span>
							<span>Damage: <span class="text-error-dark">{weapon.damage}</span></span>
							<span>AP: <span class="text-warning-dark">{weapon.ap}</span></span>
							{#if weapon.rc}
								<span>RC: <span class="text-text-secondary">{weapon.rc}</span></span>
							{/if}
							{#if weapon.ammo}
								<span>Ammo: <span class="text-text-secondary">{weapon.ammo}</span></span>
							{/if}
							{#if weapon.mode}
								<span>Mode: <span class="text-text-secondary">{weapon.mode}</span></span>
							{/if}
						</div>
						<div class="text-xs text-text-muted mt-1">
							Avail: <span class="text-text-secondary">{weapon.avail}</span>
						</div>
					</div>
				{/each}
				{#if filteredWeapons.length > 100}
					<p class="text-text-muted text-center py-2">Showing first 100 of {filteredWeapons.length} items. Use search to narrow results.</p>
				{/if}
				{#if filteredWeapons.length === 0}
					<p class="text-text-muted text-center py-4">No weapons found.</p>
				{/if}
			</div>
		{/if}

		<!-- Armor -->
		{#if currentCategory === 'armor'}
			<div class="grid gap-2">
				{#each filteredArmor as armor}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-text-primary">{armor.name}</span>
							<span class="text-primary-dark text-sm">{formatNuyen(armor.cost)}</span>
						</div>
						<div class="flex flex-wrap gap-3 text-xs text-text-muted mt-1">
							<span>Ballistic: <span class="text-primary-dark">{armor.ballistic}</span></span>
							<span>Impact: <span class="text-warning-dark">{armor.impact}</span></span>
							{#if armor.capacity}
								<span>Capacity: <span class="text-text-secondary">{armor.capacity}</span></span>
							{/if}
							<span>Avail: <span class="text-text-secondary">{armor.avail}</span></span>
						</div>
					</div>
				{/each}
				{#if filteredArmor.length === 0}
					<p class="text-text-muted text-center py-4">No armor found.</p>
				{/if}
			</div>
		{/if}

		<!-- Cyberware -->
		{#if currentCategory === 'cyberware'}
			<div class="grid gap-2">
				{#each filteredCyberware.slice(0, 100) as cyber}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-text-primary">{cyber.name}</span>
							<span class="text-error-dark text-sm">{cyber.ess} ESS</span>
						</div>
						<div class="flex flex-wrap gap-3 text-xs text-text-muted mt-1">
							<span>Category: <span class="text-text-secondary">{cyber.category}</span></span>
							<span>Cost: <span class="text-primary-dark">{formatNuyen(cyber.cost)}</span></span>
							<span>Avail: <span class="text-text-secondary">{cyber.avail}</span></span>
						</div>
					</div>
				{/each}
				{#if filteredCyberware.length > 100}
					<p class="text-text-muted text-center py-2">Showing first 100 of {filteredCyberware.length} items. Use search to narrow results.</p>
				{/if}
				{#if filteredCyberware.length === 0}
					<p class="text-text-muted text-center py-4">No cyberware found.</p>
				{/if}
			</div>
		{/if}

		<!-- Bioware -->
		{#if currentCategory === 'bioware'}
			<div class="grid gap-2">
				{#each filteredBioware.slice(0, 100) as bio}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-text-primary">{bio.name}</span>
							<span class="text-info-dark text-sm">{bio.ess} ESS</span>
						</div>
						<div class="flex flex-wrap gap-3 text-xs text-text-muted mt-1">
							<span>Category: <span class="text-text-secondary">{bio.category}</span></span>
							<span>Cost: <span class="text-primary-dark">{formatNuyen(bio.cost)}</span></span>
							<span>Avail: <span class="text-text-secondary">{bio.avail}</span></span>
						</div>
					</div>
				{/each}
				{#if filteredBioware.length > 100}
					<p class="text-text-muted text-center py-2">Showing first 100 of {filteredBioware.length} items. Use search to narrow results.</p>
				{/if}
				{#if filteredBioware.length === 0}
					<p class="text-text-muted text-center py-4">No bioware found.</p>
				{/if}
			</div>
		{/if}

		<!-- Vehicles -->
		{#if currentCategory === 'vehicles'}
			<div class="grid gap-2">
				{#each filteredVehicles.slice(0, 100) as vehicle}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-text-primary">{vehicle.name}</span>
							<span class="text-primary-dark text-sm">{formatNuyen(vehicle.cost)}</span>
						</div>
						<div class="text-xs text-text-muted mt-1">
							Category: <span class="text-text-secondary">{vehicle.category}</span>
						</div>
						<div class="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs text-text-muted mt-2">
							<span>Hand: <span class="text-text-secondary">{vehicle.handling}</span></span>
							<span>Accel: <span class="text-text-secondary">{vehicle.accel}</span></span>
							<span>Speed: <span class="text-text-secondary">{vehicle.speed}</span></span>
							<span>Pilot: <span class="text-text-secondary">{vehicle.pilot}</span></span>
							<span>Body: <span class="text-text-secondary">{vehicle.body}</span></span>
							<span>Armor: <span class="text-text-secondary">{vehicle.armor}</span></span>
						</div>
						<div class="flex gap-4 text-xs text-text-muted mt-1">
							<span>Sensor: <span class="text-text-secondary">{vehicle.sensor}</span></span>
							{#if vehicle.seats}
								<span>Seats: <span class="text-text-secondary">{vehicle.seats}</span></span>
							{/if}
							<span>Avail: <span class="text-text-secondary">{vehicle.avail}</span></span>
						</div>
					</div>
				{/each}
				{#if filteredVehicles.length > 100}
					<p class="text-text-muted text-center py-2">Showing first 100 of {filteredVehicles.length} items. Use search to narrow results.</p>
				{/if}
				{#if filteredVehicles.length === 0}
					<p class="text-text-muted text-center py-4">No vehicles found.</p>
				{/if}
			</div>
		{/if}

		<!-- Gear -->
		{#if currentCategory === 'gear'}
			<div class="grid gap-2">
				{#each filteredGear.slice(0, 100) as item}
					<div class="cw-card p-3">
						<div class="flex justify-between items-start">
							<span class="font-medium text-text-primary">{item.name}</span>
							<span class="text-primary-dark text-sm">{formatNuyen(item.cost)}</span>
						</div>
						<div class="flex flex-wrap gap-3 text-xs text-text-muted mt-1">
							<span>Category: <span class="text-text-secondary">{item.category}</span></span>
							{#if item.avail}
								<span>Avail: <span class="text-text-secondary">{item.avail}</span></span>
							{/if}
						</div>
					</div>
				{/each}
				{#if filteredGear.length > 100}
					<p class="text-text-muted text-center py-2">Showing first 100 of {filteredGear.length} items. Use search to narrow results.</p>
				{/if}
				{#if filteredGear.length === 0}
					<p class="text-text-muted text-center py-4">No gear found.</p>
				{/if}
			</div>
		{/if}
	{/if}
</main>
