<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
	import { setupSelectGroup } from './setup.component'
	import type { SelectGroupProps } from './base.component'

	let { ref = $bindable(), ...props }: SelectGroupProps = $props()
	const mountId = $props.id()

	const binding = setupSelectGroup(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	SelectGroup — опции списка панели под общей подписью, как `Select.Group` у
	Vue. Корень по `tag` несёт три набора ядра: `role="group"` и
	`aria-labelledby` на подпись — имя группы. Опции входят в коллекцию Select
	сквозь группу: подсветка стрелками ходит по ним, как по одному списку.

	Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
	группы тоже нет. Набор подписи (`labelAria`) — её `id` и роль
	`presentation`: список панели — `listbox`, а в нём ARIA пускает только
	опции и группы.

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
		{#if state.label}<div class="so-select-group__label" {...state.labelAria}>
				{state.label}
			</div>{/if}{@render props.children?.()}
	</Dynamic>
{/if}
