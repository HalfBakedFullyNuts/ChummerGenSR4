<script lang="ts">
	/**
	 * Accessible Modal Component
	 * ==========================
	 * WCAG 2.1 AA compliant modal dialog with focus trap and keyboard handling.
	 */

	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { trapFocus, generateId, ARIA_LABELS } from '$lib/utils/accessibility';

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	/** Whether the modal is open. */
	export let open: boolean = false;

	/** Modal title (required for accessibility). */
	export let title: string;

	/** Optional description for more context. */
	export let description: string = '';

	/** Size of the modal. */
	export let size: 'small' | 'medium' | 'large' = 'medium';

	/** Whether clicking the backdrop closes the modal. */
	export let closeOnBackdrop: boolean = true;

	/** Whether pressing Escape closes the modal. */
	export let closeOnEscape: boolean = true;

	/** Reference to the modal element. */
	let modalElement: HTMLElement;

	/** Focus trap cleanup function. */
	let cleanupFocusTrap: (() => void) | null = null;

	/** Element that had focus before modal opened. */
	let previouslyFocused: HTMLElement | null = null;

	/** Generated IDs for ARIA relationships. */
	const titleId = generateId('modal-title');
	const descId = generateId('modal-desc');

	/** Handle Escape key. */
	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && closeOnEscape) {
			event.preventDefault();
			close();
		}
	}

	/** Handle backdrop click. */
	function handleBackdropClick(event: MouseEvent): void {
		if (event.target === event.currentTarget && closeOnBackdrop) {
			close();
		}
	}

	/** Close the modal. */
	function close(): void {
		dispatch('close');
	}

	/** Set up focus trap when modal opens. */
	$: if (open && modalElement) {
		previouslyFocused = document.activeElement as HTMLElement;
		cleanupFocusTrap = trapFocus(modalElement);
		document.body.style.overflow = 'hidden';
	}

	/** Clean up when modal closes. */
	$: if (!open) {
		if (cleanupFocusTrap) {
			cleanupFocusTrap();
			cleanupFocusTrap = null;
		}
		document.body.style.overflow = '';
		previouslyFocused?.focus();
	}

	onDestroy(() => {
		if (cleanupFocusTrap) {
			cleanupFocusTrap();
		}
		document.body.style.overflow = '';
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="modal-backdrop"
		on:click={handleBackdropClick}
		aria-hidden="true"
	>
		<div
			bind:this={modalElement}
			class="modal modal-{size}"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={description ? descId : undefined}
		>
			<header class="modal-header">
				<h2 id={titleId} class="modal-title">{title}</h2>
				<button
					type="button"
					class="modal-close"
					aria-label={ARIA_LABELS.close}
					on:click={close}
				>
					<span aria-hidden="true">&times;</span>
				</button>
			</header>

			{#if description}
				<p id={descId} class="sr-only">{description}</p>
			{/if}

			<div class="modal-body">
				<slot />
			</div>

			{#if $$slots.footer}
				<footer class="modal-footer">
					<slot name="footer" />
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 16px;
	}

	.modal {
		background: var(--cw-panel-background, #161B22);
		border: 1px solid var(--cw-border, #30363D);
		border-radius: 12px;
		max-height: calc(100vh - 32px);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
	}

	.modal-small {
		width: 100%;
		max-width: 400px;
	}

	.modal-medium {
		width: 100%;
		max-width: 600px;
	}

	.modal-large {
		width: 100%;
		max-width: 800px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--cw-border, #30363D);
	}

	.modal-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--cw-text, #E6EDF3);
	}

	.modal-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--cw-secondary-text, #8B949E);
		font-size: 24px;
		cursor: pointer;
		transition: background 150ms ease, color 150ms ease;
	}

	.modal-close:hover,
	.modal-close:focus {
		background: var(--cw-hover, rgba(255, 255, 255, 0.1));
		color: var(--cw-text, #E6EDF3);
	}

	.modal-close:focus-visible {
		outline: 2px solid var(--cw-accent-primary, #58A6FF);
		outline-offset: 2px;
	}

	.modal-body {
		padding: 20px;
		overflow-y: auto;
		flex: 1;
	}

	.modal-footer {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		padding: 16px 20px;
		border-top: 1px solid var(--cw-border, #30363D);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Mobile adjustments */
	@media (max-width: 640px) {
		.modal-backdrop {
			padding: 0;
			align-items: flex-end;
		}

		.modal {
			max-height: 90vh;
			border-radius: 12px 12px 0 0;
			width: 100%;
			max-width: 100%;
		}
	}
</style>
