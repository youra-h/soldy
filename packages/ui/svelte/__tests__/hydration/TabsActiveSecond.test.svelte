<script lang="ts">
	/**
	 * Страница гидратации: табы разметкой, активный вторым. Таб выше активного
	 * сервер рисует с остановкой Tab, которую тот держал как первый доступный, —
	 * у сервера остановок две (`docs/agents/collections.md`, «Цена»).
	 *
	 * Движок снаружи (`engine`) — только у гидратации: по нему тест меняет
	 * коллекцию после гидратации. Сервер рисует страницу без него, и разметка
	 * от этого не меняется — движок пуст, и табы разметки входят в него в том
	 * же порядке.
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
	<Tabs.Item value="a" text="A" />
	<Tabs.Item value="b" text="B" active />
</Tabs>
