<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		character,
		currentStep,
		currentStepIndex,
		remainingBP,
		startNewCharacter,
		nextWizardStep,
		prevWizardStep,
		setWizardStep,
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

	/** Save character and redirect to sheet. */
	function handleFinalize(): void {
		// TODO: Save to Firestore
		goto('/characters');
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
		<div class="cw-panel px-4 py-2">
			<span class="text-muted-text text-sm">Build Points</span>
			<span class="text-accent-primary font-mono text-xl ml-2">{$remainingBP}</span>
		</div>
	</header>

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
				<p class="text-secondary-text mb-4">
					Using Build Point (BP) system with 400 starting points.
				</p>
				<p class="text-muted-text text-sm">
					Karma build method coming soon.
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
			<div class="cw-card">
				<h2 class="cw-card-header">Finalize Character</h2>
				<p class="text-secondary-text mb-4">
					Review your character and save when ready.
				</p>
				{#if $character}
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-muted-text">Name:</span>
							<span class="text-primary-text ml-2">
								{$character.identity.name || 'Unnamed'}
							</span>
						</div>
						<div>
							<span class="text-muted-text">Metatype:</span>
							<span class="text-primary-text ml-2">
								{$character.identity.metatype || 'None'}
							</span>
						</div>
						<div>
							<span class="text-muted-text">Skills:</span>
							<span class="text-primary-text ml-2">{$character.skills.length}</span>
						</div>
						<div>
							<span class="text-muted-text">Qualities:</span>
							<span class="text-primary-text ml-2">{$character.qualities.length}</span>
						</div>
					</div>
				{/if}
			</div>
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
			disabled={!canGoNext}
		>
			{isLastStep ? 'Save Character' : 'Next'}
		</button>
	</footer>
</main>
