<script lang="ts">
	import { Dynamic, toRootProps } from '../../../adapter'
	import { setupMenuRadioGroup } from './setup.component'
	import type { MenuRadioGroupProps } from './base.component'

	let { ref = $bindable(), ...props }: MenuRadioGroupProps = $props()
	const mountId = $props.id()

	const binding = setupMenuRadioGroup(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	MenuRadioGroup — переключатели меню под общей подписью, как
	`Menu.RadioGroup` у Vue. Разметка — как у группы меню (`MenuGroup`):
	`role="group"` и `aria-labelledby` на подпись — имя группы. Роли
	`radiogroup` нет: в меню группа переключателей — `group` (APG).
	Переключатели входят в коллекцию меню сквозь группу: навигация ходит по
	ним, как по одному списку.

	Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
	группы тоже нет. `id` подписи — в её наборе (`labelAria`).

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
		{#if state.label}<div class="so-menu-group__label" {...state.labelAria}>
				{state.label}
			</div>{/if}{@render props.children?.()}
	</Dynamic>
{/if}
