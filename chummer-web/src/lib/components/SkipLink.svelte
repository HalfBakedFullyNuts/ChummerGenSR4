<script lang="ts">
	/**
	 * Skip Link Component
	 * ===================
	 * Accessible skip navigation link for keyboard users.
	 * Should be the first focusable element on the page.
	 */

	import { SKIP_LINK_TARGET } from '$lib/utils/accessibility';

	/** Custom target ID (defaults to main-content). */
	export let target: string = SKIP_LINK_TARGET;

	/** Link text. */
	export let text: string = 'Skip to main content';

	/** Handle skip action. */
	function handleClick(event: MouseEvent): void {
		event.preventDefault();
		const targetElement = document.getElementById(target);
		if (targetElement) {
			targetElement.tabIndex = -1;
			targetElement.focus();
			targetElement.scrollIntoView();
		}
	}
</script>

<a
	href="#{target}"
	class="skip-link"
	on:click={handleClick}
>
	{text}
</a>

<style>
	.skip-link {
		position: absolute;
		top: -100%;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10000;
		padding: 12px 24px;
		background: var(--cw-accent-primary, #58A6FF);
		color: var(--cw-background, #0D1117);
		font-weight: 600;
		text-decoration: none;
		border-radius: 0 0 8px 8px;
		transition: top 150ms ease;
	}

	.skip-link:focus {
		top: 0;
		outline: none;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}
</style>
