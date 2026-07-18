<script lang="ts">
	import { books } from '$stores/gamedata';

	/** Book code (e.g. SR4, RC, AP) */
	export let code: string = '';

	/** Page number */
	export let page: number | string = '';

	/** Show only code by default or expanded name? */
	export let expanded: boolean = false;

	$: bookData = $books ? $books.find((b) => b.code === code) : null;
	$: bookName = bookData ? bookData.name : code;
</script>

{#if page}
	<span class="text-text-muted text-xs whitespace-nowrap" title={bookData ? bookName : undefined}>
		{#if expanded}
			{bookName} p.{page}
		{:else}
			{code} p.{page}
		{/if}
	</span>
{:else if code}
	<span class="text-text-muted text-xs whitespace-nowrap" title={bookData ? bookName : undefined}>
		{#if expanded}
			{bookName}
		{:else}
			{code}
		{/if}
	</span>
{/if}
