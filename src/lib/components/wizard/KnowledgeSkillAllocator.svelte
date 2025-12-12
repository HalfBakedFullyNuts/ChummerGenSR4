<script lang="ts">
	import {
		character,
		addKnowledgeSkill,
		removeKnowledgeSkill,
		incrementKnowledgeSkill,
		decrementKnowledgeSkill,
		calculateFreeKnowledgePoints,
		calculateKnowledgePointsSpent,
		calculateKnowledgeSkillBPCost,
		calculateKnowledgeSkillKarmaCost
	} from '$stores';
	import type { KnowledgeSkillCategory, KnowledgeSkill } from '$types';
	import { calculateAttributeTotal } from '$types';

	/** Maximum skill rating during creation. */
	const MAX_RATING = 6;

	/** New skill input state. */
	let newSkillName = '';
	let newSkillCategory: KnowledgeSkillCategory = 'Street';

	/** Knowledge skill categories with metadata. */
	const CATEGORIES: {
		id: KnowledgeSkillCategory;
		label: string;
		attribute: 'INT' | 'LOG';
		color: string;
		icon: string;
		description: string;
	}[] = [
		{
			id: 'Street',
			label: 'Street',
			attribute: 'INT',
			color: 'red',
			icon: 'explore',
			description: 'Street-level knowledge: gangs, black markets, local rumors'
		},
		{
			id: 'Academic',
			label: 'Academic',
			attribute: 'LOG',
			color: 'blue',
			icon: 'school',
			description: 'Formal education: history, science, literature'
		},
		{
			id: 'Professional',
			label: 'Professional',
			attribute: 'LOG',
			color: 'green',
			icon: 'work',
			description: 'Career knowledge: corp structure, legal procedures'
		},
		{
			id: 'Interest',
			label: 'Interest',
			attribute: 'INT',
			color: 'purple',
			icon: 'interests',
			description: 'Hobbies and interests: music, sports, games'
		},
		{
			id: 'Language',
			label: 'Language',
			attribute: 'INT',
			color: 'amber',
			icon: 'translate',
			description: 'Spoken and written languages'
		}
	];

	/** Get category metadata. */
	function getCategoryMeta(category: KnowledgeSkillCategory): typeof CATEGORIES[number] {
		return CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0]!;
	}

	/** Add a new knowledge skill. */
	function handleAddSkill(): void {
		const name = newSkillName.trim();
		if (!name) return;

		addKnowledgeSkill(name, newSkillCategory, 1);
		newSkillName = '';
	}

	/** Handle enter key in input. */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			handleAddSkill();
		}
	}

	// Reactive calculations
	$: intValue = $character?.attributes.int ? calculateAttributeTotal($character.attributes.int) : 1;
	$: logValue = $character?.attributes.log ? calculateAttributeTotal($character.attributes.log) : 1;
	$: freePoints = calculateFreeKnowledgePoints($character);
	$: spentPoints = calculateKnowledgePointsSpent($character);
	$: remainingFreePoints = Math.max(0, freePoints - spentPoints);
	$: excessPoints = Math.max(0, spentPoints - freePoints);
	$: isKarmaBuild = $character?.buildMethod === 'karma';
	$: bpCost = isKarmaBuild
		? calculateKnowledgeSkillKarmaCost($character)
		: calculateKnowledgeSkillBPCost($character);

	/** Group skills by category. */
	function groupSkillsByCategory(skills: readonly KnowledgeSkill[]): Record<KnowledgeSkillCategory, KnowledgeSkill[]> {
		return skills.reduce<Record<KnowledgeSkillCategory, KnowledgeSkill[]>>(
			(acc, skill) => {
				const cat = skill.category;
				if (!acc[cat]) acc[cat] = [];
				acc[cat].push(skill);
				return acc;
			},
			{} as Record<KnowledgeSkillCategory, KnowledgeSkill[]>
		);
	}

	// Reactive grouped skills
	$: skillsByCategory = groupSkillsByCategory($character?.knowledgeSkills ?? []);

	// Reactive skill data for UI
	$: knowledgeSkills = $character?.knowledgeSkills ?? [];

	// Check if character has a native language (mother tongue)
	$: hasNativeLanguage = knowledgeSkills.some(s => s.category === 'Language' && s.isNative);
</script>

<div class="space-y-4">
	<!-- Points Summary and Native Language Warning (side by side) -->
	<div class="flex justify-center gap-4 flex-wrap">
		<!-- Points Summary -->
		<div class="bg-white border border-gray-200 rounded-lg shadow-md p-4 min-w-[350px]">
			<div class="flex items-center justify-center gap-4">
				<span class="text-sm text-gray-600">Knowledge Skills:</span>
				<span class="text-xl font-bold {remainingFreePoints > 0 ? 'text-green-600' : excessPoints > 0 ? 'text-amber-600' : 'text-gray-600'}">
					{spentPoints} / {freePoints}
				</span>
				<span class="text-sm text-gray-500">free points</span>
			</div>
			{#if excessPoints > 0}
				<div class="text-center mt-2 text-amber-600 text-sm">
					<span class="font-medium">{excessPoints} excess points</span>
					<span class="text-gray-500 mx-1">=</span>
					<span class="font-bold">{bpCost} {isKarmaBuild ? 'Karma' : 'BP'}</span>
				</div>
			{/if}
			<p class="text-gray-500 text-xs mt-2 text-center border-t border-gray-100 pt-2">
				Free points: (INT + LOG) × 3 = ({intValue} + {logValue}) × 3
				<br />
				Excess costs: {isKarmaBuild ? 'Rating × 2 Karma per point' : '2 BP per point'}
			</p>
		</div>

		<!-- Native Language Warning -->
		{#if !hasNativeLanguage}
			<div class="bg-amber-50 border border-amber-300 rounded-lg shadow-md p-4 min-w-[300px] max-w-[400px] flex items-start gap-3">
				<span class="material-icons text-amber-500 text-xl shrink-0">warning</span>
				<div>
					<h4 class="font-semibold text-amber-800 text-sm">Mother Tongue Required</h4>
					<p class="text-amber-700 text-xs">
						Add a language skill to designate your mother tongue. The first language added becomes your native language (Rating "N").
					</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- Add New Skill -->
	<div class="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
		<div class="bg-indigo-50 px-4 py-2 border-b border-gray-200">
			<h3 class="text-sm font-semibold text-indigo-800 uppercase tracking-wide flex items-center gap-2">
				<span class="material-icons text-sm">add_circle</span>
				Add Knowledge Skill
			</h3>
		</div>
		<div class="p-4">
			<div class="flex flex-wrap gap-3 items-end">
				<!-- Skill Name Input -->
				<div class="flex-1 min-w-[200px]">
					<label for="new-skill-name" class="block text-xs text-gray-600 mb-1">Skill Name</label>
					<input
						id="new-skill-name"
						type="text"
						bind:value={newSkillName}
						on:keydown={handleKeydown}
						placeholder="e.g., Seattle Gangs, History, Sperethiel..."
						class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-main/50 focus:border-primary-main"
					/>
				</div>

				<!-- Category Select -->
				<div class="min-w-[160px]">
					<label for="new-skill-category" class="block text-xs text-gray-600 mb-1">Category</label>
					<select
						id="new-skill-category"
						bind:value={newSkillCategory}
						class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-main/50 focus:border-primary-main"
					>
						{#each CATEGORIES as cat}
							<option value={cat.id}>{cat.label} ({cat.attribute})</option>
						{/each}
					</select>
				</div>

				<!-- Add Button -->
				<button
					class="cw-btn px-4 py-2"
					on:click={handleAddSkill}
					disabled={!newSkillName.trim()}
				>
					<span class="material-icons text-sm mr-1">add</span>
					Add
				</button>
			</div>

			<!-- Category Description -->
			<p class="text-xs text-gray-500 mt-2">
				{getCategoryMeta(newSkillCategory).description}
			</p>
		</div>
	</div>

	<!-- Skills by Category -->
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
		{#each CATEGORIES as category}
			{@const categorySkills = skillsByCategory[category.id] ?? []}
			{@const hasSkills = categorySkills.length > 0}

			<div class="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden {!hasSkills ? 'opacity-60' : ''}">
				<!-- Header -->
				<div class="bg-{category.color}-50 px-4 py-2 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-semibold text-{category.color}-800 uppercase tracking-wide flex items-center gap-2">
							<span class="material-icons text-sm">{category.icon}</span>
							{category.label}
							<span class="text-xs font-normal bg-{category.color}-100 px-1.5 py-0.5 rounded">
								{category.attribute}
							</span>
						</h3>
						{#if hasSkills}
							<span class="text-xs text-{category.color}-600">
								{categorySkills.reduce((sum, s) => sum + s.rating, 0)} pts
							</span>
						{/if}
					</div>
				</div>

				<!-- Skills List -->
				<div class="max-h-[300px] overflow-y-auto">
					{#if hasSkills}
						{#each categorySkills as skill, idx (skill.id)}
							<div class="flex items-center px-4 py-2 border-b border-gray-100 {idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}">
								<div class="flex-1 min-w-0">
									<span class="text-sm font-medium text-black truncate block">
										{skill.name}
										{#if skill.isNative}
											<span class="text-xs text-amber-600 ml-1">(Native)</span>
										{/if}
									</span>
								</div>
								<div class="flex items-center gap-1">
									{#if skill.isNative}
										<!-- Native languages show "N" and cannot be modified -->
										<span class="w-16 text-center font-mono text-lg text-amber-600 font-bold" title="Native language - infinite proficiency">
											N
										</span>
									{:else}
										<button
											class="cw-btn-inc-dec"
											on:click={() => decrementKnowledgeSkill(skill.id)}
											disabled={skill.rating <= 1}
										>
											<span class="material-icons text-xs">remove</span>
										</button>
										<span class="w-8 text-center font-mono text-lg text-primary-dark font-bold">
											{skill.rating}
										</span>
										<button
											class="cw-btn-inc-dec"
											on:click={() => incrementKnowledgeSkill(skill.id)}
											disabled={skill.rating >= MAX_RATING}
										>
											<span class="material-icons text-xs">add</span>
										</button>
										<button
											class="ml-2 p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
											on:click={() => removeKnowledgeSkill(skill.id)}
											title="Remove skill"
										>
											<span class="material-icons text-sm">close</span>
										</button>
									{/if}
								</div>
							</div>
						{/each}
					{:else}
						<div class="px-4 py-6 text-center text-gray-400 text-sm">
							No {category.label.toLowerCase()} skills yet
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Empty State -->
	{#if knowledgeSkills.length === 0}
		<div class="bg-white border border-gray-200 rounded-lg shadow-md p-8 text-center">
			<span class="material-icons text-4xl text-gray-300 mb-2">psychology</span>
			<p class="text-gray-500">
				No knowledge skills added yet. Use the form above to add skills.
			</p>
			<p class="text-gray-400 text-sm mt-2">
				Knowledge skills represent what your character knows about the world.
			</p>
		</div>
	{/if}

	<!-- Quick Reference -->
	<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
		<h4 class="text-sm font-semibold text-gray-700 mb-2">Knowledge Skill Categories</h4>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-gray-600">
			{#each CATEGORIES as cat}
				<div class="flex items-center gap-2">
					<span class="material-icons text-sm text-{cat.color}-500">{cat.icon}</span>
					<span class="font-medium">{cat.label}</span>
					<span class="text-gray-400">({cat.attribute})</span>
					<span class="text-gray-400">- {cat.description.split(':')[0]}</span>
				</div>
			{/each}
		</div>
	</div>
</div>
