<script lang="ts">
	/**
	 * Career Advancement Panel
	 * ========================
	 * Comprehensive UI for career mode advancement including:
	 * - Karma/Nuyen tracking
	 * - Attribute improvement
	 * - Skill improvement
	 * - Initiation/Metamagics (Awakened)
	 * - Submersion/Echoes (Technomancer)
	 * - Spirit roster
	 * - Sprite roster
	 */

	import { createEventDispatcher } from 'svelte';
	import {
		character,
		KARMA_COSTS,
		awardKarma,
		awardNuyen,
		improveAttribute,
		improveSkill,
		learnNewSkill,
		getInitiationCost,
		initiate,
		learnMetamagic,
		getSubmersionCost,
		submerge,
		learnEcho,
		addSpirit,
		removeSpirit,
		useSpiritService,
		addSprite,
		removeSprite,
		useSpriteTask,
		registerSprite,
		getExpenseLog
	} from '$stores';
	import { gameData, echoes as echoesStore } from '$stores/gamedata';

	const dispatch = createEventDispatcher();

	/** Current tab. */
	type Tab = 'overview' | 'attributes' | 'skills' | 'magic' | 'resonance' | 'spirits' | 'sprites' | 'history';
	let currentTab: Tab = 'overview';

	/** Error message. */
	let error: string | null = null;

	/** Karma/Nuyen award form. */
	let karmaAmount = 0;
	let karmaReason = '';
	let nuyenAmount = 0;
	let nuyenReason = '';

	/** Spirit form. */
	let newSpiritType = '';
	let newSpiritForce = 3;
	let newSpiritServices = 1;
	let newSpiritBound = false;

	/** Sprite form. */
	let newSpriteType = '';
	let newSpriteRating = 3;
	let newSpriteTasks = 1;

	/** Clear error after delay. */
	function showError(msg: string): void {
		error = msg;
		setTimeout(() => { error = null; }, 3000);
	}

	/** Award karma to character. */
	function handleAwardKarma(): void {
		if (karmaAmount <= 0) return;
		const result = awardKarma(karmaAmount, karmaReason || 'Karma Award');
		if (result.success) {
			karmaAmount = 0;
			karmaReason = '';
		} else {
			showError(result.error || 'Failed to award karma');
		}
	}

	/** Award nuyen to character. */
	function handleAwardNuyen(): void {
		if (nuyenAmount <= 0) return;
		const result = awardNuyen(nuyenAmount, nuyenReason || 'Nuyen Payment');
		if (result.success) {
			nuyenAmount = 0;
			nuyenReason = '';
		} else {
			showError(result.error || 'Failed to award nuyen');
		}
	}

	/** Improve an attribute. */
	function handleImproveAttribute(attrKey: string): void {
		const result = improveAttribute(attrKey);
		if (!result.success) {
			showError(result.error || 'Failed to improve attribute');
		}
	}

	/** Improve a skill. */
	function handleImproveSkill(skillName: string): void {
		const result = improveSkill(skillName);
		if (!result.success) {
			showError(result.error || 'Failed to improve skill');
		}
	}

	/** Initiate to next grade. */
	function handleInitiate(): void {
		const result = initiate();
		if (!result.success) {
			showError(result.error || 'Failed to initiate');
		}
	}

	/** Learn a metamagic. */
	function handleLearnMetamagic(name: string): void {
		const result = learnMetamagic(name);
		if (!result.success) {
			showError(result.error || 'Failed to learn metamagic');
		}
	}

	/** Submerge to next grade. */
	function handleSubmerge(): void {
		const result = submerge();
		if (!result.success) {
			showError(result.error || 'Failed to submerge');
		}
	}

	/** Learn an echo. */
	function handleLearnEcho(name: string): void {
		const result = learnEcho(name);
		if (!result.success) {
			showError(result.error || 'Failed to learn echo');
		}
	}

	/** Add a spirit. */
	function handleAddSpirit(): void {
		if (!newSpiritType) return;
		const result = addSpirit(newSpiritType, newSpiritForce, newSpiritServices, newSpiritBound);
		if (result.success) {
			newSpiritType = '';
			newSpiritForce = 3;
			newSpiritServices = 1;
			newSpiritBound = false;
		} else {
			showError(result.error || 'Failed to add spirit');
		}
	}

	/** Add a sprite. */
	function handleAddSprite(): void {
		if (!newSpriteType) return;
		const result = addSprite(newSpriteType, newSpriteRating, newSpriteTasks, false);
		if (result.success) {
			newSpriteType = '';
			newSpriteRating = 3;
			newSpriteTasks = 1;
		} else {
			showError(result.error || 'Failed to add sprite');
		}
	}

	/** Attribute names. */
	const ATTRIBUTES = ['bod', 'agi', 'rea', 'str', 'cha', 'int', 'log', 'wil', 'edg'] as const;
	const ATTR_NAMES: Record<string, string> = {
		bod: 'Body', agi: 'Agility', rea: 'Reaction', str: 'Strength',
		cha: 'Charisma', int: 'Intuition', log: 'Logic', wil: 'Willpower', edg: 'Edge'
	};

	/** Available metamagics (simplified list). */
	const METAMAGICS = [
		'Centering', 'Channeling', 'Extended Masking', 'Flexible Signature', 'Geomancy',
		'Invoking', 'Masking', 'Psychometry', 'Quickening', 'Reflecting', 'Shielding'
	];

	/** Spirit types based on tradition. */
	const SPIRIT_TYPES = ['Air', 'Beast', 'Earth', 'Fire', 'Man', 'Water', 'Guardian', 'Task'];

	/** Sprite types. */
	const SPRITE_TYPES = ['Courier', 'Crack', 'Data', 'Fault', 'Machine', 'Sleuth', 'Generalist'];

	/** Calculate attribute improvement cost. */
	function getAttrCost(attrKey: string): number | null {
		if (!$character) return null;
		const attr = $character.attributes[attrKey as keyof typeof $character.attributes];
		if (typeof attr !== 'object' || attr === null) return null;
		const newRating = attr.base + 1;
		const limits = $character.attributeLimits[attrKey as keyof typeof $character.attributeLimits];
		if (typeof limits === 'object' && limits !== null && 'max' in limits) {
			if (newRating > limits.max) return null;
		}
		return newRating * KARMA_COSTS.IMPROVE_ATTRIBUTE_MULTIPLIER;
	}

	/** Calculate skill improvement cost. */
	function getSkillCost(skillName: string): number | null {
		if (!$character) return null;
		const skill = $character.skills.find(s => s.name === skillName);
		if (!skill) return KARMA_COSTS.NEW_SKILL;
		const newRating = skill.rating + 1;
		if (newRating > 6) return null;
		return newRating * KARMA_COSTS.IMPROVE_SKILL_MULTIPLIER;
	}

	/** Get expense log entries. */
	$: expenseLog = getExpenseLog().slice().reverse();

	/** Initiation cost. */
	$: initiationCost = getInitiationCost();

	/** Submersion cost. */
	$: submersionCost = $character?.resonance ? getSubmersionCost($character.resonance.submersionGrade) : null;

	/** Available metamagic slots. */
	$: metamagicSlots = $character?.magic ? $character.magic.initiateGrade - $character.magic.metamagics.length : 0;

	/** Available echo slots. */
	$: echoSlots = $character?.resonance ? $character.resonance.submersionGrade - $character.resonance.echoes.length : 0;

	/** Tabs based on character type. */
	$: availableTabs = (() => {
		const tabs: { id: Tab; label: string }[] = [
			{ id: 'overview', label: 'Overview' },
			{ id: 'attributes', label: 'Attributes' },
			{ id: 'skills', label: 'Skills' }
		];
		if ($character?.magic) {
			tabs.push({ id: 'magic', label: 'Magic' });
			tabs.push({ id: 'spirits', label: 'Spirits' });
		}
		if ($character?.resonance) {
			tabs.push({ id: 'resonance', label: 'Resonance' });
			tabs.push({ id: 'sprites', label: 'Sprites' });
		}
		tabs.push({ id: 'history', label: 'History' });
		return tabs;
	})();
</script>

<div class="cw-card p-4">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-lg font-medium text-primary-dark">Career Advancement</h2>
		<div class="flex items-center gap-4">
			<span class="text-sm">
				<span class="text-text-muted">Karma:</span>
				<span class="text-secondary-dark font-mono ml-1">{$character?.karma ?? 0}</span>
			</span>
			<span class="text-sm">
				<span class="text-text-muted">Nuyen:</span>
				<span class="text-success-main font-mono ml-1">{($character?.nuyen ?? 0).toLocaleString()}¥</span>
			</span>
		</div>
	</div>

	{#if error}
		<div class="p-2 mb-4 bg-error-main/20 border border-error-main/50 rounded text-error-main text-sm">
			{error}
		</div>
	{/if}

	<!-- Tabs -->
	<nav class="flex flex-wrap gap-1 mb-4 border-b border-border pb-2">
		{#each availableTabs as tab}
			<button
				class="px-3 py-1.5 text-sm rounded transition-colors
					{currentTab === tab.id
						? 'bg-primary-main/20 text-primary-dark'
						: 'text-text-secondary hover:bg-surface-variant'}"
				on:click={() => currentTab = tab.id}
			>
				{tab.label}
			</button>
		{/each}
	</nav>

	<!-- Overview Tab -->
	{#if currentTab === 'overview'}
		<div class="space-y-4">
			<!-- Award Karma -->
			<div class="p-3 bg-surface rounded">
				<h3 class="text-sm font-medium text-text-primary mb-2">Award Karma</h3>
				<div class="flex gap-2">
					<input
						type="number"
						class="cw-input w-20"
						placeholder="Amount"
						bind:value={karmaAmount}
						min="1"
					/>
					<input
						type="text"
						class="cw-input flex-1"
						placeholder="Reason (optional)"
						bind:value={karmaReason}
					/>
					<button
						class="cw-btn cw-btn-primary text-sm"
						on:click={handleAwardKarma}
						disabled={karmaAmount <= 0}
					>
						Award
					</button>
				</div>
			</div>

			<!-- Award Nuyen -->
			<div class="p-3 bg-surface rounded">
				<h3 class="text-sm font-medium text-text-primary mb-2">Award Nuyen</h3>
				<div class="flex gap-2">
					<input
						type="number"
						class="cw-input w-24"
						placeholder="Amount"
						bind:value={nuyenAmount}
						min="1"
					/>
					<input
						type="text"
						class="cw-input flex-1"
						placeholder="Reason (optional)"
						bind:value={nuyenReason}
					/>
					<button
						class="cw-btn cw-btn-primary text-sm"
						on:click={handleAwardNuyen}
						disabled={nuyenAmount <= 0}
					>
						Award
					</button>
				</div>
			</div>

			<!-- Quick Stats -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
				<div class="p-3 bg-surface rounded text-center">
					<div class="text-text-muted text-xs">Total Karma</div>
					<div class="text-secondary-dark font-mono text-lg">{$character?.totalKarma ?? 0}</div>
				</div>
				{#if $character?.magic}
					<div class="p-3 bg-surface rounded text-center">
						<div class="text-text-muted text-xs">Initiate Grade</div>
						<div class="text-info-main font-mono text-lg">{$character.magic.initiateGrade}</div>
					</div>
				{/if}
				{#if $character?.resonance}
					<div class="p-3 bg-surface rounded text-center">
						<div class="text-text-muted text-xs">Submersion</div>
						<div class="text-secondary-dark font-mono text-lg">{$character.resonance.submersionGrade}</div>
					</div>
				{/if}
				<div class="p-3 bg-surface rounded text-center">
					<div class="text-text-muted text-xs">Street Cred</div>
					<div class="text-text-primary font-mono text-lg">{$character?.reputation.streetCred ?? 0}</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Attributes Tab -->
	{#if currentTab === 'attributes' && $character}
		<div class="space-y-2">
			{#each ATTRIBUTES as attrKey}
				{@const attr = $character.attributes[attrKey]}
				{@const limits = $character.attributeLimits[attrKey]}
				{@const cost = getAttrCost(attrKey)}
				{#if attr && typeof attr === 'object'}
					<div class="flex items-center justify-between p-2 bg-surface rounded">
						<div class="flex items-center gap-3">
							<span class="text-text-primary font-medium w-20">{ATTR_NAMES[attrKey]}</span>
							<span class="text-primary-dark font-mono">{attr.base + attr.bonus}</span>
							{#if typeof limits === 'object' && limits !== null && 'max' in limits}
								<span class="text-text-muted text-xs">/ {limits.max}</span>
							{/if}
						</div>
						{#if cost !== null}
							<button
								class="cw-btn cw-btn-secondary text-xs"
								on:click={() => handleImproveAttribute(attrKey)}
								disabled={$character.karma < cost}
							>
								+1 ({cost} karma)
							</button>
						{:else}
							<span class="text-text-muted text-xs">Max</span>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Skills Tab -->
	{#if currentTab === 'skills' && $character}
		<div class="space-y-2 max-h-96 overflow-y-auto">
			{#each $character.skills as skill}
				{@const cost = getSkillCost(skill.name)}
				<div class="flex items-center justify-between p-2 bg-surface rounded">
					<div class="flex items-center gap-3">
						<span class="text-text-primary font-medium">{skill.name}</span>
						<span class="text-primary-dark font-mono">{skill.rating}</span>
						{#if skill.specialization}
							<span class="text-text-muted text-xs">({skill.specialization})</span>
						{/if}
					</div>
					{#if cost !== null}
						<button
							class="cw-btn cw-btn-secondary text-xs"
							on:click={() => handleImproveSkill(skill.name)}
							disabled={$character.karma < cost}
						>
							+1 ({cost} karma)
						</button>
					{:else}
						<span class="text-text-muted text-xs">Max</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Magic Tab -->
	{#if currentTab === 'magic' && $character?.magic}
		<div class="space-y-4">
			<!-- Initiation -->
			<div class="p-3 bg-surface rounded">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-sm font-medium text-text-primary">
						Initiation Grade: <span class="text-info-main">{$character.magic.initiateGrade}</span>
					</h3>
					{#if initiationCost}
						<button
							class="cw-btn cw-btn-primary text-sm"
							on:click={handleInitiate}
							disabled={$character.karma < initiationCost}
						>
							Initiate ({initiationCost} karma)
						</button>
					{/if}
				</div>
			</div>

			<!-- Metamagics -->
			<div class="p-3 bg-surface rounded">
				<h3 class="text-sm font-medium text-text-primary mb-2">
					Metamagics
					{#if metamagicSlots > 0}
						<span class="text-success-main text-xs ml-2">({metamagicSlots} slot{metamagicSlots !== 1 ? 's' : ''} available)</span>
					{/if}
				</h3>
				{#if $character.magic.metamagics.length > 0}
					<div class="flex flex-wrap gap-1 mb-2">
						{#each $character.magic.metamagics as metamagic}
							<span class="px-2 py-0.5 bg-info-main/20 text-info-main text-xs rounded">
								{metamagic}
							</span>
						{/each}
					</div>
				{/if}
				{#if metamagicSlots > 0}
					<div class="flex flex-wrap gap-1">
						{#each METAMAGICS.filter(m => !$character?.magic?.metamagics.includes(m)) as metamagic}
							<button
								class="px-2 py-0.5 bg-surface-variant text-text-secondary text-xs rounded hover:bg-info-main/20 hover:text-info-main transition-colors"
								on:click={() => handleLearnMetamagic(metamagic)}
							>
								+ {metamagic}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Resonance Tab -->
	{#if currentTab === 'resonance' && $character?.resonance}
		<div class="space-y-4">
			<!-- Submersion -->
			<div class="p-3 bg-surface rounded">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-sm font-medium text-text-primary">
						Submersion Grade: <span class="text-secondary-dark">{$character.resonance.submersionGrade}</span>
					</h3>
					{#if submersionCost}
						<button
							class="cw-btn cw-btn-primary text-sm"
							on:click={handleSubmerge}
							disabled={$character.karma < submersionCost}
						>
							Submerge ({submersionCost} karma)
						</button>
					{/if}
				</div>
			</div>

			<!-- Echoes -->
			<div class="p-3 bg-surface rounded">
				<h3 class="text-sm font-medium text-text-primary mb-2">
					Echoes
					{#if echoSlots > 0}
						<span class="text-success-main text-xs ml-2">({echoSlots} slot{echoSlots !== 1 ? 's' : ''} available)</span>
					{/if}
				</h3>
				{#if $character.resonance.echoes.length > 0}
					<div class="flex flex-wrap gap-1 mb-2">
						{#each $character.resonance.echoes as echo}
							<span class="px-2 py-0.5 bg-secondary-main/20 text-secondary-dark text-xs rounded">
								{echo}
							</span>
						{/each}
					</div>
				{/if}
				{#if echoSlots > 0 && $echoesStore}
					<div class="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
						{#each $echoesStore.filter(e => !$character?.resonance?.echoes.includes(e.name)) as echo}
							<button
								class="px-2 py-0.5 bg-surface-variant text-text-secondary text-xs rounded hover:bg-secondary-main/20 hover:text-secondary-dark transition-colors"
								on:click={() => handleLearnEcho(echo.name)}
								title={echo.bonus || ''}
							>
								+ {echo.name}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Spirits Tab -->
	{#if currentTab === 'spirits' && $character?.magic}
		<div class="space-y-4">
			<!-- Add Spirit Form -->
			<div class="p-3 bg-surface rounded">
				<h3 class="text-sm font-medium text-text-primary mb-2">Summon/Bind Spirit</h3>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
					<select class="cw-input text-sm" bind:value={newSpiritType}>
						<option value="">Type...</option>
						{#each SPIRIT_TYPES as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
					<div class="flex items-center gap-1">
						<span class="text-xs text-text-muted">F:</span>
						<input type="number" class="cw-input text-sm w-16" bind:value={newSpiritForce} min="1" max="12" />
					</div>
					<div class="flex items-center gap-1">
						<span class="text-xs text-text-muted">Srv:</span>
						<input type="number" class="cw-input text-sm w-16" bind:value={newSpiritServices} min="0" max="20" />
					</div>
					<div class="flex items-center gap-2">
						<label class="flex items-center gap-1 text-xs text-text-muted">
							<input type="checkbox" bind:checked={newSpiritBound} />
							Bound
						</label>
						<button class="cw-btn cw-btn-primary text-xs" on:click={handleAddSpirit} disabled={!newSpiritType}>
							Add
						</button>
					</div>
				</div>
			</div>

			<!-- Spirit List -->
			<div class="space-y-2">
				{#if $character.magic.spirits.length === 0}
					<p class="text-text-muted text-sm text-center py-4">No spirits summoned.</p>
				{:else}
					{#each $character.magic.spirits as spirit}
						<div class="flex items-center justify-between p-2 bg-surface rounded">
							<div class="flex items-center gap-3">
								<span class="text-text-primary font-medium">{spirit.type}</span>
								<span class="text-info-main text-sm">F{spirit.force}</span>
								<span class="text-text-muted text-sm">{spirit.services} service{spirit.services !== 1 ? 's' : ''}</span>
								{#if spirit.bound}
									<span class="px-1.5 py-0.5 bg-success-main/20 text-success-main text-xs rounded">Bound</span>
								{/if}
							</div>
							<div class="flex gap-1">
								<button
									class="cw-btn text-xs"
									on:click={() => useSpiritService(spirit.id)}
									disabled={spirit.services <= 0}
								>
									Use Service
								</button>
								<button
									class="cw-btn text-xs text-error-main"
									on:click={() => removeSpirit(spirit.id)}
								>
									Release
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

	<!-- Sprites Tab -->
	{#if currentTab === 'sprites' && $character?.resonance}
		<div class="space-y-4">
			<!-- Add Sprite Form -->
			<div class="p-3 bg-surface rounded">
				<h3 class="text-sm font-medium text-text-primary mb-2">Compile Sprite</h3>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
					<select class="cw-input text-sm" bind:value={newSpriteType}>
						<option value="">Type...</option>
						{#each SPRITE_TYPES as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
					<div class="flex items-center gap-1">
						<span class="text-xs text-text-muted">R:</span>
						<input type="number" class="cw-input text-sm w-16" bind:value={newSpriteRating} min="1" max="12" />
					</div>
					<div class="flex items-center gap-1">
						<span class="text-xs text-text-muted">Tasks:</span>
						<input type="number" class="cw-input text-sm w-16" bind:value={newSpriteTasks} min="0" max="20" />
					</div>
					<button class="cw-btn cw-btn-primary text-xs" on:click={handleAddSprite} disabled={!newSpriteType}>
						Add
					</button>
				</div>
			</div>

			<!-- Sprite List -->
			<div class="space-y-2">
				{#if $character.resonance.sprites.length === 0}
					<p class="text-text-muted text-sm text-center py-4">No sprites compiled.</p>
				{:else}
					{#each $character.resonance.sprites as sprite}
						<div class="flex items-center justify-between p-2 bg-surface rounded">
							<div class="flex items-center gap-3">
								<span class="text-text-primary font-medium">{sprite.type}</span>
								<span class="text-secondary-dark text-sm">R{sprite.rating}</span>
								<span class="text-text-muted text-sm">{sprite.tasks} task{sprite.tasks !== 1 ? 's' : ''}</span>
								{#if sprite.registered}
									<span class="px-1.5 py-0.5 bg-success-main/20 text-success-main text-xs rounded">Registered</span>
								{/if}
							</div>
							<div class="flex gap-1">
								<button
									class="cw-btn text-xs"
									on:click={() => useSpriteTask(sprite.id)}
									disabled={sprite.tasks <= 0}
								>
									Use Task
								</button>
								{#if !sprite.registered}
									<button
										class="cw-btn text-xs"
										on:click={() => registerSprite(sprite.id)}
									>
										Register
									</button>
								{/if}
								<button
									class="cw-btn text-xs text-error-main"
									on:click={() => removeSprite(sprite.id)}
								>
									Decompile
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

	<!-- History Tab -->
	{#if currentTab === 'history'}
		<div class="max-h-96 overflow-y-auto">
			{#if expenseLog.length === 0}
				<p class="text-text-muted text-sm text-center py-4">No transactions yet.</p>
			{:else}
				<div class="space-y-1">
					{#each expenseLog as entry}
						<div class="flex items-center justify-between p-2 bg-surface rounded text-sm">
							<div class="flex items-center gap-2">
								<span class="text-text-muted text-xs">
									{new Date(entry.date).toLocaleDateString()}
								</span>
								<span class="text-text-secondary">{entry.reason}</span>
							</div>
							<span class="font-mono {entry.amount >= 0 ? 'text-success-main' : 'text-error-main'}">
								{entry.amount >= 0 ? '+' : ''}{entry.type === 'nuyen' ? entry.amount.toLocaleString() + '¥' : entry.amount + ' karma'}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
