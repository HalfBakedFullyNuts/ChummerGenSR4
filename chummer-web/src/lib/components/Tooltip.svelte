<script lang="ts">
	/**
	 * Reusable Tooltip Component
	 * ==========================
	 * A hover tooltip that displays additional information.
	 * Supports both simple text and rich content via slots.
	 */

	/** Tooltip text content (alternative to using slot). */
	export let text: string = '';

	/** Position of tooltip relative to trigger. */
	export let position: 'top' | 'bottom' | 'left' | 'right' = 'top';

	/** Maximum width of tooltip. */
	export let maxWidth: string = '16rem';

	/** Whether to show the tooltip. If false, tooltip is hidden even on hover. */
	export let show: boolean = true;
</script>

{#if show && (text || $$slots.content)}
	<span
		class="absolute z-20 px-2 py-1 bg-surface-dark text-accent-secondary text-xs rounded
			opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
			whitespace-normal text-center
			{position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : ''}
			{position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' : ''}
			{position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' : ''}
			{position === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2' : ''}"
		style="max-width: {maxWidth};"
	>
		{#if $$slots.content}
			<slot name="content" />
		{:else}
			{text}
		{/if}
	</span>
{/if}
