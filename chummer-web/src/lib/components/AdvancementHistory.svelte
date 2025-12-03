<script lang="ts">
	/**
	 * Advancement History Component
	 * =============================
	 * Displays character advancement history including
	 * karma and nuyen transactions.
	 */

	import { character } from '$stores/character';
	import type { ExpenseEntry } from '$lib/types/character';

	/** Filter by expense type. */
	let typeFilter: 'all' | 'karma' | 'nuyen' = 'all';

	/** Search query. */
	let searchQuery = '';

	/** Sort direction. */
	let sortNewestFirst = true;

	/** Get expense log. */
	$: expenseLog = $character?.expenseLog ?? [];

	/** Current karma. */
	$: currentKarma = $character?.karma ?? 0;

	/** Total karma earned. */
	$: totalKarma = $character?.totalKarma ?? 0;

	/** Current nuyen. */
	$: currentNuyen = $character?.nuyen ?? 0;

	/** Starting nuyen. */
	$: startingNuyen = $character?.startingNuyen ?? 0;

	/** Filter and sort expense log. */
	$: filteredLog = (() => {
		let result = [...expenseLog];

		/* Filter by type */
		if (typeFilter !== 'all') {
			result = result.filter((e) => e.type === typeFilter);
		}

		/* Filter by search */
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter((e) =>
				e.reason.toLowerCase().includes(query)
			);
		}

		/* Sort by date */
		result.sort((a, b) => {
			const dateA = new Date(a.date).getTime();
			const dateB = new Date(b.date).getTime();
			return sortNewestFirst ? dateB - dateA : dateA - dateB;
		});

		return result;
	})();

	/** Calculate totals for a type. */
	function calculateTotals(type: 'karma' | 'nuyen'): { earned: number; spent: number } {
		const entries = expenseLog.filter((e) => e.type === type);
		const earned = entries.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
		const spent = entries.filter((e) => e.amount < 0).reduce((sum, e) => sum + Math.abs(e.amount), 0);
		return { earned, spent };
	}

	$: karmaTotals = calculateTotals('karma');
	$: nuyenTotals = calculateTotals('nuyen');

	/** Format date. */
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	/** Format nuyen. */
	function formatNuyen(amount: number): string {
		return Math.abs(amount).toLocaleString() + '¥';
	}

	/** Export history to CSV. */
	function exportToCSV(): void {
		const headers = ['Date', 'Type', 'Amount', 'Reason'];
		const rows = expenseLog.map((e) => [
			e.date,
			e.type,
			e.amount.toString(),
			`"${e.reason.replace(/"/g, '""')}"`
		]);

		const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = `advancement-history-${$character?.identity.name || 'character'}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-medium text-primary-text">Advancement History</h3>
		{#if expenseLog.length > 0}
			<button class="text-xs text-accent-cyan hover:underline" on:click={exportToCSV}>
				Export CSV
			</button>
		{/if}
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-2 gap-3">
		<div class="cw-panel p-3">
			<h4 class="text-xs text-muted-text uppercase tracking-wide mb-2">Karma</h4>
			<div class="text-2xl font-mono text-accent-magenta mb-2">{currentKarma}</div>
			<div class="flex justify-between text-xs">
				<span class="text-accent-success">+{karmaTotals.earned} earned</span>
				<span class="text-accent-danger">-{karmaTotals.spent} spent</span>
			</div>
			<div class="text-xs text-muted-text mt-1">
				Total lifetime: {totalKarma}
			</div>
		</div>

		<div class="cw-panel p-3">
			<h4 class="text-xs text-muted-text uppercase tracking-wide mb-2">Nuyen</h4>
			<div class="text-2xl font-mono text-accent-cyan mb-2">{currentNuyen.toLocaleString()}¥</div>
			<div class="flex justify-between text-xs">
				<span class="text-accent-success">+{formatNuyen(nuyenTotals.earned)} earned</span>
				<span class="text-accent-danger">-{formatNuyen(nuyenTotals.spent)} spent</span>
			</div>
			<div class="text-xs text-muted-text mt-1">
				Started with: {formatNuyen(startingNuyen)}
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap items-center gap-3">
		<div class="flex items-center gap-2">
			<span class="text-xs text-muted-text">Filter:</span>
			<button
				class="text-xs px-2 py-1 rounded transition-colors
					{typeFilter === 'all' ? 'bg-accent-primary/20 text-accent-primary' : 'bg-surface-light text-secondary-text hover:bg-surface-lighter'}"
				on:click={() => (typeFilter = 'all')}
			>
				All
			</button>
			<button
				class="text-xs px-2 py-1 rounded transition-colors
					{typeFilter === 'karma' ? 'bg-accent-magenta/20 text-accent-magenta' : 'bg-surface-light text-secondary-text hover:bg-surface-lighter'}"
				on:click={() => (typeFilter = 'karma')}
			>
				Karma
			</button>
			<button
				class="text-xs px-2 py-1 rounded transition-colors
					{typeFilter === 'nuyen' ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-surface-light text-secondary-text hover:bg-surface-lighter'}"
				on:click={() => (typeFilter = 'nuyen')}
			>
				Nuyen
			</button>
		</div>

		<input
			type="text"
			class="cw-input text-sm flex-1 min-w-[150px]"
			placeholder="Search history..."
			bind:value={searchQuery}
		/>

		<button
			class="text-xs px-2 py-1 rounded bg-surface-light text-secondary-text hover:bg-surface-lighter transition-colors"
			on:click={() => (sortNewestFirst = !sortNewestFirst)}
		>
			{sortNewestFirst ? '↓ Newest' : '↑ Oldest'} first
		</button>
	</div>

	<!-- History List -->
	{#if filteredLog.length > 0}
		<div class="space-y-1">
			{#each filteredLog as entry}
				<div class="cw-panel p-3 flex items-center justify-between">
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<span class="text-xs px-1.5 py-0.5 rounded
								{entry.type === 'karma'
									? 'bg-accent-magenta/20 text-accent-magenta'
									: 'bg-accent-cyan/20 text-accent-cyan'}">
								{entry.type}
							</span>
							<span class="text-sm text-primary-text">{entry.reason}</span>
						</div>
						<div class="text-xs text-muted-text mt-1">
							{formatDate(entry.date)}
						</div>
					</div>
					<div class="text-right font-mono text-sm
						{entry.amount >= 0 ? 'text-accent-success' : 'text-accent-danger'}">
						{entry.amount >= 0 ? '+' : ''}{entry.type === 'nuyen' ? formatNuyen(entry.amount) : entry.amount}
					</div>
				</div>
			{/each}
		</div>
	{:else if expenseLog.length > 0}
		<div class="cw-panel p-6 text-center">
			<p class="text-muted-text">No entries match your filters.</p>
		</div>
	{:else}
		<div class="cw-panel p-6 text-center">
			<p class="text-muted-text">No advancement history yet.</p>
			<p class="text-xs text-muted-text mt-1">
				History will be recorded when you spend karma or nuyen in career mode.
			</p>
		</div>
	{/if}
</div>
