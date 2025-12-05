<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		MATRIX_ACTIONS,
		calculateMatrixPool,
		calculateMatrixDefense,
		type MatrixActionType,
		type MatrixAction,
		type CommlinkStats,
		type LoadedProgram
	} from '$lib/utils/dice';

	/** Character's relevant skill ratings. */
	export let skills: Record<string, number> = {};

	/** Character's Logic attribute. */
	export let logic = 3;

	/** Character's Intuition attribute. */
	export let intuition = 3;

	/** Character's Charisma attribute. */
	export let charisma = 3;

	/** Character's Resonance (for technomancers). */
	export let resonance: number | null = null;

	/** Commlink stats. */
	export let commlink: CommlinkStats = { response: 3, signal: 3, firewall: 3, system: 3 };

	/** Loaded programs. */
	export let programs: LoadedProgram[] = [];

	/** Whether in VR mode. */
	export let vrMode = false;

	/** Dispatch events. */
	const dispatch = createEventDispatcher<{
		rollMatrix: {
			action: MatrixAction;
			pool: number;
			opposed: boolean;
			opposedBy?: string;
		};
	}>();

	/** Get skill rating by name. */
	function getSkillRating(skillName: string): number {
		// Map Matrix skills to character skill names
		const skillMap: Record<string, string> = {
			'Computer': 'Computer',
			'Data Search': 'Data Search',
			'Electronic Warfare': 'Electronic Warfare',
			'Hacking': 'Hacking',
			'Cybercombat': 'Cybercombat'
		};
		return skills[skillMap[skillName]] || 0;
	}

	/** Get program rating by name. */
	function getProgramRating(programName?: string): number {
		if (!programName) return 0;
		const program = programs.find(p => p.name.toLowerCase() === programName.toLowerCase());
		return program?.rating || 0;
	}

	/** Get attribute value for an action. */
	function getAttributeValue(attr: 'log' | 'int' | 'cha' | 'res'): number {
		switch (attr) {
			case 'log': return logic;
			case 'int': return intuition;
			case 'cha': return charisma;
			case 'res': return resonance || 0;
		}
	}

	/** Calculate dice pool for an action. */
	function getActionPool(action: MatrixAction): number {
		const skillRating = getSkillRating(action.skill);
		const attrValue = getAttributeValue(action.attribute);
		const programRating = action.addProgram ? getProgramRating(action.program) : 0;

		let pool = calculateMatrixPool(
			Object.keys(MATRIX_ACTIONS).find(k => MATRIX_ACTIONS[k as MatrixActionType] === action) as MatrixActionType,
			skillRating,
			attrValue,
			programRating
		);

		// VR mode bonus (+2 in hot sim)
		if (vrMode) {
			pool += 2;
		}

		return pool;
	}

	/** Handle action click. */
	function handleActionClick(actionKey: MatrixActionType): void {
		const action = MATRIX_ACTIONS[actionKey];
		const pool = getActionPool(action);

		dispatch('rollMatrix', {
			action,
			pool,
			opposed: action.opposed,
			opposedBy: action.opposedBy
		});
	}

	/** Group actions by category. */
	interface ActionCategory {
		name: string;
		actions: MatrixActionType[];
	}

	const actionCategories: ActionCategory[] = [
		{
			name: 'Hacking',
			actions: ['hack_on_the_fly', 'brute_force', 'exploit', 'spoof_command', 'disarm']
		},
		{
			name: 'Electronic Warfare',
			actions: ['decrypt', 'encrypt', 'intercept_traffic', 'jam_signals']
		},
		{
			name: 'Computer',
			actions: ['analyze', 'browse', 'command', 'edit', 'data_search', 'matrix_perception', 'trace_user']
		},
		{
			name: 'Cybercombat',
			actions: ['crash_program', 'jack_out', 'redirect_trace']
		}
	];
</script>

<div class="cw-card p-4">
	<div class="flex items-center justify-between mb-3">
		<h3 class="text-text-primary font-medium">Matrix Actions</h3>
		<div class="flex items-center gap-3">
			<label class="flex items-center gap-2 cursor-pointer">
				<input
					type="checkbox"
					class="w-4 h-4 accent-secondary-main"
					bind:checked={vrMode}
				/>
				<span class="text-text-secondary text-sm">Hot-Sim VR</span>
			</label>
		</div>
	</div>

	<!-- Commlink Stats -->
	<div class="grid grid-cols-4 gap-2 mb-4 p-2 bg-surface-variant rounded text-center">
		<div>
			<div class="text-xs text-text-muted">Response</div>
			<div class="font-mono text-secondary-dark">{commlink.response}</div>
		</div>
		<div>
			<div class="text-xs text-text-muted">Signal</div>
			<div class="font-mono text-secondary-dark">{commlink.signal}</div>
		</div>
		<div>
			<div class="text-xs text-text-muted">Firewall</div>
			<div class="font-mono text-success-main">{commlink.firewall}</div>
		</div>
		<div>
			<div class="text-xs text-text-muted">System</div>
			<div class="font-mono text-text-primary">{commlink.system}</div>
		</div>
	</div>

	<!-- Action Categories -->
	<div class="space-y-4">
		{#each actionCategories as category}
			<div>
				<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">{category.name}</h4>
				<div class="grid grid-cols-2 md:grid-cols-3 gap-2">
					{#each category.actions as actionKey}
						{@const action = MATRIX_ACTIONS[actionKey]}
						{@const pool = getActionPool(action)}
						<button
							type="button"
							class="text-left p-2 rounded transition-colors bg-surface-variant hover:bg-surface"
							on:click={() => handleActionClick(actionKey)}
						>
							<div class="flex items-center justify-between">
								<span class="text-sm text-text-secondary truncate">{action.name}</span>
								<span class="font-mono text-secondary-dark text-sm ml-2">{pool}d6</span>
							</div>
							<div class="flex items-center gap-2 mt-1">
								<span class="text-xs text-text-muted">{action.skill}</span>
								{#if action.opposed}
									<span class="text-xs text-warning-main" title="Opposed by: {action.opposedBy}">Opp</span>
								{/if}
								{#if action.program}
									<span class="text-xs text-info-main" title="Uses {action.program} program">+{action.program}</span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<!-- Loaded Programs -->
	{#if programs.length > 0}
		<div class="mt-4 pt-3 border-t border-border">
			<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Loaded Programs</h4>
			<div class="flex flex-wrap gap-2">
				{#each programs as program}
					<span class="text-xs py-1 px-2 bg-surface-variant rounded text-text-secondary">
						{program.name}
						<span class="font-mono text-info-main">R{program.rating}</span>
					</span>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Matrix Defense -->
	<div class="mt-4 pt-3 border-t border-border">
		<h4 class="text-xs text-text-muted uppercase tracking-wide mb-2">Defense Pools</h4>
		<div class="grid grid-cols-2 gap-2 text-sm">
			<div class="flex justify-between p-2 bg-surface-variant rounded">
				<span class="text-text-secondary">vs Hacking</span>
				<span class="font-mono text-success-main">
					{calculateMatrixDefense(commlink.firewall, getProgramRating('Analyze'))}d6
				</span>
			</div>
			<div class="flex justify-between p-2 bg-surface-variant rounded">
				<span class="text-text-secondary">vs Cybercombat</span>
				<span class="font-mono text-success-main">
					{calculateMatrixDefense(commlink.firewall, getProgramRating('Armor'), commlink.response)}d6
				</span>
			</div>
		</div>
	</div>
</div>
