<script lang="ts">
	/**
	 * Build Method Confirmation Modal
	 * ================================
	 * Modal for selecting build method with customizable BP/Karma values
	 * and quick presets (Low Level, Default, Prime Runner).
	 */

	import { createEventDispatcher } from 'svelte';
	import type { BuildMethod } from '$types';

	export let open = false;
	export let method: BuildMethod = 'bp';

	const dispatch = createEventDispatcher<{
		confirm: { method: BuildMethod; points: number };
		cancel: void;
	}>();

	/** Preset configurations */
	const PRESETS = {
		bp: {
			low: { label: 'Low Level', points: 300, description: 'Street-level characters' },
			default: { label: 'Standard', points: 400, description: 'Default SR4 creation' },
			prime: { label: 'Prime Runner', points: 500, description: 'Experienced professionals' }
		},
		karma: {
			low: { label: 'Low Level', points: 550, description: 'Street-level characters' },
			default: { label: 'Standard', points: 750, description: 'Default karma build' },
			prime: { label: 'Prime Runner', points: 875, description: 'Experienced professionals' }
		}
	} as const;

	/** Preset keys for iteration */
	const PRESET_KEYS: readonly ('low' | 'default' | 'prime')[] = ['low', 'default', 'prime'];

	/** Current points value */
	let pointsValue = method === 'karma' ? 750 : 400;
	let selectedPreset: 'low' | 'default' | 'prime' | 'custom' = 'default';

	/** Update points when method changes */
	$: {
		if (method === 'karma') {
			pointsValue = PRESETS.karma[selectedPreset === 'custom' ? 'default' : selectedPreset].points;
		} else {
			pointsValue = PRESETS.bp[selectedPreset === 'custom' ? 'default' : selectedPreset].points;
		}
	}

	/** Handle preset selection */
	function selectPreset(preset: 'low' | 'default' | 'prime'): void {
		selectedPreset = preset;
		pointsValue = method === 'karma'
			? PRESETS.karma[preset].points
			: PRESETS.bp[preset].points;
	}

	/** Handle custom input change */
	function handleCustomInput(event: Event): void {
		const target = event.target as HTMLInputElement;
		const value = parseInt(target.value, 10);
		if (!isNaN(value) && value > 0) {
			pointsValue = value;
			// Check if it matches a preset
			const presets = method === 'karma' ? PRESETS.karma : PRESETS.bp;
			if (value === presets.low.points) {
				selectedPreset = 'low';
			} else if (value === presets.default.points) {
				selectedPreset = 'default';
			} else if (value === presets.prime.points) {
				selectedPreset = 'prime';
			} else {
				selectedPreset = 'custom';
			}
		}
	}

	/** Confirm selection */
	function handleConfirm(): void {
		dispatch('confirm', { method, points: pointsValue });
		open = false;
	}

	/** Cancel and close */
	function handleCancel(): void {
		dispatch('cancel');
		open = false;
	}

	/** Handle backdrop click */
	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}

	/** Handle escape key */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			handleCancel();
		}
	}

	/** Get presets for current method */
	$: presets = method === 'karma' ? PRESETS.karma : PRESETS.bp;
	$: unitLabel = method === 'karma' ? 'Karma' : 'BP';
	$: minPoints = method === 'karma' ? 400 : 200;
	$: maxPoints = method === 'karma' ? 1200 : 800;
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
		on:click={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<!-- Modal -->
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-border bg-surface-variant">
				<h2 id="modal-title" class="text-lg font-semibold text-text-primary flex items-center gap-2">
					<span class="material-icons text-primary-dark">settings</span>
					Configure {method === 'karma' ? 'Karma' : 'Build Points'}
				</h2>
			</div>

			<!-- Content -->
			<div class="px-6 py-4 space-y-4">
				<!-- Method Display -->
				<div class="flex items-center gap-3 p-3 rounded-lg bg-surface-variant border border-border">
					<div class="w-10 h-10 rounded-full flex items-center justify-center
						{method === 'karma' ? 'bg-secondary-main/30' : 'bg-primary-main/30'}">
						<span class="font-bold {method === 'karma' ? 'text-secondary-dark' : 'text-primary-dark'}">
							{method === 'karma' ? 'K' : 'BP'}
						</span>
					</div>
					<div>
						<div class="font-medium text-text-primary">
							{method === 'karma' ? 'Karma Build' : 'Build Points'}
						</div>
						<div class="text-sm text-text-muted">
							{method === 'karma' ? "Runner's Companion method" : 'Standard SR4 creation'}
						</div>
					</div>
				</div>

				<!-- Quick Presets -->
				<div>
					<label class="block text-sm font-medium text-text-secondary mb-2">Quick Select</label>
					<div class="grid grid-cols-3 gap-2">
						{#each PRESET_KEYS as preset}
							<button
								type="button"
								class="px-3 py-2 rounded-lg text-sm font-medium transition-all
									{selectedPreset === preset
										? 'bg-primary-main text-primary-contrast shadow-primary'
										: 'bg-surface border border-border text-text-secondary hover:border-primary-main hover:text-primary-dark'}"
								on:click={() => selectPreset(preset)}
							>
								<div class="font-semibold">{presets[preset].label}</div>
								<div class="text-xs opacity-80">{presets[preset].points} {unitLabel}</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Custom Input -->
				<div>
					<label for="points-input" class="block text-sm font-medium text-text-secondary mb-2">
						Custom Value
					</label>
					<div class="flex items-center gap-2">
						<input
							id="points-input"
							type="number"
							class="flex-1 px-3 py-2 border border-border rounded-lg font-mono text-lg
								focus:outline-none focus:ring-2 focus:ring-primary-main/50 focus:border-primary-main"
							min={minPoints}
							max={maxPoints}
							value={pointsValue}
							on:input={handleCustomInput}
						/>
						<span class="text-text-muted font-medium">{unitLabel}</span>
					</div>
					<p class="text-xs text-text-muted mt-1">
						Range: {minPoints} - {maxPoints} {unitLabel}
					</p>
				</div>

				<!-- Preset Description -->
				{#if selectedPreset !== 'custom'}
					<div class="text-sm text-text-secondary p-3 bg-info-main/10 rounded-lg border border-info-main/30">
						<span class="material-icons text-info-main text-sm align-middle mr-1">info</span>
						{presets[selectedPreset].description}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-border bg-surface-variant flex justify-end gap-3">
				<button
					type="button"
					class="cw-btn cw-btn-secondary"
					on:click={handleCancel}
				>
					Cancel
				</button>
				<button
					type="button"
					class="cw-btn cw-btn-primary"
					on:click={handleConfirm}
				>
					<span class="material-icons text-sm">check</span>
					Confirm
				</button>
			</div>
		</div>
	</div>
{/if}
