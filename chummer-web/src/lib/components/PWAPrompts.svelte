<script lang="ts">
	/**
	 * PWA Prompts Component
	 * =====================
	 * Shows install prompt and update notification for PWA.
	 */

	import { onMount } from 'svelte';
	import {
		initInstallPrompt,
		showInstallPrompt,
		dismissInstallPrompt,
		showInstallButton
	} from '$lib/pwa/install-prompt';
	import {
		registerServiceWorker,
		applyUpdate,
		hasUpdate,
		isRegistered
	} from '$lib/pwa/service-worker';

	/** Whether the update toast is visible. */
	let showUpdateToast = false;

	/** Whether the install banner is visible. */
	let showInstallBanner = false;

	/** Animation state. */
	let animate = false;

	onMount(() => {
		/* Initialize PWA */
		initInstallPrompt();
		registerServiceWorker();

		/* Delay showing banners for better UX */
		setTimeout(() => {
			animate = true;
		}, 1000);
	});

	/* Show install banner when available */
	$: if ($showInstallButton && animate) {
		showInstallBanner = true;
	}

	/* Show update toast when available */
	$: if ($hasUpdate) {
		showUpdateToast = true;
	}

	/** Handle install click. */
	async function handleInstall(): Promise<void> {
		const installed = await showInstallPrompt();
		if (installed) {
			showInstallBanner = false;
		}
	}

	/** Handle install dismiss. */
	function handleInstallDismiss(): void {
		dismissInstallPrompt();
		showInstallBanner = false;
	}

	/** Handle update click. */
	function handleUpdate(): void {
		applyUpdate();
		showUpdateToast = false;
	}

	/** Handle update dismiss. */
	function handleUpdateDismiss(): void {
		showUpdateToast = false;
	}
</script>

<!-- Install Banner -->
{#if showInstallBanner}
	<div
		class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up"
	>
		<div class="cw-panel p-4 shadow-lg border border-accent-primary/30">
			<div class="flex items-start gap-3">
				<div class="text-2xl">📱</div>
				<div class="flex-1">
					<h3 class="font-medium text-primary-text">Install ChummerWeb</h3>
					<p class="text-sm text-secondary-text mt-1">
						Install as an app for quick access and offline use.
					</p>
					<div class="flex gap-2 mt-3">
						<button
							class="px-4 py-2 rounded text-sm bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 transition-colors"
							on:click={handleInstall}
						>
							Install
						</button>
						<button
							class="px-4 py-2 rounded text-sm bg-surface-light text-secondary-text hover:bg-surface-lighter transition-colors"
							on:click={handleInstallDismiss}
						>
							Not Now
						</button>
					</div>
				</div>
				<button
					class="text-muted-text hover:text-primary-text"
					on:click={handleInstallDismiss}
					aria-label="Dismiss"
				>
					✕
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Update Toast -->
{#if showUpdateToast}
	<div
		class="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-down"
	>
		<div class="cw-panel p-4 shadow-lg border border-accent-cyan/30">
			<div class="flex items-start gap-3">
				<div class="text-2xl">🔄</div>
				<div class="flex-1">
					<h3 class="font-medium text-primary-text">Update Available</h3>
					<p class="text-sm text-secondary-text mt-1">
						A new version is ready. Refresh to update.
					</p>
					<div class="flex gap-2 mt-3">
						<button
							class="px-4 py-2 rounded text-sm bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30 transition-colors"
							on:click={handleUpdate}
						>
							Update Now
						</button>
						<button
							class="px-4 py-2 rounded text-sm bg-surface-light text-secondary-text hover:bg-surface-lighter transition-colors"
							on:click={handleUpdateDismiss}
						>
							Later
						</button>
					</div>
				</div>
				<button
					class="text-muted-text hover:text-primary-text"
					on:click={handleUpdateDismiss}
					aria-label="Dismiss"
				>
					✕
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slide-down {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-slide-up {
		animation: slide-up 0.3s ease-out;
	}

	.animate-slide-down {
		animation: slide-down 0.3s ease-out;
	}
</style>
