<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { loadSavedCharacter, character, updateCondition, updateEdge, setAmmo, reloadWeapon, spendAmmo } from '$stores';
	import { gameData, loadGameData } from '$stores/gamedata';
	import { CharacterSheet, CombatTracker, DiceRoller } from '$lib/components';
	import { rollInitiative } from '$lib/utils/dice';

	/** Roll history entry type. */
	interface RollHistoryEntry {
		id: number;
		timestamp: Date;
		testName: string;
		pool: number;
		hits: number;
		isGlitch: boolean;
		isCriticalGlitch: boolean;
		edgeUsed: boolean;
		dice: number[];
	}

	/** Show dice roller panel. */
	let showDiceRoller = false;

	/** Show roll history panel. */
	let showRollHistory = false;

	/** Show combat tracker panel. */
	let showCombatTracker = false;

	/** Current dice pool for roller. */
	let dicePool = 6;

	/** Last rolled test name. */
	let lastTestName = '';

	/** Roll history (most recent first). */
	let rollHistory: RollHistoryEntry[] = [];
	let rollIdCounter = 0;

	/** Loading state. */
	let loading = true;
	let loadError: string | null = null;

	/** Load character on mount. */
	onMount(async () => {
		// Load game data for skill definitions
		await loadGameData();

		const characterId = $page.params.id;

		if (!characterId) {
			loadError = 'No character ID provided';
			loading = false;
			return;
		}

		const result = await loadSavedCharacter(characterId);

		if (!result.success) {
			loadError = result.error || 'Failed to load character';
		} else if (!result.data) {
			loadError = 'Character not found';
		}

		loading = false;
	});

	/** Navigate to edit page. */
	function handleEdit(): void {
		if ($character) {
			goto(`/character/edit/${$character.id}`);
		}
	}

	/** Handle skill roll from character sheet. */
	function handleSkillRoll(event: CustomEvent<{ name: string; pool: number }>): void {
		dicePool = event.detail.pool;
		lastTestName = event.detail.name;
		selectedWeapon = null;
		selectedSpell = null;
		showDiceRoller = true;
	}

	/** Handle attribute roll from character sheet. */
	function handleAttributeRoll(event: CustomEvent<{ name: string; pool: number }>): void {
		dicePool = event.detail.pool;
		lastTestName = event.detail.name;
		selectedWeapon = null;
		selectedSpell = null;
		showDiceRoller = true;
	}

	/** Handle roll result from dice roller. */
	function handleRollResult(event: CustomEvent<{ results: {
		dice: number[];
		hits: number;
		ones: number;
		isGlitch: boolean;
		isCriticalGlitch: boolean;
		edgeUsed: boolean;
		pool: number;
	} }>): void {
		const r = event.detail.results;
		const entry: RollHistoryEntry = {
			id: rollIdCounter++,
			timestamp: new Date(),
			testName: lastTestName || 'Manual Roll',
			pool: r.pool,
			hits: r.hits,
			isGlitch: r.isGlitch,
			isCriticalGlitch: r.isCriticalGlitch,
			edgeUsed: r.edgeUsed,
			dice: r.dice
		};
		rollHistory = [entry, ...rollHistory].slice(0, 50); // Keep last 50
	}

	/** Clear roll history. */
	function clearHistory(): void {
		rollHistory = [];
	}

	/** Format time for display. */
	function formatTime(date: Date): string {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	/** Handle damage change from condition monitor. */
	function handleDamageChanged(event: CustomEvent<{ type: 'physical' | 'stun'; value: number }>): void {
		updateCondition(event.detail.type, event.detail.value);
	}

	/** Handle Edge change. */
	function handleEdgeChanged(event: CustomEvent<{ value: number }>): void {
		updateEdge(event.detail.value);
	}

	/** Handle initiative roll from character sheet. */
	function handleInitiativeRoll(event: CustomEvent<{ base: number; dice: number }>): void {
		const result = rollInitiative({ base: event.detail.base, dice: event.detail.dice });

		// Add to roll history
		const entry: RollHistoryEntry = {
			id: rollIdCounter++,
			timestamp: new Date(),
			testName: 'Initiative',
			pool: result.dice.length,
			hits: result.total,  // Using hits field for total
			isGlitch: false,
			isCriticalGlitch: false,
			edgeUsed: false,
			dice: result.dice
		};
		rollHistory = [entry, ...rollHistory].slice(0, 50);

		// Show combat tracker if not already visible
		if (!showCombatTracker) {
			showCombatTracker = true;
		}
	}

	/** Handle initiative rolled from combat tracker. */
	function handleCombatInitiative(event: CustomEvent<{ total: number; passes: number; dice: number[] }>): void {
		const entry: RollHistoryEntry = {
			id: rollIdCounter++,
			timestamp: new Date(),
			testName: `Initiative (${event.detail.passes} pass${event.detail.passes !== 1 ? 'es' : ''})`,
			pool: event.detail.dice.length,
			hits: event.detail.total,
			isGlitch: false,
			isCriticalGlitch: false,
			edgeUsed: false,
			dice: event.detail.dice
		};
		rollHistory = [entry, ...rollHistory].slice(0, 50);
	}

	/** Get player base initiative. */
	$: playerBaseInit = $character
		? ($character.attributes.rea.base + $character.attributes.rea.bonus) +
		  ($character.attributes.int.base + $character.attributes.int.bonus)
		: 10;

	/** Currently selected weapon for attack. */
	let selectedWeapon: { id: string; name: string; damage: string; ap: string; damageMod: number; ammoUsed: number } | null = null;

	/** Currently selected spell for casting. */
	let selectedSpell: { name: string; drainPool: number; drainValue: string } | null = null;

	/** Handle weapon attack roll. */
	function handleWeaponRoll(event: CustomEvent<{
		weapon: { id: string; name: string; damage: string; ap: string };
		pool: number;
		skillName: string;
		firingMode?: { code: string; name: string; ammoPerShot: number; damageMod: number }
	}>): void {
		const { weapon, pool, skillName, firingMode } = event.detail;

		// Calculate damage modifier and ammo consumption from firing mode
		const damageMod = firingMode?.damageMod ?? 0;
		const ammoUsed = firingMode?.ammoPerShot ?? 1;

		// Spend ammo for ranged attack
		if (ammoUsed > 0) {
			spendAmmo(weapon.id, ammoUsed);
		}

		selectedWeapon = {
			id: weapon.id,
			name: weapon.name,
			damage: weapon.damage,
			ap: weapon.ap,
			damageMod,
			ammoUsed
		};
		selectedSpell = null;
		dicePool = pool;
		lastTestName = firingMode
			? `${weapon.name} (${firingMode.code})`
			: `${weapon.name} (${skillName})`;
		showDiceRoller = true;
	}

	/** Handle spell cast roll. */
	function handleSpellRoll(event: CustomEvent<{ spell: { name: string }; castPool: number; drainPool: number; drainValue: string }>): void {
		const { spell, castPool, drainPool, drainValue } = event.detail;
		selectedSpell = { name: spell.name, drainPool, drainValue };
		selectedWeapon = null;
		dicePool = castPool;
		lastTestName = `Cast ${spell.name}`;
		showDiceRoller = true;
	}

	/** Handle ammo change. */
	function handleAmmoChanged(event: CustomEvent<{ weaponId: string; value: number }>): void {
		setAmmo(event.detail.weaponId, event.detail.value);
	}

	/** Handle weapon reload. */
	function handleReloadWeapon(event: CustomEvent<{ weaponId: string }>): void {
		reloadWeapon(event.detail.weaponId);
	}
</script>

<svelte:head>
	<title>{$character?.identity.name || 'Character'} - Chummer Web</title>
</svelte:head>

<main class="container mx-auto px-4 py-6 max-w-6xl">
	{#if loading}
		<div class="flex items-center justify-center h-64">
			<span class="text-accent-primary animate-pulse">Loading character...</span>
		</div>
	{:else if loadError}
		<div class="cw-card text-center py-12">
			<h2 class="text-xl text-accent-danger mb-4">Error Loading Character</h2>
			<p class="text-secondary-text mb-6">{loadError}</p>
			<a href="/characters" class="cw-btn cw-btn-primary">
				Back to Characters
			</a>
		</div>
	{:else if $character}
		<!-- Header with actions -->
		<header class="flex items-center justify-between mb-6">
			<a href="/characters" class="cw-btn cw-btn-secondary text-sm">
				Back to Characters
			</a>
			<div class="flex gap-2">
				<button
					class="cw-btn {showCombatTracker ? 'cw-btn-primary' : ''}"
					on:click={() => showCombatTracker = !showCombatTracker}
					title="Toggle combat tracker"
				>
					Combat
				</button>
				<button
					class="cw-btn {showDiceRoller ? 'cw-btn-primary' : ''}"
					on:click={() => showDiceRoller = !showDiceRoller}
					title="Toggle dice roller"
				>
					Dice
				</button>
				<button
					class="cw-btn {showRollHistory ? 'cw-btn-primary' : ''}"
					on:click={() => showRollHistory = !showRollHistory}
					title="Toggle roll history"
				>
					History {#if rollHistory.length > 0}<span class="text-xs">({rollHistory.length})</span>{/if}
				</button>
				<button
					class="cw-btn cw-btn-primary"
					on:click={handleEdit}
				>
					Edit Character
				</button>
				<button
					class="cw-btn"
					on:click={() => window.print()}
					title="Print character sheet"
				>
					Print
				</button>
			</div>
		</header>

		<!-- Combat Tracker Panel -->
		{#if showCombatTracker}
			<div class="mb-6 combat-tracker-panel">
				<CombatTracker
					playerName={$character.identity.name || 'Player'}
					playerBaseInit={playerBaseInit}
					playerInitDice={1}
					on:initiativeRolled={handleCombatInitiative}
				/>
			</div>
		{/if}

		<!-- Dice Roller Panel -->
		{#if showDiceRoller}
			<div class="mb-6 dice-roller-panel">
				{#if lastTestName}
					<div class="text-sm text-accent-cyan mb-2">Rolling: {lastTestName}</div>
				{/if}
				{#if selectedWeapon}
					<div class="cw-card mb-2 p-3">
						<div class="flex flex-wrap gap-4 text-sm">
							<span class="text-secondary-text">
								Damage: <span class="text-accent-danger font-bold">{selectedWeapon.damage}</span>
								{#if selectedWeapon.damageMod > 0}
									<span class="text-accent-success">+{selectedWeapon.damageMod}</span>
								{/if}
							</span>
							<span class="text-secondary-text">
								AP: <span class="text-accent-warning font-bold">{selectedWeapon.ap}</span>
							</span>
							{#if selectedWeapon.ammoUsed > 0}
								<span class="text-muted-text text-xs">({selectedWeapon.ammoUsed} ammo)</span>
							{/if}
							<span class="text-muted-text text-xs">(Net hits add to damage)</span>
						</div>
					</div>
				{/if}
				{#if selectedSpell}
					<div class="cw-card mb-2 p-3">
						<div class="flex flex-wrap gap-4 text-sm">
							<span class="text-secondary-text">
								Drain: <span class="text-accent-magenta font-bold">{selectedSpell.drainValue}</span>
							</span>
							<span class="text-secondary-text">
								Resist: <span class="text-accent-cyan font-bold">{selectedSpell.drainPool}d6</span>
							</span>
							<span class="text-muted-text text-xs">(Hits on spellcasting determine Force)</span>
						</div>
					</div>
				{/if}
				<DiceRoller bind:dicePool on:roll={handleRollResult} />
			</div>
		{/if}

		<!-- Roll History Panel -->
		{#if showRollHistory}
			<div class="mb-6 cw-card roll-history-panel">
				<div class="flex items-center justify-between mb-3">
					<h3 class="text-primary-text font-medium">Roll History</h3>
					{#if rollHistory.length > 0}
						<button
							class="cw-btn text-xs text-accent-danger"
							on:click={clearHistory}
						>
							Clear
						</button>
					{/if}
				</div>
				{#if rollHistory.length === 0}
					<p class="text-muted-text text-sm">No rolls yet this session.</p>
				{:else}
					<div class="space-y-2 max-h-64 overflow-y-auto">
						{#each rollHistory as entry (entry.id)}
							<div class="flex items-center justify-between py-2 border-b border-border text-sm">
								<div class="flex-1">
									<span class="text-secondary-text">{entry.testName}</span>
									<span class="text-muted-text text-xs ml-2">({entry.pool}d6)</span>
									{#if entry.edgeUsed}
										<span class="text-accent-primary text-xs ml-1">Edge</span>
									{/if}
								</div>
								<div class="flex items-center gap-3">
									<span class="font-mono font-bold
										{entry.isCriticalGlitch ? 'text-accent-danger' : ''}
										{entry.isGlitch && !entry.isCriticalGlitch ? 'text-accent-warning' : ''}
										{!entry.isGlitch ? 'text-accent-success' : ''}">
										{entry.hits} hit{entry.hits !== 1 ? 's' : ''}
										{#if entry.isCriticalGlitch}
											<span class="text-xs">(CG!)</span>
										{:else if entry.isGlitch}
											<span class="text-xs">(G)</span>
										{/if}
									</span>
									<span class="text-muted-text text-xs">{formatTime(entry.timestamp)}</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Character Sheet -->
		<CharacterSheet
			char={$character}
			skillDefs={$gameData.skills}
			interactive={true}
			on:rollSkill={handleSkillRoll}
			on:rollAttribute={handleAttributeRoll}
			on:rollInitiative={handleInitiativeRoll}
			on:rollWeapon={handleWeaponRoll}
			on:rollSpell={handleSpellRoll}
			on:damageChanged={handleDamageChanged}
			on:edgeChanged={handleEdgeChanged}
			on:ammoChanged={handleAmmoChanged}
			on:reloadWeapon={handleReloadWeapon}
		/>
	{:else}
		<div class="cw-card text-center py-12">
			<p class="text-secondary-text">No character data available.</p>
			<a href="/characters" class="cw-btn cw-btn-primary mt-4">
				Back to Characters
			</a>
		</div>
	{/if}
</main>

<style>
	@media print {
		header,
		.combat-tracker-panel,
		.dice-roller-panel,
		.roll-history-panel {
			display: none;
		}
	}
</style>
