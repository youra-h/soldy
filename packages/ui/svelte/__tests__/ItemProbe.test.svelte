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
	 *   `body`;
	 * - `menu-item`, `menu-checkbox-item`, `menu-radio-item` (в группе
	 *   переключателей), `menu-submenu` и `menu-popover-item` — пункт меню
	 *   своего вида: он в панели меню, телепортированной в `body`.
	 */
	import { Accordion, Menu, RadioGroup, Select, Tabs, Tags } from '@soldy-ui/svelte'

	type THarnessProps = {
		kind:
			| 'tabs'
			| 'content'
			| 'accordion'
			| 'radio'
			| 'tags'
			| 'select'
			| 'menu-item'
			| 'menu-checkbox-item'
			| 'menu-radio-item'
			| 'menu-submenu'
			| 'menu-popover-item'
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
{:else if kind === 'menu-item'}
	<Menu>
		<Menu.Item value="a" text="A" {...part} />
	</Menu>
{:else if kind === 'menu-checkbox-item'}
	<Menu>
		<Menu.CheckboxItem value="a" text="A" {...part} />
	</Menu>
{:else if kind === 'menu-radio-item'}
	<Menu>
		<Menu.RadioGroup value="a">
			<Menu.RadioItem value="a" text="A" {...part} />
		</Menu.RadioGroup>
	</Menu>
{:else if kind === 'menu-submenu'}
	<Menu>
		<Menu.Submenu value="share" text="Поделиться" {...part} />
	</Menu>
{:else if kind === 'menu-popover-item'}
	<Menu>
		<Menu.PopoverItem value="due" text="Срок" {...part} />
	</Menu>
{:else}
	<RadioGroup>
		<RadioGroup.Item value="a" {...part} />
	</RadioGroup>
{/if}
