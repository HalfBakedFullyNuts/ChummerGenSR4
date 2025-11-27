<script lang="ts">
	import type { Character } from '$types';

	/** Character to display. */
	export let char: Character;

	/** Calculate condition monitor boxes. */
	function getPhysicalBoxes(bod: number): number {
		return Math.ceil(bod / 2) + 8;
	}

	function getStunBoxes(wil: number): number {
		return Math.ceil(wil / 2) + 8;
	}

	/** Format nuyen with commas. */
	function formatNuyen(amount: number): string {
		return amount.toLocaleString();
	}

	/** Get total for an attribute. */
	function getAttrTotal(attr: { base: number; bonus: number } | null): number {
		if (!attr) return 0;
		return attr.base + attr.bonus;
	}

	/** Get initiative. */
	$: initiative = getAttrTotal(char.attributes.rea) + getAttrTotal(char.attributes.int);

	/** Get composure. */
	$: composure = getAttrTotal(char.attributes.cha) + getAttrTotal(char.attributes.wil);

	/** Get judge intentions. */
	$: judgeIntentions = getAttrTotal(char.attributes.cha) + getAttrTotal(char.attributes.int);

	/** Get lifting/carrying. */
	$: liftCarry = getAttrTotal(char.attributes.bod) + getAttrTotal(char.attributes.str);

	/** Get memory. */
	$: memory = getAttrTotal(char.attributes.log) + getAttrTotal(char.attributes.wil);

	/** Physical boxes. */
	$: physicalBoxes = getPhysicalBoxes(getAttrTotal(char.attributes.bod));

	/** Stun boxes. */
	$: stunBoxes = getStunBoxes(getAttrTotal(char.attributes.wil));
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="cw-card p-4">
		<div class="flex items-start justify-between">
			<div>
				<h1 class="text-2xl font-bold text-primary-text">
					{char.identity.name || 'Unnamed Character'}
				</h1>
				{#if char.identity.alias}
					<p class="text-accent-cyan">"{char.identity.alias}"</p>
				{/if}
				<p class="text-secondary-text">
					{char.identity.metatype}
					{#if char.identity.metavariant}
						({char.identity.metavariant})
					{/if}
				</p>
			</div>
			<div class="text-right">
				<div class="text-sm text-muted-text">
					{char.status === 'career' ? 'Career Mode' : 'In Creation'}
				</div>
				{#if char.status === 'career'}
					<div class="text-accent-primary font-bold">Karma: {char.karma}</div>
				{/if}
				<div class="text-accent-cyan">Nuyen: {formatNuyen(char.nuyen)}</div>
			</div>
		</div>
	</div>

	<!-- Main Stats Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		<!-- Attributes -->
		<div class="cw-card">
			<h2 class="cw-card-header">Attributes</h2>
			<div class="grid grid-cols-2 gap-2 text-sm">
				<div class="flex justify-between">
					<span class="text-secondary-text">BOD</span>
					<span class="font-mono text-primary-text">{getAttrTotal(char.attributes.bod)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary-text">AGI</span>
					<span class="font-mono text-primary-text">{getAttrTotal(char.attributes.agi)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary-text">REA</span>
					<span class="font-mono text-primary-text">{getAttrTotal(char.attributes.rea)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary-text">STR</span>
					<span class="font-mono text-primary-text">{getAttrTotal(char.attributes.str)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary-text">CHA</span>
					<span class="font-mono text-primary-text">{getAttrTotal(char.attributes.cha)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary-text">INT</span>
					<span class="font-mono text-primary-text">{getAttrTotal(char.attributes.int)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary-text">LOG</span>
					<span class="font-mono text-primary-text">{getAttrTotal(char.attributes.log)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary-text">WIL</span>
					<span class="font-mono text-primary-text">{getAttrTotal(char.attributes.wil)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary-text">EDG</span>
					<span class="font-mono text-accent-primary">{getAttrTotal(char.attributes.edg)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary-text">ESS</span>
					<span class="font-mono text-accent-cyan">{char.attributes.ess.toFixed(2)}</span>
				</div>
				{#if char.attributes.mag}
					<div class="flex justify-between">
						<span class="text-secondary-text">MAG</span>
						<span class="font-mono text-accent-magenta">{getAttrTotal(char.attributes.mag)}</span>
					</div>
				{/if}
				{#if char.attributes.res}
					<div class="flex justify-between">
						<span class="text-secondary-text">RES</span>
						<span class="font-mono text-accent-magenta">{getAttrTotal(char.attributes.res)}</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Derived Stats -->
		<div class="cw-card">
			<h2 class="cw-card-header">Derived Stats</h2>
			<div class="space-y-2 text-sm">
				<div class="flex justify-between">
					<span class="text-secondary-text">Initiative</span>
					<span class="font-mono text-primary-text">{initiative} + 1d6</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary-text">Composure</span>
					<span class="font-mono text-primary-text">{composure}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary-text">Judge Intentions</span>
					<span class="font-mono text-primary-text">{judgeIntentions}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary-text">Lift/Carry</span>
					<span class="font-mono text-primary-text">{liftCarry}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary-text">Memory</span>
					<span class="font-mono text-primary-text">{memory}</span>
				</div>
			</div>
		</div>

		<!-- Condition Monitor -->
		<div class="cw-card">
			<h2 class="cw-card-header">Condition Monitor</h2>
			<div class="space-y-3">
				<div>
					<div class="flex justify-between text-sm mb-1">
						<span class="text-secondary-text">Physical</span>
						<span class="text-primary-text">{char.condition.physicalCurrent} / {physicalBoxes}</span>
					</div>
					<div class="flex flex-wrap gap-1">
						{#each Array(physicalBoxes) as _, i}
							<div
								class="w-5 h-5 border rounded text-center text-xs leading-5
									{i < char.condition.physicalCurrent
										? 'bg-accent-danger border-accent-danger text-surface'
										: 'border-border text-muted-text'}"
							>
								{i < char.condition.physicalCurrent ? 'X' : ''}
							</div>
						{/each}
					</div>
				</div>
				<div>
					<div class="flex justify-between text-sm mb-1">
						<span class="text-secondary-text">Stun</span>
						<span class="text-primary-text">{char.condition.stunCurrent} / {stunBoxes}</span>
					</div>
					<div class="flex flex-wrap gap-1">
						{#each Array(stunBoxes) as _, i}
							<div
								class="w-5 h-5 border rounded text-center text-xs leading-5
									{i < char.condition.stunCurrent
										? 'bg-accent-warning border-accent-warning text-surface'
										: 'border-border text-muted-text'}"
							>
								{i < char.condition.stunCurrent ? 'X' : ''}
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Skills -->
	<div class="cw-card">
		<h2 class="cw-card-header">Active Skills</h2>
		{#if char.skills.length === 0}
			<p class="text-muted-text text-sm">No skills.</p>
		{:else}
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
				{#each char.skills.sort((a, b) => a.name.localeCompare(b.name)) as skill}
					<div class="flex justify-between py-1 border-b border-border">
						<span class="text-secondary-text truncate" title={skill.name}>
							{skill.name}
							{#if skill.specialization}
								<span class="text-muted-text">({skill.specialization})</span>
							{/if}
						</span>
						<span class="font-mono text-primary-text ml-2">
							{skill.rating + skill.bonus}
							{#if skill.specialization}
								<span class="text-accent-cyan">(+2)</span>
							{/if}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Knowledge Skills -->
	{#if char.knowledgeSkills.length > 0}
		<div class="cw-card">
			<h2 class="cw-card-header">Knowledge Skills</h2>
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
				{#each char.knowledgeSkills.sort((a, b) => a.name.localeCompare(b.name)) as skill}
					<div class="flex justify-between py-1 border-b border-border">
						<span class="text-secondary-text truncate" title={skill.name}>
							{skill.name}
							<span class="text-muted-text text-xs">({skill.category})</span>
						</span>
						<span class="font-mono text-primary-text ml-2">{skill.rating}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Qualities -->
	{#if char.qualities.length > 0}
		<div class="cw-card">
			<h2 class="cw-card-header">Qualities</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
				{#each char.qualities as quality}
					<div class="flex justify-between py-1 border-b border-border">
						<span class:text-accent-success={quality.category === 'Positive'}
							  class:text-accent-danger={quality.category === 'Negative'}>
							{quality.name}
						</span>
						<span class="text-muted-text">{quality.bp} BP</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Equipment Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<!-- Weapons -->
		{#if char.equipment.weapons.length > 0}
			<div class="cw-card">
				<h2 class="cw-card-header">Weapons</h2>
				<div class="space-y-2 text-sm">
					{#each char.equipment.weapons as weapon}
						<div class="p-2 bg-surface-light rounded">
							<div class="font-medium text-primary-text">{weapon.name}</div>
							<div class="flex flex-wrap gap-3 text-xs text-muted-text mt-1">
								<span>DMG: <span class="text-secondary-text">{weapon.damage}</span></span>
								<span>AP: <span class="text-secondary-text">{weapon.ap}</span></span>
								{#if weapon.mode}
									<span>Mode: <span class="text-secondary-text">{weapon.mode}</span></span>
								{/if}
								{#if weapon.ammo}
									<span>Ammo: <span class="text-secondary-text">{weapon.ammo}</span></span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Armor -->
		{#if char.equipment.armor.length > 0}
			<div class="cw-card">
				<h2 class="cw-card-header">Armor</h2>
				<div class="space-y-2 text-sm">
					{#each char.equipment.armor as armor}
						<div class="p-2 bg-surface-light rounded flex justify-between items-center">
							<div>
								<span class="font-medium text-primary-text">{armor.name}</span>
								{#if armor.equipped}
									<span class="ml-2 text-xs text-accent-success">(Equipped)</span>
								{/if}
							</div>
							<div class="text-xs text-muted-text">
								B: <span class="text-secondary-text">{armor.ballistic}</span>
								/ I: <span class="text-secondary-text">{armor.impact}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Cyberware -->
	{#if char.equipment.cyberware.length > 0}
		<div class="cw-card">
			<h2 class="cw-card-header">Cyberware</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
				{#each char.equipment.cyberware as cyber}
					<div class="flex justify-between py-1 border-b border-border">
						<span class="text-secondary-text">
							{cyber.name}
							{#if cyber.rating > 0}
								<span class="text-muted-text">(R{cyber.rating})</span>
							{/if}
							{#if cyber.grade !== 'Standard'}
								<span class="text-accent-cyan text-xs ml-1">[{cyber.grade}]</span>
							{/if}
						</span>
						<span class="text-accent-danger text-xs">{cyber.essence.toFixed(2)} ESS</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Magic -->
	{#if char.magic}
		<div class="cw-card">
			<h2 class="cw-card-header">Magic</h2>
			<div class="space-y-4">
				<div class="flex gap-4 text-sm">
					<span class="text-secondary-text">Tradition: <span class="text-primary-text">{char.magic.tradition}</span></span>
					{#if char.magic.initiateGrade > 0}
						<span class="text-secondary-text">Initiate Grade: <span class="text-accent-magenta">{char.magic.initiateGrade}</span></span>
					{/if}
				</div>

				{#if char.magic.spells.length > 0}
					<div>
						<h3 class="text-sm font-medium text-secondary-text mb-2">Spells</h3>
						<div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
							{#each char.magic.spells as spell}
								<div class="p-2 bg-surface-light rounded">
									<div class="font-medium text-primary-text">{spell.name}</div>
									<div class="text-xs text-muted-text">
										{spell.category} • {spell.type} • DV {spell.dv}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if char.magic.powers.length > 0}
					<div>
						<h3 class="text-sm font-medium text-secondary-text mb-2">Adept Powers</h3>
						<div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
							{#each char.magic.powers as power}
								<div class="flex justify-between py-1 border-b border-border">
									<span class="text-secondary-text">{power.name}</span>
									<span class="text-accent-magenta">{power.points * power.level} PP</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Contacts -->
	{#if char.contacts.length > 0}
		<div class="cw-card">
			<h2 class="cw-card-header">Contacts</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
				{#each char.contacts as contact}
					<div class="p-2 bg-surface-light rounded">
						<div class="font-medium text-primary-text">{contact.name}</div>
						<div class="flex justify-between text-xs">
							<span class="text-muted-text">{contact.type}</span>
							<span class="text-secondary-text">
								L: {contact.loyalty} / C: {contact.connection}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Identity Details -->
	<div class="cw-card">
		<h2 class="cw-card-header">Identity</h2>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
			{#if char.identity.sex}
				<div>
					<span class="text-muted-text">Sex:</span>
					<span class="text-secondary-text ml-1">{char.identity.sex}</span>
				</div>
			{/if}
			{#if char.identity.age}
				<div>
					<span class="text-muted-text">Age:</span>
					<span class="text-secondary-text ml-1">{char.identity.age}</span>
				</div>
			{/if}
			{#if char.identity.height}
				<div>
					<span class="text-muted-text">Height:</span>
					<span class="text-secondary-text ml-1">{char.identity.height}</span>
				</div>
			{/if}
			{#if char.identity.weight}
				<div>
					<span class="text-muted-text">Weight:</span>
					<span class="text-secondary-text ml-1">{char.identity.weight}</span>
				</div>
			{/if}
		</div>
		{#if char.background.description}
			<div class="mt-4 pt-4 border-t border-border">
				<h3 class="text-sm font-medium text-secondary-text mb-2">Description</h3>
				<p class="text-secondary-text text-sm whitespace-pre-wrap">{char.background.description}</p>
			</div>
		{/if}
	</div>
</div>
