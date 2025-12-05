<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		listCharacters,
		loadSavedCharacter,
		loadImportedCharacter,
		deleteSavedCharacter,
		startNewCharacter,
		saveCurrentCharacter,
		type CharacterSummary
	} from '$stores/character';
	import {
		initializeFirebase,
		signInWithGoogle,
		signOutUser,
		subscribeToAuthState
	} from '$lib/firebase';
	import { loadCharacter } from '$lib/firebase/characters';
	import { downloadAsChum, importFromFile } from '$lib/xml';
	import type { User } from 'firebase/auth';

	/** Current authenticated user. */
	let user: User | null = null;

	/** List of user's characters. */
	let characters: CharacterSummary[] = [];

	/** Loading state. */
	let loading = true;

	/** Error message. */
	let error: string | null = null;

	/** Character being deleted (for confirmation). */
	let deleteConfirm: string | null = null;

	/** Auth state unsubscribe function. */
	let unsubscribeAuth: (() => void) | null = null;

	/** File input reference for import. */
	let fileInput: HTMLInputElement;

	/** Import in progress. */
	let importing = false;

	/** Export in progress. */
	let exporting: string | null = null;

	/** Dispatches events to parent. */
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher<{
		characterLoaded: { id: string };
		newCharacter: void;
	}>();

	onMount(async () => {
		/* Initialize Firebase */
		const initResult = initializeFirebase();
		if (!initResult.success) {
			error = initResult.error || 'Failed to initialize Firebase';
			loading = false;
			return;
		}

		/* Subscribe to auth state */
		unsubscribeAuth = subscribeToAuthState(async (authUser) => {
			user = authUser;
			if (authUser) {
				await refreshCharacters();
			} else {
				characters = [];
			}
			loading = false;
		});
	});

	onDestroy(() => {
		if (unsubscribeAuth) {
			unsubscribeAuth();
		}
	});

	/** Refresh character list from Firebase. */
	async function refreshCharacters() {
		if (!user) return;

		loading = true;
		error = null;

		const result = await listCharacters(user.uid);
		if (result.success && result.data) {
			characters = result.data;
		} else {
			error = result.error || 'Failed to load characters';
		}

		loading = false;
	}

	/** Handle sign in. */
	async function handleSignIn() {
		loading = true;
		error = null;

		const result = await signInWithGoogle();
		if (!result.success) {
			error = result.error || 'Sign-in failed';
			loading = false;
		}
		/* Auth state change will handle the rest */
	}

	/** Handle sign out. */
	async function handleSignOut() {
		const result = await signOutUser();
		if (!result.success) {
			error = result.error || 'Sign-out failed';
		}
	}

	/** Load a character. */
	async function handleLoad(characterId: string) {
		loading = true;
		error = null;

		const result = await loadSavedCharacter(characterId);
		if (result.success) {
			dispatch('characterLoaded', { id: characterId });
		} else {
			error = result.error || 'Failed to load character';
		}

		loading = false;
	}

	/** Delete a character. */
	async function handleDelete(characterId: string) {
		if (deleteConfirm !== characterId) {
			deleteConfirm = characterId;
			return;
		}

		loading = true;
		error = null;
		deleteConfirm = null;

		const result = await deleteSavedCharacter(characterId);
		if (result.success) {
			await refreshCharacters();
		} else {
			error = result.error || 'Failed to delete character';
			loading = false;
		}
	}

	/** Cancel delete confirmation. */
	function cancelDelete() {
		deleteConfirm = null;
	}

	/** Create new character. */
	function handleNewCharacter() {
		if (!user) return;
		startNewCharacter(user.uid, 'bp');
		dispatch('newCharacter');
	}

	/** Format date for display. */
	function formatDate(isoString: string): string {
		if (!isoString) return 'Unknown';
		const date = new Date(isoString);
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	/** Export character as .chum file. */
	async function handleExport(characterId: string) {
		if (!user) return;
		exporting = characterId;
		error = null;

		const result = await loadCharacter(characterId);
		if (result.success && result.data) {
			downloadAsChum(result.data);
		} else {
			error = result.error || 'Failed to export character';
		}

		exporting = null;
	}

	/** Handle file selection for import. */
	async function handleImportFile(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file || !user) return;

		importing = true;
		error = null;

		const result = await importFromFile(file, user.uid);
		if (result.success && result.character) {
			/* Store imported character and save */
			loadImportedCharacter(result.character);
			const saveResult = await saveCurrentCharacter();
			if (saveResult.success) {
				await refreshCharacters();
			} else {
				error = saveResult.error || 'Failed to save imported character';
			}
		} else {
			error = result.error || 'Failed to import character';
		}

		importing = false;
		/* Reset file input */
		target.value = '';
	}

	/** Trigger file input click. */
	function triggerImport() {
		fileInput?.click();
	}
</script>

<div class="space-y-6">
	<!-- Hidden file input for import -->
	<input
		type="file"
		accept=".chum,.xml"
		class="hidden"
		bind:this={fileInput}
		on:change={handleImportFile}
	/>

	<!-- Header -->
	<div class="flex items-center justify-between">
		<h2 class="cw-page-header">Characters</h2>
		{#if user}
			<div class="flex items-center gap-4">
				<span class="text-text-secondary text-sm">
					{user.displayName || user.email}
				</span>
				<button class="cw-btn text-sm" on:click={handleSignOut}>
					Sign Out
				</button>
			</div>
		{/if}
	</div>

	<!-- Error Message -->
	{#if error}
		<div class="cw-panel p-4 border-l-4 border-error-main">
			<p class="text-error-main text-sm">{error}</p>
		</div>
	{/if}

	<!-- Not Signed In -->
	{#if !loading && !user}
		<div class="cw-card p-6 text-center py-12">
			<h3 class="text-xl text-text-primary mb-4">Sign In to Manage Characters</h3>
			<p class="text-text-secondary mb-6">
				Sign in with your Google account to save characters to the cloud and access them from any device.
			</p>
			<button class="cw-btn cw-btn-primary px-6 py-2" on:click={handleSignIn}>
				Sign In with Google
			</button>
		</div>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="cw-card p-6 text-center py-8">
			<div class="inline-block w-8 h-8 border-4 border-primary-main border-t-transparent rounded-full animate-spin"></div>
			<p class="text-text-secondary mt-4">Loading...</p>
		</div>
	{/if}

	<!-- Character List -->
	{#if !loading && user}
		<!-- Action Buttons -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<!-- New Character Button -->
			<button
				class="cw-card p-6 text-left hover:border-primary-main/50 transition-colors group"
				on:click={handleNewCharacter}
			>
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 rounded-full bg-primary-main/20 flex items-center justify-center text-primary-dark text-2xl group-hover:bg-primary-main group-hover:text-primary-contrast transition-colors">
						+
					</div>
					<div>
						<h3 class="text-text-primary font-medium">Create New Character</h3>
						<p class="text-text-secondary text-sm">Start the character creation wizard</p>
					</div>
				</div>
			</button>

			<!-- Import Button -->
			<button
				class="cw-card p-6 text-left hover:border-secondary-main/50 transition-colors group"
				on:click={triggerImport}
				disabled={importing}
			>
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 rounded-full bg-secondary-main/20 flex items-center justify-center text-secondary-dark text-xl group-hover:bg-secondary-main group-hover:text-secondary-contrast transition-colors">
						{#if importing}
							<span class="animate-spin">↻</span>
						{:else}
							↑
						{/if}
					</div>
					<div>
						<h3 class="text-text-primary font-medium">
							{importing ? 'Importing...' : 'Import Character'}
						</h3>
						<p class="text-text-secondary text-sm">Load .chum file from desktop Chummer</p>
					</div>
				</div>
			</button>
		</div>

		<!-- Character Cards -->
		{#if characters.length === 0}
			<div class="cw-panel p-8 text-center">
				<p class="text-text-muted">No saved characters yet.</p>
				<p class="text-text-secondary text-sm mt-2">
					Click "Create New Character" above to get started.
				</p>
			</div>
		{:else}
			<div class="grid gap-4">
				{#each characters as char (char.id)}
					<div class="cw-card p-4 hover:border-border-dark transition-colors">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<h3 class="text-text-primary font-medium">
									{char.name || 'Unnamed Character'}
								</h3>
								{#if char.alias}
									<p class="text-secondary-dark text-sm">"{char.alias}"</p>
								{/if}
								<div class="flex items-center gap-4 mt-2 text-sm">
									<span class="text-text-secondary">
										{char.metatype || 'Unknown Metatype'}
									</span>
									<span class="text-text-muted">|</span>
									<span class:text-primary-dark={char.status === 'creation'}
										  class:text-secondary-dark={char.status === 'career'}>
										{char.status === 'creation' ? 'In Creation' : 'Career Mode'}
									</span>
								</div>
								<p class="text-text-muted text-xs mt-2">
									Last updated: {formatDate(char.updatedAt)}
								</p>
							</div>
							<div class="flex gap-2">
								{#if deleteConfirm === char.id}
									<button
										class="cw-btn text-sm bg-error-main/20 text-error-main hover:bg-error-main hover:text-error-contrast"
										on:click={() => handleDelete(char.id)}
									>
										Confirm
									</button>
									<button
										class="cw-btn text-sm"
										on:click={cancelDelete}
									>
										Cancel
									</button>
								{:else}
									<a
										href="/character/view/{char.id}"
										class="cw-btn text-sm"
									>
										View
									</a>
									<button
										class="cw-btn cw-btn-primary text-sm"
										on:click={() => handleLoad(char.id)}
									>
										Edit
									</button>
									<button
										class="cw-btn text-sm text-secondary-dark hover:bg-secondary-main/20"
										on:click={() => handleExport(char.id)}
										disabled={exporting === char.id}
									>
										{exporting === char.id ? '...' : 'Export'}
									</button>
									<button
										class="cw-btn text-sm text-error-main hover:bg-error-main/20"
										on:click={() => handleDelete(char.id)}
									>
										Delete
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Help Text -->
	<div class="cw-panel p-4 text-sm">
		<h4 class="text-primary-dark font-semibold mb-2">Cloud Save & Desktop Compatibility</h4>
		<ul class="text-text-secondary space-y-1 list-disc list-inside">
			<li>Characters are automatically saved to the cloud</li>
			<li>Access your characters from any device</li>
			<li>Import .chum files from desktop Chummer</li>
			<li>Export characters as .chum for desktop use</li>
			<li>Career mode characters track karma and advancement</li>
		</ul>
	</div>
</div>
