<script lang="ts">
	/**
	 * Optimized Image Component
	 * =========================
	 * Lazy-loaded image with placeholder and error handling.
	 */

	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	/** Image source URL. */
	export let src: string;

	/** Alt text (required for accessibility). */
	export let alt: string;

	/** Width in pixels (helps prevent layout shift). */
	export let width: number | undefined = undefined;

	/** Height in pixels (helps prevent layout shift). */
	export let height: number | undefined = undefined;

	/** Loading strategy. */
	export let loading: 'lazy' | 'eager' = 'lazy';

	/** Placeholder color or low-res image URL. */
	export let placeholder: string = 'var(--cw-panel-background, #161B22)';

	/** Whether image has loaded. */
	let loaded = false;

	/** Whether there was an error loading. */
	let error = false;

	/** Reference to the image element. */
	let imgElement: HTMLImageElement;

	/** Load image when it enters viewport. */
	function handleLoad(): void {
		loaded = true;
	}

	function handleError(): void {
		error = true;
	}

	onMount(() => {
		if (!browser) return;

		// Check if image is already cached
		if (imgElement?.complete && imgElement.naturalHeight !== 0) {
			loaded = true;
		}
	});
</script>

<div
	class="optimized-image"
	class:loaded
	class:error
	style:width={width ? `${width}px` : undefined}
	style:height={height ? `${height}px` : undefined}
	style:background={!loaded && !error ? placeholder : undefined}
>
	{#if error}
		<div class="error-state" aria-label="Image failed to load">
			<span class="error-icon" aria-hidden="true">🖼️</span>
			<span class="error-text">Failed to load</span>
		</div>
	{:else}
		<img
			bind:this={imgElement}
			{src}
			{alt}
			{width}
			{height}
			{loading}
			on:load={handleLoad}
			on:error={handleError}
			class:visible={loaded}
		/>
	{/if}
</div>

<style>
	.optimized-image {
		position: relative;
		overflow: hidden;
		display: inline-block;
		border-radius: 4px;
	}

	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity 300ms ease;
	}

	img.visible {
		opacity: 1;
	}

	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		min-height: 100px;
		background: var(--cw-panel-background, #161B22);
		color: var(--cw-secondary-text, #8B949E);
	}

	.error-icon {
		font-size: 2rem;
		margin-bottom: 8px;
		filter: grayscale(1);
		opacity: 0.5;
	}

	.error-text {
		font-size: 0.75rem;
	}
</style>
