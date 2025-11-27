<script lang="ts">
	import { user } from '$stores/user';
	import { signInWithGoogle, signOutUser } from '$firebase/auth';

	let isLoading = false;
	let errorMessage: string | null = null;

	const MAX_RETRIES = 3;

	/**
	 * Handle Google sign-in with retry logic.
	 * Sets loading state and captures any error messages.
	 */
	async function handleSignIn(): Promise<void> {
		isLoading = true;
		errorMessage = null;

		for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
			const result = await signInWithGoogle();
			if (result.success) {
				isLoading = false;
				return;
			}
			if (attempt === MAX_RETRIES - 1) {
				errorMessage = result.error ?? 'Sign in failed';
			}
		}
		isLoading = false;
	}

	/**
	 * Handle sign-out action.
	 * Clears any existing error messages on success.
	 */
	async function handleSignOut(): Promise<void> {
		const result = await signOutUser();
		if (!result.success) {
			errorMessage = result.error ?? 'Sign out failed';
		} else {
			errorMessage = null;
		}
	}
</script>

<main class="container mx-auto px-4 py-8 max-w-6xl">
	<!-- Header -->
	<header class="text-center mb-12">
		<h1 class="font-heading text-4xl text-accent-primary mb-2 text-glow-primary">
			ChummerWeb
		</h1>
		<p class="text-secondary-text text-lg">
			Shadowrun 4th Edition Character Generator
		</p>
	</header>

	<!-- Auth Section -->
	<section class="cw-card max-w-md mx-auto mb-8">
		{#if $user}
			<div class="text-center">
				<p class="text-primary-text mb-4">
					Welcome, <span class="text-accent-primary">{$user.displayName ?? $user.email}</span>
				</p>
				<button
					class="cw-btn cw-btn-secondary w-full"
					on:click={handleSignOut}
				>
					Sign Out
				</button>
			</div>
		{:else}
			<div class="text-center">
				<p class="text-secondary-text mb-6">
					Sign in to save and sync your characters across devices.
				</p>
				<button
					class="cw-btn cw-btn-primary w-full mb-4"
					on:click={handleSignIn}
					disabled={isLoading}
				>
					{#if isLoading}
						Signing in...
					{:else}
						Sign in with Google
					{/if}
				</button>
				<button class="cw-btn cw-btn-ghost w-full">
					Continue as Guest
				</button>
			</div>
		{/if}

		{#if errorMessage}
			<p class="text-error text-sm mt-4 text-center">{errorMessage}</p>
		{/if}
	</section>

	<!-- Quick Actions -->
	<section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
		<a href="/character/new" class="cw-card cw-card-interactive">
			<h3 class="cw-card-header text-accent-primary">New Character</h3>
			<p class="text-secondary-text text-sm">
				Create a new Shadowrun 4th Edition character from scratch.
			</p>
		</a>

		<a href="/characters" class="cw-card cw-card-interactive">
			<h3 class="cw-card-header text-accent-cyan">My Characters</h3>
			<p class="text-secondary-text text-sm">
				View and manage your saved characters.
			</p>
		</a>

		<a href="/browse" class="cw-card cw-card-interactive">
			<h3 class="cw-card-header text-accent-purple">Browse Data</h3>
			<p class="text-secondary-text text-sm">
				Explore skills, spells, gear, and more from the SR4 rulebooks.
			</p>
		</a>
	</section>

	<!-- Features -->
	<section class="cw-panel p-6">
		<h2 class="font-heading text-2xl text-accent-primary mb-6 text-center">Features</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="flex items-start gap-3">
				<span class="cw-badge cw-badge-primary">PWA</span>
				<p class="text-secondary-text text-sm">
					Works offline - install on any device
				</p>
			</div>
			<div class="flex items-start gap-3">
				<span class="cw-badge cw-badge-success">Sync</span>
				<p class="text-secondary-text text-sm">
					Cloud sync across all your devices
				</p>
			</div>
			<div class="flex items-start gap-3">
				<span class="cw-badge cw-badge-warning">XML</span>
				<p class="text-secondary-text text-sm">
					Import/export Chummer XML files
				</p>
			</div>
			<div class="flex items-start gap-3">
				<span class="cw-badge cw-badge-purple">Share</span>
				<p class="text-secondary-text text-sm">
					Share characters with your group
				</p>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="mt-12 text-center text-muted-text text-sm">
		<p>ChummerWeb is a fan project for Shadowrun 4th Edition.</p>
		<p class="mt-2">
			<a href="https://github.com/HalfBakedFullyNuts/ChummerGenSR4" class="cw-link">
				GitHub
			</a>
		</p>
	</footer>
</main>
