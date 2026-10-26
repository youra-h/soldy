<script lang="ts">
	import type { Snippet } from 'svelte'
	import { enUS } from '@soldy-ui/plugins'
	import { LocaleProvider } from '@soldy-ui/svelte'

	const { children }: { children: Snippet } = $props()
</script>

<LocaleProvider locale={enUS}>{@render children()}</LocaleProvider>
