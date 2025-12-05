<script lang="ts">
	/**
	 * Sync Status Indicator
	 * =====================
	 * Shows online/offline status and pending sync changes.
	 */

	import {
		syncStatusStore,
		hasUpdate,
		applyUpdate,
		type SyncStatus
	} from '$lib/pwa';

	/** Get status icon based on current state. */
	function getStatusIcon(status: SyncStatus): string {
		switch (status) {
			case 'online':
				return '●';
			case 'offline':
				return '○';
			case 'syncing':
				return '◐';
			case 'error':
				return '!';
			default:
				return '?';
		}
	}

	/** Get status color class. */
	function getStatusColor(status: SyncStatus): string {
		switch (status) {
			case 'online':
				return 'text-accent-success';
			case 'offline':
				return 'text-accent-warning';
			case 'syncing':
				return 'text-accent-cyan animate-pulse';
			case 'error':
				return 'text-accent-danger';
			default:
				return 'text-muted-text';
		}
	}

	/** Get status label. */
	function getStatusLabel(status: SyncStatus): string {
		switch (status) {
			case 'online':
				return 'Online';
			case 'offline':
				return 'Offline';
			case 'syncing':
				return 'Syncing...';
			case 'error':
				return 'Sync Error';
			default:
				return 'Unknown';
		}
	}

	/** Handle update button click. */
	function handleUpdate(): void {
		applyUpdate();
	}

	$: status = $syncStatusStore.status;
	$: pendingChanges = $syncStatusStore.pendingChanges;
	$: lastSync = $syncStatusStore.lastSync;
	$: updateAvailable = $hasUpdate;
</script>

<div class="flex items-center gap-2">
	<!-- Update Available Banner -->
	{#if updateAvailable}
		<button
			class="flex items-center gap-2 px-3 py-1 rounded bg-accent-primary/20
				text-accent-primary text-xs hover:bg-accent-primary/30 transition-colors"
			on:click={handleUpdate}
		>
			<span>Update Available</span>
			<span class="font-medium">Refresh</span>
		</button>
	{/if}

	<!-- Pending Changes Badge -->
	{#if pendingChanges > 0 && status !== 'syncing'}
		<span
			class="px-2 py-0.5 rounded bg-accent-warning/20 text-accent-warning text-xs"
			title="Changes pending sync"
		>
			{pendingChanges} pending
		</span>
	{/if}

	<!-- Status Indicator -->
	<div
		class="flex items-center gap-1.5 text-xs cursor-default"
		title={lastSync ? `Last sync: ${new Date(lastSync).toLocaleString()}` : 'Not synced'}
	>
		<span class={`text-sm ${getStatusColor(status)}`}>
			{getStatusIcon(status)}
		</span>
		<span class="text-muted-text hidden sm:inline">
			{getStatusLabel(status)}
		</span>
	</div>
</div>
