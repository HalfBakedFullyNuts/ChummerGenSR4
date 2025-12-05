<script lang="ts" generics="T">
	/**
	 * Virtual List Component
	 * ======================
	 * Efficiently renders large lists by only rendering visible items.
	 * Critical for performance with long skill/gear lists.
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	/** Items to render. */
	export let items: T[];

	/** Height of each item in pixels. */
	export let itemHeight: number = 40;

	/** Buffer items above and below viewport. */
	export let buffer: number = 5;

	/** Container height (or 'auto' to use parent). */
	export let height: string = '400px';

	/** Key function for item identity. */
	export let keyFn: (item: T, index: number) => string | number = (_, i) => i;

	/** Container element. */
	let container: HTMLElement;

	/** Scroll position. */
	let scrollTop = 0;

	/** Container height in pixels. */
	let containerHeight = 0;

	/** Calculate visible range. */
	$: totalHeight = items.length * itemHeight;
	$: startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
	$: visibleCount = Math.ceil(containerHeight / itemHeight) + buffer * 2;
	$: endIndex = Math.min(items.length, startIndex + visibleCount);
	$: visibleItems = items.slice(startIndex, endIndex);
	$: offsetY = startIndex * itemHeight;

	/** Handle scroll. */
	function handleScroll(): void {
		scrollTop = container?.scrollTop ?? 0;
	}

	/** Set up resize observer. */
	let resizeObserver: ResizeObserver | null = null;

	onMount(() => {
		if (!browser) return;

		containerHeight = container?.clientHeight ?? 0;

		resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				containerHeight = entry.contentRect.height;
			}
		});

		resizeObserver.observe(container);
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
	});
</script>

<div
	bind:this={container}
	class="virtual-list-container"
	style:height
	on:scroll={handleScroll}
	role="list"
	tabindex="0"
>
	<div class="virtual-list-spacer" style:height="{totalHeight}px">
		<div class="virtual-list-items" style:transform="translateY({offsetY}px)">
			{#each visibleItems as item, i (keyFn(item, startIndex + i))}
				<div
					class="virtual-list-item"
					style:height="{itemHeight}px"
					role="listitem"
				>
					<slot {item} index={startIndex + i} />
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.virtual-list-container {
		overflow-y: auto;
		overflow-x: hidden;
		position: relative;
		-webkit-overflow-scrolling: touch;
	}

	.virtual-list-spacer {
		position: relative;
		width: 100%;
	}

	.virtual-list-items {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		will-change: transform;
	}

	.virtual-list-item {
		display: flex;
		align-items: center;
		overflow: hidden;
	}

	/* Focus styles for keyboard navigation */
	.virtual-list-container:focus {
		outline: 2px solid var(--cw-accent-primary, #58A6FF);
		outline-offset: -2px;
	}

	.virtual-list-container:focus-visible {
		outline: 2px solid var(--cw-accent-primary, #58A6FF);
		outline-offset: -2px;
	}
</style>
