<script lang="ts" module>
	import type { IMenuItem, TGroupSection, TMenuSubmenuEntries } from '@soldy-ui/core'
	import { MenuGroup } from '../group'
	import { MenuItem } from '../item'
	import { MenuSeparator } from '../separator'
	import MenuSubmenu from './Submenu.svelte'
	import type { MenuSubmenuProps } from './base.component'

	/** Что пунктам из данных нужно от состояния владельца — меню или подменю. */
	type TItemsState = {
		/** Секции показанных пунктов: группа с подписью или пункты без группы. */
		readonly sections?: ReadonlyArray<TGroupSection<IMenuItem>>
		/** Подменю из данных по пункту — пункт и движок его пунктов. */
		readonly submenus?: TMenuSubmenuEntries
		/** Рисовать ли разделитель между соседними секциями. */
		readonly groupSeparators?: boolean
	}

	/**
	 * Слоты пунктов из данных — одни у меню и подменю: свои `item` и `item-*`
	 * владелец отдаёт подменю из данных под теми же именами.
	 */
	type TItemSlots = Pick<
		MenuSubmenuProps,
		'item' | 'item-leading' | 'item-trailing' | 'item-header' | 'item-arrow-icon' | 'item-content'
	>

	export { drawItems }
</script>

<script lang="ts">
	import type { MouseEventHandler } from 'svelte/elements'
	import { Dynamic, roleIcon, toControlAttrs, toRootForward, toRootProps } from '../../../adapter'
	import { Button } from '../../button'
	import { Frame } from '../../frame'
	import { Icon } from '../../icon'
	import { setupMenuSubmenu } from './setup.component'
	import type { MenuSubmenuAttributes } from './base.component'

	let { ref = $bindable(), ...props }: MenuSubmenuProps = $props()
	const mountId = $props.id()

	const binding = setupMenuSubmenu(() => props, mountId, (node) => (ref = node))
	const state = binding.state
	const context = binding.context

	// Стрелка без слота — иконка из пакета по роли: метка одна на роль
	const ARROW = roleIcon('arrowRight')

	/**
	 * Атрибуты строки — всё от потребителя, кроме класса и стиля. Клик —
	 * сначала открытие подменю через меню, потом клик потребителя.
	 */
	function rowAttributes() {
		const { onclick, ...row } = toControlAttrs<MenuSubmenuAttributes>(binding.forwardProps)
		const open: MouseEventHandler<HTMLElement> = (event) => {
			context?.adapters.menu.open()
			onclick?.(event)
		}

		return { ...row, onclick: open }
	}
</script>

<!--
	Пункты из данных (`items`) — одна разметка на меню и подменю: сниппет
	модуля, его зовёт и разметка меню (`Menu.svelte`), и подменю для своих
	уровней. Экспортированный сниппет инстансного `<script>` не видит, поэтому
	части меню и само подменю — импорты модуля.

	Пункты — по секциям показанных (`sections`), ключ — ключ секции: группа с
	подписью — в `MenuGroup`, пункты без группы — прямо в списке, между
	соседними секциями, пока его просит владелец (`groupSeparators`), —
	разделитель. Секции идут порядком показанного, поэтому стрелки ходят так
	же, как пункты стоят на экране; без групп секция одна — ни обёртки, ни
	разделителя. Секции — новые записи на каждую смену, а узел живого ключа
	`{#each}` оставляет на месте и отдаёт ему новую запись: смена подписи и
	новый пункт не пересоздают строк. Пункты секции — по `uid`.

	Пункт с вложенным `items` — подменю из данных: коллекция отдаёт его запись
	(`submenus`), и она ложится в пропсы `MenuSubmenu` спредом, как `v-bind` у
	Vue, — пункт (`ctrl`) и движок его пунктов (`engine`). Запись у пункта
	устойчива, а снимок `submenus` — новый на каждую смену: ветка подменю
	держится, пока запись есть, и подменю то же. Подменю, снятое вместе с
	пунктом, Svelte читает и при снятии: строка, отпуская узел, сообщает
	событие, связка ищет его колбэк среди пропсов строки, а атрибуты строки —
	из пропсов подменю. Записи к этому времени уже нет: спред ушедшей записи
	пуст, а `entry.ctrl` бросил бы ошибку. Остальные пункты — действия.

	Слоты пункта пробрасываются целиком: у каждого слота строки есть
	`item-<слот>`, scope — scope слота строки плюс сам пункт (`item`). Проброс
	— сниппет рядом с пунктом, и отдаётся он пункту, только когда слот задан
	владельцу: сниппет непрозрачен, и без `item` пункт рисует свой текст.
	`default` у действия — `item`, у подменю — `item-content`. Свои `item` и
	`item-*` владелец отдаёт подменю как есть — слоты одни на все уровни.
-->
{#snippet drawItems(state: TItemsState, slots: TItemSlots)}
	{#each state.sections ?? [] as section, index (section.key)}
		{#if state.groupSeparators && index > 0}<MenuSeparator />{/if}{#if section.group}
			<MenuGroup label={section.group.label}
				>{@render drawSection(section, state, slots)}</MenuGroup
			>
		{:else}
			{@render drawSection(section, state, slots)}
		{/if}
	{/each}
{/snippet}

{#snippet drawSection(section: TGroupSection<IMenuItem>, state: TItemsState, slots: TItemSlots)}
	{#each section.items as item (item.uid)}
		{@render drawItem(item, state, slots)}
	{/each}
{/snippet}

{#snippet drawItem(item: IMenuItem, state: TItemsState, slots: TItemSlots)}
	{@const entry = state.submenus?.get(item)}
	{#snippet leading()}
		{@render slots['item-leading']?.({ item })}
	{/snippet}
	{#snippet content(scope: { text: string })}
		{@render slots.item?.({ ...scope, item })}
	{/snippet}
	{#snippet trailing()}
		{@render slots['item-trailing']?.({ item })}
	{/snippet}
	{#snippet header(scope: { text: string; open: boolean })}
		{@render slots['item-header']?.({ ...scope, item })}
	{/snippet}
	{#snippet arrow()}
		{@render slots['item-arrow-icon']?.({ item })}
	{/snippet}
	{#snippet panel()}
		{@render slots['item-content']?.({ item })}
	{/snippet}
	{#if entry}
		<MenuSubmenu
			{...entry}
			leading={slots['item-leading'] ? leading : undefined}
			header={slots['item-header'] ? header : undefined}
			arrow-icon={slots['item-arrow-icon'] ? arrow : undefined}
			children={slots['item-content'] ? panel : undefined}
			item={slots.item}
			item-leading={slots['item-leading']}
			item-trailing={slots['item-trailing']}
			item-header={slots['item-header']}
			item-arrow-icon={slots['item-arrow-icon']}
			item-content={slots['item-content']}
		/>
	{:else}
		<MenuItem
			ctrl={item}
			leading={slots['item-leading'] ? leading : undefined}
			trailing={slots['item-trailing'] ? trailing : undefined}
			children={slots.item ? content : undefined}
		/>
	{/if}
{/snippet}

<!--
	MenuSubmenu — пункт с подменю: строка пункта в меню над ним и своя панель с
	пунктами, как `Menu.Submenu` у Vue.

	Корень по `tag` несёт состояние для темы (`data-highlighted`,
	`data-disabled`, `data-open`), `attrs` и модификаторы размера меню и своего
	варианта, а строка красится от него, как у пункта: открытый пункт горит,
	пока открыта его панель. Корень — якорь панели: его прямоугольник —
	строка. Атрибуты потребителя делятся, как у пункта: класс и стиль — корню,
	остальное — строке, поверх её `aria`.

	Строка — `Button` на `div` (`menu.row`): на ней ARIA пункта — роль
	`menuitem`, `aria-haspopup="menu"`, `aria-expanded`, `id` и
	`aria-controls` на панель, `tabindex="-1"` от меню — и DOM-фокус, когда
	пункт подсвечен. Нажатие строки открывает подменю, а не переключает:
	открытое наведением клик не закроет. Решает меню (`adapters.menu.open()`):
	выключенному отказывает. Стрелку к концу строки, Enter и пробел клавиатура
	пункта гасит сама и открывает подменю на первом пункте — клика из них нет.

	Текст строки — сниппет `header` (scope — `text` и `open`), без него — текст
	пункта; стрелка у конца строки — сниппет `arrow-icon` в обёртке, которая
	держит её место, зеркалит её в RTL и скрыта от скринридера (подменю
	объявляет `aria-haspopup`), без сниппета — иконка роли `arrowRight`.
	Значок — сниппет `leading` в обёртке колонки, без пробелов: пустую тема
	прячет по `:empty`.

	Панель — Frame, как у меню: телепорт, слой выше панели меню над ним
	(нажатие в ней меню мимо не считает), привязка к корню пункта и пометка
	владельцем. Встаёт у конца строки, верхом вровень с ней, без зазора
	(`end-start`); у края окна привязка переводит её к началу строки, в RTL —
	наоборот. На неё ложится набор панели (`panelAria`): `role="menu"`, `id`,
	на который ссылается `aria-controls` строки, и `aria-labelledby` на строку
	— имя подменю. `tabindex="-1"` — фокус встаёт на саму панель, пока ни один
	пункт не подсвечен. Открытость — `visible` панели, а не `rendered`: пункты
	входят в коллекцию подменю при монтировании, и закрытие не должно её
	вычищать. Классы — свой набор (`panelClasses`): блок панели меню с размером
	подменю и вариантом его панели — своим вариантом подменю, а без него
	вариантом меню над ним.

	Пункты — содержимое (`<Menu.Item>`), а без него — свои пункты из данных
	(`drawItems`). Пункты разметкой в панели читают лифт подменю, а не меню
	над ним: панель монтирует `Teleport` с контекстами места, а место — внутри
	подменю, после его `setContext`.

	Части стоят вплотную: пробел между блоками Svelte оставил бы в корне и в
	списке текстом.
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
			embedded="menu.submenu-frame"
			class={state.panelClasses}
			tabindex={-1}
			visible={state.open}
			position="fixed"
			anchor_anchor={binding.rootElement}
			anchor_placement="end-start"
			{...state.panelAria}
			{...state.dismiss_ownerAttribute}
		>
			<div class="so-menu__list">
				{#if props.children}
					{@render props.children()}
				{:else}
					{@render drawItems(state, props)}
				{/if}
			</div>
		</Frame>
	</Dynamic>
{/if}
