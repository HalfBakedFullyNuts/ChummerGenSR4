<script lang="ts">
	/**
	 * Spirit Manager Component
	 * ========================
	 * Manages bound spirits for magicians.
	 * Supports summoning, binding, and service tracking.
	 */

	import {
		character,
		addSpirit,
		removeSpirit,
		useSpiritService,
		updateSpiritServices
	} from '$stores/character';
	import { traditions, type GameTradition } from '$stores/gamedata';

	/** All spirit types in SR4. */
	const SPIRIT_TYPES = [
		'Spirit of Air',
		'Spirit of Beasts',
		'Spirit of Earth',
		'Spirit of Fire',
		'Spirit of Man',
		'Spirit of Water',
		'Guardian Spirit',
		'Guidance Spirit',
		'Plant Spirit',
		'Task Spirit'
	] as const;

	/** Current spirit type for summoning. */
	let selectedType = SPIRIT_TYPES[0];

	/** Current force for summoning. */
	let selectedForce = 4;

	/** Number of services. */
	let selectedServices = 1;

	/** Whether binding the spirit. */
	let binding = false;

	/** Error message. */
	let error = '';

	/** Get tradition-specific spirits. */
	function getTraditionSpirits(tradition: string | undefined, allTraditions: readonly GameTradition[]): readonly string[] {
		if (!tradition) return SPIRIT_TYPES;
		const trad = allTraditions.find((t) => t.name === tradition);
		if (!trad) return SPIRIT_TYPES;
		return trad.spirits;
	}

	/** Handle spirit summoning. */
	function handleSummon(): void {
		error = '';
		const result = addSpirit(selectedType, selectedForce, selectedServices, binding);
		if (!result.success) {
			error = result.error || 'Failed to summon spirit';
		} else {
			/* Reset for next summon */
			selectedServices = 1;
			binding = false;
		}
	}

	/** Handle service use. */
	function handleUseService(spiritId: string): void {
		const result = useSpiritService(spiritId);
		if (!result.success) {
			error = result.error || 'Failed to use service';
		}
	}

	/** Handle spirit dismissal. */
	function handleDismiss(spiritId: string): void {
		removeSpirit(spiritId);
	}

	/** Add services (after binding). */
	function handleAddServices(spiritId: string, current: number): void {
		const newServices = prompt('Enter new service total:', String(current));
		if (newServices !== null) {
			const num = parseInt(newServices, 10);
			if (!isNaN(num) && num >= 0) {
				updateSpiritServices(spiritId, num);
			}
		}
	}

	$: traditionSpirits = $traditions ? getTraditionSpirits($character?.magic?.tradition, $traditions) : SPIRIT_TYPES;
	$: spirits = $character?.magic?.spirits ?? [];
	$: magicRating = $character?.attributes.mag?.base ?? 0;
</script>

<div class="space-y-4">
	<h3 class="text-lg font-medium text-accent-magenta">Bound Spirits</h3>

	<!-- Current Spirits List -->
	{#if spirits.length > 0}
		<div class="space-y-2">
			{#each spirits as spirit}
				<div
					class="cw-panel p-3 flex items-center justify-between
						{spirit.bound ? 'border-accent-magenta/50' : 'border-accent-warning/50'}"
				>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<span class="font-medium text-primary-text">{spirit.type}</span>
							<span class="cw-badge text-xs {spirit.bound ? 'cw-badge-success' : 'cw-badge-warning'}">
								{spirit.bound ? 'Bound' : 'Summoned'}
							</span>
						</div>
						<div class="flex items-center gap-4 text-xs text-muted-text mt-1">
							<span>Force {spirit.force}</span>
							<span class="text-accent-cyan">
								{spirit.services} service{spirit.services !== 1 ? 's' : ''} remaining
							</span>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<button
							class="cw-btn cw-btn-secondary text-xs"
							disabled={spirit.services <= 0}
							on:click={() => handleUseService(spirit.id)}
							title="Use one service"
						>
							Use
						</button>
						{#if spirit.bound}
							<button
								class="cw-btn text-xs"
								on:click={() => handleAddServices(spirit.id, spirit.services)}
								title="Add services (after additional binding)"
							>
								+Svc
							</button>
						{/if}
						<button
							class="cw-btn cw-btn-danger text-xs"
							on:click={() => handleDismiss(spirit.id)}
							title="Dismiss spirit"
						>
							Dismiss
						</button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-muted-text text-sm">No spirits bound or summoned.</p>
	{/if}

	<!-- Summon New Spirit -->
	<div class="cw-card">
		<h4 class="cw-card-header mb-3">Summon Spirit</h4>

		{#if error}
			<div class="text-accent-danger text-sm mb-3">{error}</div>
		{/if}

		<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
			<div>
				<label class="text-xs text-muted-text block mb-1" for="spirit-type">Spirit Type</label>
				<select id="spirit-type" class="cw-input text-sm w-full" bind:value={selectedType}>
					{#each traditionSpirits as spiritType}
						<option value={spiritType}>{spiritType}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="text-xs text-muted-text block mb-1" for="spirit-force">Force</label>
				<input
					id="spirit-force"
					type="number"
					class="cw-input text-sm w-full"
					bind:value={selectedForce}
					min="1"
					max="12"
				/>
			</div>
			<div>
				<label class="text-xs text-muted-text block mb-1" for="spirit-services">Services</label>
				<input
					id="spirit-services"
					type="number"
					class="cw-input text-sm w-full"
					bind:value={selectedServices}
					min="0"
					max="20"
				/>
			</div>
			<div class="flex items-end">
				<label class="flex items-center gap-2 cursor-pointer py-2">
					<input
						type="checkbox"
						class="w-4 h-4 accent-accent-magenta"
						bind:checked={binding}
					/>
					<span class="text-sm text-secondary-text">Binding</span>
				</label>
			</div>
		</div>

		{#if selectedForce > magicRating}
			<p class="text-accent-warning text-xs mb-3">
				Warning: Force exceeds Magic ({magicRating}). Drain will be Physical!
			</p>
		{/if}

		<button class="cw-btn w-full" on:click={handleSummon}>
			{binding ? 'Bind' : 'Summon'} {selectedType}
		</button>

		<p class="text-muted-text text-xs mt-2">
			Summoning: MAG + Summoning vs Force. Net hits = services.
			{#if binding}
				Binding: MAG + Binding vs Force × 2.
			{/if}
		</p>
	</div>
</div>
