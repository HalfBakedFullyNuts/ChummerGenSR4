<script lang="ts">
	import { user } from '$stores/user';
	import { signInWithGoogle } from '$firebase/auth';

	let isLoading = false;
	let errorMessage: string | null = null;

	const MAX_RETRIES = 3;

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
</script>

<div class="container mx-auto px-4 py-8 max-w-5xl">
	<!-- Hero Section -->
	<section class="text-center mb-10">
		<h1 class="text-3xl text-primary-dark font-bold mb-3 tracking-wider">
			SHADOWRUN 4E
		</h1>
		<p class="text-text-secondary text-base mb-6">
			Character Generator
		</p>
		<p class="text-text-muted text-sm max-w-xl mx-auto">
			Create, manage, and share your Shadowrun 4th Edition characters with a modern web-based tool inspired by the classic Chummer desktop application.
		</p>
	</section>

	<!-- Auth Card -->
	{#if !$user}
		<section class="cw-panel p-6 max-w-md mx-auto mb-10">
			<div class="text-center">
				<span class="material-icons text-primary-dark text-3xl mb-3">account_circle</span>
				<h2 class="text-text-primary font-medium mb-2">Get Started</h2>
				<p class="text-text-secondary text-sm mb-6">
					Sign in to save and sync your characters across devices.
				</p>
				<button
					class="cw-btn cw-btn-primary w-full mb-3"
					on:click={handleSignIn}
					disabled={isLoading}
				>
					<span class="material-icons text-sm mr-2">login</span>
					{#if isLoading}
						Signing in...
					{:else}
						Sign in with Google
					{/if}
				</button>
				<a href="/character/new" class="cw-btn cw-btn-secondary w-full">
					<span class="material-icons text-sm mr-2">person_outline</span>
					Continue as Guest
				</a>
			</div>

			{#if errorMessage}
				<p class="text-error text-sm mt-4 text-center">{errorMessage}</p>
			{/if}
		</section>
	{:else}
		<section class="cw-panel p-4 max-w-md mx-auto mb-10">
			<div class="flex items-center gap-3">
				<span class="material-icons text-success-main">verified_user</span>
				<div class="flex-1">
					<p class="text-text-primary text-sm">Signed in as</p>
					<p class="text-primary-dark font-medium">{$user.displayName ?? $user.email}</p>
				</div>
			</div>
		</section>
	{/if}

	<!-- Quick Actions -->
	<section class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
		<a href="/character/new" class="cw-card p-4 group hover:border-primary-dark transition-colors">
			<div class="flex items-center gap-3 mb-2">
				<span class="material-icons text-primary-dark">add_circle</span>
				<h3 class="text-text-primary font-medium group-hover:text-primary-dark transition-colors">
					New Character
				</h3>
			</div>
			<p class="text-text-muted text-sm">
				Create a new SR4 character from scratch using the build point system.
			</p>
		</a>

		<a href="/characters" class="cw-card p-4 group hover:border-secondary-dark transition-colors">
			<div class="flex items-center gap-3 mb-2">
				<span class="material-icons text-secondary-dark">folder_open</span>
				<h3 class="text-text-primary font-medium group-hover:text-secondary-dark transition-colors">
					My Characters
				</h3>
			</div>
			<p class="text-text-muted text-sm">
				View and manage your saved characters.
			</p>
		</a>

		<a href="/browse" class="cw-card p-4 group hover:border-info-dark transition-colors">
			<div class="flex items-center gap-3 mb-2">
				<span class="material-icons text-info-dark">auto_stories</span>
				<h3 class="text-text-primary font-medium group-hover:text-info-dark transition-colors">
					Browse Data
				</h3>
			</div>
			<p class="text-text-muted text-sm">
				Explore skills, spells, gear, and more from SR4 rulebooks.
			</p>
		</a>
	</section>

	<!-- Features Grid -->
	<section class="cw-panel p-6 mb-10">
		<h2 class="cw-section-header mb-4">
			<span class="material-icons mr-2">star</span>
			Features
		</h2>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div class="cw-data-row">
				<span class="flex items-center gap-2">
					<span class="material-icons text-sm text-primary-dark">install_mobile</span>
					<span class="text-text-secondary">Progressive Web App</span>
				</span>
				<span class="text-text-muted text-xs">Works offline</span>
			</div>
			<div class="cw-data-row">
				<span class="flex items-center gap-2">
					<span class="material-icons text-sm text-success-main">sync</span>
					<span class="text-text-secondary">Cloud Sync</span>
				</span>
				<span class="text-text-muted text-xs">All devices</span>
			</div>
			<div class="cw-data-row">
				<span class="flex items-center gap-2">
					<span class="material-icons text-sm text-warning-dark">code</span>
					<span class="text-text-secondary">XML Import/Export</span>
				</span>
				<span class="text-text-muted text-xs">Chummer compatible</span>
			</div>
			<div class="cw-data-row">
				<span class="flex items-center gap-2">
					<span class="material-icons text-sm text-info-dark">share</span>
					<span class="text-text-secondary">Character Sharing</span>
				</span>
				<span class="text-text-muted text-xs">With your group</span>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="text-center text-text-muted text-xs py-4 border-t border-border">
		<p>ChummerWeb is a fan project for Shadowrun 4th Edition.</p>
		<p class="mt-2">
			<a
				href="https://github.com/HalfBakedFullyNuts/ChummerGenSR4"
				class="text-primary-dark hover:underline inline-flex items-center gap-1"
			>
				<span class="material-icons text-xs">open_in_new</span>
				GitHub
			</a>
		</p>
	</footer>
</div>
