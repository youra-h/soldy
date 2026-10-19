<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
	import { setupListBoxGroup } from './setup.component'
	import type { ListBoxGroupProps } from './base.component'

	let { ref = $bindable(), ...props }: ListBoxGroupProps = $props()
	const mountId = $props.id()

	const binding = setupListBoxGroup(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	ListBoxGroup — элементы списка под общей подписью, как `ListBox.Group` у
	Vue. Корень по `tag` несёт три набора ядра: `role="group"` и
	`aria-labelledby` на подпись — имя группы. Элементы входят в коллекцию
	списка сквозь группу: навигация ходит по ним, как по одному списку.

	Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
	группы тоже нет. Набор подписи (`labelAria`) — её `id` и роль
	`presentation`: в `listbox` ARIA пускает только опции и группы.

	Части стоят вплотную: пробел между блоками Svelte оставил бы в группе
	текстом.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
		)}
		attach={binding.attachElement}
	>
		{#if state.label}<div class="so-list-box-group__label" {...state.labelAria}>
				{state.label}
			</div>{/if}{@render props.children?.()}
	</Dynamic>
{/if}
