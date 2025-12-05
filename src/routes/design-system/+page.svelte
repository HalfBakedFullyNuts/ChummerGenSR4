<script lang="ts">
	let selectedItem = 'item-1';
	let inputValue = '';
	let selectValue = '';
	let collapsibleOpen = false;
	let statValue = 3;

	const selectOptions = [
		{ value: 'opt1', label: 'Option 1' },
		{ value: 'opt2', label: 'Option 2' },
		{ value: 'opt3', label: 'Option 3' }
	];
</script>

<div class="container mx-auto px-4 py-6 max-w-6xl">
	<h1 class="text-2xl text-primary-dark font-bold mb-2 tracking-wider">DESIGN SYSTEM</h1>
	<p class="text-text-secondary mb-8">
		Material UI-inspired light mode design system for ChummerWeb.
	</p>

	<!-- Color Palette -->
	<section class="mb-10">
		<h2 class="cw-section-header mb-4">
			<span class="material-icons mr-2">palette</span>
			Color Palette
		</h2>

		<!-- Primary -->
		<h3 class="text-sm text-text-secondary uppercase tracking-wide mb-2">Primary (Cyan)</h3>
		<div class="grid grid-cols-3 gap-2 mb-4">
			<div class="cw-panel p-3 text-center">
				<div class="w-full h-10 bg-primary-light mb-2 rounded"></div>
				<span class="text-xs text-text-muted">Light</span>
				<span class="text-xs text-primary-dark block">#33EAFF</span>
			</div>
			<div class="cw-panel p-3 text-center">
				<div class="w-full h-10 bg-primary-main mb-2 rounded shadow-primary"></div>
				<span class="text-xs text-text-muted">Main</span>
				<span class="text-xs text-primary-dark block">#00e5ff</span>
			</div>
			<div class="cw-panel p-3 text-center">
				<div class="w-full h-10 bg-primary-dark mb-2 rounded"></div>
				<span class="text-xs text-text-muted">Dark</span>
				<span class="text-xs text-primary-dark block">#00A0B2</span>
			</div>
		</div>

		<!-- Secondary -->
		<h3 class="text-sm text-text-secondary uppercase tracking-wide mb-2">Secondary (Blue)</h3>
		<div class="grid grid-cols-3 gap-2 mb-4">
			<div class="cw-panel p-3 text-center">
				<div class="w-full h-10 bg-secondary-light mb-2 rounded"></div>
				<span class="text-xs text-text-muted">Light</span>
				<span class="text-xs text-secondary-dark block">#79B7FF</span>
			</div>
			<div class="cw-panel p-3 text-center">
				<div class="w-full h-10 bg-secondary-main mb-2 rounded"></div>
				<span class="text-xs text-text-muted">Main</span>
				<span class="text-xs text-secondary-dark block">#58A6FF</span>
			</div>
			<div class="cw-panel p-3 text-center">
				<div class="w-full h-10 bg-secondary-dark mb-2 rounded"></div>
				<span class="text-xs text-text-muted">Dark</span>
				<span class="text-xs text-secondary-contrast block">#3D74B2</span>
			</div>
		</div>

		<!-- Status Colors -->
		<h3 class="text-sm text-text-secondary uppercase tracking-wide mb-2">Status Colors</h3>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
			<div class="cw-panel p-3 text-center">
				<div class="w-full h-10 bg-success-main mb-2 rounded"></div>
				<span class="text-xs text-text-muted">Success</span>
				<span class="text-xs text-success-dark block">#2EA043</span>
			</div>
			<div class="cw-panel p-3 text-center">
				<div class="w-full h-10 bg-warning-main mb-2 rounded"></div>
				<span class="text-xs text-text-muted">Warning</span>
				<span class="text-xs text-warning-dark block">#D29922</span>
			</div>
			<div class="cw-panel p-3 text-center">
				<div class="w-full h-10 bg-error-main mb-2 rounded"></div>
				<span class="text-xs text-text-muted">Error</span>
				<span class="text-xs text-error-dark block">#F85149</span>
			</div>
			<div class="cw-panel p-3 text-center">
				<div class="w-full h-10 bg-info-main mb-2 rounded"></div>
				<span class="text-xs text-text-muted">Info</span>
				<span class="text-xs text-info-dark block">#A371F7</span>
			</div>
		</div>

		<!-- Backgrounds -->
		<h3 class="text-sm text-text-secondary uppercase tracking-wide mb-2">Backgrounds & Surfaces</h3>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			<div class="cw-panel p-3 text-center border-2 border-border">
				<div class="w-full h-10 bg-background mb-2 rounded border border-border"></div>
				<span class="text-xs text-text-muted">Background</span>
				<span class="text-xs text-text-secondary block">#F5F5F5</span>
			</div>
			<div class="cw-panel p-3 text-center">
				<div class="w-full h-10 bg-surface mb-2 rounded border border-border"></div>
				<span class="text-xs text-text-muted">Surface</span>
				<span class="text-xs text-text-secondary block">#FFFFFF</span>
			</div>
			<div class="cw-panel p-3 text-center">
				<div class="w-full h-10 bg-border mb-2 rounded"></div>
				<span class="text-xs text-text-muted">Border</span>
				<span class="text-xs text-text-secondary block">#E0E0E0</span>
			</div>
			<div class="cw-panel p-3 text-center">
				<div class="w-full h-10 bg-gray-800 mb-2 rounded"></div>
				<span class="text-xs text-text-muted">Text Primary</span>
				<span class="text-xs text-text-secondary block">#212121</span>
			</div>
		</div>
	</section>

	<!-- Typography -->
	<section class="mb-10">
		<h2 class="cw-section-header mb-4">
			<span class="material-icons mr-2">text_fields</span>
			Typography
		</h2>
		<div class="cw-panel p-4 space-y-3">
			<div class="cw-data-row">
				<span class="text-text-muted">Font Family</span>
				<span class="text-text-primary">Roboto Mono (monospace)</span>
			</div>
			<p class="text-3xl text-primary-dark font-bold">Heading 1 - CHUMMER :: SR4</p>
			<p class="text-2xl text-text-primary font-medium">Heading 2 - Section Title</p>
			<p class="text-lg text-text-secondary">Heading 3 - Subsection</p>
			<p class="text-base text-text-primary">Body text - Regular content goes here.</p>
			<p class="text-sm text-text-secondary">Secondary text - Supporting information.</p>
			<p class="text-xs text-text-muted">Muted text - Source: SR4 p.123</p>
		</div>
	</section>

	<!-- Buttons -->
	<section class="mb-10">
		<h2 class="cw-section-header mb-4">
			<span class="material-icons mr-2">smart_button</span>
			Buttons
		</h2>
		<div class="cw-panel p-4">
			<div class="flex flex-wrap gap-3 mb-4">
				<button class="cw-btn cw-btn-primary">
					<span class="material-icons text-sm mr-1">add</span>
					Primary
				</button>
				<button class="cw-btn cw-btn-secondary">
					<span class="material-icons text-sm mr-1">edit</span>
					Secondary
				</button>
				<button class="cw-btn cw-btn-icon" title="Icon Button">
					<span class="material-icons text-sm">settings</span>
				</button>
				<button class="cw-btn cw-btn-primary" disabled>Disabled</button>
			</div>
			<div class="flex gap-2">
				<button class="cw-btn-inc-dec">
					<span class="material-icons text-xs">remove</span>
				</button>
				<span class="w-10 text-center text-primary-dark font-mono text-lg">{statValue}</span>
				<button class="cw-btn-inc-dec">
					<span class="material-icons text-xs">add</span>
				</button>
				<span class="text-text-muted text-sm ml-2">Increment/Decrement Controls</span>
			</div>
		</div>
	</section>

	<!-- Panels & Cards -->
	<section class="mb-10">
		<h2 class="cw-section-header mb-4">
			<span class="material-icons mr-2">dashboard</span>
			Panels & Cards
		</h2>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="cw-panel p-4">
				<h3 class="text-primary-dark font-medium mb-2">Default Panel</h3>
				<p class="text-text-secondary text-sm">White background with subtle border.</p>
			</div>
			<div class="cw-card p-4">
				<h3 class="text-text-primary font-medium mb-2">Card</h3>
				<p class="text-text-secondary text-sm">Solid background with shadow.</p>
			</div>
			<div class="cw-card cw-card-selected p-4">
				<h3 class="text-primary-dark font-medium mb-2">Selected Card</h3>
				<p class="text-text-secondary text-sm">Primary border with shadow accent.</p>
			</div>
		</div>
	</section>

	<!-- Form Elements -->
	<section class="mb-10">
		<h2 class="cw-section-header mb-4">
			<span class="material-icons mr-2">edit_note</span>
			Form Elements
		</h2>
		<div class="cw-panel p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label class="text-xs text-text-secondary uppercase tracking-wide block mb-1">
					Text Input
				</label>
				<input
					type="text"
					class="cw-input w-full"
					placeholder="Enter character name..."
					bind:value={inputValue}
				/>
			</div>
			<div>
				<label class="text-xs text-text-secondary uppercase tracking-wide block mb-1">
					Search Input
				</label>
				<div class="relative">
					<span
						class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm"
					>
						search
					</span>
					<input type="text" class="cw-input cw-input-search w-full pl-9" placeholder="Search..." />
				</div>
			</div>
			<div>
				<label class="text-xs text-text-secondary uppercase tracking-wide block mb-1">
					Select
				</label>
				<select class="cw-select w-full" bind:value={selectValue}>
					<option value="">Choose an option...</option>
					{#each selectOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="text-xs text-text-secondary uppercase tracking-wide block mb-1">
					Number Input
				</label>
				<input type="number" class="cw-input cw-input-number w-full" value="42" min="0" max="100" />
			</div>
		</div>
	</section>

	<!-- Badges -->
	<section class="mb-10">
		<h2 class="cw-section-header mb-4">
			<span class="material-icons mr-2">label</span>
			Badges & Tags
		</h2>
		<div class="cw-panel p-4 flex flex-wrap gap-3">
			<span class="cw-badge-primary">Primary</span>
			<span class="px-2 py-0.5 text-xs bg-success-main/20 text-success-dark rounded">Success</span>
			<span class="px-2 py-0.5 text-xs bg-warning-main/20 text-warning-dark rounded">Warning</span>
			<span class="px-2 py-0.5 text-xs bg-error-main/20 text-error-dark rounded">Error</span>
			<span class="px-2 py-0.5 text-xs bg-info-main/20 text-info-dark rounded">Info</span>
			<span class="cw-bp-cost">35 BP</span>
			<span class="cw-source">SR4 p.123</span>
		</div>
	</section>

	<!-- List Items -->
	<section class="mb-10">
		<h2 class="cw-section-header mb-4">
			<span class="material-icons mr-2">list</span>
			List Items
		</h2>
		<div class="cw-panel p-0 max-w-md">
			{#each ['item-1', 'item-2', 'item-3'] as item}
				<button
					class="cw-list-item w-full text-left"
					class:cw-selected={selectedItem === item}
					on:click={() => (selectedItem = item)}
				>
					<span class="material-icons text-sm mr-2">person</span>
					<span class="flex-1">List Item {item.split('-')[1]}</span>
					<span class="text-text-muted text-xs">10 BP</span>
				</button>
			{/each}
		</div>
	</section>

	<!-- Stat Rows -->
	<section class="mb-10">
		<h2 class="cw-section-header mb-4">
			<span class="material-icons mr-2">analytics</span>
			Stat & Data Rows
		</h2>
		<div class="cw-panel p-4 max-w-md">
			<div class="cw-stat-row">
				<span class="text-text-muted">Body</span>
				<span class="text-text-primary font-medium">3/6</span>
			</div>
			<div class="cw-stat-row">
				<span class="text-text-muted">Agility</span>
				<span class="text-primary-dark font-medium">5/7</span>
			</div>
			<div class="cw-data-row">
				<span class="text-text-muted">Essence</span>
				<span class="text-info-dark">6.0</span>
			</div>
			<div class="cw-data-row">
				<span class="text-text-muted">Build Points</span>
				<span class="text-primary-dark">400</span>
			</div>
		</div>
	</section>

	<!-- Collapsible -->
	<section class="mb-10">
		<h2 class="cw-section-header mb-4">
			<span class="material-icons mr-2">unfold_more</span>
			Collapsible Sections
		</h2>
		<div class="max-w-md space-y-2">
			<details class="cw-collapsible" bind:open={collapsibleOpen}>
				<summary class="cw-collapsible-header">
					<span class="material-icons text-sm mr-2">
						{collapsibleOpen ? 'expand_more' : 'chevron_right'}
					</span>
					<span class="flex-1 text-xs uppercase tracking-wide">Active Skills</span>
					<span class="cw-badge-primary">12</span>
				</summary>
				<div class="p-4">
					<p class="text-text-secondary text-sm">
						Collapsible content goes here. This can contain any elements.
					</p>
				</div>
			</details>
			<details class="cw-collapsible">
				<summary class="cw-collapsible-header">
					<span class="material-icons text-sm mr-2">chevron_right</span>
					<span class="flex-1 text-xs uppercase tracking-wide">Knowledge Skills</span>
					<span class="cw-badge-primary">8</span>
				</summary>
				<div class="p-4">
					<p class="text-text-secondary text-sm">More collapsible content.</p>
				</div>
			</details>
		</div>
	</section>

	<!-- Progress Bars -->
	<section class="mb-10">
		<h2 class="cw-section-header mb-4">
			<span class="material-icons mr-2">linear_scale</span>
			Progress Indicators
		</h2>
		<div class="cw-panel p-4 space-y-4 max-w-md">
			<div>
				<div class="flex justify-between text-xs mb-1">
					<span class="text-text-secondary">BP Remaining</span>
					<span class="text-primary-dark">325/400</span>
				</div>
				<div class="cw-progress">
					<div class="cw-progress-bar" style="width: 81%"></div>
				</div>
			</div>
			<div>
				<div class="flex justify-between text-xs mb-1">
					<span class="text-text-secondary">Essence</span>
					<span class="text-info-dark">4.2/6.0</span>
				</div>
				<div class="cw-progress">
					<div class="cw-progress-bar bg-info-main" style="width: 70%"></div>
				</div>
			</div>
		</div>
	</section>

	<!-- Icons Reference -->
	<section class="mb-10">
		<h2 class="cw-section-header mb-4">
			<span class="material-icons mr-2">category</span>
			Common Icons
		</h2>
		<div class="cw-panel p-4">
			<div class="grid grid-cols-4 md:grid-cols-8 gap-4 text-center">
				{#each ['add', 'edit', 'delete', 'search', 'settings', 'person', 'folder', 'save', 'menu_book', 'auto_awesome', 'fitness_center', 'psychology', 'security', 'visibility', 'chevron_right', 'expand_more'] as icon}
					<div class="flex flex-col items-center gap-1">
						<span class="material-icons text-primary-dark">{icon}</span>
						<span class="text-text-muted text-xs">{icon}</span>
					</div>
				{/each}
			</div>
		</div>
	</section>
</div>
