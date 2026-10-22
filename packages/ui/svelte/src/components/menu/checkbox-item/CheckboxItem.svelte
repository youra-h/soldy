<script lang="ts">
	import type { MouseEventHandler } from 'svelte/elements'
	import { Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Icon } from '../../icon'
	import { setupMenuCheckboxItem } from './setup.component'
	import type { MenuCheckboxItemAttributes, MenuCheckboxItemProps } from './base.component'

	let { ref = $bindable(), ...props }: MenuCheckboxItemProps = $props()
	const mountId = $props.id()

	const binding = setupMenuCheckboxItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	// Отметка без слота — иконка из пакета по роли: метка одна на роль
	const CHECK = roleIcon('check')

	/**
	 * Атрибуты строки — всё от потребителя, кроме класса и стиля. Клик —
	 * сначала отметка через меню, потом клик потребителя.
	 */
	function rowAttributes() {
		const { onclick, ...row } = toControlAttrs<MenuCheckboxItemAttributes>(
			binding.forwardProps,
		)
		const toggle: MouseEventHandler<HTMLElement> = (event) => {
			context?.adapters.menu.toggle()
			onclick?.(event)
		}

		return { ...row, onclick: toggle }
	}
</script>

<!--
	MenuCheckboxItem — флажок меню: строка пункта с отметкой в начале, как у
	Vue.

	Корень несёт состояние для темы (`data-highlighted`, `data-disabled`,
	`data-selected`) и модификаторы размера меню и своего варианта, а строка
	красится от него: носитель `dataset` один. На строке — ARIA флажка (роль
	`menuitemcheckbox`, `aria-checked` и `tabindex="-1"` от меню) и DOM-фокус,
	когда флажок подсвечен. Атрибуты потребителя делятся, как у пункта: класс
	и стиль — корню, остальное — строке.

	Нажатие — клик строки, из Enter и пробела его делает сама строка. Решает
	меню (`adapters.menu.toggle()`): выключенному отказывает, а доступному
	переключает отметку — выбор коллекции — и остаётся открытым.

	Отметка — у неотмеченного флажка тоже: обёртка держит колонку, а её
	наличие в списке тема читает как «у меню есть колонка отметок». Рисунок
	внутри — только у отмеченного, сниппет `indicator-icon` (scope —
	`selected`) подменяет его. Обёртка скрыта от скринридера: состояние
	объявляет `aria-checked`. Пробелов в обёртках нет: пустую тема прячет по
	`:empty`.
-->
{#snippet mark()}
	{#if props['indicator-icon']}
		{@render props['indicator-icon']({ selected: state.selected ?? false })}
	{:else if state.selected}
		<Icon embedded="menu.indicator" tag={CHECK} size={state.size} />
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
