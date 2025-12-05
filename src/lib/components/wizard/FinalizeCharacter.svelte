<script lang="ts">
	import {
		character,
		remainingBP,
		bpBreakdown,
		remainingNuyen,
		currentEssence,
		updateIdentity
	} from '$stores/character';

	/** Validation messages. */
	interface ValidationMessage {
		type: 'error' | 'warning';
		message: string;
	}

	/** Calculate total BP spent. */
	$: totalSpent = $bpBreakdown
		? Object.values($bpBreakdown).reduce((a, b) => a + b, 0)
		: 0;

	/** Validate character. */
	$: validationMessages = validateCharacter($character);

	function validateCharacter(char: typeof $character): ValidationMessage[] {
		const messages: ValidationMessage[] = [];

		if (!char) return messages;

		// Check BP balance
		if ($remainingBP < 0) {
			messages.push({
				type: 'error',
				message: `Over budget by ${Math.abs($remainingBP)} BP`
			});
		}

		// Check required fields
		if (!char.identity.name) {
			messages.push({
				type: 'warning',
				message: 'Character has no name'
			});
		}

		if (!char.identity.metatype) {
			messages.push({
				type: 'error',
				message: 'No metatype selected'
			});
		}

		// Check skills
		if (char.skills.length === 0) {
			messages.push({
				type: 'warning',
				message: 'No skills assigned'
			});
		}

		// Check essence
		if (char.attributes.ess <= 0) {
			messages.push({
				type: 'error',
				message: 'Essence cannot be 0 or negative'
			});
		}

		// Check positive quality limit (35 BP max)
		const positiveBP = char.qualities
			.filter((q) => q.category === 'Positive')
			.reduce((sum, q) => sum + q.bp, 0);
		if (positiveBP > 35) {
			messages.push({
				type: 'error',
				message: `Positive qualities exceed 35 BP limit (${positiveBP} BP)`
			});
		}

		// Check negative quality limit (35 BP max)
		const negativeBP = Math.abs(
			char.qualities
				.filter((q) => q.category === 'Negative')
				.reduce((sum, q) => sum + q.bp, 0)
		);
		if (negativeBP > 35) {
			messages.push({
				type: 'error',
				message: `Negative qualities exceed 35 BP limit (${negativeBP} BP)`
			});
		}

		// Check lifestyle
		if (!char.equipment.lifestyle) {
			messages.push({
				type: 'warning',
				message: 'No lifestyle selected - character needs somewhere to live'
			});
		}

		return messages;
	}

	/** Check if character can be saved. */
	$: canSave = validationMessages.filter((m) => m.type === 'error').length === 0;

	/** Format nuyen. */
	function formatNuyen(amount: number): string {
		return amount.toLocaleString() + ' ¥';
	}
</script>

<div class="space-y-6">
	<!-- Character Identity -->
	<section class="cw-card p-4">
		<h3 class="cw-card-header mb-4">Character Identity</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label class="block text-text-secondary text-sm mb-1" for="char-name">
					Character Name
				</label>
				<input
					id="char-name"
					type="text"
					class="cw-input w-full"
					placeholder="Enter name..."
					value={$character?.identity.name ?? ''}
					on:input={(e) => updateIdentity('name', e.currentTarget.value)}
				/>
			</div>
			<div>
				<label class="block text-text-secondary text-sm mb-1" for="char-alias">
					Street Name / Alias
				</label>
				<input
					id="char-alias"
					type="text"
					class="cw-input w-full"
					placeholder="Enter alias..."
					value={$character?.identity.alias ?? ''}
					on:input={(e) => updateIdentity('alias', e.currentTarget.value)}
				/>
			</div>
		</div>
	</section>

	<!-- Validation Messages -->
	{#if validationMessages.length > 0}
		<section class="cw-panel p-4 space-y-2">
			<h4 class="text-primary-dark font-medium mb-2">Validation</h4>
			{#each validationMessages as msg}
				<div
					class="flex items-start gap-2 text-sm
						{msg.type === 'error' ? 'text-error-main' : 'text-warning-main'}"
				>
					<span class="font-bold">{msg.type === 'error' ? '✕' : '!'}</span>
					<span>{msg.message}</span>
				</div>
			{/each}
		</section>
	{/if}

	<!-- BP Breakdown -->
	<section class="cw-card p-4">
		<h3 class="cw-card-header mb-4">Build Points</h3>
		<div class="space-y-2 text-sm">
			{#if $bpBreakdown}
				<div class="flex justify-between py-1 border-b border-border/30">
					<span class="text-text-secondary">Metatype</span>
					<span class="text-text-primary font-mono">{$bpBreakdown.metatype} BP</span>
				</div>
				<div class="flex justify-between py-1 border-b border-border/30">
					<span class="text-text-secondary">Attributes</span>
					<span class="text-text-primary font-mono">{$bpBreakdown.attributes} BP</span>
				</div>
				<div class="flex justify-between py-1 border-b border-border/30">
					<span class="text-text-secondary">Skills</span>
					<span class="text-text-primary font-mono">{$bpBreakdown.skills} BP</span>
				</div>
				<div class="flex justify-between py-1 border-b border-border/30">
					<span class="text-text-secondary">Skill Groups</span>
					<span class="text-text-primary font-mono">{$bpBreakdown.skillGroups} BP</span>
				</div>
				<div class="flex justify-between py-1 border-b border-border/30">
					<span class="text-text-secondary">Qualities</span>
					<span class="text-text-primary font-mono">{$bpBreakdown.qualities} BP</span>
				</div>
				<div class="flex justify-between py-1 border-b border-border/30">
					<span class="text-text-secondary">Spells</span>
					<span class="text-text-primary font-mono">{$bpBreakdown.spells} BP</span>
				</div>
				<div class="flex justify-between py-1 border-b border-border/30">
					<span class="text-text-secondary">Complex Forms</span>
					<span class="text-text-primary font-mono">{$bpBreakdown.complexForms} BP</span>
				</div>
				<div class="flex justify-between py-1 border-b border-border/30">
					<span class="text-text-secondary">Contacts</span>
					<span class="text-text-primary font-mono">{$bpBreakdown.contacts} BP</span>
				</div>
				<div class="flex justify-between py-1 border-b border-border/30">
					<span class="text-text-secondary">Resources</span>
					<span class="text-text-primary font-mono">{$bpBreakdown.resources} BP</span>
				</div>
				{#if $bpBreakdown.mentor > 0}
					<div class="flex justify-between py-1 border-b border-border/30">
						<span class="text-text-secondary">Mentor Spirit</span>
						<span class="text-text-primary font-mono">{$bpBreakdown.mentor} BP</span>
					</div>
				{/if}
				{#if $bpBreakdown.martialArts > 0}
					<div class="flex justify-between py-1 border-b border-border/30">
						<span class="text-text-secondary">Martial Arts</span>
						<span class="text-text-primary font-mono">{$bpBreakdown.martialArts} BP</span>
					</div>
				{/if}
				<div class="flex justify-between py-2 font-medium border-t border-border">
					<span class="text-text-secondary">Total Spent</span>
					<span class="text-text-primary font-mono">{totalSpent} / {$character?.buildPoints ?? 400} {$character?.buildMethod === 'karma' ? 'Karma' : 'BP'}</span>
				</div>
				<div class="flex justify-between py-2">
					<span class="text-text-secondary">Remaining</span>
					<span
						class="font-mono font-bold
							{$remainingBP < 0 ? 'text-error-main' : 'text-primary-dark'}"
					>
						{$remainingBP} {$character?.buildMethod === 'karma' ? 'Karma' : 'BP'}
					</span>
				</div>
			{/if}
		</div>
	</section>

	<!-- Character Summary -->
	<section class="cw-card p-4">
		<h3 class="cw-card-header mb-4">Character Summary</h3>
		{#if $character}
			<div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
				<div>
					<span class="text-text-muted block">Metatype</span>
					<span class="text-text-primary">
						{$character.identity.metatype || 'None'}
						{#if $character.identity.metavariant}
							({$character.identity.metavariant})
						{/if}
					</span>
				</div>
				<div>
					<span class="text-text-muted block">Essence</span>
					<span class="text-info-main font-mono">{$currentEssence.toFixed(2)}</span>
				</div>
				<div>
					<span class="text-text-muted block">Nuyen</span>
					<span class="text-primary-dark font-mono">{formatNuyen($remainingNuyen)}</span>
				</div>
				<div>
					<span class="text-text-muted block">Active Skills</span>
					<span class="text-text-primary">{$character.skills.length}</span>
				</div>
				<div>
					<span class="text-text-muted block">Qualities</span>
					<span class="text-text-primary">{$character.qualities.length}</span>
				</div>
				<div>
					<span class="text-text-muted block">Contacts</span>
					<span class="text-text-primary">{$character.contacts.length}</span>
				</div>
				<div>
					<span class="text-text-muted block">Weapons</span>
					<span class="text-text-primary">{$character.equipment.weapons.length}</span>
				</div>
				<div>
					<span class="text-text-muted block">Armor</span>
					<span class="text-text-primary">{$character.equipment.armor.length}</span>
				</div>
				<div>
					<span class="text-text-muted block">Cyberware</span>
					<span class="text-text-primary">{$character.equipment.cyberware.length}</span>
				</div>
				<div>
					<span class="text-text-muted block">Bioware</span>
					<span class="text-text-primary">{$character.equipment.bioware?.length ?? 0}</span>
				</div>
				<div>
					<span class="text-text-muted block">Vehicles</span>
					<span class="text-text-primary">{$character.equipment.vehicles?.length ?? 0}</span>
				</div>
				<div>
					<span class="text-text-muted block">Martial Arts</span>
					<span class="text-text-primary">{$character.equipment.martialArts?.length ?? 0}</span>
				</div>
			</div>

			<!-- Qualities List -->
			{#if $character.qualities.length > 0}
				<div class="mt-4 pt-4 border-t border-border/30">
					<span class="text-text-muted text-sm block mb-2">Qualities:</span>
					<div class="flex flex-wrap gap-2">
						{#each $character.qualities as quality}
							<span
								class="px-2 py-1 rounded text-xs
									{quality.category === 'Positive'
										? 'bg-success-main/20 text-success-dark'
										: 'bg-error-main/20 text-error-main'}"
							>
								{quality.name}
								{#if quality.bp !== 0}
									({quality.bp > 0 ? '+' : ''}{quality.bp})
								{/if}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Magic Info -->
			{#if $character.magic}
				<div class="mt-4 pt-4 border-t border-border/30">
					<span class="text-text-muted text-sm block mb-2">Magic:</span>
					<div class="text-sm">
						<span class="text-text-secondary">Tradition:</span>
						<span class="text-text-primary ml-2">{$character.magic.tradition || 'None'}</span>
						{#if $character.magic.mentor}
							<span class="text-text-muted ml-4">|</span>
							<span class="text-text-secondary ml-4">Mentor:</span>
							<span class="text-info-main ml-2">{$character.magic.mentor}</span>
						{/if}
						{#if $character.magic.spells.length > 0}
							<span class="text-text-muted ml-4">|</span>
							<span class="text-text-secondary ml-4">Spells:</span>
							<span class="text-text-primary ml-2">{$character.magic.spells.length}</span>
						{/if}
						{#if $character.magic.powers.length > 0}
							<span class="text-text-muted ml-4">|</span>
							<span class="text-text-secondary ml-4">Powers:</span>
							<span class="text-text-primary ml-2">{$character.magic.powers.length}</span>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Resonance Info -->
			{#if $character.resonance}
				<div class="mt-4 pt-4 border-t border-border/30">
					<span class="text-text-muted text-sm block mb-2">Resonance:</span>
					<div class="text-sm">
						<span class="text-text-secondary">Stream:</span>
						<span class="text-primary-dark ml-2">{$character.resonance.stream || 'None'}</span>
						{#if $character.resonance.complexForms.length > 0}
							<span class="text-text-muted ml-4">|</span>
							<span class="text-text-secondary ml-4">Complex Forms:</span>
							<span class="text-text-primary ml-2">{$character.resonance.complexForms.length}</span>
						{/if}
						{#if $character.resonance.echoes && $character.resonance.echoes.length > 0}
							<span class="text-text-muted ml-4">|</span>
							<span class="text-text-secondary ml-4">Echoes:</span>
							<span class="text-text-primary ml-2">{$character.resonance.echoes.length}</span>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Lifestyle -->
			{#if $character.equipment.lifestyle}
				<div class="mt-4 pt-4 border-t border-border/30">
					<span class="text-text-muted text-sm block mb-2">Lifestyle:</span>
					<span class="text-text-primary text-sm">
						{$character.equipment.lifestyle.name}
						({formatNuyen($character.equipment.lifestyle.monthlyCost)}/month)
					</span>
				</div>
			{/if}
		{/if}
	</section>

	<!-- Save Button -->
	<div class="flex justify-end">
		<button
			class="cw-btn cw-btn-primary px-8 py-3"
			disabled={!canSave}
			title={canSave ? 'Save character' : 'Fix errors before saving'}
		>
			Save Character
		</button>
	</div>

	<!-- Help -->
	<div class="cw-panel p-4 text-sm">
		<h4 class="text-primary-dark mb-2">Finalization Tips</h4>
		<ul class="text-text-secondary space-y-1 list-disc list-inside">
			<li>You can go back to any step to make changes</li>
			<li>Ensure all errors (red) are resolved before saving</li>
			<li>Warnings (yellow) are recommendations but not required</li>
			<li>Leftover BP can be converted to karma at 1:1 ratio</li>
		</ul>
	</div>
</div>
