<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		character,
		currentStep,
		currentStepIndex,
		remainingBP,
		startNewCharacter,
		setBuildMethod,
		setCustomBuildPoints,
		nextWizardStep,
		prevWizardStep,
		setWizardStep,
		saveCurrentCharacter,
		markAsSaved,
		isDirty,
		WIZARD_STEPS,
		type WizardStep
	} from '$stores';
	import { user } from '$stores/user';
	import { gameData } from '$stores/gamedata';
	import MetatypeSelector from '$lib/components/wizard/MetatypeSelector.svelte';
	import AttributeAllocator from '$lib/components/wizard/AttributeAllocator.svelte';
	import QualitySelector from '$lib/components/wizard/QualitySelector.svelte';
	import SkillAllocator from '$lib/components/wizard/SkillAllocator.svelte';
	import MagicSelector from '$lib/components/wizard/MagicSelector.svelte';
	import EquipmentSelector from '$lib/components/wizard/EquipmentSelector.svelte';
	import ContactsEditor from '$lib/components/wizard/ContactsEditor.svelte';
	import FinalizeCharacter from '$lib/components/wizard/FinalizeCharacter.svelte';

	/** Saving state. */
	let saving = false;
	let saveError: string | null = null;

	/** Custom build points editing state. */
	let isEditingBP = false;
	let customBPInput = '';

	/** Initialize new character on mount. */
	onMount(() => {
		const userId = $user?.uid ?? 'guest';
		startNewCharacter(userId, 'bp');
	});

	/** Navigate to previous step. */
	function handlePrev(): void {
		prevWizardStep();
	}

	/** Navigate to next step or finalize. */
	function handleNext(): void {
		if ($currentStep === 'finalize') {
			handleFinalize();
			return;
		}
		nextWizardStep();
	}

	/** Save character and redirect to character list. */
	async function handleFinalize(): Promise<void> {
		saving = true;
		saveError = null;

		const result = await saveCurrentCharacter();

		if (result.success) {
			markAsSaved();
			goto('/characters');
		} else {
			saveError = result.error || 'Failed to save character';
		}

		saving = false;
	}

	/** Quick save without navigating away. */
	async function handleQuickSave(): Promise<void> {
		saving = true;
		saveError = null;

		const result = await saveCurrentCharacter();

		if (result.success) {
			markAsSaved();
		} else {
			saveError = result.error || 'Failed to save character';
		}

		saving = false;
	}

	/** Start editing custom build points. */
	function startEditingBP(): void {
		customBPInput = String($character?.buildPoints ?? 400);
		isEditingBP = true;
	}

	/** Apply custom build points and close editor. */
	function applyCustomBP(): void {
		const value = parseInt(customBPInput, 10);
		if (!isNaN(value) && value > 0) {
			setCustomBuildPoints(value);
		}
		isEditingBP = false;
	}

	/** Cancel editing and close editor. */
	function cancelEditBP(): void {
		isEditingBP = false;
		customBPInput = '';
	}

	/** Check if current step allows proceeding. */
	function canProceed(step: WizardStep, char: typeof $character): boolean {
		if (!char) return false;

		switch (step) {
			case 'method':
				return true;
			case 'metatype':
				return !!char.identity.metatype;
			case 'attributes':
				return true; // Hard limit enforced in store
			case 'qualities':
				return true; // Qualities are optional
			case 'skills':
				return char.skills.length > 0;
			case 'magic':
				return true; // Optional step
			case 'equipment':
				return true; // Equipment is optional but BP must be allocated
			case 'contacts':
				return true; // Contacts are optional
			case 'finalize':
				return true;
			default:
				return false;
		}
	}

	$: canGoNext = canProceed($currentStep, $character);
	$: canGoBack = $currentStepIndex > 0;
	$: isLastStep = $currentStepIndex === WIZARD_STEPS.length - 1;

	/** Handle keyboard navigation. */
	function handleKeydown(event: KeyboardEvent): void {
		// Don't navigate if user is typing in an input
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}

		if (event.key === 'ArrowLeft' && canGoBack) {
			handlePrev();
		} else if (event.key === 'ArrowRight' && canGoNext && !saving) {
			handleNext();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Fixed Side Navigation Buttons -->
<button
	class="nav-btn nav-btn-prev"
	on:click={handlePrev}
	disabled={!canGoBack}
	title="Previous step (Left Arrow)"
>
	<span class="material-icons">chevron_left</span>
</button>

<button
	class="nav-btn nav-btn-next"
	on:click={handleNext}
	disabled={!canGoNext || saving}
	title="Next step (Right Arrow)"
>
	{#if saving}
		<span class="material-icons animate-spin">sync</span>
	{:else}
		<span class="material-icons">chevron_right</span>
	{/if}
</button>

<main class="container mx-auto px-4 py-6 max-w-6xl pl-16 pr-16">
	<!-- Header with BP Counter -->
	<header class="flex items-center justify-between mb-6">
		<div>
			<h1 class="cw-page-header">
				New Character
			</h1>
			<p class="cw-page-subheader">
				{WIZARD_STEPS[$currentStepIndex]?.description ?? ''}
			</p>
		</div>
		<div class="flex items-center gap-4">
			{#if $user}
				<button
					class="cw-btn text-sm"
					on:click={handleQuickSave}
					disabled={saving || !$isDirty}
					title={$isDirty ? 'Save progress' : 'No changes to save'}
				>
					{saving ? 'Saving...' : $isDirty ? 'Save' : 'Saved'}
				</button>
			{/if}
			<div class="cw-panel px-4 py-2 flex items-center gap-2">
				<span class="text-primary-dark font-mono text-xl font-bold">{$remainingBP}</span>
				<span class="text-text-muted text-sm">/ {$character?.buildPoints ?? 400}</span>
				<span class="text-text-secondary text-sm">
					{$character?.buildMethod === 'karma' ? 'Karma' : 'BP'} remaining
				</span>
			</div>
		</div>
	</header>

	<!-- Save Error -->
	{#if saveError}
		<div class="cw-panel p-3 mb-4 border-l-4 border-error-main">
			<p class="text-error-main text-sm">{saveError}</p>
		</div>
	{/if}

	<!-- Step Progress -->
	<nav class="mb-8">
		<div class="flex items-center justify-between gap-1 overflow-x-auto pb-2">
			{#each WIZARD_STEPS as step, idx}
				<button
					class="flex-1 min-w-0 px-2 py-2 rounded text-xs transition-colors
						{idx === $currentStepIndex
							? 'bg-primary-main/20 text-primary-dark border border-primary-main/50'
							: idx < $currentStepIndex
								? 'bg-surface-variant text-text-primary'
								: 'bg-surface text-text-muted'}"
					on:click={() => setWizardStep(step.id)}
					disabled={idx > $currentStepIndex + 1}
				>
					<span class="block truncate">{step.label}</span>
				</button>
			{/each}
		</div>
	</nav>

	<!-- Step Content -->
	<section class="min-h-[400px]">
		{#if !$character || !$gameData}
			<div class="flex items-center justify-center h-64">
				<span class="text-primary-main animate-pulse">Loading...</span>
			</div>
		{:else if $currentStep === 'method'}
			<div class="cw-card p-6">
				<h2 class="cw-card-header">Build Method</h2>
				<p class="text-text-secondary mb-6">
					Choose how you want to create your character.
				</p>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- BP Method -->
					<button
						class="text-left transition-all rounded-lg p-6
							{$character?.buildMethod === 'bp'
								? 'bg-primary-main/10 border-2 border-primary-main shadow-lg shadow-primary-main/20'
								: 'bg-white border border-gray-200 shadow-md hover:shadow-lg hover:border-primary-main/50'}"
						on:click={() => setBuildMethod('bp')}
					>
						<div class="flex items-center gap-3 mb-3">
							<div class="w-12 h-12 rounded-full bg-primary-main/30 flex items-center justify-center">
								<span class="text-primary-dark text-xl font-bold">BP</span>
							</div>
							<div>
								<h3 class="text-lg font-medium text-text-primary">Build Points</h3>
								<span class="text-primary-dark font-mono">400 BP</span>
							</div>
						</div>
						<p class="text-text-secondary text-sm">
							The standard SR4 creation method. Allocate Build Points across all aspects
							of your character with straightforward costs.
						</p>
						<ul class="text-text-muted text-xs mt-3 space-y-1">
							<li>• Attributes: 10 BP per point above minimum</li>
							<li>• Skills: 4 BP per rating point</li>
							<li>• Spells/Forms: 5 BP each</li>
							<li>• Resources: Up to 50 BP for nuyen</li>
						</ul>
					</button>

					<!-- Karma Method -->
					<button
						class="text-left transition-all rounded-lg p-6
							{$character?.buildMethod === 'karma'
								? 'bg-primary-main/10 border-2 border-primary-main shadow-lg shadow-primary-main/20'
								: 'bg-white border border-gray-200 shadow-md hover:shadow-lg hover:border-primary-main/50'}"
						on:click={() => setBuildMethod('karma')}
					>
						<div class="flex items-center gap-3 mb-3">
							<div class="w-12 h-12 rounded-full bg-secondary-main/30 flex items-center justify-center">
								<span class="text-secondary-dark text-xl font-bold">K</span>
							</div>
							<div>
								<h3 class="text-lg font-medium text-text-primary">Karma Build</h3>
								<span class="text-secondary-dark font-mono">750 Karma</span>
							</div>
						</div>
						<p class="text-text-secondary text-sm">
							Runner's Companion alternate method. Uses karma for everything,
							matching career advancement costs for easier tracking.
						</p>
						<ul class="text-text-muted text-xs mt-3 space-y-1">
							<li>• Attributes: (new rating) × 5 karma</li>
							<li>• Skills: (new rating) × 2 karma</li>
							<li>• Qualities: BP cost × 2 karma</li>
							<li>• Resources: 1 karma = 2,500¥</li>
						</ul>
					</button>
				</div>

					<div class="mt-6 p-4 bg-surface-variant rounded-lg border border-border">
					<div class="flex items-center justify-between">
						<span class="text-text-secondary">Selected Method:</span>
						<span class="font-medium {$character?.buildMethod === 'karma' ? 'text-secondary-dark' : 'text-primary-dark'}">
							{$character?.buildMethod === 'karma' ? 'Karma Build' : 'Build Points'}
						</span>
					</div>
					<div class="flex items-center justify-between mt-2">
						<span class="text-text-secondary">Starting Points:</span>
						{#if isEditingBP}
							<div class="flex items-center gap-2">
								<input
									type="number"
									bind:value={customBPInput}
									class="w-24 px-2 py-1 text-right font-mono border border-primary-main rounded focus:outline-none focus:ring-2 focus:ring-primary-main/50"
									min={$character?.buildMethod === 'karma' ? 400 : 200}
									max={$character?.buildMethod === 'karma' ? 1200 : 800}
									on:keydown={(e) => e.key === 'Enter' && applyCustomBP()}
								/>
								<span class="text-text-muted text-sm">{$character?.buildMethod === 'karma' ? 'Karma' : 'BP'}</span>
								<button
									class="p-1 text-success-main hover:bg-success-main/10 rounded"
									on:click={applyCustomBP}
									title="Apply"
								>
									<span class="material-icons text-sm">check</span>
								</button>
								<button
									class="p-1 text-error-main hover:bg-error-main/10 rounded"
									on:click={cancelEditBP}
									title="Cancel"
								>
									<span class="material-icons text-sm">close</span>
								</button>
							</div>
						{:else}
							<div class="flex items-center gap-2">
								<span class="font-mono text-lg {$character?.buildMethod === 'karma' ? 'text-secondary-dark' : 'text-primary-dark'}">
									{$character?.buildPoints ?? 400}
									{$character?.buildMethod === 'karma' ? ' Karma' : ' BP'}
								</span>
								<button
									class="p-1 text-text-muted hover:text-primary-main hover:bg-primary-main/10 rounded transition-colors"
									on:click={startEditingBP}
									title="Customize starting points"
								>
									<span class="material-icons text-sm">edit</span>
								</button>
							</div>
						{/if}
					</div>
					{#if !isEditingBP}
						<p class="text-text-muted text-xs mt-2">
							Click the edit button to customize your starting {$character?.buildMethod === 'karma' ? 'karma' : 'build points'}.
						</p>
					{/if}
				</div>
			</div>
		{:else if $currentStep === 'metatype'}
			<MetatypeSelector />
		{:else if $currentStep === 'attributes'}
			<AttributeAllocator />
		{:else if $currentStep === 'qualities'}
			<QualitySelector />
		{:else if $currentStep === 'skills'}
			<SkillAllocator />
		{:else if $currentStep === 'magic'}
			<MagicSelector />
		{:else if $currentStep === 'equipment'}
			<EquipmentSelector />
		{:else if $currentStep === 'contacts'}
			<ContactsEditor />
		{:else if $currentStep === 'finalize'}
			<FinalizeCharacter />
		{/if}
	</section>

	<!-- Step Indicator (centered) -->
	<div class="mt-8 text-center">
		<span class="text-text-muted text-sm">
			Step {$currentStepIndex + 1} of {WIZARD_STEPS.length}
			{#if isLastStep}
				<span class="text-primary-main ml-2">• Press → to save</span>
			{/if}
		</span>
	</div>
</main>

<style>
	/* Fixed side navigation buttons */
	:global(.nav-btn) {
		position: fixed;
		top: 50%;
		transform: translateY(-50%);
		z-index: 50;

		/* Base size increased by 20% */
		width: 3rem;      /* 2.5rem * 1.2 */
		height: 3.6rem;   /* 3rem * 1.2 */

		display: flex;
		align-items: center;
		justify-content: center;

		background: var(--color-primary-main, #1976d2);
		color: white;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;

		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		transition: all 0.2s ease;
	}

	:global(.nav-btn:hover:not(:disabled)) {
		background: var(--color-primary-dark, #1565c0);
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
	}

	:global(.nav-btn:disabled) {
		background: var(--color-surface-variant, #e0e0e0);
		color: var(--color-text-muted, #9e9e9e);
		cursor: not-allowed;
		box-shadow: none;
	}

	:global(.nav-btn .material-icons) {
		font-size: 2rem;  /* Larger icons */
	}

	:global(.nav-btn-prev) {
		left: max(0.5rem, calc(50% - 38rem)); /* At content edge, min 0.5rem from viewport */
	}

	:global(.nav-btn-next) {
		right: max(0.5rem, calc(50% - 38rem)); /* At content edge, min 0.5rem from viewport */
	}

	/* Spin animation for saving state */
	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
