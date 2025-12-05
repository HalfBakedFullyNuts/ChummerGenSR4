<script lang="ts">
	/**
	 * Character Print View Component
	 * ================================
	 * Print-friendly character sheet layout.
	 */

	import { character } from '$stores/character';

	/** Print the sheet. */
	function handlePrint(): void {
		window.print();
	}

	/** Calculate dice pool. */
	function dicePool(attr: number, skill: number): number {
		return attr + skill;
	}

	/** Format nuyen. */
	function formatNuyen(amount: number): string {
		return amount.toLocaleString() + '¥';
	}

	$: char = $character;
	$: attrs = char?.attributes;
</script>

<svelte:head>
	<style>
		@media print {
			body * {
				visibility: hidden;
			}
			.print-container, .print-container * {
				visibility: visible;
			}
			.print-container {
				position: absolute;
				left: 0;
				top: 0;
				width: 100%;
			}
			.no-print {
				display: none !important;
			}
		}
	</style>
</svelte:head>

<div class="space-y-4">
	<!-- Print Button (hidden in print) -->
	<div class="no-print flex items-center justify-between">
		<h3 class="text-lg font-medium text-primary-text">Character Sheet</h3>
		<button class="cw-btn cw-btn-primary" on:click={handlePrint}>
			Print / Save PDF
		</button>
	</div>

	{#if char}
		<div class="print-container bg-white text-black p-6 rounded shadow-lg">
			<!-- Header -->
			<div class="border-b-2 border-black pb-2 mb-4">
				<h1 class="text-2xl font-bold">{char.identity.name || 'Unnamed Character'}</h1>
				<div class="flex justify-between text-sm">
					<span>{char.identity.metatype}{char.identity.metavariant ? ` (${char.identity.metavariant})` : ''}</span>
					<span>Player: {char.identity.playerName || 'Unknown'}</span>
				</div>
			</div>

			<!-- Main Grid -->
			<div class="grid grid-cols-2 gap-4">
				<!-- Left Column -->
				<div class="space-y-4">
					<!-- Attributes -->
					<section>
						<h2 class="text-lg font-bold border-b border-gray-400 mb-2">Attributes</h2>
						<div class="grid grid-cols-4 gap-2 text-sm">
							{#if attrs}
								<div class="text-center p-1 border">
									<div class="font-bold">BOD</div>
									<div class="text-lg">{attrs.bod?.total ?? 0}</div>
								</div>
								<div class="text-center p-1 border">
									<div class="font-bold">AGI</div>
									<div class="text-lg">{attrs.agi?.total ?? 0}</div>
								</div>
								<div class="text-center p-1 border">
									<div class="font-bold">REA</div>
									<div class="text-lg">{attrs.rea?.total ?? 0}</div>
								</div>
								<div class="text-center p-1 border">
									<div class="font-bold">STR</div>
									<div class="text-lg">{attrs.str?.total ?? 0}</div>
								</div>
								<div class="text-center p-1 border">
									<div class="font-bold">CHA</div>
									<div class="text-lg">{attrs.cha?.total ?? 0}</div>
								</div>
								<div class="text-center p-1 border">
									<div class="font-bold">INT</div>
									<div class="text-lg">{attrs.int?.total ?? 0}</div>
								</div>
								<div class="text-center p-1 border">
									<div class="font-bold">LOG</div>
									<div class="text-lg">{attrs.log?.total ?? 0}</div>
								</div>
								<div class="text-center p-1 border">
									<div class="font-bold">WIL</div>
									<div class="text-lg">{attrs.wil?.total ?? 0}</div>
								</div>
							{/if}
						</div>
						<div class="grid grid-cols-3 gap-2 text-sm mt-2">
							<div class="text-center p-1 border bg-gray-100">
								<div class="font-bold">EDG</div>
								<div class="text-lg">{attrs?.edg?.total ?? 0}</div>
							</div>
							{#if char.magic}
								<div class="text-center p-1 border bg-purple-50">
									<div class="font-bold">MAG</div>
									<div class="text-lg">{attrs?.mag?.total ?? 0}</div>
								</div>
							{/if}
							{#if char.resonance}
								<div class="text-center p-1 border bg-cyan-50">
									<div class="font-bold">RES</div>
									<div class="text-lg">{attrs?.res?.total ?? 0}</div>
								</div>
							{/if}
							<div class="text-center p-1 border">
								<div class="font-bold">ESS</div>
								<div class="text-lg">{attrs?.ess?.total?.toFixed(2) ?? '6.00'}</div>
							</div>
						</div>
					</section>

					<!-- Derived Stats -->
					<section>
						<h2 class="text-lg font-bold border-b border-gray-400 mb-2">Derived</h2>
						<div class="grid grid-cols-2 gap-2 text-sm">
							<div class="flex justify-between p-1 border">
								<span>Initiative</span>
								<span class="font-bold">
									{(attrs?.int?.total ?? 0) + (attrs?.rea?.total ?? 0)} + 1d6
								</span>
							</div>
							<div class="flex justify-between p-1 border">
								<span>Composure</span>
								<span class="font-bold">
									{(attrs?.cha?.total ?? 0) + (attrs?.wil?.total ?? 0)}
								</span>
							</div>
							<div class="flex justify-between p-1 border">
								<span>Judge Intent</span>
								<span class="font-bold">
									{(attrs?.cha?.total ?? 0) + (attrs?.int?.total ?? 0)}
								</span>
							</div>
							<div class="flex justify-between p-1 border">
								<span>Memory</span>
								<span class="font-bold">
									{(attrs?.log?.total ?? 0) + (attrs?.wil?.total ?? 0)}
								</span>
							</div>
							<div class="flex justify-between p-1 border">
								<span>Lift/Carry</span>
								<span class="font-bold">
									{(attrs?.bod?.total ?? 0) + (attrs?.str?.total ?? 0)}
								</span>
							</div>
						</div>
					</section>

					<!-- Condition Monitor -->
					<section>
						<h2 class="text-lg font-bold border-b border-gray-400 mb-2">Condition Monitor</h2>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<div class="font-bold">Physical: {char.condition.physicalMax}</div>
								<div class="flex flex-wrap gap-1 mt-1">
									{#each Array(char.condition.physicalMax) as _, i}
										<div class="w-4 h-4 border border-black"></div>
									{/each}
								</div>
							</div>
							<div>
								<div class="font-bold">Stun: {char.condition.stunMax}</div>
								<div class="flex flex-wrap gap-1 mt-1">
									{#each Array(char.condition.stunMax) as _, i}
										<div class="w-4 h-4 border border-black"></div>
									{/each}
								</div>
							</div>
						</div>
					</section>

					<!-- Qualities -->
					<section>
						<h2 class="text-lg font-bold border-b border-gray-400 mb-2">Qualities</h2>
						<div class="text-sm space-y-1">
							{#each char.qualities.filter(q => q.category === 'Positive') as quality}
								<div class="text-green-700">+ {quality.name}{quality.rating > 1 ? ` R${quality.rating}` : ''}</div>
							{/each}
							{#each char.qualities.filter(q => q.category === 'Negative') as quality}
								<div class="text-red-700">- {quality.name}{quality.rating > 1 ? ` R${quality.rating}` : ''}</div>
							{/each}
							{#if char.qualities.length === 0}
								<div class="text-gray-400 italic">None</div>
							{/if}
						</div>
					</section>
				</div>

				<!-- Right Column -->
				<div class="space-y-4">
					<!-- Active Skills -->
					<section>
						<h2 class="text-lg font-bold border-b border-gray-400 mb-2">Active Skills</h2>
						<div class="text-xs space-y-0.5 max-h-48 overflow-hidden">
							{#each char.skills.filter(s => s.rating > 0).sort((a, b) => b.rating - a.rating) as skill}
								<div class="flex justify-between">
									<span>{skill.name}{skill.specialization ? ` (${skill.specialization})` : ''}</span>
									<span class="font-mono">{skill.rating}</span>
								</div>
							{/each}
							{#if char.skills.filter(s => s.rating > 0).length === 0}
								<div class="text-gray-400 italic">No skills</div>
							{/if}
						</div>
					</section>

					<!-- Knowledge Skills -->
					<section>
						<h2 class="text-lg font-bold border-b border-gray-400 mb-2">Knowledge Skills</h2>
						<div class="text-xs space-y-0.5">
							{#each char.knowledgeSkills as skill}
								<div class="flex justify-between">
									<span>{skill.name} ({skill.category})</span>
									<span class="font-mono">{skill.rating}</span>
								</div>
							{/each}
							{#if char.knowledgeSkills.length === 0}
								<div class="text-gray-400 italic">No knowledge skills</div>
							{/if}
						</div>
					</section>

					<!-- Contacts -->
					<section>
						<h2 class="text-lg font-bold border-b border-gray-400 mb-2">Contacts</h2>
						<div class="text-xs space-y-1">
							{#each char.contacts as contact}
								<div class="flex justify-between">
									<span>{contact.name} ({contact.type})</span>
									<span class="font-mono">L{contact.loyalty}/C{contact.connection}</span>
								</div>
							{/each}
							{#if char.contacts.length === 0}
								<div class="text-gray-400 italic">No contacts</div>
							{/if}
						</div>
					</section>

					<!-- Resources -->
					<section>
						<h2 class="text-lg font-bold border-b border-gray-400 mb-2">Resources</h2>
						<div class="text-sm">
							<div class="flex justify-between">
								<span>Nuyen</span>
								<span class="font-bold">{formatNuyen(char.nuyen)}</span>
							</div>
							<div class="flex justify-between">
								<span>Karma</span>
								<span class="font-bold">{char.karma}</span>
							</div>
						</div>
					</section>
				</div>
			</div>

			<!-- Equipment Section -->
			<div class="mt-4 border-t border-gray-300 pt-4">
				<h2 class="text-lg font-bold border-b border-gray-400 mb-2">Equipment</h2>
				<div class="grid grid-cols-3 gap-4 text-xs">
					<!-- Weapons -->
					<div>
						<h3 class="font-bold mb-1">Weapons</h3>
						{#each char.equipment.weapons as weapon}
							<div class="mb-1">
								<div class="font-medium">{weapon.name}</div>
								<div class="text-gray-600">DV: {weapon.damage} | AP: {weapon.ap}</div>
							</div>
						{/each}
						{#if char.equipment.weapons.length === 0}
							<div class="text-gray-400 italic">None</div>
						{/if}
					</div>

					<!-- Armor -->
					<div>
						<h3 class="font-bold mb-1">Armor</h3>
						{#each char.equipment.armor as armor}
							<div class="mb-1">
								<div class="font-medium">{armor.name}</div>
								<div class="text-gray-600">B/I: {armor.ballistic}/{armor.impact}</div>
							</div>
						{/each}
						{#if char.equipment.armor.length === 0}
							<div class="text-gray-400 italic">None</div>
						{/if}
					</div>

					<!-- Cyberware -->
					<div>
						<h3 class="font-bold mb-1">Augmentations</h3>
						{#each char.equipment.cyberware as cyber}
							<div>{cyber.name}</div>
						{/each}
						{#each char.equipment.bioware as bio}
							<div>{bio.name}</div>
						{/each}
						{#if char.equipment.cyberware.length === 0 && char.equipment.bioware.length === 0}
							<div class="text-gray-400 italic">None</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Magic Section (if applicable) -->
			{#if char.magic}
				<div class="mt-4 border-t border-gray-300 pt-4">
					<h2 class="text-lg font-bold border-b border-gray-400 mb-2">Magic</h2>
					<div class="text-sm mb-2">
						<span class="font-medium">Tradition:</span> {char.magic.tradition}
						{#if char.magic.mentor}
							| <span class="font-medium">Mentor:</span> {char.magic.mentor}
						{/if}
						{#if char.magic.initiateGrade > 0}
							| <span class="font-medium">Initiate Grade:</span> {char.magic.initiateGrade}
						{/if}
					</div>
					<div class="grid grid-cols-2 gap-4 text-xs">
						<div>
							<h3 class="font-bold mb-1">Spells</h3>
							{#each char.magic.spells as spell}
								<div>{spell.name} ({spell.category})</div>
							{/each}
							{#if char.magic.spells.length === 0}
								<div class="text-gray-400 italic">None</div>
							{/if}
						</div>
						<div>
							<h3 class="font-bold mb-1">Adept Powers ({char.magic.powerPointsUsed}/{char.magic.powerPoints} PP)</h3>
							{#each char.magic.powers as power}
								<div>{power.name}{power.level > 1 ? ` R${power.level}` : ''}</div>
							{/each}
							{#if char.magic.powers.length === 0}
								<div class="text-gray-400 italic">None</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}

			<!-- Footer -->
			<div class="mt-4 pt-2 border-t border-gray-300 text-xs text-gray-500 flex justify-between">
				<span>Shadowrun 4th Edition</span>
				<span>Generated by ChummerWeb</span>
			</div>
		</div>
	{:else}
		<div class="cw-panel p-6 text-center">
			<p class="text-muted-text">No character loaded.</p>
		</div>
	{/if}
</div>
