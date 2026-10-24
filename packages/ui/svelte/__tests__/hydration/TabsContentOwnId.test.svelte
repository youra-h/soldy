<script lang="ts">
	/**
	 * Страница гидратации: табы разметкой и панель со своим `id`. Таб отдан
	 * раньше, чем инициализировалась панель, и у сервера ведёт на формулу, а
	 * ссылку на `id` панели получает с гидратацией.
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

{#snippet content()}
	<Tabs.Content value="a" id="general">Панель A</Tabs.Content>
{/snippet}

<Tabs {engine} {content}>
	<Tabs.Item value="a" text="A" active />
	<Tabs.Item value="b" text="B" />
</Tabs>
