<script lang="ts">
	import type { Component } from 'svelte'
	import type { TLocale } from '@soldy-ui/plugins'
	import { LocaleProvider } from '@soldy-ui/svelte'

	type TPageProps = {
		locale: TLocale
		/** The previews of the page with their props. */
		previews: readonly { preview: Component<Record<string, unknown>>; props: Record<string, unknown> }[]
	}

	const { locale, previews }: TPageProps = $props()
</script>

<!-- The Svelte page: the previews of the stand's Svelte host under the provider -->
<LocaleProvider {locale}>
	{#each previews as { preview: Preview, props }, index (index)}
		<Preview {...props} />
	{/each}
</LocaleProvider>
