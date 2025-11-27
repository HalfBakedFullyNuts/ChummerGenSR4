<script lang="ts">
	import { character, isCareerMode, getExpenseLog, awardKarma, awardNuyen, spendNuyen, KARMA_COSTS } from '$stores/character';
	import type { ExpenseEntry } from '$types';

	/** Whether the panel is expanded. */
	let expanded = true;

	/** Tab selection: summary, skills, or log. */
	let activeTab: 'summary' | 'skills' | 'log' = 'summary';

	/** Award karma form. */
	let karmaAmount = 0;
	let karmaReason = '';

	/** Award nuyen form. */
	let nuyenAmount = 0;
	let nuyenReason = '';

	/** Error message. */
	let error: string | null = null;

	/** Get expense log. */
	$: expenseLog = $character ? getExpenseLog() : [];

	/** Format date for display. */
	function formatDate(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/** Format nuyen with commas. */
	function formatNuyen(amount: number): string {
		return amount.toLocaleString();
	}

	/** Handle karma award. */
	function handleAwardKarma() {
		if (karmaAmount <= 0) {
			error = 'Amount must be positive';
			return;
		}
		if (!karmaReason.trim()) {
			error = 'Please provide a reason';
			return;
		}

		const result = awardKarma(karmaAmount, karmaReason);
		if (result.success) {
			karmaAmount = 0;
			karmaReason = '';
			error = null;
		} else {
			error = result.error || 'Failed to award karma';
		}
	}

	/** Handle nuyen award. */
	function handleAwardNuyen() {
		if (nuyenAmount <= 0) {
			error = 'Amount must be positive';
			return;
		}
		if (!nuyenReason.trim()) {
			error = 'Please provide a reason';
			return;
		}

		const result = awardNuyen(nuyenAmount, nuyenReason);
		if (result.success) {
			nuyenAmount = 0;
			nuyenReason = '';
			error = null;
		} else {
			error = result.error || 'Failed to award nuyen';
		}
	}

	/** Handle nuyen spend. */
	function handleSpendNuyen() {
		if (nuyenAmount <= 0) {
			error = 'Amount must be positive';
			return;
		}
		if (!nuyenReason.trim()) {
			error = 'Please provide a reason';
			return;
		}

		const result = spendNuyen(nuyenAmount, nuyenReason);
		if (result.success) {
			nuyenAmount = 0;
			nuyenReason = '';
			error = null;
		} else {
			error = result.error || 'Failed to spend nuyen';
		}
	}

	/** Get entry color based on amount. */
	function getEntryColor(entry: ExpenseEntry): string {
		if (entry.amount > 0) return 'text-accent-success';
		if (entry.amount < 0) return 'text-accent-danger';
		return 'text-secondary-text';
	}
</script>

{#if $isCareerMode && $character}
	<div class="cw-card">
		<!-- Header -->
		<button
			class="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors"
			on:click={() => (expanded = !expanded)}
		>
			<div class="flex items-center gap-4">
				<h3 class="text-lg font-bold text-primary-text">Career Mode</h3>
				<div class="flex gap-4 text-sm">
					<span class="text-accent-primary">
						Karma: {$character.karma}
					</span>
					<span class="text-accent-cyan">
						Nuyen: {formatNuyen($character.nuyen)}
					</span>
				</div>
			</div>
			<span class="text-muted-text">{expanded ? '−' : '+'}</span>
		</button>

		{#if expanded}
			<!-- Tabs -->
			<div class="flex border-b border-border">
				<button
					class="px-4 py-2 text-sm transition-colors"
					class:text-accent-primary={activeTab === 'summary'}
					class:border-b-2={activeTab === 'summary'}
					class:border-accent-primary={activeTab === 'summary'}
					class:text-secondary-text={activeTab !== 'summary'}
					on:click={() => (activeTab = 'summary')}
				>
					Summary
				</button>
				<button
					class="px-4 py-2 text-sm transition-colors"
					class:text-accent-primary={activeTab === 'skills'}
					class:border-b-2={activeTab === 'skills'}
					class:border-accent-primary={activeTab === 'skills'}
					class:text-secondary-text={activeTab !== 'skills'}
					on:click={() => (activeTab = 'skills')}
				>
					Karma Costs
				</button>
				<button
					class="px-4 py-2 text-sm transition-colors"
					class:text-accent-primary={activeTab === 'log'}
					class:border-b-2={activeTab === 'log'}
					class:border-accent-primary={activeTab === 'log'}
					class:text-secondary-text={activeTab !== 'log'}
					on:click={() => (activeTab = 'log')}
				>
					Expense Log
				</button>
			</div>

			<div class="p-4">
				<!-- Error Message -->
				{#if error}
					<div class="mb-4 p-3 bg-accent-danger/20 border border-accent-danger rounded text-accent-danger text-sm">
						{error}
					</div>
				{/if}

				<!-- Summary Tab -->
				{#if activeTab === 'summary'}
					<div class="space-y-6">
						<!-- Stats Grid -->
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div class="cw-panel p-3 text-center">
								<div class="text-2xl font-bold text-accent-primary">{$character.karma}</div>
								<div class="text-xs text-muted-text">Current Karma</div>
							</div>
							<div class="cw-panel p-3 text-center">
								<div class="text-2xl font-bold text-secondary-text">{$character.totalKarma}</div>
								<div class="text-xs text-muted-text">Total Earned</div>
							</div>
							<div class="cw-panel p-3 text-center">
								<div class="text-2xl font-bold text-accent-cyan">{formatNuyen($character.nuyen)}</div>
								<div class="text-xs text-muted-text">Nuyen</div>
							</div>
							<div class="cw-panel p-3 text-center">
								<div class="text-2xl font-bold text-secondary-text">{$character.reputation.streetCred}</div>
								<div class="text-xs text-muted-text">Street Cred</div>
							</div>
						</div>

						<!-- Award Karma -->
						<div class="space-y-2">
							<h4 class="text-sm font-medium text-primary-text">Award Karma</h4>
							<div class="flex gap-2">
								<input
									type="number"
									class="cw-input w-24"
									placeholder="Amount"
									min="1"
									bind:value={karmaAmount}
								/>
								<input
									type="text"
									class="cw-input flex-1"
									placeholder="Reason (e.g., Session 5)"
									bind:value={karmaReason}
								/>
								<button class="cw-btn cw-btn-primary" on:click={handleAwardKarma}>
									Award
								</button>
							</div>
						</div>

						<!-- Nuyen Management -->
						<div class="space-y-2">
							<h4 class="text-sm font-medium text-primary-text">Nuyen</h4>
							<div class="flex gap-2">
								<input
									type="number"
									class="cw-input w-32"
									placeholder="Amount"
									min="1"
									bind:value={nuyenAmount}
								/>
								<input
									type="text"
									class="cw-input flex-1"
									placeholder="Reason"
									bind:value={nuyenReason}
								/>
								<button class="cw-btn text-accent-success" on:click={handleAwardNuyen}>
									+Award
								</button>
								<button class="cw-btn text-accent-danger" on:click={handleSpendNuyen}>
									-Spend
								</button>
							</div>
						</div>
					</div>
				{/if}

				<!-- Karma Costs Tab -->
				{#if activeTab === 'skills'}
					<div class="space-y-4">
						<p class="text-sm text-secondary-text">
							Reference table for karma costs in SR4.
						</p>
						<div class="grid gap-2 text-sm">
							<div class="flex justify-between py-1 border-b border-border">
								<span class="text-secondary-text">New Active Skill (rating 1)</span>
								<span class="text-primary-text font-medium">{KARMA_COSTS.NEW_SKILL} karma</span>
							</div>
							<div class="flex justify-between py-1 border-b border-border">
								<span class="text-secondary-text">Improve Active Skill</span>
								<span class="text-primary-text font-medium">New Rating x {KARMA_COSTS.IMPROVE_SKILL_MULTIPLIER} karma</span>
							</div>
							<div class="flex justify-between py-1 border-b border-border">
								<span class="text-secondary-text">New Skill Group (rating 1)</span>
								<span class="text-primary-text font-medium">{KARMA_COSTS.NEW_SKILL_GROUP} karma</span>
							</div>
							<div class="flex justify-between py-1 border-b border-border">
								<span class="text-secondary-text">Improve Skill Group</span>
								<span class="text-primary-text font-medium">New Rating x {KARMA_COSTS.IMPROVE_SKILL_GROUP_MULTIPLIER} karma</span>
							</div>
							<div class="flex justify-between py-1 border-b border-border">
								<span class="text-secondary-text">New Knowledge Skill</span>
								<span class="text-primary-text font-medium">{KARMA_COSTS.NEW_KNOWLEDGE_SKILL} karma</span>
							</div>
							<div class="flex justify-between py-1 border-b border-border">
								<span class="text-secondary-text">Improve Knowledge Skill</span>
								<span class="text-primary-text font-medium">New Rating x {KARMA_COSTS.IMPROVE_KNOWLEDGE_SKILL_MULTIPLIER} karma</span>
							</div>
							<div class="flex justify-between py-1 border-b border-border">
								<span class="text-secondary-text">Improve Attribute</span>
								<span class="text-primary-text font-medium">New Rating x {KARMA_COSTS.IMPROVE_ATTRIBUTE_MULTIPLIER} karma</span>
							</div>
							<div class="flex justify-between py-1 border-b border-border">
								<span class="text-secondary-text">Learn Spell</span>
								<span class="text-primary-text font-medium">{KARMA_COSTS.NEW_SPELL} karma</span>
							</div>
							<div class="flex justify-between py-1 border-b border-border">
								<span class="text-secondary-text">Learn Complex Form</span>
								<span class="text-primary-text font-medium">{KARMA_COSTS.NEW_COMPLEX_FORM} karma</span>
							</div>
							<div class="flex justify-between py-1 border-b border-border">
								<span class="text-secondary-text">Initiation</span>
								<span class="text-primary-text font-medium">{KARMA_COSTS.INITIATION_BASE} + (Grade x {KARMA_COSTS.INITIATION_MULTIPLIER}) karma</span>
							</div>
							<div class="flex justify-between py-1">
								<span class="text-secondary-text">Add/Remove Quality</span>
								<span class="text-primary-text font-medium">BP x {KARMA_COSTS.QUALITY_MULTIPLIER} karma</span>
							</div>
						</div>
					</div>
				{/if}

				<!-- Expense Log Tab -->
				{#if activeTab === 'log'}
					<div class="space-y-2">
						{#if expenseLog.length === 0}
							<p class="text-muted-text text-center py-4">No transactions recorded yet.</p>
						{:else}
							<div class="max-h-64 overflow-y-auto">
								{#each [...expenseLog].reverse() as entry (entry.id)}
									<div class="flex items-center justify-between py-2 border-b border-border text-sm">
										<div>
											<span class="text-muted-text">{formatDate(entry.date)}</span>
											<span class="mx-2 text-border">|</span>
											<span class="text-secondary-text">{entry.reason}</span>
										</div>
										<div class="flex items-center gap-2">
											<span class={getEntryColor(entry)}>
												{entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString()}
											</span>
											<span class="text-muted-text text-xs">
												{entry.type}
											</span>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
