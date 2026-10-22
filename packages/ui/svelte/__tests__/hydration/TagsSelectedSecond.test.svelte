<script lang="ts">
	/**
	 * Страница гидратации: теги разметкой с выбором, выбран второй. У сервера
	 * остановок Tab две, как у табов с активным вторым (`TabsActiveSecond`).
	 *
	 * Движок снаружи (`engine`) — только у гидратации, как у `TabsActiveSecond`.
	 */
	import type { TTagsCollection } from '@soldy-ui/core'
	import { Tags } from '@soldy-ui/svelte'

	type TPageProps = {
		/** Движок тегов — только у гидратации. */
		engine?: TTagsCollection
	}

	const { engine }: TPageProps = $props()
</script>

<Tags mode="single" {engine}>
	<Tags.Item value="a" text="A" />
	<Tags.Item value="b" text="B" selected />
</Tags>
