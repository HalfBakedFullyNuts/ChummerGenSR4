<script lang="ts">
	/**
	 * Living Persona Display
	 * ======================
	 * Shows technomancer's living persona attributes.
	 * The living persona is the technomancer's mental presence in the Matrix.
	 */

	import { character } from '$stores/character';

	/**
	 * Living Persona Attributes (SR4 p.239):
	 * - Response = Intuition
	 * - Signal = Resonance
	 * - System = Logic
	 * - Firewall = Willpower
	 *
	 * Additionally:
	 * - Biofeedback Filter = Willpower + Resonance (for biofeedback damage resistance)
	 */

	$: resonance = $character?.attributes.res?.base ?? 0;
	$: intuition = $character?.attributes.int?.base ?? 0;
	$: logic = $character?.attributes.log?.base ?? 0;
	$: willpower = $character?.attributes.wil?.base ?? 0;

	/** Living persona stats. */
	$: response = intuition;
	$: signal = resonance;
	$: system = logic;
	$: firewall = willpower;
	$: biofeedbackFilter = willpower + resonance;

	/** Stream info. */
	$: stream = $character?.resonance?.stream ?? null;
	$: submersionGrade = $character?.resonance?.submersionGrade ?? 0;
</script>

<div class="cw-card">
	<h3 class="cw-card-header mb-4">Living Persona</h3>

	{#if stream}
		<div class="mb-4">
			<span class="text-xs text-muted-text">Stream:</span>
			<span class="text-accent-cyan ml-2">{stream}</span>
			{#if submersionGrade > 0}
				<span class="text-muted-text text-xs ml-2">(Grade {submersionGrade})</span>
			{/if}
		</div>
	{/if}

	<!-- Matrix Attributes Grid -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
		<div class="bg-surface p-3 rounded text-center">
			<div class="text-xs text-muted-text uppercase tracking-wide">Response</div>
			<div class="text-2xl font-mono text-accent-cyan">{response}</div>
			<div class="text-xs text-muted-text">(INT)</div>
		</div>
		<div class="bg-surface p-3 rounded text-center">
			<div class="text-xs text-muted-text uppercase tracking-wide">Signal</div>
			<div class="text-2xl font-mono text-accent-cyan">{signal}</div>
			<div class="text-xs text-muted-text">(RES)</div>
		</div>
		<div class="bg-surface p-3 rounded text-center">
			<div class="text-xs text-muted-text uppercase tracking-wide">System</div>
			<div class="text-2xl font-mono text-accent-cyan">{system}</div>
			<div class="text-xs text-muted-text">(LOG)</div>
		</div>
		<div class="bg-surface p-3 rounded text-center">
			<div class="text-xs text-muted-text uppercase tracking-wide">Firewall</div>
			<div class="text-2xl font-mono text-accent-cyan">{firewall}</div>
			<div class="text-xs text-muted-text">(WIL)</div>
		</div>
	</div>

	<!-- Biofeedback Filter -->
	<div class="bg-surface-light p-3 rounded flex items-center justify-between">
		<div>
			<span class="text-sm text-secondary-text">Biofeedback Filter</span>
			<span class="text-xs text-muted-text ml-2">(WIL + RES)</span>
		</div>
		<span class="font-mono text-accent-success text-lg">{biofeedbackFilter}</span>
	</div>

	<!-- Quick Reference -->
	<div class="mt-4 p-3 bg-surface rounded">
		<h4 class="text-xs text-muted-text uppercase tracking-wide mb-2">Matrix Actions</h4>
		<div class="grid grid-cols-2 gap-2 text-xs">
			<div>
				<span class="text-secondary-text">Matrix Initiative:</span>
				<span class="text-accent-cyan ml-1">{response} + {intuition}d6</span>
			</div>
			<div>
				<span class="text-secondary-text">Perception (Matrix):</span>
				<span class="text-accent-cyan ml-1">{intuition} + Software</span>
			</div>
			<div>
				<span class="text-secondary-text">Cybercombat Attack:</span>
				<span class="text-accent-cyan ml-1">Logic + Cybercombat</span>
			</div>
			<div>
				<span class="text-secondary-text">Hacking (on the fly):</span>
				<span class="text-accent-cyan ml-1">Logic + Hacking</span>
			</div>
		</div>
	</div>

	<!-- Notes -->
	<p class="text-muted-text text-xs mt-3">
		The Living Persona replaces a commlink for Matrix access.
		Resonance determines Signal strength and limits complex form rating.
	</p>
</div>
