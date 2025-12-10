<script lang="ts">
	import { skills } from '$stores/gamedata';
	import {
		character,
		incrementSkillGroup,
		decrementSkillGroup,
		setSkillWithGroupCheck
	} from '$stores/character';
	import type { SkillDefinition, SkillGroupName } from '$types';
	import { MAX_SKILL_GROUP_RATING } from '$types';

	/** Maximum skill rating during creation. */
	const MAX_RATING = 6;

	/** BP cost per skill point. */
	const BP_PER_POINT = 4;

	/** BP cost per skill group point. */
	const BP_PER_GROUP_POINT = 10;

	/** Grouping mode. */
	let groupMode: 'skillgroup' | 'attribute' = 'skillgroup';

	/** Search query filter. */
	let searchQuery = '';


	/** Skill group metadata with colors and icons. */
	const SKILL_GROUP_META: Record<string, { color: string; icon: string }> = {
		// Combat groups - red/amber
		'Firearms': { color: 'red', icon: 'gps_fixed' },
		'Close Combat': { color: 'red', icon: 'sports_martial_arts' },
		// Magic groups - purple
		'Conjuring': { color: 'purple', icon: 'auto_awesome' },
		'Sorcery': { color: 'purple', icon: 'blur_on' },
		'Tasking': { color: 'violet', icon: 'memory' },
		// Tech groups - blue
		'Electronics': { color: 'blue', icon: 'developer_board' },
		'Cracking': { color: 'blue', icon: 'security' },
		'Mechanic': { color: 'sky', icon: 'build' },
		// Social groups - green
		'Influence': { color: 'green', icon: 'record_voice_over' },
		// Physical groups - teal
		'Athletics': { color: 'teal', icon: 'directions_run' },
		'Stealth': { color: 'slate', icon: 'visibility_off' },
		'Outdoors': { color: 'emerald', icon: 'forest' },
		// Other groups - gray/amber
		'Biotech': { color: 'pink', icon: 'biotech' },
		'Animal Husbandry': { color: 'amber', icon: 'pets' },
		// Ungrouped
		'Ungrouped': { color: 'gray', icon: 'category' }
	};

	/** Attribute metadata with colors and icons. */
	const ATTRIBUTE_META: Record<string, { color: string; icon: string; name: string }> = {
		// Physical - amber
		'BOD': { color: 'amber', icon: 'fitness_center', name: 'Body' },
		'AGI': { color: 'amber', icon: 'directions_run', name: 'Agility' },
		'REA': { color: 'amber', icon: 'speed', name: 'Reaction' },
		'STR': { color: 'amber', icon: 'fitness_center', name: 'Strength' },
		// Mental - blue
		'CHA': { color: 'blue', icon: 'record_voice_over', name: 'Charisma' },
		'INT': { color: 'blue', icon: 'psychology', name: 'Intuition' },
		'LOG': { color: 'blue', icon: 'school', name: 'Logic' },
		'WIL': { color: 'blue', icon: 'self_improvement', name: 'Willpower' },
		// Special - purple/green
		'MAG': { color: 'purple', icon: 'auto_awesome', name: 'Magic' },
		'RES': { color: 'cyan', icon: 'memory', name: 'Resonance' }
	};

	/** Get color classes for a skill group. */
	function getGroupColorClasses(groupName: string): { bg: string; text: string } {
		const meta = SKILL_GROUP_META[groupName] ?? SKILL_GROUP_META['Ungrouped'] ?? { color: 'gray' };
		return {
			bg: `bg-${meta.color}-50`,
			text: `text-${meta.color}-800`
		};
	}

	/** Get icon for a skill group. */
	function getGroupIcon(groupName: string): string {
		return SKILL_GROUP_META[groupName]?.icon ?? 'category';
	}

	/** Get color classes for an attribute. */
	function getAttrColorClasses(attrCode: string): { bg: string; text: string } {
		const meta = ATTRIBUTE_META[attrCode.toUpperCase()] ?? { color: 'gray' };
		return {
			bg: `bg-${meta.color}-50`,
			text: `text-${meta.color}-800`
		};
	}

	/** Get icon for an attribute. */
	function getAttrIcon(attrCode: string): string {
		return ATTRIBUTE_META[attrCode.toUpperCase()]?.icon ?? 'help';
	}

	/** Get display name for an attribute. */
	function getAttrName(attrCode: string): string {
		return ATTRIBUTE_META[attrCode.toUpperCase()]?.name ?? attrCode;
	}

	/** Group skills by skill group name. */
	function groupBySkillGroup(allSkills: readonly SkillDefinition[]): Map<string, SkillDefinition[]> {
		const groups = new Map<string, SkillDefinition[]>();

		for (const skill of allSkills) {
			const groupName = skill.skillgroup || 'Ungrouped';
			if (!groups.has(groupName)) {
				groups.set(groupName, []);
			}
			groups.get(groupName)!.push(skill);
		}

		// Sort skills within each group alphabetically
		for (const [, skillList] of groups) {
			skillList.sort((a, b) => a.name.localeCompare(b.name));
		}

		return groups;
	}

	/** Group skills by attribute. */
	function groupByAttribute(allSkills: readonly SkillDefinition[]): Map<string, SkillDefinition[]> {
		const groups = new Map<string, SkillDefinition[]>();

		for (const skill of allSkills) {
			const attr = skill.attribute.toUpperCase();
			if (!groups.has(attr)) {
				groups.set(attr, []);
			}
			groups.get(attr)!.push(skill);
		}

		// Sort skills within each group alphabetically
		for (const [, skillList] of groups) {
			skillList.sort((a, b) => a.name.localeCompare(b.name));
		}

		return groups;
	}

	/** Filter skills by search query. */
	function filterSkills(skillMap: Map<string, SkillDefinition[]>, search: string): Map<string, SkillDefinition[]> {
		if (!search) return skillMap;

		const lower = search.toLowerCase();
		const filtered = new Map<string, SkillDefinition[]>();

		for (const [groupName, skillList] of skillMap) {
			const matchingSkills = skillList.filter(s =>
				s.name.toLowerCase().includes(lower)
			);
			if (matchingSkills.length > 0) {
				filtered.set(groupName, matchingSkills);
			}
		}

		return filtered;
	}

	/** Get current individual rating for a skill (not counting group rating). */
	function getIndividualSkillRating(skillName: string): number {
		return $character?.skills.find((s) => s.name === skillName)?.rating ?? 0;
	}

	/** Get skill group rating. */
	function getSkillGroupRating(groupName: string): number {
		return $character?.skillGroups.find((g) => g.name === groupName)?.rating ?? 0;
	}

	/** Set skill to specific rating (with group breaking check). */
	function setRating(skillName: string, rating: number): void {
		setSkillWithGroupCheck(skillName, Math.min(rating, MAX_RATING));
	}

	/** Increment skill rating. */
	function incrementSkill(skillName: string, skillDef: SkillDefinition): void {
		// Get effective rating (max of individual and group)
		const groupRating = skillDef.skillgroup
			? getSkillGroupRating(skillDef.skillgroup as SkillGroupName)
			: 0;
		const individualRating = getIndividualSkillRating(skillName);
		const effectiveRating = Math.max(individualRating, groupRating);

		// If individual is below group, we need to set individual to group+1
		if (individualRating <= groupRating && groupRating > 0) {
			setRating(skillName, groupRating + 1);
		} else {
			setRating(skillName, effectiveRating + 1);
		}
	}

	/** Decrement skill rating. */
	function decrementSkill(skillName: string, skillDef: SkillDefinition): void {
		const individualRating = getIndividualSkillRating(skillName);
		const groupRating = skillDef.skillgroup
			? getSkillGroupRating(skillDef.skillgroup as SkillGroupName)
			: 0;

		// Can only decrement individual rating, and only if it's above group rating or group is 0
		if (individualRating > groupRating) {
			setRating(skillName, individualRating - 1);
		} else if (individualRating > 0 && groupRating === 0) {
			setRating(skillName, individualRating - 1);
		}
	}

	/** Calculate total BP spent on individual skills. */
	function calculateSkillBP(): number {
		if (!$character) return 0;
		return $character.skills.reduce((sum, s) => sum + s.rating * BP_PER_POINT, 0);
	}

	/** Calculate total BP spent on skill groups. */
	function calculateSkillGroupBP(): number {
		if (!$character) return 0;
		return $character.skillGroups.reduce((sum, g) => sum + g.rating * BP_PER_GROUP_POINT, 0);
	}

	/** Get sorted group names for skill group mode. */
	function getSortedSkillGroups(groups: Map<string, SkillDefinition[]>): string[] {
		const names = Array.from(groups.keys());
		// Put Ungrouped at the end
		return names.sort((a, b) => {
			if (a === 'Ungrouped') return 1;
			if (b === 'Ungrouped') return -1;
			return a.localeCompare(b);
		});
	}

	/** Get sorted attribute codes for attribute mode. */
	function getSortedAttributes(groups: Map<string, SkillDefinition[]>): string[] {
		const attrOrder = ['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL', 'MAG', 'RES'];
		const names = Array.from(groups.keys());
		return names.sort((a, b) => {
			const aIdx = attrOrder.indexOf(a);
			const bIdx = attrOrder.indexOf(b);
			if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
			if (aIdx === -1) return 1;
			if (bIdx === -1) return -1;
			return aIdx - bIdx;
		});
	}

	/** Handle incrementing skill group. */
	function handleIncrementGroup(groupName: string): void {
		const result = incrementSkillGroup(groupName as SkillGroupName);
		if (!result.success && result.error) {
			// Could show error toast here
			console.warn(result.error);
		}
	}

	/** Handle decrementing skill group. */
	function handleDecrementGroup(groupName: string): void {
		const result = decrementSkillGroup(groupName as SkillGroupName);
		if (!result.success && result.error) {
			console.warn(result.error);
		}
	}

	// Reactive grouping
	$: skillsByGroup = $skills ? groupBySkillGroup($skills) : new Map();
	$: skillsByAttr = $skills ? groupByAttribute($skills) : new Map();

	// Apply current grouping mode and search filter
	$: currentGroups = groupMode === 'skillgroup' ? skillsByGroup : skillsByAttr;
	$: filteredGroups = filterSkills(currentGroups, searchQuery);
	$: sortedGroupNames = groupMode === 'skillgroup'
		? getSortedSkillGroups(filteredGroups)
		: getSortedAttributes(filteredGroups);

	$: skillBP = calculateSkillBP();
	$: skillGroupBP = calculateSkillGroupBP();
	$: totalSkillBP = skillBP + skillGroupBP;

	// Reactive skill group data - this triggers re-renders when skill groups change
	$: characterSkillGroups = $character?.skillGroups ?? [];
	$: characterSkills = $character?.skills ?? [];

	// Reactive lookup for skill group ratings
	$: skillGroupRatings = new Map<string, number>(characterSkillGroups.map(g => [g.name, g.rating]));
	$: skillGroupBroken = new Map<string, boolean>(characterSkillGroups.map(g => [g.name, g.broken]));

	// Reactive lookup for individual skill ratings
	$: individualSkillRatings = new Map(characterSkills.map(s => [s.name, s.rating]));
</script>

<div class="space-y-4">
	<!-- BP Summary (centered, matching AttributeAllocator style) -->
	<div class="flex justify-center">
		<div class="bg-white border border-gray-200 rounded-lg shadow-md p-4 inline-block min-w-[350px]">
			<div class="flex items-center justify-between gap-4">
				<span class="text-black flex items-center gap-2">
					<span class="material-icons text-sm">school</span>
					Skill BP Spent
				</span>
				<span class="cw-bp-cost text-lg">{totalSkillBP}</span>
			</div>
			<div class="text-gray-500 text-xs mt-2 flex justify-between">
				<span>Individual Skills: {skillBP} BP</span>
				<span>Skill Groups: {skillGroupBP} BP</span>
			</div>
			<p class="text-gray-600 text-xs mt-1 text-center border-t border-gray-100 pt-2">
				Skills: 4 BP/point (max 6) • Groups: 10 BP/point (max {MAX_SKILL_GROUP_RATING})
			</p>
		</div>
	</div>

	<!-- Controls: Toggle + Search -->
	<div class="flex flex-wrap items-center gap-4">
		<!-- Grouping Toggle -->
		<div class="flex items-center gap-2">
			<span class="text-sm text-gray-600">View by:</span>
			<div class="flex gap-1">
				<button
					class="px-3 py-1.5 rounded text-sm transition-colors
						{groupMode === 'skillgroup'
							? 'bg-primary-main text-white'
							: 'bg-surface text-text-secondary hover:bg-surface-variant'}"
					on:click={() => (groupMode = 'skillgroup')}
				>
					Skill Group
				</button>
				<button
					class="px-3 py-1.5 rounded text-sm transition-colors
						{groupMode === 'attribute'
							? 'bg-primary-main text-white'
							: 'bg-surface text-text-secondary hover:bg-surface-variant'}"
					on:click={() => (groupMode = 'attribute')}
				>
					Attribute
				</button>
			</div>
		</div>

		<!-- Search -->
		<input
			type="text"
			placeholder="Search skills..."
			class="cw-input flex-1 min-w-[200px]"
			bind:value={searchQuery}
		/>
	</div>

	<!-- Skill Group Panels Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
		{#each sortedGroupNames as groupName}
			{@const groupSkills = filteredGroups.get(groupName) ?? []}
			{@const colorClasses = groupMode === 'skillgroup'
				? getGroupColorClasses(groupName)
				: getAttrColorClasses(groupName)}
			{@const icon = groupMode === 'skillgroup'
				? getGroupIcon(groupName)
				: getAttrIcon(groupName)}
			{@const displayName = groupMode === 'skillgroup'
				? groupName
				: getAttrName(groupName)}
			{@const isRealGroup = groupMode === 'skillgroup' && groupName !== 'Ungrouped'}
			{@const groupRating = isRealGroup ? (skillGroupRatings.get(groupName) ?? 0) : 0}
			{@const isBroken = isRealGroup ? (skillGroupBroken.get(groupName) ?? false) : false}

			<div class="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
				<!-- Header -->
				<div class="{colorClasses.bg} px-4 py-2 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-semibold {colorClasses.text} uppercase tracking-wide flex items-center gap-2">
							<span class="material-icons text-sm">{icon}</span>
							{displayName}
							{#if isBroken}
								<span class="material-icons text-xs text-red-500" title="Group broken">link_off</span>
							{/if}
						</h3>
						{#if isRealGroup}
							<div class="flex items-center gap-1">
								<button
									class="cw-btn-inc-dec"
									on:click={() => handleDecrementGroup(groupName)}
									disabled={groupRating <= 0 || isBroken}
								>
									<span class="material-icons text-xs">remove</span>
								</button>
								<span class="w-8 text-center font-mono text-lg {groupRating > 0 ? 'text-primary-dark font-bold' : 'text-gray-400'}">
									{groupRating}
								</span>
								<button
									class="cw-btn-inc-dec"
									on:click={() => handleIncrementGroup(groupName)}
									disabled={groupRating >= MAX_SKILL_GROUP_RATING || isBroken}
								>
									<span class="material-icons text-xs">add</span>
								</button>
							</div>
						{/if}
					</div>
				</div>

				<!-- Skills List -->
				<div class="max-h-[400px] overflow-y-auto">
					{#each groupSkills as skill, idx}
						{@const individualRating = individualSkillRatings.get(skill.name) ?? 0}
						{@const skillGroupRating = skill.skillgroup ? (skillGroupRatings.get(skill.skillgroup) ?? 0) : 0}
						{@const effectiveRating = Math.max(individualRating, skillGroupRating)}
						{@const isActive = effectiveRating > 0}
						{@const isFromGroup = skillGroupRating > 0 && individualRating <= skillGroupRating}
						{@const canDecrement = individualRating > skillGroupRating || (individualRating > 0 && skillGroupRating === 0)}

						<div class="flex items-center px-4 py-2 border-b border-gray-100 {idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-1">
									<span class="text-sm font-medium truncate {isActive ? 'text-primary-dark' : 'text-black'}">
										{skill.name}
									</span>
									{#if !skill.default}
										<span class="text-xs text-red-500" title="Cannot use untrained">*</span>
									{/if}
									{#if isFromGroup}
										<span class="text-xs text-indigo-500" title="Rating from skill group">G</span>
									{/if}
								</div>
								{#if groupMode === 'skillgroup'}
									<span class="text-gray-500 text-xs">{skill.attribute}</span>
								{:else}
									<span class="text-gray-500 text-xs">{skill.skillgroup || 'No group'}</span>
								{/if}
							</div>
							<div class="flex items-center gap-1">
								<button
									class="cw-btn-inc-dec"
									on:click={() => decrementSkill(skill.name, skill)}
									disabled={!canDecrement}
								>
									<span class="material-icons text-xs">remove</span>
								</button>
								<span class="w-8 text-center font-mono text-lg {isActive ? 'text-primary-dark font-bold' : 'text-gray-400'}">
									{effectiveRating}
								</span>
								<button
									class="cw-btn-inc-dec"
									on:click={() => incrementSkill(skill.name, skill)}
									disabled={effectiveRating >= MAX_RATING}
								>
									<span class="material-icons text-xs">add</span>
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<!-- Empty State -->
	{#if sortedGroupNames.length === 0}
		<div class="cw-panel p-8 text-center">
			<p class="text-text-secondary">No skills found matching your search.</p>
		</div>
	{/if}

	<!-- Help Text -->
	<div class="cw-panel p-4 text-sm">
		<h4 class="text-primary-dark font-semibold mb-2">Skill Tips</h4>
		<ul class="text-text-secondary space-y-1 list-disc list-inside">
			<li><strong>Skill Groups</strong>: Purchase all skills in a group at once (10 BP/point, max 4)</li>
			<li><strong>Individual Skills</strong>: Purchase skills separately (4 BP/point, max 6)</li>
			<li><strong>Breaking Groups</strong>: Raising a skill above its group rating "breaks" the group</li>
			<li>Skills marked with <span class="text-red-500">*</span> cannot be used untrained</li>
			<li>Skills marked with <span class="text-indigo-500">G</span> get their rating from a skill group</li>
		</ul>
	</div>
</div>
