<script lang="ts">
	/**
	 * Character Sheet Print View
	 * ==========================
	 * Generates a print-optimized view of the character sheet.
	 * Supports direct printing and PDF export.
	 */

	import { character } from '$stores/character';
	import { getTotalAttributeValue } from '$lib/engine/calculations';
	import type { Character } from '$types';

	/** Whether to show print preview. */
	export let previewMode = true;

	/** Print the character sheet. */
	function printSheet(): void {
		window.print();
	}

	/** Export to PDF (uses print dialog). */
	function exportPDF(): void {
		/* Show print dialog with "Save as PDF" option */
		window.print();
	}

	/** Get attribute value. */
	function getAttr(char: Character, attr: string): number {
		return getTotalAttributeValue(char, attr as keyof typeof char.attributes);
	}

	/** Get derived attribute. */
	function getDerived(char: Character, type: 'initiative' | 'composure' | 'judgeIntent' | 'memory' | 'liftCarry'): number {
		const attrs = char.attributes;
		switch (type) {
			case 'initiative':
				return getAttr(char, 'int') + getAttr(char, 'rea');
			case 'composure':
				return getAttr(char, 'wil') + getAttr(char, 'cha');
			case 'judgeIntent':
				return getAttr(char, 'int') + getAttr(char, 'cha');
			case 'memory':
				return getAttr(char, 'log') + getAttr(char, 'wil');
			case 'liftCarry':
				return getAttr(char, 'str') + getAttr(char, 'bod');
			default:
				return 0;
		}
	}

	/** Get condition monitor boxes. */
	function getConditionBoxes(max: number, current: number): boolean[] {
		return Array(max).fill(false).map((_, i) => i < current);
	}

	/** Format nuyen. */
	function formatNuyen(amount: number): string {
		return amount.toLocaleString() + '¥';
	}
</script>

<svelte:head>
	<link rel="stylesheet" href="/src/lib/styles/print.css" />
</svelte:head>

{#if !$character}
	<div class="p-6 text-center">
		<p class="text-muted-text">No character loaded</p>
	</div>
{:else}
	<!-- Print Controls (hidden when printing) -->
	<div class="no-print mb-4 flex items-center justify-between">
		<h3 class="text-lg font-medium text-primary-text">Print Preview</h3>
		<div class="flex gap-2">
			<button
				class="px-4 py-2 rounded bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 transition-colors"
				on:click={printSheet}
			>
				Print
			</button>
			<button
				class="px-4 py-2 rounded bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30 transition-colors"
				on:click={exportPDF}
			>
				Save as PDF
			</button>
		</div>
	</div>

	<!-- Print Preview Container -->
	<div class="print-preview print-container">
		<!-- Header -->
		<header class="print-header">
			<div>
				<h1>{$character.identity.name || 'Unnamed Character'}</h1>
				<div class="subtitle">
					{$character.identity.metatype}
					{#if $character.identity.metavariant}
						({$character.identity.metavariant})
					{/if}
					• {$character.buildMethod.toUpperCase()} Build
					• {$character.status === 'career' ? 'Career Mode' : 'Creation'}
				</div>
			</div>
			<div class="text-right text-sm">
				<div>Player: {$character.identity.playerName || '—'}</div>
				<div>Alias: {$character.identity.alias || '—'}</div>
			</div>
		</header>

		<!-- Attributes Section -->
		<section class="print-section avoid-break">
			<div class="print-section-header">Attributes</div>
			<div class="print-grid-4">
				<div class="print-attr-box">
					<div class="print-attr-label">BOD</div>
					<div class="print-attr-value">{getAttr($character, 'bod')}</div>
				</div>
				<div class="print-attr-box">
					<div class="print-attr-label">AGI</div>
					<div class="print-attr-value">{getAttr($character, 'agi')}</div>
				</div>
				<div class="print-attr-box">
					<div class="print-attr-label">REA</div>
					<div class="print-attr-value">{getAttr($character, 'rea')}</div>
				</div>
				<div class="print-attr-box">
					<div class="print-attr-label">STR</div>
					<div class="print-attr-value">{getAttr($character, 'str')}</div>
				</div>
				<div class="print-attr-box">
					<div class="print-attr-label">CHA</div>
					<div class="print-attr-value">{getAttr($character, 'cha')}</div>
				</div>
				<div class="print-attr-box">
					<div class="print-attr-label">INT</div>
					<div class="print-attr-value">{getAttr($character, 'int')}</div>
				</div>
				<div class="print-attr-box">
					<div class="print-attr-label">LOG</div>
					<div class="print-attr-value">{getAttr($character, 'log')}</div>
				</div>
				<div class="print-attr-box">
					<div class="print-attr-label">WIL</div>
					<div class="print-attr-value">{getAttr($character, 'wil')}</div>
				</div>
			</div>
			<div class="print-grid-4" style="margin-top: 8pt;">
				<div class="print-attr-box">
					<div class="print-attr-label">Edge</div>
					<div class="print-attr-value">{getAttr($character, 'edg')}</div>
				</div>
				<div class="print-attr-box">
					<div class="print-attr-label">Essence</div>
					<div class="print-attr-value">{$character.attributes.ess.toFixed(2)}</div>
				</div>
				{#if $character.attributes.mag}
					<div class="print-attr-box">
						<div class="print-attr-label">Magic</div>
						<div class="print-attr-value">{getAttr($character, 'mag')}</div>
					</div>
				{/if}
				{#if $character.attributes.res}
					<div class="print-attr-box">
						<div class="print-attr-label">Resonance</div>
						<div class="print-attr-value">{getAttr($character, 'res')}</div>
					</div>
				{/if}
			</div>
		</section>

		<!-- Derived Attributes & Condition -->
		<section class="print-section avoid-break">
			<div class="print-grid-2">
				<div>
					<div class="print-section-header">Derived Attributes</div>
					<table class="print-table">
						<tr>
							<td>Initiative</td>
							<td>{getDerived($character, 'initiative')} + 1d6</td>
						</tr>
						<tr>
							<td>Composure</td>
							<td>{getDerived($character, 'composure')}</td>
						</tr>
						<tr>
							<td>Judge Intentions</td>
							<td>{getDerived($character, 'judgeIntent')}</td>
						</tr>
						<tr>
							<td>Memory</td>
							<td>{getDerived($character, 'memory')}</td>
						</tr>
						<tr>
							<td>Lift/Carry</td>
							<td>{getDerived($character, 'liftCarry')} ({getDerived($character, 'liftCarry') * 10} kg)</td>
						</tr>
					</table>
				</div>
				<div>
					<div class="print-section-header">Condition Monitor</div>
					<div style="margin-bottom: 8pt;">
						<div style="font-weight: bold; font-size: 9pt;">Physical ({$character.condition.physicalMax})</div>
						<div class="print-cm-row">
							{#each getConditionBoxes($character.condition.physicalMax, $character.condition.physicalCurrent) as filled}
								<div class="print-cm-box" class:filled></div>
							{/each}
						</div>
					</div>
					<div>
						<div style="font-weight: bold; font-size: 9pt;">Stun ({$character.condition.stunMax})</div>
						<div class="print-cm-row">
							{#each getConditionBoxes($character.condition.stunMax, $character.condition.stunCurrent) as filled}
								<div class="print-cm-box" class:filled></div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Skills Section -->
		{#if $character.skills.length > 0}
			<section class="print-section avoid-break">
				<div class="print-section-header">Active Skills</div>
				<div class="print-skill-list">
					{#each $character.skills.filter(s => s.rating > 0).sort((a, b) => a.name.localeCompare(b.name)) as skill}
						<div class="print-skill-item">
							<span>
								{skill.name}
								{#if skill.specialization}
									<span style="font-size: 8pt;">({skill.specialization})</span>
								{/if}
							</span>
							<span style="font-weight: bold;">{skill.rating}</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Knowledge Skills -->
		{#if $character.knowledgeSkills.length > 0}
			<section class="print-section avoid-break">
				<div class="print-section-header">Knowledge Skills</div>
				<div class="print-skill-list">
					{#each $character.knowledgeSkills.filter(s => s.rating > 0).sort((a, b) => a.name.localeCompare(b.name)) as skill}
						<div class="print-skill-item">
							<span>
								{skill.name}
								<span style="font-size: 8pt; color: #666;">({skill.category})</span>
							</span>
							<span style="font-weight: bold;">{skill.rating}</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Qualities -->
		{#if $character.qualities.length > 0}
			<section class="print-section avoid-break">
				<div class="print-section-header">Qualities</div>
				<div class="print-grid-2">
					<div>
						<div style="font-weight: bold; font-size: 9pt; margin-bottom: 4pt;">Positive</div>
						{#each $character.qualities.filter(q => q.category === 'Positive') as quality}
							<div style="font-size: 9pt; padding: 2pt 0;">
								{quality.name}
								{#if quality.rating > 1}({quality.rating}){/if}
							</div>
						{/each}
					</div>
					<div>
						<div style="font-weight: bold; font-size: 9pt; margin-bottom: 4pt;">Negative</div>
						{#each $character.qualities.filter(q => q.category === 'Negative') as quality}
							<div style="font-size: 9pt; padding: 2pt 0;">
								{quality.name}
								{#if quality.rating > 1}({quality.rating}){/if}
							</div>
						{/each}
					</div>
				</div>
			</section>
		{/if}

		<!-- Equipment - Weapons -->
		{#if $character.equipment.weapons.length > 0}
			<section class="print-section avoid-break">
				<div class="print-section-header">Weapons</div>
				<table class="print-table">
					<thead>
						<tr>
							<th>Weapon</th>
							<th>DV</th>
							<th>AP</th>
							<th>Mode</th>
							<th>RC</th>
							<th>Ammo</th>
						</tr>
					</thead>
					<tbody>
						{#each $character.equipment.weapons as weapon}
							<tr>
								<td>{weapon.name}</td>
								<td>{weapon.damage}</td>
								<td>{weapon.ap}</td>
								<td>{weapon.mode}</td>
								<td>{weapon.rc || '—'}</td>
								<td>{weapon.ammo || '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>
		{/if}

		<!-- Equipment - Armor -->
		{#if $character.equipment.armor.length > 0}
			<section class="print-section avoid-break">
				<div class="print-section-header">Armor</div>
				<table class="print-table">
					<thead>
						<tr>
							<th>Armor</th>
							<th>Ballistic</th>
							<th>Impact</th>
						</tr>
					</thead>
					<tbody>
						{#each $character.equipment.armor as armor}
							<tr>
								<td>
									{armor.name}
									{#if armor.equipped}*{/if}
								</td>
								<td>{armor.ballistic}</td>
								<td>{armor.impact}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>
		{/if}

		<!-- Cyberware/Bioware -->
		{#if $character.equipment.cyberware.length > 0 || $character.equipment.bioware.length > 0}
			<section class="print-section avoid-break">
				<div class="print-section-header">Augmentations</div>
				<div class="print-grid-2">
					{#if $character.equipment.cyberware.length > 0}
						<div>
							<div style="font-weight: bold; font-size: 9pt; margin-bottom: 4pt;">Cyberware</div>
							{#each $character.equipment.cyberware as item}
								<div style="font-size: 9pt; padding: 2pt 0;">
									{item.name}
									{#if item.rating > 0}(R{item.rating}){/if}
									<span style="color: #666;">- {item.essenceCost.toFixed(2)} ESS</span>
								</div>
							{/each}
						</div>
					{/if}
					{#if $character.equipment.bioware.length > 0}
						<div>
							<div style="font-weight: bold; font-size: 9pt; margin-bottom: 4pt;">Bioware</div>
							{#each $character.equipment.bioware as item}
								<div style="font-size: 9pt; padding: 2pt 0;">
									{item.name}
									{#if item.rating > 0}(R{item.rating}){/if}
									<span style="color: #666;">- {item.essenceCost.toFixed(2)} ESS</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Magic -->
		{#if $character.magic}
			<section class="print-section avoid-break page-break">
				<div class="print-section-header">
					Magic - {$character.magic.tradition}
					{#if $character.magic.mentor}
						({$character.magic.mentor})
					{/if}
				</div>

				{#if $character.magic.spells.length > 0}
					<div style="margin-bottom: 8pt;">
						<div style="font-weight: bold; font-size: 9pt; margin-bottom: 4pt;">Spells</div>
						<table class="print-table">
							<thead>
								<tr>
									<th>Spell</th>
									<th>Type</th>
									<th>Range</th>
									<th>Duration</th>
									<th>DV</th>
								</tr>
							</thead>
							<tbody>
								{#each $character.magic.spells as spell}
									<tr>
										<td>{spell.name}</td>
										<td>{spell.type}</td>
										<td>{spell.range}</td>
										<td>{spell.duration}</td>
										<td>{spell.dv}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

				{#if $character.magic.powers.length > 0}
					<div>
						<div style="font-weight: bold; font-size: 9pt; margin-bottom: 4pt;">
							Adept Powers ({$character.magic.powerPointsUsed}/{$character.magic.powerPoints} PP)
						</div>
						{#each $character.magic.powers as power}
							<div style="font-size: 9pt; padding: 2pt 0;">
								{power.name}
								{#if power.level > 1}(Level {power.level}){/if}
								<span style="color: #666;">- {power.points} PP</span>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<!-- Contacts -->
		{#if $character.contacts.length > 0}
			<section class="print-section avoid-break">
				<div class="print-section-header">Contacts</div>
				<table class="print-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Type</th>
							<th>Loyalty</th>
							<th>Connection</th>
						</tr>
					</thead>
					<tbody>
						{#each $character.contacts as contact}
							<tr>
								<td>{contact.name}</td>
								<td>{contact.type}</td>
								<td>{contact.loyalty}</td>
								<td>{contact.connection}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>
		{/if}

		<!-- Resources -->
		<section class="print-section avoid-break">
			<div class="print-section-header">Resources</div>
			<div class="print-grid-3">
				<div class="print-attr-box">
					<div class="print-attr-label">Nuyen</div>
					<div class="print-attr-value" style="font-size: 12pt;">{formatNuyen($character.nuyen)}</div>
				</div>
				<div class="print-attr-box">
					<div class="print-attr-label">Karma</div>
					<div class="print-attr-value" style="font-size: 12pt;">{$character.karma}</div>
				</div>
				<div class="print-attr-box">
					<div class="print-attr-label">Street Cred</div>
					<div class="print-attr-value" style="font-size: 12pt;">{$character.reputation.streetCred}</div>
				</div>
			</div>
		</section>

		<!-- Notes -->
		{#if $character.background.notes}
			<section class="print-section">
				<div class="print-section-header">Notes</div>
				<div class="print-notes">{$character.background.notes}</div>
			</section>
		{/if}

		<!-- Footer -->
		<div class="print-footer">
			Generated by Chummer Web • {new Date().toLocaleDateString()}
		</div>
	</div>
{/if}
