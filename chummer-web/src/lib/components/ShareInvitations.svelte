<script lang="ts">
	/**
	 * Share Invitations Component
	 * ===========================
	 * UI for managing user-to-user character sharing.
	 * Shows sent/received invitations and permission controls.
	 */

	import { onMount } from 'svelte';
	import { character } from '$stores/character';
	import {
		type ShareInvitation,
		type SharePermission,
		type SharedCharacterAccess,
		createShareInvitation,
		acceptInvitation,
		declineInvitation,
		revokeInvitation,
		createAccessFromInvitation,
		canPerformAction,
		loadInvitations,
		saveInvitations,
		loadSharedAccess,
		saveSharedAccess
	} from '$lib/sharing/sharing';

	/** Current user ID (would come from auth in production). */
	export let userId: string = 'current-user';

	/** All invitations. */
	let invitations: ShareInvitation[] = [];

	/** Shared access records. */
	let accessRecords: SharedCharacterAccess[] = [];

	/** Loading state. */
	let loading = false;

	/** Error message. */
	let error = '';

	/** Success message. */
	let success = '';

	/** New invitation form. */
	let newInviteUserId = '';
	let newInvitePermission: SharePermission = 'view';
	let newInviteMessage = '';
	let showNewInviteForm = false;

	/** Active tab. */
	let activeTab: 'sent' | 'received' | 'access' = 'sent';

	/** Permission options. */
	const permissionOptions: { value: SharePermission; label: string; description: string }[] = [
		{ value: 'view', label: 'View Only', description: 'Can view character details' },
		{ value: 'copy', label: 'View & Copy', description: 'Can view and copy to their account' },
		{ value: 'edit', label: 'Full Access', description: 'Can view, copy, and edit' }
	];

	onMount(() => {
		loadData();
	});

	/** Load invitations and access records. */
	function loadData(): void {
		invitations = loadInvitations();
		accessRecords = loadSharedAccess();
	}

	/** Filter invitations sent by current user for this character. */
	$: sentInvitations = invitations.filter(
		(i) => i.fromUserId === userId && (!$character || i.characterId === $character.id)
	);

	/** Filter invitations received by current user. */
	$: receivedInvitations = invitations.filter(
		(i) => i.toUserId === userId && i.status === 'pending'
	);

	/** Filter access records for this character. */
	$: characterAccess = accessRecords.filter(
		(a) => $character && a.characterId === $character.id
	);

	/** Send a new invitation. */
	function sendInvitation(): void {
		if (!$character || !newInviteUserId.trim()) {
			error = 'Please enter a user ID';
			return;
		}

		if (newInviteUserId === userId) {
			error = 'You cannot share with yourself';
			return;
		}

		error = '';
		success = '';

		try {
			const invitation = createShareInvitation(
				$character.id,
				userId,
				newInviteUserId.trim(),
				newInvitePermission,
				newInviteMessage.trim()
			);

			invitations = [...invitations, invitation];
			saveInvitations(invitations);

			success = `Invitation sent to ${newInviteUserId}`;
			newInviteUserId = '';
			newInviteMessage = '';
			showNewInviteForm = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to send invitation';
		}
	}

	/** Accept an invitation. */
	function handleAccept(invitation: ShareInvitation): void {
		const updated = acceptInvitation(invitation);
		updateInvitation(updated);

		const access = createAccessFromInvitation(updated);
		if (access) {
			accessRecords = [...accessRecords, access];
			saveSharedAccess(accessRecords);
		}

		success = 'Invitation accepted';
	}

	/** Decline an invitation. */
	function handleDecline(invitation: ShareInvitation): void {
		const updated = declineInvitation(invitation);
		updateInvitation(updated);
		success = 'Invitation declined';
	}

	/** Revoke an invitation. */
	function handleRevoke(invitation: ShareInvitation): void {
		if (!confirm('Revoke this invitation?')) return;

		const updated = revokeInvitation(invitation);
		updateInvitation(updated);

		/* Also remove access if it was accepted */
		accessRecords = accessRecords.filter(
			(a) => !(a.characterId === invitation.characterId && a.userId === invitation.toUserId)
		);
		saveSharedAccess(accessRecords);

		success = 'Invitation revoked';
	}

	/** Remove access. */
	function removeAccess(access: SharedCharacterAccess): void {
		if (!confirm('Remove access for this user?')) return;

		accessRecords = accessRecords.filter(
			(a) => !(a.characterId === access.characterId && a.userId === access.userId)
		);
		saveSharedAccess(accessRecords);
		success = 'Access removed';
	}

	/** Update invitation in list. */
	function updateInvitation(invitation: ShareInvitation): void {
		invitations = invitations.map((i) => (i.id === invitation.id ? invitation : i));
		saveInvitations(invitations);
	}

	/** Get status badge class. */
	function getStatusClass(status: string): string {
		switch (status) {
			case 'pending':
				return 'bg-accent-warning/20 text-accent-warning';
			case 'accepted':
				return 'bg-accent-success/20 text-accent-success';
			case 'declined':
				return 'bg-accent-danger/20 text-accent-danger';
			case 'revoked':
				return 'bg-surface-lighter text-muted-text';
			default:
				return 'bg-surface-lighter text-muted-text';
		}
	}

	/** Get permission badge class. */
	function getPermissionClass(permission: SharePermission): string {
		switch (permission) {
			case 'view':
				return 'bg-accent-cyan/20 text-accent-cyan';
			case 'copy':
				return 'bg-accent-primary/20 text-accent-primary';
			case 'edit':
				return 'bg-accent-magenta/20 text-accent-magenta';
			default:
				return 'bg-surface-lighter text-muted-text';
		}
	}

	/** Format date. */
	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-medium text-primary-text">Sharing</h3>
		{#if $character && activeTab === 'sent'}
			<button
				class="text-sm px-3 py-1 rounded bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 transition-colors"
				on:click={() => (showNewInviteForm = !showNewInviteForm)}
			>
				{showNewInviteForm ? 'Cancel' : 'Invite User'}
			</button>
		{/if}
	</div>

	{#if error}
		<div class="p-3 bg-accent-danger/10 border border-accent-danger/30 rounded text-sm text-accent-danger">
			{error}
		</div>
	{/if}

	{#if success}
		<div class="p-3 bg-accent-success/10 border border-accent-success/30 rounded text-sm text-accent-success">
			{success}
		</div>
	{/if}

	<!-- Tabs -->
	<div class="flex gap-1 border-b border-border">
		<button
			class="px-4 py-2 text-sm transition-colors
				{activeTab === 'sent'
					? 'text-accent-primary border-b-2 border-accent-primary'
					: 'text-secondary-text hover:text-primary-text'}"
			on:click={() => (activeTab = 'sent')}
		>
			Sent ({sentInvitations.length})
		</button>
		<button
			class="px-4 py-2 text-sm transition-colors
				{activeTab === 'received'
					? 'text-accent-primary border-b-2 border-accent-primary'
					: 'text-secondary-text hover:text-primary-text'}"
			on:click={() => (activeTab = 'received')}
		>
			Received ({receivedInvitations.length})
		</button>
		<button
			class="px-4 py-2 text-sm transition-colors
				{activeTab === 'access'
					? 'text-accent-primary border-b-2 border-accent-primary'
					: 'text-secondary-text hover:text-primary-text'}"
			on:click={() => (activeTab = 'access')}
		>
			Access ({characterAccess.length})
		</button>
	</div>

	<!-- New Invitation Form -->
	{#if showNewInviteForm && $character}
		<div class="cw-panel p-4 space-y-4">
			<h4 class="text-sm font-medium text-secondary-text">Invite User to View Character</h4>

			<div class="space-y-2">
				<label class="text-xs text-muted-text uppercase tracking-wide">User ID</label>
				<input
					type="text"
					class="cw-input"
					placeholder="Enter user ID or email"
					bind:value={newInviteUserId}
				/>
			</div>

			<div class="space-y-2">
				<label class="text-xs text-muted-text uppercase tracking-wide">Permission Level</label>
				<div class="space-y-2">
					{#each permissionOptions as option}
						<label class="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-surface-light">
							<input
								type="radio"
								name="permission"
								value={option.value}
								bind:group={newInvitePermission}
								class="mt-1 accent-accent-primary"
							/>
							<div>
								<div class="text-sm text-primary-text">{option.label}</div>
								<div class="text-xs text-muted-text">{option.description}</div>
							</div>
						</label>
					{/each}
				</div>
			</div>

			<div class="space-y-2">
				<label class="text-xs text-muted-text uppercase tracking-wide">Message (optional)</label>
				<textarea
					class="cw-input resize-none"
					rows="2"
					placeholder="Add a message..."
					bind:value={newInviteMessage}
				></textarea>
			</div>

			<div class="flex gap-2 justify-end">
				<button
					class="px-4 py-2 rounded bg-surface-light text-secondary-text hover:bg-surface-lighter transition-colors"
					on:click={() => (showNewInviteForm = false)}
				>
					Cancel
				</button>
				<button
					class="px-4 py-2 rounded bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 transition-colors"
					on:click={sendInvitation}
				>
					Send Invitation
				</button>
			</div>
		</div>
	{/if}

	<!-- Sent Invitations -->
	{#if activeTab === 'sent'}
		{#if sentInvitations.length > 0}
			<div class="space-y-2">
				{#each sentInvitations as invitation}
					<div class="cw-panel p-3 flex items-center justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<span class="text-sm text-primary-text">{invitation.toUserId}</span>
								<span class="text-xs px-1.5 py-0.5 rounded {getPermissionClass(invitation.permission)}">
									{invitation.permission}
								</span>
								<span class="text-xs px-1.5 py-0.5 rounded {getStatusClass(invitation.status)}">
									{invitation.status}
								</span>
							</div>
							<div class="text-xs text-muted-text mt-1">
								Sent {formatDate(invitation.createdAt)}
								{#if invitation.message}
									<span class="text-secondary-text"> - "{invitation.message}"</span>
								{/if}
							</div>
						</div>
						{#if invitation.status === 'pending' || invitation.status === 'accepted'}
							<button
								class="text-xs text-accent-danger hover:underline"
								on:click={() => handleRevoke(invitation)}
							>
								Revoke
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="cw-panel p-6 text-center">
				<p class="text-muted-text">No invitations sent.</p>
				{#if $character}
					<button
						class="text-xs text-accent-cyan hover:underline mt-2"
						on:click={() => (showNewInviteForm = true)}
					>
						Invite someone to view this character
					</button>
				{/if}
			</div>
		{/if}
	{/if}

	<!-- Received Invitations -->
	{#if activeTab === 'received'}
		{#if receivedInvitations.length > 0}
			<div class="space-y-2">
				{#each receivedInvitations as invitation}
					<div class="cw-panel p-4 space-y-3">
						<div class="flex items-start justify-between">
							<div>
								<div class="text-sm text-primary-text">
									<span class="font-medium">{invitation.fromUserId}</span>
									wants to share a character with you
								</div>
								<div class="flex items-center gap-2 mt-1">
									<span class="text-xs px-1.5 py-0.5 rounded {getPermissionClass(invitation.permission)}">
										{invitation.permission} access
									</span>
									<span class="text-xs text-muted-text">
										{formatDate(invitation.createdAt)}
									</span>
								</div>
							</div>
						</div>
						{#if invitation.message}
							<div class="text-sm text-secondary-text bg-surface-light p-2 rounded">
								"{invitation.message}"
							</div>
						{/if}
						<div class="flex gap-2">
							<button
								class="flex-1 px-3 py-2 rounded text-sm bg-accent-success/20 text-accent-success hover:bg-accent-success/30 transition-colors"
								on:click={() => handleAccept(invitation)}
							>
								Accept
							</button>
							<button
								class="flex-1 px-3 py-2 rounded text-sm bg-accent-danger/20 text-accent-danger hover:bg-accent-danger/30 transition-colors"
								on:click={() => handleDecline(invitation)}
							>
								Decline
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="cw-panel p-6 text-center">
				<p class="text-muted-text">No pending invitations.</p>
			</div>
		{/if}
	{/if}

	<!-- Access Management -->
	{#if activeTab === 'access'}
		{#if characterAccess.length > 0}
			<div class="space-y-2">
				{#each characterAccess as access}
					<div class="cw-panel p-3 flex items-center justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<span class="text-sm text-primary-text">{access.userId}</span>
								<span class="text-xs px-1.5 py-0.5 rounded {getPermissionClass(access.permission)}">
									{access.permission}
								</span>
							</div>
							<div class="text-xs text-muted-text mt-1">
								Shared by {access.sharedBy} on {formatDate(access.sharedAt)}
							</div>
						</div>
						<button
							class="text-xs text-accent-danger hover:underline"
							on:click={() => removeAccess(access)}
						>
							Remove
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<div class="cw-panel p-6 text-center">
				<p class="text-muted-text">No one has access to this character.</p>
				<p class="text-xs text-muted-text mt-1">
					Share with specific users to grant access.
				</p>
			</div>
		{/if}
	{/if}

	<!-- Info -->
	<div class="p-3 bg-surface-light rounded text-xs text-muted-text">
		<p class="font-medium text-secondary-text mb-1">Permission Levels:</p>
		<ul class="list-disc list-inside space-y-0.5">
			<li><span class="text-accent-cyan">View</span> - Can see character details</li>
			<li><span class="text-accent-primary">Copy</span> - Can view and copy to their account</li>
			<li><span class="text-accent-magenta">Edit</span> - Full access including editing</li>
		</ul>
	</div>
</div>
