<script lang="ts">
	import type { MouseEventHandler } from 'svelte/elements'
	import { Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Frame } from '../../frame'
	import { Icon } from '../../icon'
	import { setupMenuPopoverItem } from './setup.component'
	import type { MenuPopoverItemAttributes, MenuPopoverItemProps } from './base.component'

	let { ref = $bindable(), ...props }: MenuPopoverItemProps = $props()
	const mountId = $props.id()

	const binding = setupMenuPopoverItem(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	// Стрелка без слота — иконка из пакета по роли: метка одна на роль
	const ARROW = roleIcon('arrowRight')

	/**
	 * Атрибуты строки — всё от потребителя, кроме класса и стиля. Клик —
	 * сначала открытие панели через меню, потом клик потребителя.
	 */
	function rowAttributes() {
		const { onclick, ...row } = toControlAttrs<MenuPopoverItemAttributes>(
			binding.forwardProps,
		)
		const open: MouseEventHandler<HTMLElement> = (event) => {
			context?.adapters.menu.open()
			onclick?.(event)
		}

		return { ...row, onclick: open }
	}
</script>

<!--
	MenuPopoverItem — пункт с панелью: строка пункта в меню и своя панель сбоку
	с любым содержимым — календарём, полями, палитрой, как `Menu.PopoverItem`
	у Vue.

	Корень — блок пункта, общий с действием и флажком: на нём модификаторы
	размера меню и своего варианта и состояние для темы — `data-highlighted`,
	`data-disabled` и `data-open` (панель открыта). Строка красится от него,
	носитель `dataset` один. Панель телепортирована, поэтому прямоугольник
	корня — прямоугольник строки, и корень служит панели якорем. Атрибуты
	потребителя делятся, как у пункта: класс и стиль — корню, остальное —
	строке.

	Строка — `Button` на `div` (`menu.row`): на ней ARIA пункта — роль
	`menuitem`, `aria-haspopup="dialog"`, `aria-expanded`, `id` и
	`aria-controls` на панель, `tabindex="-1"` от меню — и DOM-фокус, когда
	пункт подсвечен. Нажатие строки открывает панель, а не выполняет действие:
	меню остаётся открытым, а открытую панель повторное нажатие не закрывает.
	Решает меню (`adapters.menu.open()`): выключенному отказывает. Enter и
	пробел на строке превращает в клик сама строка (`TActionPlugin`), стрелку к
	концу строки клавиатура пункта гасит и открывает панель сама.

	Текст строки — сниппет `header`, а не `children`: `children` — содержимое
	панели, как у `Accordion.Item` и `Popover`. Scope — `text` и `open`, без
	сниппета — текст пункта. Стрелка — у конца строки, в обёртке: тема
	зеркалит её в RTL по `.so-menu-item__arrow`, и иконка, подменённая
	сниппетом `arrow-icon`, зеркалится так же; обёртка скрыта от скринридера —
	о панели говорит ARIA строки. Подсказки сочетания у этого пункта нет.

	Панель — Frame: телепорт в `body`, соседка панели меню, а не её потомок,
	слой поверх неё (нажатие и фокус в ней меню мимо не считает), привязка к
	корню пункта и пометка владельцем. Встаёт у самого конца строки, верхом
	вровень с ней, без зазора (`end-start`). На неё ложится её набор ARIA
	(`panelAria`): `role="dialog"`, `id` и `aria-labelledby` на строку — имя
	панели. Модификаторов размера и варианта у неё нет: содержимое красится
	само. Открытость — `visible` панели, а не `rendered`; `lazyMount` действует
	только на содержимое — обёртка остаётся, панель не размонтируется никогда.

	Части стоят вплотную: пробел между блоками Svelte оставил бы в корне
	текстом.
-->
{#snippet arrowIcon()}
	{#if props['arrow-icon']}
		{@render props['arrow-icon']()}
	{:else}
		<Icon embedded="menu.arrow" tag={ARROW} size={state.size} />
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
				<span class="so-menu-item__icon">{@render props.leading?.()}</span>
			{/snippet}
			{#if props.header}
				{@render props.header({ text: state.text ?? '', open: state.open ?? false })}
			{:else}
				{state.text}
			{/if}
			{#snippet trailing()}
				<span class="so-menu-item__arrow" aria-hidden="true">{@render arrowIcon()}</span>
			{/snippet}
		</Button><Frame
			embedded="menu.popover-item-frame"
			class="so-menu-item__panel"
			tabindex={-1}
			visible={state.open}
			position="fixed"
			anchor_anchor={binding.rootElement}
			anchor_placement="end-start"
			{...state.panelAria}
			{...state.dismiss_ownerAttribute}
		>
			<div class="so-menu-item__content">
				{#if state.contentRendered}{@render props.children?.()}{/if}
			</div>
		</Frame>
	</Dynamic>
{/if}
