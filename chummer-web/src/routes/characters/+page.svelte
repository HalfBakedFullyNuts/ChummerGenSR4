<script lang="ts">
	import { goto } from '$app/navigation';
	import { CharacterList } from '$lib/components';

	/** Handle character loaded event. */
	function handleCharacterLoaded(event: CustomEvent<{ id: string }>) {
		/* Navigate to edit the character */
		goto(`/character/edit/${event.detail.id}`);
	}

	/** Handle new character event. */
	function handleNewCharacter() {
		goto('/character/new');
	}
</script>

<main class="container mx-auto px-4 py-8 max-w-4xl">
	<CharacterList
		on:characterLoaded={handleCharacterLoaded}
		on:newCharacter={handleNewCharacter}
	/>
</main>
