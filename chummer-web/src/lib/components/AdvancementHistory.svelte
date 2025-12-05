<script lang="ts">
	/**
	 * Advancement History Component
	 * =============================
	 * Displays character advancement history including
	 * karma and nuyen transactions with filtering and export.
	 */

	import { character } from '$stores/character';
	import type { ExpenseEntry, ExpenseCategory } from '$lib/types/character';

	/** Filter by expense type. */
	let typeFilter: 'all' | 'karma' | 'nuyen' = 'all';

	/** Filter by category. */
	let categoryFilter: ExpenseCategory | 'all' = 'all';

	/** Filter by session. */
	let sessionFilter: string | 'all' = 'all';

	/** Search query. */
	let searchQuery = '';

	/** Sort direction. */
	let sortNewestFirst = true;

	/** Group by session toggle. */
	let groupBySession = false;

	/** All expense categories. */
	const categories: ExpenseCategory[] = [
		'Attribute', 'Skill', 'Quality', 'Spell', 'Power', 'ComplexForm',
		'Initiation', 'Submersion', 'Gear', 'Lifestyle', 'Contact', 'Mission', 'Other'
	];

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

	/** Get unique sessions from expense log. */
	$: uniqueSessions = [...new Set(expenseLog.filter(e => e.session).map(e => e.session!))]
		.sort((a, b) => b.localeCompare(a));

	/** Filter and sort expense log. */
	$: filteredLog = (() => {
		let result = [...expenseLog];

		/* Filter by type */
		if (typeFilter !== 'all') {
			result = result.filter((e) => e.type === typeFilter);
		}

		/* Filter by category */
		if (categoryFilter !== 'all') {
			result = result.filter((e) => e.category === categoryFilter);
		}

		/* Filter by session */
		if (sessionFilter !== 'all') {
			result = result.filter((e) => e.session === sessionFilter);
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

	/** Group entries by session. */
	$: groupedBySession = (() => {
		if (!groupBySession) return null;

		const groups = new Map<string, ExpenseEntry[]>();
		for (const entry of filteredLog) {
			const session = entry.session || 'No Session';
			if (!groups.has(session)) {
				groups.set(session, []);
			}
			groups.get(session)!.push(entry);
		}
		return groups;
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
		const headers = ['Date', 'Type', 'Category', 'Session', 'Amount', 'Reason'];
		const rows = filteredLog.map((e) => [
			e.date,
			e.type,
			e.category || '',
			e.session || '',
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

	/** Export history to JSON. */
	function exportToJSON(): void {
		const data = {
			characterName: $character?.identity.name || 'Unknown',
			exportDate: new Date().toISOString(),
			summary: {
				karma: { current: currentKarma, total: totalKarma, ...karmaTotals },
				nuyen: { current: currentNuyen, starting: startingNuyen, ...nuyenTotals }
			},
			entries: filteredLog
		};

		const json = JSON.stringify(data, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = `advancement-history-${$character?.identity.name || 'character'}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	/** Get category color class. */
	function getCategoryColor(category: ExpenseCategory | undefined): string {
		if (!category) return 'bg-surface-lighter text-muted-text';
		const colors: Record<ExpenseCategory, string> = {
			Attribute: 'bg-accent-success/20 text-accent-success',
			Skill: 'bg-accent-cyan/20 text-accent-cyan',
			Quality: 'bg-accent-magenta/20 text-accent-magenta',
			Spell: 'bg-accent-primary/20 text-accent-primary',
			Power: 'bg-accent-warning/20 text-accent-warning',
			ComplexForm: 'bg-blue-500/20 text-blue-400',
			Initiation: 'bg-purple-500/20 text-purple-400',
			Submersion: 'bg-indigo-500/20 text-indigo-400',
			Gear: 'bg-orange-500/20 text-orange-400',
			Lifestyle: 'bg-emerald-500/20 text-emerald-400',
			Contact: 'bg-yellow-500/20 text-yellow-400',
			Mission: 'bg-red-500/20 text-red-400',
			Other: 'bg-surface-lighter text-muted-text'
		};
		return colors[category];
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-medium text-primary-text">Advancement History</h3>
		{#if expenseLog.length > 0}
			<div class="flex gap-2">
				<button class="text-xs text-accent-cyan hover:underline" on:click={exportToCSV}>
					Export CSV
				</button>
				<button class="text-xs text-accent-primary hover:underline" on:click={exportToJSON}>
					Export JSON
				</button>
			</div>
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
	<div class="space-y-3">
		<!-- Type and Search Row -->
		<div class="flex flex-wrap items-center gap-3">
			<div class="flex items-center gap-2">
				<span class="text-xs text-muted-text">Type:</span>
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
		</div>

		<!-- Category and Session Row -->
		<div class="flex flex-wrap items-center gap-3">
			<div class="flex items-center gap-2">
				<span class="text-xs text-muted-text">Category:</span>
				<select
					class="cw-input text-xs py-1"
					bind:value={categoryFilter}
				>
					<option value="all">All Categories</option>
					{#each categories as cat}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
			</div>

			{#if uniqueSessions.length > 0}
				<div class="flex items-center gap-2">
					<span class="text-xs text-muted-text">Session:</span>
					<select
						class="cw-input text-xs py-1"
						bind:value={sessionFilter}
					>
						<option value="all">All Sessions</option>
						{#each uniqueSessions as session}
							<option value={session}>{session}</option>
						{/each}
					</select>
				</div>
			{/if}

			<button
				class="text-xs px-2 py-1 rounded transition-colors
					{groupBySession ? 'bg-accent-primary/20 text-accent-primary' : 'bg-surface-light text-secondary-text hover:bg-surface-lighter'}"
				on:click={() => (groupBySession = !groupBySession)}
			>
				{groupBySession ? '✓ ' : ''}Group by Session
			</button>

			<button
				class="text-xs px-2 py-1 rounded bg-surface-light text-secondary-text hover:bg-surface-lighter transition-colors"
				on:click={() => (sortNewestFirst = !sortNewestFirst)}
			>
				{sortNewestFirst ? '↓ Newest' : '↑ Oldest'} first
			</button>
		</div>
	</div>

	<!-- History List -->
	{#if filteredLog.length > 0}
		{#if groupBySession && groupedBySession}
			<!-- Grouped by Session View -->
			{#each [...groupedBySession.entries()] as [session, entries]}
				<div class="space-y-1">
					<div class="flex items-center justify-between py-2 border-b border-border">
						<h4 class="text-sm font-medium text-secondary-text">{session}</h4>
						<span class="text-xs text-muted-text">{entries.length} entries</span>
					</div>
					{#each entries as entry}
						<div class="cw-panel p-3 flex items-center justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="text-xs px-1.5 py-0.5 rounded
										{entry.type === 'karma'
											? 'bg-accent-magenta/20 text-accent-magenta'
											: 'bg-accent-cyan/20 text-accent-cyan'}">
										{entry.type}
									</span>
									{#if entry.category}
										<span class="text-xs px-1.5 py-0.5 rounded {getCategoryColor(entry.category)}">
											{entry.category}
										</span>
									{/if}
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
			{/each}
		{:else}
			<!-- Flat List View -->
			<div class="space-y-1">
				{#each filteredLog as entry}
					<div class="cw-panel p-3 flex items-center justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="text-xs px-1.5 py-0.5 rounded
									{entry.type === 'karma'
										? 'bg-accent-magenta/20 text-accent-magenta'
										: 'bg-accent-cyan/20 text-accent-cyan'}">
									{entry.type}
								</span>
								{#if entry.category}
									<span class="text-xs px-1.5 py-0.5 rounded {getCategoryColor(entry.category)}">
										{entry.category}
									</span>
								{/if}
								<span class="text-sm text-primary-text">{entry.reason}</span>
							</div>
							<div class="flex items-center gap-2 text-xs text-muted-text mt-1">
								<span>{formatDate(entry.date)}</span>
								{#if entry.session}
									<span class="px-1.5 py-0.5 rounded bg-surface-lighter">{entry.session}</span>
								{/if}
							</div>
						</div>
						<div class="text-right font-mono text-sm
							{entry.amount >= 0 ? 'text-accent-success' : 'text-accent-danger'}">
							{entry.amount >= 0 ? '+' : ''}{entry.type === 'nuyen' ? formatNuyen(entry.amount) : entry.amount}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Results summary -->
		<div class="text-xs text-muted-text text-right">
			Showing {filteredLog.length} of {expenseLog.length} entries
		</div>
	{:else if expenseLog.length > 0}
		<div class="cw-panel p-6 text-center">
			<p class="text-muted-text">No entries match your filters.</p>
			<button
				class="text-xs text-accent-cyan hover:underline mt-2"
				on:click={() => {
					typeFilter = 'all';
					categoryFilter = 'all';
					sessionFilter = 'all';
					searchQuery = '';
				}}
			>
				Clear all filters
			</button>
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
