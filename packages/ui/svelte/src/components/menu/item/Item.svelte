<script lang="ts">
	import type { MouseEventHandler } from 'svelte/elements'
	import { Dynamic, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { setupMenuItem } from './setup.component'
	import type { MenuItemAttributes, MenuItemProps } from './base.component'

	let { ref = $bindable(), ...props }: MenuItemProps = $props()
	const mountId = $props.id()

	const binding = setupMenuItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	/**
	 * Атрибуты строки — всё от потребителя, кроме класса и стиля. Клик —
	 * сначала нажатие пункта через меню, потом клик потребителя: слушатели
	 * складываются, как у Vue.
	 */
	function rowAttributes() {
		const { onclick, ...row } = toControlAttrs<MenuItemAttributes>(binding.forwardProps)
		const choose: MouseEventHandler<HTMLElement> = (event) => {
			context?.adapters.menu.choose()
			onclick?.(event)
		}

		return { ...row, onclick: choose }
	}
</script>

<!--
	MenuItem — пункт-действие: корень по `tag` (по умолчанию `div`) и строка
	внутри — `Button` на `div`, как у Vue. Строку флажок и переключатель рисуют
	свою: у них отметка в начале строки и другое нажатие.

	Корень несёт состояние для темы (`dataset`: `data-highlighted`,
	`data-disabled`), `attrs` и модификаторы размера меню и своего варианта, а
	строка красится от него: носитель `dataset` один. На строке — ARIA пункта
	(роль `menuitem`, `tabindex="-1"` от меню) и DOM-фокус, когда пункт
	подсвечен. Размер и `disabled` — пункта; вида и варианта строка не
	получает: вид ей даёт тема по контексту, а цвет она берёт с пункта и
	панели. Атрибуты потребителя делятся, как у Vue: класс и стиль — корню,
	остальное — строке, поверх её `aria`.

	Нажатие — клик строки: Enter и пробел на ней превращает в клик сама строка
	(`TActionPlugin`), и путь у мыши и клавиатуры один. Решает меню
	(`adapters.menu.choose()`): выключенному пункту оно отказывает, а доступный
	выполняет и закрывается.

	Значок — сниппет `leading` в обёртке колонки, подсказка сочетания клавиш —
	`trailing` в обёртке у конца строки. Обёртки есть у каждого пункта, и
	пробелов в них нет: пустую тема прячет по `:empty`.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.dataset, state.attrs],
			toRootForward(binding.forwardProps),
		)}
		attach={binding.attachElement}
	>
		<Button
			embedded="menu.row"
			tag="div"
			size={state.size}
			disabled={state.disabled}
			{...state.aria}
			{...rowAttributes()}
		>
			{#snippet leading()}
				<span class="so-menu-item__icon">{@render props.leading?.()}</span>
			{/snippet}
			{#if props.children}
				{@render props.children({ text: state.text ?? '' })}
			{:else}
				{state.text}
			{/if}
			{#snippet trailing()}
				<span class="so-menu-item__shortcut">{@render props.trailing?.()}</span>
			{/snippet}
		</Button>
	</Dynamic>
{/if}
