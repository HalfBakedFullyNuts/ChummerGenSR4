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

	/** Check if current step allows proceeding. */
	function canProceed(step: WizardStep, char: typeof $character): boolean {
		if (!char) return false;

		switch (step) {
			case 'method':
				return true;
			case 'metatype':
				return !!char.identity.metatype;
			case 'attributes':
				return true; // Attributes have minimums set by metatype
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
</script>

<main class="container mx-auto px-4 py-6 max-w-6xl">
	<!-- Header with BP Counter -->
	<header class="flex items-center justify-between mb-6">
		<div>
			<h1 class="font-heading text-2xl text-accent-primary text-glow-primary">
				New Character
			</h1>
			<p class="text-secondary-text text-sm">
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
			<div class="cw-panel px-4 py-2">
				<span class="text-muted-text text-sm">Build Points</span>
				<span class="text-accent-primary font-mono text-xl ml-2">{$remainingBP}</span>
			</div>
		</div>
	</header>

	<!-- Save Error -->
	{#if saveError}
		<div class="cw-panel p-3 mb-4 border-l-4 border-accent-danger">
			<p class="text-accent-danger text-sm">{saveError}</p>
		</div>
	{/if}

	<!-- Step Progress -->
	<nav class="mb-8">
		<div class="flex items-center justify-between gap-1 overflow-x-auto pb-2">
			{#each WIZARD_STEPS as step, idx}
				<button
					class="flex-1 min-w-0 px-2 py-2 rounded text-xs transition-colors
						{idx === $currentStepIndex
							? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
							: idx < $currentStepIndex
								? 'bg-surface-light text-primary-text'
								: 'bg-surface text-muted-text'}"
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
				<span class="text-accent-primary animate-pulse">Loading...</span>
			</div>
		{:else if $currentStep === 'method'}
			<div class="cw-card">
				<h2 class="cw-card-header">Build Method</h2>
				<p class="text-secondary-text mb-6">
					Choose how you want to create your character.
				</p>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- BP Method -->
					<button
						class="p-6 rounded-lg text-left transition-all
							{$character?.buildMethod === 'bp'
								? 'bg-accent-primary/20 border-2 border-accent-primary'
								: 'bg-surface hover:bg-surface-light border-2 border-transparent'}"
						on:click={() => setBuildMethod('bp')}
					>
						<div class="flex items-center gap-3 mb-3">
							<div class="w-12 h-12 rounded-full bg-accent-primary/30 flex items-center justify-center">
								<span class="text-accent-primary text-xl font-bold">BP</span>
							</div>
							<div>
								<h3 class="text-lg font-medium text-primary-text">Build Points</h3>
								<span class="text-accent-primary font-mono">400 BP</span>
							</div>
						</div>
						<p class="text-secondary-text text-sm">
							The standard SR4 creation method. Allocate Build Points across all aspects
							of your character with straightforward costs.
						</p>
						<ul class="text-muted-text text-xs mt-3 space-y-1">
							<li>• Attributes: 10 BP per point above minimum</li>
							<li>• Skills: 4 BP per rating point</li>
							<li>• Spells/Forms: 5 BP each</li>
							<li>• Resources: Up to 50 BP for nuyen</li>
						</ul>
					</button>

					<!-- Karma Method -->
					<button
						class="p-6 rounded-lg text-left transition-all
							{$character?.buildMethod === 'karma'
								? 'bg-accent-cyan/20 border-2 border-accent-cyan'
								: 'bg-surface hover:bg-surface-light border-2 border-transparent'}"
						on:click={() => setBuildMethod('karma')}
					>
						<div class="flex items-center gap-3 mb-3">
							<div class="w-12 h-12 rounded-full bg-accent-cyan/30 flex items-center justify-center">
								<span class="text-accent-cyan text-xl font-bold">K</span>
							</div>
							<div>
								<h3 class="text-lg font-medium text-primary-text">Karma Build</h3>
								<span class="text-accent-cyan font-mono">750 Karma</span>
							</div>
						</div>
						<p class="text-secondary-text text-sm">
							Runner's Companion alternate method. Uses karma for everything,
							matching career advancement costs for easier tracking.
						</p>
						<ul class="text-muted-text text-xs mt-3 space-y-1">
							<li>• Attributes: (new rating) × 5 karma</li>
							<li>• Skills: (new rating) × 2 karma</li>
							<li>• Qualities: BP cost × 2 karma</li>
							<li>• Resources: 1 karma = 2,500¥</li>
						</ul>
					</button>
				</div>

				<div class="mt-6 p-4 bg-surface rounded-lg">
					<div class="flex items-center justify-between">
						<span class="text-secondary-text">Selected Method:</span>
						<span class="font-medium {$character?.buildMethod === 'karma' ? 'text-accent-cyan' : 'text-accent-primary'}">
							{$character?.buildMethod === 'karma' ? 'Karma Build' : 'Build Points'}
						</span>
					</div>
					<div class="flex items-center justify-between mt-2">
						<span class="text-secondary-text">Starting Points:</span>
						<span class="font-mono text-lg {$character?.buildMethod === 'karma' ? 'text-accent-cyan' : 'text-accent-primary'}">
							{$character?.buildPoints ?? 400}
							{$character?.buildMethod === 'karma' ? ' Karma' : ' BP'}
						</span>
					</div>
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

	<!-- Navigation Footer -->
	<footer class="mt-8 flex items-center justify-between">
		<button
			class="cw-btn cw-btn-secondary"
			on:click={handlePrev}
			disabled={!canGoBack}
		>
			Previous
		</button>

		<span class="text-muted-text text-sm">
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
</main>
