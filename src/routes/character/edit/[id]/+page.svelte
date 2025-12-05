<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		character,
		currentStep,
		currentStepIndex,
		remainingBP,
		isCareerMode,
		loadSavedCharacter,
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
	import { CareerPanel } from '$lib/components';
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

	/** Loading state. */
	let loading = true;
	let loadError: string | null = null;

	/** Load character on mount. */
	onMount(async () => {
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
		} else {
			markAsSaved();
		}

		loading = false;
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

	/** Check if current step allows proceeding. */
	function canProceed(step: WizardStep, char: typeof $character): boolean {
		if (!char) return false;

		switch (step) {
			case 'method':
				return true;
			case 'metatype':
				return !!char.identity.metatype;
			case 'attributes':
				return true;
			case 'qualities':
				return true;
			case 'skills':
				return char.skills.length > 0;
			case 'magic':
				return true;
			case 'equipment':
				return true;
			case 'contacts':
				return true;
			case 'finalize':
				return true;
			default:
				return false;
		}
	}

	$: canGoNext = canProceed($currentStep, $character);
	$: canGoBack = $currentStepIndex > 0;
	$: isLastStep = $currentStepIndex === WIZARD_STEPS.length - 1;
	$: characterName = $character?.identity.name || $character?.identity.alias || 'Unnamed';
</script>

<main class="container mx-auto px-4 py-6 max-w-6xl">
	{#if loading}
		<div class="flex items-center justify-center h-64">
			<span class="text-primary-dark animate-pulse">Loading character...</span>
		</div>
	{:else if loadError}
		<div class="cw-card text-center py-12">
			<h2 class="text-xl text-error-main mb-4">Error Loading Character</h2>
			<p class="text-text-secondary mb-6">{loadError}</p>
			<a href="/characters" class="cw-btn cw-btn-primary">
				Back to Characters
			</a>
		</div>
	{:else}
		<!-- Header with BP Counter -->
		<header class="flex items-center justify-between mb-6">
			<div>
				<h1 class="cw-page-header">
					{characterName}
				</h1>
				<p class="text-text-secondary text-sm">
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

		<!-- Career Mode Panel -->
		{#if $isCareerMode}
			<div class="mb-6">
				<CareerPanel />
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
					<span class="text-primary-dark animate-pulse">Loading...</span>
				</div>
			{:else if $currentStep === 'method'}
				<div class="cw-card p-4">
					<h2 class="cw-card-header">Build Method</h2>
					<div class="p-4 bg-surface rounded-lg">
						<div class="flex items-center gap-4">
							<div class="w-16 h-16 rounded-full flex items-center justify-center
								{$character.buildMethod === 'karma' ? 'bg-secondary-main/30' : 'bg-primary-main/30'}">
								<span class="text-2xl font-bold {$character.buildMethod === 'karma' ? 'text-secondary-dark' : 'text-primary-dark'}">
									{$character.buildMethod === 'karma' ? 'K' : 'BP'}
								</span>
							</div>
							<div>
								<h3 class="text-lg font-medium text-text-primary">
									{$character.buildMethod === 'karma' ? 'Karma Build' : 'Build Points'}
								</h3>
								<p class="text-text-secondary">
									Started with {$character.buildPoints} {$character.buildMethod === 'karma' ? 'Karma' : 'BP'}
								</p>
							</div>
						</div>
					</div>
					<p class="text-text-muted text-sm mt-4">
						Build method cannot be changed after character creation.
					</p>
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

		<!-- Navigation Footer -->
		<footer class="mt-8 flex items-center justify-between">
			<button
				class="cw-btn cw-btn-secondary"
				on:click={handlePrev}
				disabled={!canGoBack}
			>
				Previous
			</button>

			<span class="text-text-muted text-sm">
				Step {$currentStepIndex + 1} of {WIZARD_STEPS.length}
			</span>

			<button
				class="cw-btn cw-btn-primary"
				on:click={handleNext}
				disabled={!canGoNext || saving}
			>
				{#if saving}
					Saving...
				{:else if isLastStep}
					Save Character
				{:else}
					Next
				{/if}
			</button>
		</footer>
	{/if}
</main>
