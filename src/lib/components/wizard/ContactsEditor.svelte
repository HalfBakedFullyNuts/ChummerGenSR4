<script lang="ts">
	import { character, addContact, removeContact } from '$stores/character';

	/** Contact types commonly used in SR4. */
	const CONTACT_TYPES = [
		'Fixer',
		'Street Doc',
		'Arms Dealer',
		'Info Broker',
		'Corp Contact',
		'Gang Member',
		'Fence',
		'Talismonger',
		'Hacker',
		'Journalist',
		'Bartender',
		'Police Contact',
		'Smuggler',
		'Mechanic',
		'Other'
	] as const;

	/** New contact form state. */
	let newName = '';
	let newType = 'Fixer';
	let newLoyalty = 2;
	let newConnection = 2;

	/** Calculate BP cost for a contact. */
	function contactBP(loyalty: number, connection: number): number {
		return loyalty + connection;
	}

	/** Calculate total BP spent on contacts. */
	function totalContactsBP(): number {
		if (!$character) return 0;
		return $character.contacts.reduce((sum, c) => sum + contactBP(c.loyalty, c.connection), 0);
	}

	/** Handle adding a new contact. */
	function handleAddContact(): void {
		if (!newName.trim()) return;

		addContact(newName.trim(), newType, newLoyalty, newConnection);

		/* Reset form */
		newName = '';
		newType = 'Fixer';
		newLoyalty = 2;
		newConnection = 2;
	}

	/** Get loyalty description. */
	function getLoyaltyDesc(loyalty: number): string {
		switch (loyalty) {
			case 1: return 'Just Biz';
			case 2: return 'Regular';
			case 3: return 'Reliable';
			case 4: return 'Loyal';
			case 5: return 'Friend';
			case 6: return 'Blood';
			default: return '';
		}
	}

	/** Get connection description. */
	function getConnectionDesc(connection: number): string {
		switch (connection) {
			case 1: return 'Limited';
			case 2: return 'Minor';
			case 3: return 'Average';
			case 4: return 'Significant';
			case 5: return 'Major';
			case 6: return 'Powerful';
			default: return '';
		}
	}

	$: contacts = $character?.contacts ?? [];
	$: contactsBP = totalContactsBP();
</script>

<div class="space-y-6">
	<!-- BP Summary -->
	<div class="cw-panel p-4">
		<div class="flex items-center justify-between">
			<span class="text-text-secondary">Contacts BP Spent:</span>
			<span class="font-mono text-primary-dark text-xl">{contactsBP}</span>
		</div>
		<p class="text-text-muted text-xs mt-2">
			Each contact costs (Loyalty + Connection) BP. Recommended: 10-25 BP for contacts.
		</p>
	</div>

	<!-- Add Contact Form -->
	<div class="cw-card p-4">
		<h3 class="cw-card-header mb-4">Add New Contact</h3>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
			<!-- Name -->
			<div>
				<label class="block text-text-secondary text-sm mb-1">Name</label>
				<input
					type="text"
					placeholder="Contact name..."
					class="cw-input w-full"
					bind:value={newName}
				/>
			</div>

			<!-- Type -->
			<div>
				<label class="block text-text-secondary text-sm mb-1">Type</label>
				<select class="cw-input w-full" bind:value={newType}>
					{#each CONTACT_TYPES as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</div>

			<!-- Loyalty -->
			<div>
				<label class="block text-text-secondary text-sm mb-1">
					Loyalty: {newLoyalty}
					<span class="text-text-muted">({getLoyaltyDesc(newLoyalty)})</span>
				</label>
				<div class="flex items-center gap-2">
					<input
						type="range"
						min="1"
						max="6"
						class="flex-1"
						bind:value={newLoyalty}
					/>
					<span class="font-mono text-primary-dark w-8 text-center">{newLoyalty}</span>
				</div>
			</div>

			<!-- Connection -->
			<div>
				<label class="block text-text-secondary text-sm mb-1">
					Connection: {newConnection}
					<span class="text-text-muted">({getConnectionDesc(newConnection)})</span>
				</label>
				<div class="flex items-center gap-2">
					<input
						type="range"
						min="1"
						max="6"
						class="flex-1"
						bind:value={newConnection}
					/>
					<span class="font-mono text-secondary-dark w-8 text-center">{newConnection}</span>
				</div>
			</div>
		</div>

		<div class="flex items-center justify-between">
			<span class="text-text-muted text-sm">
				Cost: <span class="text-primary-dark font-mono">{contactBP(newLoyalty, newConnection)}</span> BP
			</span>
			<button
				class="cw-btn cw-btn-primary"
				on:click={handleAddContact}
				disabled={!newName.trim()}
			>
				Add Contact
			</button>
		</div>
	</div>

	<!-- Contacts List -->
	{#if contacts.length > 0}
		<div class="cw-card p-4">
			<h3 class="cw-card-header mb-4">Your Contacts ({contacts.length})</h3>

			<div class="space-y-3">
				{#each contacts as contact}
					<div class="flex items-center gap-4 p-3 bg-surface-variant rounded border border-border">
						<!-- Contact Info -->
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<span class="font-medium text-text-primary">{contact.name}</span>
								<span class="cw-badge cw-badge-ghost text-xs">{contact.type}</span>
							</div>
							<div class="text-text-muted text-xs mt-1">
								Loyalty {contact.loyalty} ({getLoyaltyDesc(contact.loyalty)}) •
								Connection {contact.connection} ({getConnectionDesc(contact.connection)})
							</div>
						</div>

						<!-- BP Cost -->
						<div class="text-primary-dark font-mono">
							{contactBP(contact.loyalty, contact.connection)} BP
						</div>

						<!-- Remove Button -->
						<button
							class="w-8 h-8 rounded bg-error-main/20 text-error-main hover:bg-error-main hover:text-white
								transition-colors flex items-center justify-center"
							on:click={() => removeContact(contact.id)}
						>
							×
						</button>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="cw-panel p-8 text-center">
			<p class="text-text-secondary mb-2">No contacts yet.</p>
			<p class="text-text-muted text-sm">
				Add contacts to build your network of information, resources, and favors.
			</p>
		</div>
	{/if}

	<!-- Help Text -->
	<div class="cw-panel p-4 text-sm">
		<h4 class="text-primary-dark font-semibold mb-2">Contact Guidelines</h4>
		<ul class="text-text-secondary space-y-1 list-disc list-inside">
			<li><strong>Loyalty:</strong> How much they'll do for you and risk for you</li>
			<li><strong>Connection:</strong> How useful/powerful they are in their field</li>
			<li>A fixer with high Connection knows more people to connect you with</li>
			<li>A contact with low Loyalty might sell you out if pressured</li>
			<li>Balance: Fewer reliable contacts vs many unreliable ones</li>
		</ul>
	</div>
</div>
