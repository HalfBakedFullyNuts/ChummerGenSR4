<script lang="ts">
	/**
	 * Character Sharing Component
	 * ============================
	 * Manages public sharing links for characters.
	 */

	import { character } from '$stores/character';

	/** Share info. */
	interface ShareInfo {
		shareId: string;
		createdAt: string;
		viewCount: number;
		isPublic: boolean;
	}

	/** Error message. */
	let error = '';

	/** Success message. */
	let success = '';

	/** Share info for current character. */
	let shareInfo: ShareInfo | null = null;

	/** Loading state. */
	let loading = false;

	/** Copied state. */
	let copied = false;

	/** Get share info from localStorage. */
	$: if ($character?.id) {
		const stored = localStorage.getItem(`chummer-share-${$character.id}`);
		shareInfo = stored ? JSON.parse(stored) : null;
	}

	/** Generate share URL. */
	$: shareUrl = shareInfo
		? `${window.location.origin}/share/${shareInfo.shareId}`
		: '';

	/** Create a new share link. */
	async function createShareLink(): Promise<void> {
		if (!$character) return;

		error = '';
		success = '';
		loading = true;

		try {
			/* Generate unique share ID */
			const shareId = generateShareId();

			/* Create share info */
			const info: ShareInfo = {
				shareId,
				createdAt: new Date().toISOString(),
				viewCount: 0,
				isPublic: true
			};

			/* Store share mapping */
			localStorage.setItem(`chummer-share-${$character.id}`, JSON.stringify(info));

			/* Store character data for public access */
			localStorage.setItem(`chummer-shared-${shareId}`, JSON.stringify({
				character: $character,
				sharedAt: new Date().toISOString()
			}));

			shareInfo = info;
			success = 'Share link created!';
		} catch (e) {
			error = 'Failed to create share link';
		} finally {
			loading = false;
		}
	}

	/** Revoke the share link. */
	function revokeShareLink(): void {
		if (!$character || !shareInfo) return;

		if (!confirm('Revoke this share link? Anyone with the link will no longer be able to view your character.')) {
			return;
		}

		/* Remove share data */
		localStorage.removeItem(`chummer-share-${$character.id}`);
		localStorage.removeItem(`chummer-shared-${shareInfo.shareId}`);

		shareInfo = null;
		success = 'Share link revoked';
	}

	/** Copy link to clipboard. */
	async function copyLink(): Promise<void> {
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch (e) {
			error = 'Failed to copy link';
		}
	}

	/** Generate a random share ID. */
	function generateShareId(): string {
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
		let result = '';
		for (let i = 0; i < 12; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}

	/** Format date. */
	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-medium text-primary-text">Character Sharing</h3>
	</div>

	{#if !$character}
		<div class="cw-panel p-6 text-center">
			<p class="text-muted-text">No character loaded.</p>
		</div>
	{:else}
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

		{#if shareInfo}
			<!-- Active Share Link -->
			<div class="cw-panel p-4 space-y-3">
				<div class="flex items-center justify-between">
					<h4 class="text-sm font-medium text-secondary-text">Share Link Active</h4>
					<span class="text-xs px-2 py-1 bg-accent-success/20 text-accent-success rounded">
						Public
					</span>
				</div>

				<div class="flex gap-2">
					<input
						type="text"
						class="cw-input flex-1 text-sm font-mono"
						value={shareUrl}
						readonly
					/>
					<button
						class="cw-btn cw-btn-secondary text-sm"
						on:click={copyLink}
					>
						{copied ? 'Copied!' : 'Copy'}
					</button>
				</div>

				<div class="flex justify-between text-xs text-muted-text">
					<span>Created: {formatDate(shareInfo.createdAt)}</span>
					<span>Views: {shareInfo.viewCount}</span>
				</div>

				<button
					class="text-xs text-accent-danger hover:underline"
					on:click={revokeShareLink}
				>
					Revoke Share Link
				</button>
			</div>
		{:else}
			<!-- Create Share Link -->
			<div class="cw-panel p-4 space-y-3">
				<h4 class="text-sm font-medium text-secondary-text">Share Your Character</h4>

				<p class="text-sm text-muted-text">
					Create a public link to share your character sheet with others.
					Anyone with the link can view (but not edit) your character.
				</p>

				<button
					class="cw-btn cw-btn-primary"
					on:click={createShareLink}
					disabled={loading}
				>
					{loading ? 'Creating...' : 'Create Share Link'}
				</button>
			</div>
		{/if}

		<!-- Sharing Info -->
		<div class="p-3 bg-surface-light rounded text-xs text-muted-text space-y-2">
			<p class="font-medium text-secondary-text">About Character Sharing:</p>
			<ul class="list-disc list-inside space-y-1">
				<li>Shared characters are read-only - viewers cannot make changes</li>
				<li>Your character data is stored locally in your browser</li>
				<li>You can revoke access at any time</li>
				<li>Share links do not expire unless revoked</li>
			</ul>
		</div>
	{/if}
</div>
