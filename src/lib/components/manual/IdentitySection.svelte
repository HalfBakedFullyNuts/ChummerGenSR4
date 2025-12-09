<script lang="ts">
	import type { Character, Metatype } from '$types';
	import { updateIdentity, setMetatype } from '$stores/character';
	import { gameData } from '$stores/gamedata';

	export let character: Character;
	export let metatypes: readonly Metatype[];

	/** Currently selected metatype name. */
	$: selectedMetatype = character.identity.metatype;
	$: selectedMetatypeData = metatypes.find(m => m.name === selectedMetatype);
	$: availableMetavariants = selectedMetatypeData?.metavariants ?? [];

	function handleIdentityChange(field: keyof Character['identity'], value: string): void {
		updateIdentity(field, value);
	}

	function handleMetatypeSelect(event: Event): void {
		const target = event.target as HTMLSelectElement;
		const metatypeName = target.value;
		const metatype = metatypes.find(m => m.name === metatypeName);
		if (metatype && $gameData) {
			setMetatype($gameData, metatype.name, null);
		}
	}

	function handleMetavariantSelect(event: Event): void {
		const target = event.target as HTMLSelectElement;
		const variant = target.value || null;
		if ($gameData) {
			setMetatype($gameData, selectedMetatype, variant);
		}
	}
</script>

<div class="space-y-4">
	<!-- Basic Info -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label for="name" class="block text-text-secondary text-sm mb-1">Character Name</label>
			<input
				id="name"
				type="text"
				value={character.identity.name}
				on:input={(e) => handleIdentityChange('name', e.currentTarget.value)}
				class="cw-input w-full"
				placeholder="Street name or real name"
			/>
		</div>
		<div>
			<label for="alias" class="block text-text-secondary text-sm mb-1">Alias / Street Name</label>
			<input
				id="alias"
				type="text"
				value={character.identity.alias}
				on:input={(e) => handleIdentityChange('alias', e.currentTarget.value)}
				class="cw-input w-full"
				placeholder="What the shadows call you"
			/>
		</div>
	</div>

	<div>
		<label for="playerName" class="block text-text-secondary text-sm mb-1">Player Name</label>
		<input
			id="playerName"
			type="text"
			value={character.identity.playerName}
			on:input={(e) => handleIdentityChange('playerName', e.currentTarget.value)}
			class="cw-input w-full"
			placeholder="Your name"
		/>
	</div>

	<!-- Metatype Selection -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label for="metatype" class="block text-text-secondary text-sm mb-1">Metatype</label>
			<select
				id="metatype"
				class="cw-select w-full"
				value={selectedMetatype}
				on:change={handleMetatypeSelect}
			>
				<option value="">Select Metatype</option>
				{#each metatypes as meta}
					<option value={meta.name}>{meta.name} ({meta.bp} BP)</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="metavariant" class="block text-text-secondary text-sm mb-1">Metavariant</label>
			<select
				id="metavariant"
				class="cw-select w-full"
				value={character.identity.metavariant ?? ''}
				on:change={handleMetavariantSelect}
				disabled={availableMetavariants.length === 0}
			>
				<option value="">None / Standard</option>
				{#each availableMetavariants as variant}
					<option value={variant.name}>{variant.name} ({variant.bp} BP)</option>
				{/each}
			</select>
		</div>
	</div>

	<!-- Personal Details -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div>
			<label for="sex" class="block text-text-secondary text-sm mb-1">Sex</label>
			<input
				id="sex"
				type="text"
				value={character.identity.sex}
				on:input={(e) => handleIdentityChange('sex', e.currentTarget.value)}
				class="cw-input w-full"
				placeholder="M/F/Other"
			/>
		</div>
		<div>
			<label for="age" class="block text-text-secondary text-sm mb-1">Age</label>
			<input
				id="age"
				type="text"
				value={character.identity.age}
				on:input={(e) => handleIdentityChange('age', e.currentTarget.value)}
				class="cw-input w-full"
				placeholder="25"
			/>
		</div>
		<div>
			<label for="height" class="block text-text-secondary text-sm mb-1">Height</label>
			<input
				id="height"
				type="text"
				value={character.identity.height}
				on:input={(e) => handleIdentityChange('height', e.currentTarget.value)}
				class="cw-input w-full"
				placeholder="1.8m"
			/>
		</div>
		<div>
			<label for="weight" class="block text-text-secondary text-sm mb-1">Weight</label>
			<input
				id="weight"
				type="text"
				value={character.identity.weight}
				on:input={(e) => handleIdentityChange('weight', e.currentTarget.value)}
				class="cw-input w-full"
				placeholder="80kg"
			/>
		</div>
	</div>

	<div class="grid grid-cols-3 gap-4">
		<div>
			<label for="hair" class="block text-text-secondary text-sm mb-1">Hair</label>
			<input
				id="hair"
				type="text"
				value={character.identity.hair}
				on:input={(e) => handleIdentityChange('hair', e.currentTarget.value)}
				class="cw-input w-full"
				placeholder="Black"
			/>
		</div>
		<div>
			<label for="eyes" class="block text-text-secondary text-sm mb-1">Eyes</label>
			<input
				id="eyes"
				type="text"
				value={character.identity.eyes}
				on:input={(e) => handleIdentityChange('eyes', e.currentTarget.value)}
				class="cw-input w-full"
				placeholder="Brown"
			/>
		</div>
		<div>
			<label for="skin" class="block text-text-secondary text-sm mb-1">Skin</label>
			<input
				id="skin"
				type="text"
				value={character.identity.skin}
				on:input={(e) => handleIdentityChange('skin', e.currentTarget.value)}
				class="cw-input w-full"
				placeholder="Olive"
			/>
		</div>
	</div>
</div>
