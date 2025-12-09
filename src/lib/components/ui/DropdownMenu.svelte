<script context="module" lang="ts">
	export interface DropdownItem {
		id: string;
		label: string;
		icon?: string;
		description?: string;
		disabled?: boolean;
		href?: string;
	}
</script>

<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';

	export let items: DropdownItem[] = [];
	export let position: 'bottom-left' | 'bottom-right' | 'bottom-center' = 'bottom-left';
	export let disabled: boolean = false;

	const dispatch = createEventDispatcher<{ select: DropdownItem }>();

	let isOpen = false;
	let menuRef: HTMLDivElement;
	let triggerRef: HTMLDivElement;
	let focusedIndex = -1;

	function toggle(): void {
		if (disabled) return;
		isOpen = !isOpen;
		if (isOpen) {
			focusedIndex = -1;
		}
	}

	function close(): void {
		isOpen = false;
		focusedIndex = -1;
	}

	function handleSelect(item: DropdownItem): void {
		if (item.disabled) return;
		dispatch('select', item);
		close();
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (!isOpen) {
			if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
				event.preventDefault();
				toggle();
			}
			return;
		}

		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				close();
				triggerRef?.focus();
				break;
			case 'ArrowDown':
				event.preventDefault();
				focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				focusedIndex = Math.max(focusedIndex - 1, 0);
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				const focusedItem = items[focusedIndex];
				if (focusedIndex >= 0 && focusedIndex < items.length && focusedItem) {
					handleSelect(focusedItem);
				}
				break;
			case 'Tab':
				close();
				break;
		}
	}

	function handleClickOutside(event: MouseEvent): void {
		if (menuRef && !menuRef.contains(event.target as Node) &&
		    triggerRef && !triggerRef.contains(event.target as Node)) {
			close();
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
	});

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside);
	});
</script>

<div class="cw-dropdown" role="presentation" on:keydown={handleKeydown}>
	<div
		bind:this={triggerRef}
		class="cw-dropdown-trigger"
		role="button"
		tabindex={disabled ? -1 : 0}
		aria-haspopup="menu"
		aria-expanded={isOpen}
		on:click={toggle}
		on:keydown={handleKeydown}
	>
		<slot name="trigger">
			<button class="cw-dropdown-default-trigger" {disabled}>
				Menu
				<span class="material-icons">expand_more</span>
			</button>
		</slot>
	</div>

	{#if isOpen}
		<div
			bind:this={menuRef}
			class="cw-dropdown-menu cw-dropdown-{position}"
			role="menu"
			aria-label="Dropdown menu"
		>
			{#each items as item, index}
				{#if item.href && !item.disabled}
					<a
						href={item.href}
						class="cw-dropdown-item"
						class:cw-dropdown-item-focused={focusedIndex === index}
						role="menuitem"
						on:click={() => handleSelect(item)}
					>
						{#if item.icon}
							<span class="material-icons cw-dropdown-item-icon">{item.icon}</span>
						{/if}
						<div class="cw-dropdown-item-content">
							<span class="cw-dropdown-item-label">{item.label}</span>
							{#if item.description}
								<span class="cw-dropdown-item-description">{item.description}</span>
							{/if}
						</div>
					</a>
				{:else}
					<button
						class="cw-dropdown-item"
						class:cw-dropdown-item-focused={focusedIndex === index}
						class:cw-dropdown-item-disabled={item.disabled}
						role="menuitem"
						disabled={item.disabled}
						on:click={() => handleSelect(item)}
					>
						{#if item.icon}
							<span class="material-icons cw-dropdown-item-icon">{item.icon}</span>
						{/if}
						<div class="cw-dropdown-item-content">
							<span class="cw-dropdown-item-label">{item.label}</span>
							{#if item.description}
								<span class="cw-dropdown-item-description">{item.description}</span>
							{/if}
						</div>
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.cw-dropdown {
		position: relative;
		display: inline-block;
	}

	.cw-dropdown-trigger {
		cursor: pointer;
	}

	.cw-dropdown-default-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		background: var(--cw-panel);
		border: 1px solid var(--cw-border);
		color: var(--cw-text-primary);
		font-family: var(--cw-font-display);
		cursor: pointer;
	}

	.cw-dropdown-menu {
		position: absolute;
		top: 100%;
		margin-top: 0.25rem;
		min-width: 200px;
		background: var(--cw-panel);
		border: 1px solid var(--cw-border);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		z-index: 50;
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.cw-dropdown-bottom-left {
		left: 0;
	}

	.cw-dropdown-bottom-right {
		right: 0;
	}

	.cw-dropdown-bottom-center {
		left: 50%;
		transform: translateX(-50%);
	}

	.cw-dropdown-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		color: var(--cw-text-primary);
		font-family: var(--cw-font-display);
		font-size: 0.875rem;
		text-align: left;
		text-decoration: none;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.cw-dropdown-item:hover:not(:disabled),
	.cw-dropdown-item-focused {
		background: var(--cw-primary-glow);
	}

	.cw-dropdown-item-disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.cw-dropdown-item-icon {
		font-size: 1.25rem;
		color: var(--cw-primary);
		flex-shrink: 0;
	}

	.cw-dropdown-item-content {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.cw-dropdown-item-label {
		font-weight: 500;
	}

	.cw-dropdown-item-description {
		font-size: 0.75rem;
		color: var(--cw-text-muted);
	}
</style>
