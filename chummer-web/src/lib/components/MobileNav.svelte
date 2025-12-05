<script lang="ts">
	/**
	 * Mobile Navigation Component
	 * ===========================
	 * Bottom navigation bar for mobile devices.
	 */

	import { page } from '$app/stores';

	/** Navigation items. */
	const navItems = [
		{ href: '/', icon: '🏠', label: 'Home' },
		{ href: '/characters', icon: '👤', label: 'Characters' },
		{ href: '/browse', icon: '📚', label: 'Browse' },
		{ href: '/tools', icon: '🛠️', label: 'Tools' },
		{ href: '/settings', icon: '⚙️', label: 'Settings' }
	];

	/** Check if route is active. */
	function isActive(href: string, pathname: string): boolean {
		if (href === '/') {
			return pathname === '/';
		}
		return pathname.startsWith(href);
	}
</script>

<nav class="mobile-nav" role="navigation" aria-label="Mobile navigation">
	{#each navItems as item}
		<a
			href={item.href}
			class="mobile-nav-item"
			class:active={isActive(item.href, $page.url.pathname)}
			aria-current={isActive(item.href, $page.url.pathname) ? 'page' : undefined}
		>
			<span class="icon" aria-hidden="true">{item.icon}</span>
			<span class="label">{item.label}</span>
		</a>
	{/each}
</nav>

<style>
	.mobile-nav {
		display: none;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--cw-panel-background, #0F1419);
		border-top: 1px solid var(--cw-border, #1E2A36);
		z-index: 200;
		padding-bottom: env(safe-area-inset-bottom);
	}

	@media (max-width: 768px) {
		.mobile-nav {
			display: flex;
			justify-content: space-around;
			align-items: center;
		}
	}

	.mobile-nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 8px 12px;
		min-width: 64px;
		min-height: 56px;
		color: var(--cw-secondary-text, #8B949E);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.mobile-nav-item:hover,
	.mobile-nav-item:focus,
	.mobile-nav-item.active {
		color: var(--cw-accent-primary, #58A6FF);
	}

	.icon {
		font-size: 24px;
		margin-bottom: 2px;
	}

	.label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Landscape mode */
	@media (max-height: 500px) and (orientation: landscape) {
		.mobile-nav-item {
			min-height: 44px;
			padding: 4px 12px;
		}

		.label {
			display: none;
		}
	}
</style>
