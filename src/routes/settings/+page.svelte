<script lang="ts">
	import { appSettings } from '$stores/appSettings';
	import { gameData } from '$stores/gamedata';
	import AppHeader from '$lib/components/ui/AppHeader.svelte';

	// The sourcebooks from game data
	$: availableSourcebooks = [...new Set($gameData.books.map((b) => b.name))].sort();

	function toggleSourcebook(book: string) {
		appSettings.update((s) => {
			const active = s.enabledSourcebooks.includes(book);
			return {
				...s,
				enabledSourcebooks: active
					? s.enabledSourcebooks.filter((b) => b !== book)
					: [...s.enabledSourcebooks, book]
			};
		});
	}

	function handleThemeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		appSettings.update((s) => ({ ...s, theme: target.value as any }));
	}

	function handleBuildMethodChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		appSettings.update((s) => ({
			...s,
			characterDefaults: {
				...s.characterDefaults,
				buildMethod: target.value as 'BP' | 'Karma'
			}
		}));
	}
</script>

<div class="min-h-screen bg-background flex flex-col">
	<AppHeader title="CHUMMER" section="Settings">
		<a href="/" class="cw-btn cw-btn-secondary">
			<span class="material-icons text-[18px]">home</span>
			<span class="ml-1 hidden md:inline">Home</span>
		</a>
	</AppHeader>

	<main class="flex-1 p-4 md:p-6 overflow-y-auto">
		<div class="max-w-4xl mx-auto space-y-6">
			<section class="cw-panel p-6">
				<h2 class="cw-section-header mb-4">
					<span class="material-icons mr-2">palette</span>
					Appearance
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="flex flex-col gap-2">
						<label for="theme" class="text-text-primary font-medium">Theme</label>
						<select
							id="theme"
							class="cw-input"
							value={$appSettings.theme}
							on:change={handleThemeChange}
						>
							<option value="light">Light</option>
							<option value="dark">Dark</option>
							<option value="system">System Default</option>
						</select>
					</div>
				</div>
			</section>

			<section class="cw-panel p-6">
				<h2 class="cw-section-header mb-4">
					<span class="material-icons mr-2">person_add</span>
					New Character Defaults
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="flex flex-col gap-2">
						<label for="buildMethod" class="text-text-primary font-medium">Build Method</label>
						<select
							id="buildMethod"
							class="cw-input"
							value={$appSettings.characterDefaults.buildMethod}
							on:change={handleBuildMethodChange}
						>
							<option value="BP">Build Points (Standard)</option>
							<option value="Karma">Karma (Point Buy)</option>
						</select>
					</div>

					<div class="flex flex-col gap-2">
						<label for="startingBP" class="text-text-primary font-medium"
							>Starting Build Points</label
						>
						<input
							id="startingBP"
							type="number"
							class="cw-input"
							bind:value={$appSettings.characterDefaults.startingBP}
						/>
					</div>

					<div class="flex flex-col gap-2">
						<label for="startingKarma" class="text-text-primary font-medium"
							>Starting Karma (Karma Build)</label
						>
						<input
							id="startingKarma"
							type="number"
							class="cw-input"
							bind:value={$appSettings.characterDefaults.startingKarma}
						/>
					</div>

					<div class="flex flex-col gap-2">
						<label for="maxAvailability" class="text-text-primary font-medium"
							>Max Availability</label
						>
						<input
							id="maxAvailability"
							type="number"
							class="cw-input"
							bind:value={$appSettings.characterDefaults.maxAvailability}
						/>
					</div>
				</div>
			</section>

			<section class="cw-panel p-6">
				<h2 class="cw-section-header mb-4">
					<span class="material-icons mr-2">library_books</span>
					Sourcebooks
				</h2>
				<p class="text-text-secondary text-sm mb-4">
					Select which sourcebooks are allowed when creating characters. Items from disabled books
					will be hidden.
				</p>

				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
					{#each availableSourcebooks as book}
						{@const isEnabled = $appSettings.enabledSourcebooks.includes(book)}
						<label
							class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-surface-variant transition-colors {isEnabled
								? 'bg-primary-main/10 border-primary-main/30'
								: 'bg-surface border-border'}"
						>
							<div class="flex items-center h-5">
								<input
									type="checkbox"
									class="cw-checkbox"
									checked={isEnabled}
									on:change={() => toggleSourcebook(book)}
								/>
							</div>
							<div class="flex-1 text-sm pt-0.5">
								<span class="font-medium {isEnabled ? 'text-primary-dark' : 'text-text-primary'}">
									{book}
								</span>
							</div>
						</label>
					{/each}
				</div>
			</section>
		</div>
	</main>
</div>
