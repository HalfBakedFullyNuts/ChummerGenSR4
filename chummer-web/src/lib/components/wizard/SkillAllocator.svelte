<script lang="ts">
	import { skills } from '$stores/gamedata';
	import { character, setSkill, removeSkill } from '$stores/character';
	import type { SkillDefinition } from '$types';

	/** Maximum skill rating during creation. */
	const MAX_RATING = 6;

	/** BP cost per skill point. */
	const BP_PER_POINT = 4;

	/** Active tab - skill category filter. */
	let activeCategory: string = 'Combat Active';

	/** Search query filter. */
	let searchQuery = '';

	/** Get unique categories from skills. */
	function getCategories(allSkills: readonly SkillDefinition[]): string[] {
		const cats = new Set(allSkills.map((s) => s.category));
		return Array.from(cats).sort();
	}

	/** Filter skills by category and search. */
	function filterSkills(
		allSkills: readonly SkillDefinition[],
		category: string,
		search: string
	): SkillDefinition[] {
		return allSkills.filter((s) => {
			const matchesCat = s.category === category;
			const matchesSearch =
				search === '' || s.name.toLowerCase().includes(search.toLowerCase());
			return matchesCat && matchesSearch;
		});
	}

	/** Get current rating for a skill. */
	function getSkillRating(skillName: string): number {
		return $character?.skills.find((s) => s.name === skillName)?.rating ?? 0;
	}

	/** Set skill to specific rating. */
	function setRating(skillName: string, rating: number): void {
		if (rating <= 0) {
			removeSkill(skillName);
		} else {
			setSkill(skillName, Math.min(rating, MAX_RATING));
		}
	}

	/** Increment skill rating. */
	function incrementSkill(skillName: string): void {
		const current = getSkillRating(skillName);
		setRating(skillName, current + 1);
	}

	/** Decrement skill rating. */
	function decrementSkill(skillName: string): void {
		const current = getSkillRating(skillName);
		setRating(skillName, current - 1);
	}

	/** Calculate total BP spent on skills. */
	function calculateSkillBP(): number {
		if (!$character) return 0;
		return $character.skills.reduce((sum, s) => sum + s.rating * BP_PER_POINT, 0);
	}

	$: categories = $skills ? getCategories($skills) : [];
	$: filteredSkills = $skills ? filterSkills($skills, activeCategory, searchQuery) : [];
	$: selectedSkills = $character?.skills ?? [];
	$: skillBP = calculateSkillBP();
</script>

<div class="space-y-6">
	<!-- BP Summary -->
	<div class="cw-panel p-4">
		<div class="flex items-center justify-between">
			<span class="text-secondary-text">Skill BP Spent:</span>
			<span class="font-mono text-accent-primary text-xl">{skillBP}</span>
		</div>
		<p class="text-muted-text text-xs mt-2">
			Each skill point costs 4 BP. Maximum rating 6 during creation.
		</p>
	</div>

	<!-- Selected Skills Summary -->
	{#if selectedSkills.length > 0}
		<div class="cw-card">
			<h3 class="cw-card-header mb-3">
				Selected Skills ({selectedSkills.length})
			</h3>
			<div class="flex flex-wrap gap-2">
				{#each selectedSkills as skill}
					<div
						class="px-3 py-1 rounded bg-accent-primary/20 text-accent-primary
							border border-accent-primary/30 text-sm flex items-center gap-2"
					>
						{skill.name}
						<span class="font-mono">{skill.rating}</span>
						<button
							class="text-xs opacity-50 hover:opacity-100"
							on:click={() => removeSkill(skill.name)}
						>
							×
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Category Tabs -->
	<div class="flex flex-wrap gap-1 overflow-x-auto pb-2">
		{#each categories as cat}
			<button
				class="px-3 py-1 rounded text-sm whitespace-nowrap transition-colors
					{activeCategory === cat
						? 'bg-accent-primary text-background'
						: 'bg-surface text-secondary-text hover:bg-surface-light'}"
				on:click={() => (activeCategory = cat)}
			>
				{cat}
			</button>
		{/each}
	</div>

	<!-- Search -->
	<input
		type="text"
		placeholder="Search skills..."
		class="cw-input w-full"
		bind:value={searchQuery}
	/>

	<!-- Skill List -->
	<div class="space-y-2">
		{#each filteredSkills as skill}
			{@const rating = getSkillRating(skill.name)}
			{@const isActive = rating > 0}

			<div
				class="flex items-center gap-4 p-3 rounded transition-colors
					{isActive ? 'bg-accent-primary/10 border border-accent-primary/30' : 'bg-surface'}"
			>
				<!-- Skill Info -->
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2">
						<span
							class="font-medium truncate
								{isActive ? 'text-accent-primary' : 'text-primary-text'}"
						>
							{skill.name}
						</span>
						{#if skill.skillgroup}
							<span class="cw-badge cw-badge-ghost text-xs">
								{skill.skillgroup}
							</span>
						{/if}
					</div>
					<div class="text-muted-text text-xs">
						{skill.attribute.toUpperCase()} • {skill.default ? 'Defaultable' : 'No Default'}
					</div>
				</div>

				<!-- Rating Controls -->
				<div class="flex items-center gap-2">
					<button
						class="w-8 h-8 rounded bg-surface-light text-secondary-text
							hover:bg-accent-primary hover:text-background
							disabled:opacity-30 disabled:cursor-not-allowed"
						on:click={() => decrementSkill(skill.name)}
						disabled={rating <= 0}
					>
						-
					</button>

					<span
						class="w-8 text-center font-mono text-lg
							{isActive ? 'text-accent-primary' : 'text-muted-text'}"
					>
						{rating}
					</span>

					<button
						class="w-8 h-8 rounded bg-surface-light text-secondary-text
							hover:bg-accent-primary hover:text-background
							disabled:opacity-30 disabled:cursor-not-allowed"
						on:click={() => incrementSkill(skill.name)}
						disabled={rating >= MAX_RATING}
					>
						+
					</button>
				</div>

				<!-- Quick Set Buttons -->
				<div class="hidden md:flex gap-1">
					{#each [1, 3, 6] as r}
						<button
							class="w-6 h-6 rounded text-xs transition-colors
								{rating === r
									? 'bg-accent-primary text-background'
									: 'bg-surface-light text-muted-text hover:text-primary-text'}"
							on:click={() => setRating(skill.name, r)}
						>
							{r}
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<!-- Empty State -->
	{#if filteredSkills.length === 0}
		<div class="cw-panel p-8 text-center">
			<p class="text-secondary-text">No skills found matching your criteria.</p>
		</div>
	{/if}

	<!-- Help Text -->
	<div class="cw-panel p-4 text-sm">
		<h4 class="text-accent-primary mb-2">Skill Tips</h4>
		<ul class="text-secondary-text space-y-1 list-disc list-inside">
			<li>Rating 1-3: Basic competency</li>
			<li>Rating 4-5: Professional level</li>
			<li>Rating 6: Expert/Elite (max at creation)</li>
			<li>Skill groups can be purchased together for efficiency</li>
			<li>Defaultable skills can be used untrained at -1</li>
		</ul>
	</div>
</div>
