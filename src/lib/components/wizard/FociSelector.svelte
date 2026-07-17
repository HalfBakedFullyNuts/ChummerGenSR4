<script lang="ts">
	import { character } from '$stores';
	import { addFocus, removeFocus } from '$stores/equipment';
	import { bondFocus, unbondFocus, getFocusKarmaCost } from '$stores/magic';
	import { gameData } from '$stores/gamedata';
	import BookReference from '$lib/components/ui/BookReference.svelte';
	/** Format currency for display */
	function formatNuyen(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'JPY',
			maximumFractionDigits: 0
		})
			.format(amount)
			.replace('¥', '¥');
	}

	/** Get foci data from game data */
	$: availableFoci = $gameData.gear.filter(
		(g) => g.category === 'Foci' || g.category === 'Metamagic Foci'
	);

	/** Search filter */
	let searchQuery = '';
	$: filteredFoci = availableFoci.filter(
		(f) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	/** Store selection state for Force per focus */
	let selectedForce: Record<string, number> = {};

	/** Ensure we have a default Force for everything */
	$: {
		for (const f of filteredFoci) {
			if (selectedForce[f.name] === undefined) {
				selectedForce[f.name] = 1;
			}
		}
	}

	function handleAddFocus(name: string, category: string) {
		const force = selectedForce[name] || 1;
		let costMultiplier = 10000;
		if (name.includes('Power Focus')) costMultiplier = 25000;

		addFocus(name, category, force, costMultiplier);
	}

	function handleBondFocus(id: string) {
		const result = bondFocus(id);
		if (!result.success) {
			alert(result.error);
		}
	}

	function handleUnbondFocus(id: string) {
		unbondFocus(id);
	}

	function handleRemoveFocus(id: string) {
		removeFocus(id);
	}
</script>

<div class="space-y-6">
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
		<div class="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
			<h3 class="text-lg font-medium text-gray-900">Owned Foci</h3>
		</div>
		<div class="p-4 space-y-3">
			{#if !$character?.equipment.foci || $character.equipment.foci.length === 0}
				<p class="text-gray-500 text-sm italic">No foci purchased yet.</p>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each $character.equipment.foci as focus}
						<div
							class="p-3 border rounded-lg {focus.bonded
								? 'bg-purple-50 border-purple-200'
								: 'bg-white border-gray-200'} flex justify-between items-start"
						>
							<div class="space-y-1">
								<h4 class="font-medium text-gray-900 flex items-center gap-2">
									{focus.name}
									<span class="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
										Force {focus.force}
									</span>
								</h4>
								<div class="text-xs text-gray-500">
									{focus.category} &bull; {formatNuyen(focus.cost)}
								</div>
								{#if focus.bonded}
									<div class="text-xs font-semibold text-purple-700">Bonded</div>
								{:else}
									<div class="text-xs text-orange-600">
										Unbonded (Costs {getFocusKarmaCost(focus.name, focus.category, focus.force)} Karma)
									</div>
								{/if}
							</div>
							<div class="flex items-center gap-2">
								{#if !focus.bonded}
									<button
										type="button"
										on:click={() => handleBondFocus(focus.id)}
										class="px-2 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-xs font-medium transition-colors"
										title="Bond Focus"
									>
										Bond
									</button>
								{:else}
									<button
										type="button"
										on:click={() => handleUnbondFocus(focus.id)}
										class="px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-xs transition-colors"
										title="Unbond Focus"
									>
										Unbond
									</button>
								{/if}
								<button
									type="button"
									on:click={() => handleRemoveFocus(focus.id)}
									class="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
									title="Remove Focus"
								>
									<span class="material-icons text-sm">delete</span>
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
		<div class="p-4 bg-gray-50 border-b border-gray-200 space-y-4">
			<h3 class="text-lg font-medium text-gray-900">Purchase Foci</h3>
			<div class="relative max-w-md">
				<span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
					<span class="material-icons text-[18px]">search</span>
				</span>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search foci..."
					class="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-main focus:border-transparent transition-shadow"
				/>
			</div>
		</div>

		<div class="divide-y divide-gray-200 max-h-96 overflow-y-auto">
			{#if filteredFoci.length === 0}
				<div class="p-8 text-center text-gray-500">
					No foci found matching "{searchQuery}"
				</div>
			{:else}
				{#each filteredFoci as focus}
					<div class="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
						<div class="flex-1 min-w-0 pr-4">
							<h4 class="font-medium text-gray-900 truncate flex items-center gap-2">
								{focus.name}
							</h4>
							<div class="mt-1 flex items-center gap-3 text-sm text-gray-500">
								<span>{focus.category}</span>
								<span>
									<BookReference code={focus.source} page={focus.page} expanded={false} />
								</span>
							</div>
						</div>

						<div class="flex items-center gap-4 shrink-0">
							<div class="flex items-center gap-2">
								<label for="force-{focus.name}" class="text-xs font-semibold text-gray-700"
									>Force</label
								>
								<input
									id="force-{focus.name}"
									type="number"
									min="1"
									max="10"
									bind:value={selectedForce[focus.name]}
									class="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-primary-main focus:border-primary-main"
								/>
							</div>

							<button
								type="button"
								on:click={() => handleAddFocus(focus.name, focus.category)}
								class="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 font-medium rounded-lg text-sm transition-colors flex items-center gap-1"
							>
								<span class="material-icons text-[18px]">add_shopping_cart</span>
								Buy
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
