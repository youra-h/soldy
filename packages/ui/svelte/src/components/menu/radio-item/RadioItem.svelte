<script lang="ts">
	import type { MouseEventHandler } from 'svelte/elements'
	import { Dynamic, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { setupMenuRadioItem } from './setup.component'
	import type { MenuRadioItemAttributes, MenuRadioItemProps } from './base.component'

	let { ref = $bindable(), ...props }: MenuRadioItemProps = $props()
	const mountId = $props.id()

	const binding = setupMenuRadioItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	/**
	 * Атрибуты строки — всё от потребителя, кроме класса и стиля. Клик —
	 * сначала отметка через меню, потом клик потребителя.
	 */
	function rowAttributes() {
		const { onclick, ...row } = toControlAttrs<MenuRadioItemAttributes>(binding.forwardProps)
		const check: MouseEventHandler<HTMLElement> = (event) => {
			context?.adapters.menu.check()
			onclick?.(event)
		}

		return { ...row, onclick: check }
	}
</script>

<!--
	MenuRadioItem — переключатель меню: строка пункта с отметкой-точкой в
	начале, как у Vue.

	Корень несёт состояние для темы (`data-highlighted`, `data-disabled`,
	`data-selected`) и модификаторы размера меню и своего варианта, а строка
	красится от него. На строке — ARIA переключателя (роль `menuitemradio`,
	`aria-checked` и `tabindex="-1"` от меню) и DOM-фокус, когда переключатель
	подсвечен. Атрибуты потребителя делятся, как у флажка: класс и стиль —
	корню, остальное — строке.

	Нажатие — клик строки, из Enter и пробела его делает сама строка. Решает
	меню (`adapters.menu.check()`): выключенному отказывает, а доступный
	отмечает — с остальных переключателей группы отметка снимается — и
	остаётся открытым. Отмеченный нажатием не снимается.

	Отметка — у неотмеченного переключателя тоже: обёртка держит колонку
	отметок. Точка внутри — только у отмеченного, её рисует тема, без иконки;
	сниппет `indicator-icon` (scope — `selected`) подменяет её. Обёртка скрыта
	от скринридера: состояние объявляет `aria-checked`. Пробелов в обёртках
	нет: пустую тема прячет по `:empty`.
-->
{#snippet mark()}
	{#if props['indicator-icon']}
		{@render props['indicator-icon']({ selected: state.selected ?? false })}
	{:else if state.selected}
		<span class="so-menu-item__dot"></span>
	{/if}
{/snippet}

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
				<span class="so-menu-item__indicator" aria-hidden="true">{@render mark()}</span><span
					class="so-menu-item__icon">{@render props.leading?.()}</span
				>
			{/snippet}
			{#if props.children}
				{@render props.children({
					text: state.text ?? '',
					selected: state.selected ?? false,
				})}
			{:else}
				{state.text}
			{/if}
			{#snippet trailing()}
				<span class="so-menu-item__shortcut">{@render props.trailing?.()}</span>
			{/snippet}
		</Button>
	</Dynamic>
{/if}
