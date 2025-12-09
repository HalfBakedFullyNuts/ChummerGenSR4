<script lang="ts">
	import type { Character, SkillDefinition } from '$types';
	import { setSkill, removeSkill } from '$stores/character';

	export let character: Character;
	export let skills: readonly SkillDefinition[];

	/** Search query for filtering skills. */
	let searchQuery = '';

	/** Skill groups for quick-add. */
	const skillGroups = [
		'Athletics',
		'Biotech',
		'Close Combat',
		'Conjuring',
		'Cracking',
		'Electronics',
		'Firearms',
		'Influence',
		'Mechanic',
		'Outdoors',
		'Sorcery',
		'Stealth',
		'Tasking'
	];

	/** Filter skills by search query. */
	$: filteredSkills = searchQuery
		? skills.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
		: skills.slice(0, 20);

	/** Get current rating for a skill. */
	function getSkillRating(skillName: string): number {
		const found = character.skills.find(s => s.name === skillName);
		return found?.rating ?? 0;
	}

	/** Handle skill rating change. */
	function handleSkillChange(skillName: string, rating: number): void {
		if (rating > 0) {
			setSkill(skillName, rating, null);
		} else {
			removeSkill(skillName);
		}
	}

	/** Add all skills in a group at rating 3. */
	function addSkillGroup(groupName: string): void {
		const groupSkills = skills.filter(s => s.skillgroup === groupName);
		for (const skill of groupSkills) {
			const current = getSkillRating(skill.name);
			if (current === 0) {
				setSkill(skill.name, 3, null);
			}
		}
	}
</script>

<div class="space-y-4">
	<!-- Quick-Add Skill Groups -->
	<div>
		<h3 class="text-text-secondary text-sm font-medium mb-2">Quick-Add Skill Groups (Rating 3)</h3>
		<div class="flex flex-wrap gap-2">
			{#each skillGroups as group}
				<button
					class="cw-btn text-xs px-2 py-1"
					on:click={() => addSkillGroup(group)}
				>
					{group}
				</button>
			{/each}
		</div>
	</div>

	<!-- Search -->
	<div>
		<label for="skillSearch" class="block text-text-secondary text-sm mb-1">Search Skills</label>
		<input
			id="skillSearch"
			type="text"
			bind:value={searchQuery}
			class="cw-input w-full"
			placeholder="Type to filter skills..."
		/>
	</div>

	<!-- Current Skills -->
	{#if character.skills.length > 0}
		<div>
			<h3 class="text-text-secondary text-sm font-medium mb-2">
				Current Skills ({character.skills.length})
			</h3>
			<div class="grid gap-2 max-h-60 overflow-y-auto">
				{#each character.skills as skill}
					<div class="cw-data-row py-1">
						<span class="text-text-primary text-sm flex-1">{skill.name}</span>
						<div class="flex items-center gap-2">
							<input
								type="number"
								min="0"
								max="6"
								value={skill.rating}
								on:input={(e) => handleSkillChange(skill.name, parseInt(e.currentTarget.value) || 0)}
								class="cw-input w-12 text-center text-sm"
							/>
							<button
								class="text-error hover:text-error-dark"
								on:click={() => removeSkill(skill.name)}
								title="Remove skill"
							>
								<span class="material-icons text-sm">close</span>
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Available Skills -->
	<div>
		<h3 class="text-text-secondary text-sm font-medium mb-2">
			{searchQuery ? 'Matching Skills' : 'Common Skills'} ({filteredSkills.length})
		</h3>
		<div class="grid gap-2 max-h-60 overflow-y-auto">
			{#each filteredSkills as skill}
				{@const rating = getSkillRating(skill.name)}
				{#if rating === 0}
					<div class="cw-data-row py-1">
						<div class="flex-1">
							<span class="text-text-primary text-sm">{skill.name}</span>
							<span class="text-text-muted text-xs ml-2">({skill.attribute})</span>
						</div>
						<div class="flex items-center gap-2">
							<input
								type="number"
								min="0"
								max="6"
								value={0}
								on:input={(e) => {
									const val = parseInt(e.currentTarget.value) || 0;
									if (val > 0) handleSkillChange(skill.name, val);
								}}
								class="cw-input w-12 text-center text-sm"
								placeholder="0"
							/>
							<button
								class="text-primary hover:text-primary-dark"
								on:click={() => handleSkillChange(skill.name, 1)}
								title="Add skill at rating 1"
							>
								<span class="material-icons text-sm">add</span>
							</button>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</div>
