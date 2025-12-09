<script lang="ts">
	import type { Character, Metatype, SkillDefinition } from '$types';
	import type { GameQuality } from '$stores/gamedata';
	import IdentitySection from './IdentitySection.svelte';
	import AttributeSection from './AttributeSection.svelte';
	import SkillsSection from './SkillsSection.svelte';
	import QualitiesSection from './QualitiesSection.svelte';
	import ContactsSection from './ContactsSection.svelte';

	export let character: Character;
	export let metatypes: readonly Metatype[];
	export let skills: readonly SkillDefinition[];
	export let qualities: readonly GameQuality[];

	/** Section expansion states. */
	let expandedSections: Record<string, boolean> = {
		identity: true,
		attributes: false,
		skills: false,
		qualities: false,
		contacts: false,
		magic: false,
		equipment: false
	};

	function toggleSection(section: string): void {
		expandedSections[section] = !expandedSections[section];
	}
</script>

<div class="space-y-4">
	<!-- Identity Section -->
	<section class="cw-panel">
		<button
			class="w-full flex items-center justify-between p-4 text-left"
			on:click={() => toggleSection('identity')}
		>
			<div class="flex items-center gap-3">
				<span class="material-icons text-primary-dark">person</span>
				<div>
					<h2 class="text-text-primary font-medium">Identity</h2>
					<p class="text-text-muted text-xs">Name, metatype, and personal details</p>
				</div>
			</div>
			<span class="material-icons text-text-muted transition-transform" class:rotate-180={expandedSections.identity}>
				expand_more
			</span>
		</button>
		{#if expandedSections.identity}
			<div class="border-t border-border p-4">
				<IdentitySection {character} {metatypes} />
			</div>
		{/if}
	</section>

	<!-- Attributes Section -->
	<section class="cw-panel">
		<button
			class="w-full flex items-center justify-between p-4 text-left"
			on:click={() => toggleSection('attributes')}
		>
			<div class="flex items-center gap-3">
				<span class="material-icons text-primary-dark">fitness_center</span>
				<div>
					<h2 class="text-text-primary font-medium">Attributes</h2>
					<p class="text-text-muted text-xs">BOD, AGI, REA, STR, CHA, INT, LOG, WIL, Edge</p>
				</div>
			</div>
			<span class="material-icons text-text-muted transition-transform" class:rotate-180={expandedSections.attributes}>
				expand_more
			</span>
		</button>
		{#if expandedSections.attributes}
			<div class="border-t border-border p-4">
				<AttributeSection {character} />
			</div>
		{/if}
	</section>

	<!-- Skills Section -->
	<section class="cw-panel">
		<button
			class="w-full flex items-center justify-between p-4 text-left"
			on:click={() => toggleSection('skills')}
		>
			<div class="flex items-center gap-3">
				<span class="material-icons text-primary-dark">school</span>
				<div>
					<h2 class="text-text-primary font-medium">Skills</h2>
					<p class="text-text-muted text-xs">Active skills with ratings and specializations</p>
				</div>
			</div>
			<span class="material-icons text-text-muted transition-transform" class:rotate-180={expandedSections.skills}>
				expand_more
			</span>
		</button>
		{#if expandedSections.skills}
			<div class="border-t border-border p-4">
				<SkillsSection {character} {skills} />
			</div>
		{/if}
	</section>

	<!-- Qualities Section -->
	<section class="cw-panel">
		<button
			class="w-full flex items-center justify-between p-4 text-left"
			on:click={() => toggleSection('qualities')}
		>
			<div class="flex items-center gap-3">
				<span class="material-icons text-primary-dark">stars</span>
				<div>
					<h2 class="text-text-primary font-medium">Qualities</h2>
					<p class="text-text-muted text-xs">Positive and negative qualities</p>
				</div>
			</div>
			<span class="material-icons text-text-muted transition-transform" class:rotate-180={expandedSections.qualities}>
				expand_more
			</span>
		</button>
		{#if expandedSections.qualities}
			<div class="border-t border-border p-4">
				<QualitiesSection {character} {qualities} />
			</div>
		{/if}
	</section>

	<!-- Contacts Section -->
	<section class="cw-panel">
		<button
			class="w-full flex items-center justify-between p-4 text-left"
			on:click={() => toggleSection('contacts')}
		>
			<div class="flex items-center gap-3">
				<span class="material-icons text-primary-dark">contacts</span>
				<div>
					<h2 class="text-text-primary font-medium">Contacts</h2>
					<p class="text-text-muted text-xs">NPCs with loyalty and connection ratings</p>
				</div>
			</div>
			<span class="material-icons text-text-muted transition-transform" class:rotate-180={expandedSections.contacts}>
				expand_more
			</span>
		</button>
		{#if expandedSections.contacts}
			<div class="border-t border-border p-4">
				<ContactsSection {character} />
			</div>
		{/if}
	</section>
</div>

<style>
	.rotate-180 {
		transform: rotate(180deg);
	}
</style>
