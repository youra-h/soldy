<script lang="ts">
	/**
	 * Тестовая обёртка: часть коллекции внутри своего владельца — без него у
	 * части нет того, что пишет ей коллекция (`id` строки, связка панели).
	 * Пропсы части — все, кроме `kind`: атрибуты, колбэки и attachment-ы
	 * потребителя.
	 *
	 * - `tabs` — таб в наборе;
	 * - `content` — панель активного таба, в слоте `content` набора;
	 * - `accordion` — секция в аккордеоне;
	 * - `radio` — радио в группе;
	 * - `tags` — тег в наборе;
	 * - `select` — опция в Select: она в его панели, телепортированной в
	 *   `body`.
	 */
	import { Accordion, RadioGroup, Select, Tabs, Tags } from '@soldy-ui/svelte'

	type THarnessProps = {
		kind: 'tabs' | 'content' | 'accordion' | 'radio' | 'tags' | 'select'
		[key: string]: unknown
		[key: symbol]: unknown
	}

	const { kind, ...part }: THarnessProps = $props()
</script>

{#snippet panel()}
	<Tabs.Content value="a" {...part} />
{/snippet}

{#if kind === 'tabs'}
	<Tabs>
		<Tabs.Item value="a" text="A" active {...part} />
	</Tabs>
{:else if kind === 'content'}
	<Tabs content={panel}>
		<Tabs.Item value="a" text="A" active />
	</Tabs>
{:else if kind === 'accordion'}
	<Accordion>
		<Accordion.Item value="a" text="A" {...part} />
	</Accordion>
{:else if kind === 'tags'}
	<Tags>
		<Tags.Item value="a" text="A" {...part} />
	</Tags>
{:else if kind === 'select'}
	<Select>
		<Select.Item value="a" text="A" {...part} />
	</Select>
{:else}
	<RadioGroup>
		<RadioGroup.Item value="a" {...part} />
	</RadioGroup>
{/if}
