<script lang="ts">
	/**
	 * Share Character Component
	 * =========================
	 * UI for sharing characters publicly or with other users.
	 * Shows share link, view stats, and sharing options.
	 */

	import { onMount } from 'svelte';
	import { character } from '$stores/character';
	import {
		type PublicShare,
		type ShareVisibility,
		createPublicShare,
		createShareUrl,
		recordView,
		isShareValid,
		toggleShareEnabled,
		updateShareVisibility,
		regenerateShareCode,
		formatViewCount,
		formatLastViewed,
		loadPublicShares,
		savePublicShares,
		getSharesForCharacter
	} from '$lib/sharing/sharing';

	/** Current share for the character. */
	let currentShare: PublicShare | null = null;

	/** Loading state. */
	let loading = false;

	/** Error message. */
	let error = '';

	/** Success message. */
	let success = '';

	/** Copied state for URL. */
	let copied = false;

	/** Show advanced options. */
	let showAdvanced = false;

	/** Expiration days option. */
	let expirationDays: number | null = null;

	/** Available expiration options. */
	const expirationOptions = [
		{ value: null, label: 'Never' },
		{ value: 7, label: '7 days' },
		{ value: 30, label: '30 days' },
		{ value: 90, label: '90 days' }
	];

	onMount(() => {
		loadShare();
	});

	/** Load existing share for this character. */
	function loadShare(): void {
		if (!$character) return;

		const shares = getSharesForCharacter($character.id);
		currentShare = shares.length > 0 ? shares[0] : null;
	}

	/** Create a new share link. */
	function createShare(): void {
		if (!$character) return;

		error = '';
		success = '';

		try {
			const newShare = createPublicShare(
				$character.id,
				$character.userId,
				{
					visibility: 'link',
					expiresInDays: expirationDays
				}
			);

			/* Save to storage */
			const shares = loadPublicShares();
			shares.push(newShare);
			savePublicShares(shares);

			currentShare = newShare;
			success = 'Share link created!';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create share';
		}
	}

	/** Toggle share enabled state. */
	function toggleEnabled(): void {
		if (!currentShare) return;

		const updated = toggleShareEnabled(currentShare);
		updateShare(updated);
		success = updated.enabled ? 'Share enabled' : 'Share disabled';
	}

	/** Update share visibility. */
	function setVisibility(visibility: ShareVisibility): void {
		if (!currentShare) return;

		const updated = updateShareVisibility(currentShare, visibility);
		updateShare(updated);
		success = `Visibility set to ${visibility}`;
	}

	/** Regenerate share code. */
	function regenerate(): void {
		if (!currentShare) return;

		if (!confirm('This will invalidate the current share link. Continue?')) return;

		const updated = regenerateShareCode(currentShare);
		updateShare(updated);
		success = 'New share link generated';
	}

	/** Delete share. */
	function deleteShare(): void {
		if (!currentShare) return;

		if (!confirm('Delete this share? The link will stop working.')) return;

		const shares = loadPublicShares().filter(s => s.id !== currentShare!.id);
		savePublicShares(shares);
		currentShare = null;
		success = 'Share deleted';
	}

	/** Update share in storage. */
	function updateShare(share: PublicShare): void {
		const shares = loadPublicShares();
		const index = shares.findIndex(s => s.id === share.id);
		if (index >= 0) {
			shares[index] = share;
			savePublicShares(shares);
		}
		currentShare = share;
	}

	/** Copy share URL to clipboard. */
	async function copyUrl(): Promise<void> {
		if (!currentShare) return;

		const url = createShareUrl(currentShare.shareCode);

		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (e) {
			/* Fallback for older browsers */
			const input = document.createElement('input');
			input.value = url;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}

	/** Get share URL. */
	$: shareUrl = currentShare ? createShareUrl(currentShare.shareCode) : '';

	/** Check if share is valid. */
	$: shareValid = currentShare ? isShareValid(currentShare) : false;
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-medium text-primary-text">Share Character</h3>
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

	{#if !$character}
		<div class="cw-panel p-6 text-center">
			<p class="text-muted-text">No character loaded</p>
		</div>
	{:else if currentShare}
		<!-- Existing Share -->
		<div class="cw-panel p-4 space-y-4">
			<!-- Share Status -->
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					{#if shareValid}
						<span class="w-2 h-2 rounded-full bg-accent-success"></span>
						<span class="text-sm text-accent-success">Active</span>
					{:else}
						<span class="w-2 h-2 rounded-full bg-accent-danger"></span>
						<span class="text-sm text-accent-danger">
							{currentShare.enabled ? 'Expired' : 'Disabled'}
						</span>
					{/if}
				</div>
				<button
					class="text-xs px-2 py-1 rounded transition-colors
						{currentShare.enabled
							? 'bg-accent-danger/20 text-accent-danger hover:bg-accent-danger/30'
							: 'bg-accent-success/20 text-accent-success hover:bg-accent-success/30'}"
					on:click={toggleEnabled}
				>
					{currentShare.enabled ? 'Disable' : 'Enable'}
				</button>
			</div>

			<!-- Share URL -->
			<div class="space-y-2">
				<label class="text-xs text-muted-text uppercase tracking-wide">Share Link</label>
				<div class="flex gap-2">
					<input
						type="text"
						class="cw-input flex-1 text-sm font-mono"
						value={shareUrl}
						readonly
					/>
					<button
						class="px-3 py-2 rounded bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 transition-colors"
						on:click={copyUrl}
					>
						{copied ? 'Copied!' : 'Copy'}
					</button>
				</div>
			</div>

			<!-- Stats -->
			<div class="grid grid-cols-3 gap-3">
				<div class="text-center p-2 bg-surface-light rounded">
					<div class="text-xl font-mono text-accent-primary">
						{formatViewCount(currentShare.viewCount)}
					</div>
					<div class="text-xs text-muted-text">Views</div>
				</div>
				<div class="text-center p-2 bg-surface-light rounded">
					<div class="text-xl font-mono text-accent-cyan">
						{formatViewCount(currentShare.copyCount)}
					</div>
					<div class="text-xs text-muted-text">Copies</div>
				</div>
				<div class="text-center p-2 bg-surface-light rounded">
					<div class="text-sm font-mono text-secondary-text">
						{formatLastViewed(currentShare.lastViewedAt)}
					</div>
					<div class="text-xs text-muted-text">Last Viewed</div>
				</div>
			</div>

			<!-- Visibility Options -->
			<div class="space-y-2">
				<label class="text-xs text-muted-text uppercase tracking-wide">Visibility</label>
				<div class="flex gap-2">
					<button
						class="flex-1 px-3 py-2 rounded text-sm transition-colors
							{currentShare.visibility === 'link'
								? 'bg-accent-primary/20 text-accent-primary'
								: 'bg-surface-light text-secondary-text hover:bg-surface-lighter'}"
						on:click={() => setVisibility('link')}
					>
						Link Only
					</button>
					<button
						class="flex-1 px-3 py-2 rounded text-sm transition-colors
							{currentShare.visibility === 'public'
								? 'bg-accent-primary/20 text-accent-primary'
								: 'bg-surface-light text-secondary-text hover:bg-surface-lighter'}"
						on:click={() => setVisibility('public')}
					>
						Public Gallery
					</button>
				</div>
				<p class="text-xs text-muted-text">
					{#if currentShare.visibility === 'link'}
						Only people with the link can view this character.
					{:else}
						This character will appear in the public gallery.
					{/if}
				</p>
			</div>

			<!-- Advanced Options -->
			<button
				class="text-xs text-accent-cyan hover:underline"
				on:click={() => (showAdvanced = !showAdvanced)}
			>
				{showAdvanced ? 'Hide' : 'Show'} Advanced Options
			</button>

			{#if showAdvanced}
				<div class="space-y-3 pt-2 border-t border-border">
					<!-- Expiration -->
					{#if currentShare.expiresAt}
						<div class="flex items-center justify-between text-sm">
							<span class="text-secondary-text">Expires:</span>
							<span class="text-muted-text">
								{new Date(currentShare.expiresAt).toLocaleDateString()}
							</span>
						</div>
					{/if}

					<!-- Actions -->
					<div class="flex gap-2">
						<button
							class="flex-1 px-3 py-2 rounded text-sm bg-surface-light text-secondary-text hover:bg-surface-lighter transition-colors"
							on:click={regenerate}
						>
							Regenerate Link
						</button>
						<button
							class="flex-1 px-3 py-2 rounded text-sm bg-accent-danger/20 text-accent-danger hover:bg-accent-danger/30 transition-colors"
							on:click={deleteShare}
						>
							Delete Share
						</button>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- No Share Yet -->
		<div class="cw-panel p-4 space-y-4">
			<p class="text-sm text-secondary-text">
				Create a share link to let others view this character.
			</p>

			<!-- Expiration Setting -->
			<div class="space-y-2">
				<label class="text-xs text-muted-text uppercase tracking-wide">Link Expiration</label>
				<select
					class="cw-input"
					bind:value={expirationDays}
				>
					{#each expirationOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<button
				class="w-full px-4 py-3 rounded bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 transition-colors"
				on:click={createShare}
				disabled={loading}
			>
				Create Share Link
			</button>

			<p class="text-xs text-muted-text">
				Anyone with the link will be able to view your character's stats and gear.
			</p>
		</div>
	{/if}

	<!-- Info -->
	<div class="p-3 bg-surface-light rounded text-xs text-muted-text">
		<p class="font-medium text-secondary-text mb-1">Sharing Tips:</p>
		<ul class="list-disc list-inside space-y-0.5">
			<li>Shared characters are read-only for viewers</li>
			<li>Viewers can copy your character to their account</li>
			<li>You can disable sharing at any time</li>
			<li>Regenerating the link invalidates the old one</li>
		</ul>
	</div>
</div>
