<script lang="ts">
	/**
	 * Страница гидратации: табы разметкой, активный первым — остановка Tab одна
	 * и у сервера.
	 *
	 * Движок снаружи (`engine`) — только у гидратации, как у `TabsActiveSecond`.
	 */
	import type { TTabsCollection } from '@soldy-ui/core'
	import { Tabs } from '@soldy-ui/svelte'

	type TPageProps = {
		/** Движок табов — только у гидратации. */
		engine?: TTabsCollection
	}

	const { engine }: TPageProps = $props()
</script>

<Tabs {engine}>
	<Tabs.Item value="a" text="A" active />
	<Tabs.Item value="b" text="B" />
</Tabs>
