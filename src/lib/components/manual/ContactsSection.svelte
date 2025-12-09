<script lang="ts">
	import type { Character } from '$types';
	import { addContact, removeContact } from '$stores/character';

	export let character: Character;

	/** New contact form. */
	let newContact = {
		name: '',
		type: 'Fixer',
		loyalty: 1,
		connection: 1,
		notes: ''
	};

	/** Contact type presets. */
	const contactTypes = [
		'Fixer',
		'Street Doc',
		'Talismonger',
		'Armorer',
		'Info Broker',
		'Gang Member',
		'Corporate Contact',
		'Mechanic',
		'Bartender',
		'Smuggler',
		'Hacker',
		'Other'
	];

	/** Total contact BP. */
	$: totalContactBP = character.contacts.reduce((sum, c) => sum + c.loyalty + c.connection, 0);

	/** Handle adding a contact. */
	function handleAddContact(): void {
		if (!newContact.name.trim()) return;

		addContact(
			newContact.name,
			newContact.type,
			newContact.loyalty,
			newContact.connection
		);

		/* Reset form */
		newContact = {
			name: '',
			type: 'Fixer',
			loyalty: 1,
			connection: 1,
			notes: ''
		};
	}

	/** Handle removing a contact. */
	function handleRemoveContact(id: string): void {
		removeContact(id);
	}
</script>

<div class="space-y-4">
	<!-- Summary -->
	<div class="flex items-center gap-4 text-sm">
		<span class="text-text-secondary">
			Contacts: {character.contacts.length}
		</span>
		<span class="text-primary-dark">
			Total BP: {totalContactBP}
		</span>
	</div>

	<!-- Add Contact Form -->
	<div class="cw-panel p-4 space-y-3">
		<h3 class="text-text-secondary text-sm font-medium">Add New Contact</h3>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
			<div>
				<label for="contactName" class="block text-text-muted text-xs mb-1">Name</label>
				<input
					id="contactName"
					type="text"
					bind:value={newContact.name}
					class="cw-input w-full"
					placeholder="Contact name"
				/>
			</div>
			<div>
				<label for="contactType" class="block text-text-muted text-xs mb-1">Type</label>
				<select id="contactType" bind:value={newContact.type} class="cw-select w-full">
					{#each contactTypes as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</div>
		</div>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			<div>
				<label for="contactLoyalty" class="block text-text-muted text-xs mb-1">Loyalty (1-6)</label>
				<input
					id="contactLoyalty"
					type="number"
					min="1"
					max="6"
					bind:value={newContact.loyalty}
					class="cw-input w-full"
				/>
			</div>
			<div>
				<label for="contactConnection" class="block text-text-muted text-xs mb-1">Connection (1-6)</label>
				<input
					id="contactConnection"
					type="number"
					min="1"
					max="6"
					bind:value={newContact.connection}
					class="cw-input w-full"
				/>
			</div>
			<div class="md:col-span-2 flex items-end">
				<button
					class="cw-btn cw-btn-primary w-full"
					on:click={handleAddContact}
					disabled={!newContact.name.trim()}
				>
					<span class="material-icons text-sm">add</span>
					Add Contact ({newContact.loyalty + newContact.connection} BP)
				</button>
			</div>
		</div>
	</div>

	<!-- Current Contacts -->
	{#if character.contacts.length > 0}
		<div>
			<h3 class="text-text-secondary text-sm font-medium mb-2">Current Contacts</h3>
			<div class="grid gap-2">
				{#each character.contacts as contact}
					<div class="cw-data-row py-2">
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<span class="text-text-primary font-medium">{contact.name}</span>
								<span class="text-text-muted text-xs">({contact.type})</span>
							</div>
							<div class="flex items-center gap-3 text-xs text-text-secondary mt-1">
								<span>L: {contact.loyalty}</span>
								<span>C: {contact.connection}</span>
								<span class="text-primary-dark">
									{contact.loyalty + contact.connection} BP
								</span>
							</div>
							{#if contact.notes}
								<p class="text-text-muted text-xs mt-1">{contact.notes}</p>
							{/if}
						</div>
						<button
							class="text-error hover:text-error-dark"
							on:click={() => handleRemoveContact(contact.id)}
							title="Remove contact"
						>
							<span class="material-icons">close</span>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<p class="text-text-muted text-sm text-center py-4">
			No contacts yet. Add some using the form above.
		</p>
	{/if}
</div>
