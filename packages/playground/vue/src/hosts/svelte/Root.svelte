<script lang="ts">
	import { LocaleProvider } from '@soldy-ui/svelte'
	import { language, type TLive } from './live.svelte'
	import type { TPreview, TPreviewProps } from './previews'
	import { setParts, type TParts } from './events'

	type TRootProps = {
		/** What to draw: the component's preview or a scenario fixture. */
		preview: TPreview
		/** The preview props with the event callbacks — the host's `update` sets them. */
		bind: TLive<TPreviewProps>
		/** Listeners of the preview's parts: the previews take them from the context. */
		parts: TParts
		/** How many copies of the preview stand side by side (`TPreviewMount.count`). */
		count: number
	}

	const { preview: Preview, bind, parts, count }: TRootProps = $props()

	// A mount's parts do not change: the context takes them once
	// svelte-ignore state_referenced_locally
	setParts(parts)
</script>

<!--
	The Svelte host's root: its own `LocaleProvider` around the preview. The
	shell's provider context does not reach another root, so the host gives the
	root the header's language, and a change reaches the provider without a
	remount. The copies of the preview stand side by side, and the root never
	changes their number.
-->
<LocaleProvider locale={language.current}>
	{#each { length: count }, index (index)}
		<Preview {...bind.current} />
	{/each}
</LocaleProvider>
