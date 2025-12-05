<script lang="ts">
	/**
	 * Loading Skeleton Component
	 * ==========================
	 * Placeholder content while data is loading.
	 */

	/** Type of skeleton to display. */
	export let type: 'card' | 'list' | 'text' | 'avatar' | 'button' = 'text';

	/** Number of items (for list type). */
	export let count: number = 3;

	/** Width (for text type). */
	export let width: string = '100%';

	/** Height (for text type). */
	export let height: string = '1rem';
</script>

{#if type === 'card'}
	<div class="cw-panel p-4 animate-pulse">
		<div class="h-6 bg-surface-light rounded w-3/4 mb-3"></div>
		<div class="h-4 bg-surface-light rounded w-1/2 mb-2"></div>
		<div class="h-4 bg-surface-light rounded w-full mb-2"></div>
		<div class="h-4 bg-surface-light rounded w-5/6"></div>
	</div>
{:else if type === 'list'}
	<div class="space-y-2">
		{#each Array(count) as _}
			<div class="cw-panel p-3 animate-pulse flex items-center gap-3">
				<div class="h-10 w-10 bg-surface-light rounded-full"></div>
				<div class="flex-1">
					<div class="h-4 bg-surface-light rounded w-3/4 mb-2"></div>
					<div class="h-3 bg-surface-light rounded w-1/2"></div>
				</div>
			</div>
		{/each}
	</div>
{:else if type === 'avatar'}
	<div class="h-12 w-12 bg-surface-light rounded-full animate-pulse"></div>
{:else if type === 'button'}
	<div class="h-10 w-24 bg-surface-light rounded animate-pulse"></div>
{:else}
	<div
		class="bg-surface-light rounded animate-pulse"
		style="width: {width}; height: {height}"
	></div>
{/if}

<style>
	@keyframes skeleton-pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>
