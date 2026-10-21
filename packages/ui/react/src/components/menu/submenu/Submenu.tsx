import type { ElementType, ReactElement } from 'react'
import type { IMenuItem, TGroupSection, TMenuSubmenuEntries } from '@soldy-ui/core'
import {
	Elevate,
	hasSlot,
	relaySlot,
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toPartClass,
	toRootForward,
	toRootProps,
} from '../../../adapter'
import { Button } from '../../button'
import { Frame } from '../../frame'
import { Icon } from '../../icon'
import { MenuGroup } from '../group'
import { MenuItem } from '../item'
import { MenuSeparator } from '../separator'
import { useSetupMenuSubmenu } from './setup.component'
import type { MenuSubmenuAttributes, MenuSubmenuProps } from './base.component'

/** Стрелка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const ArrowIcon = roleIcon('arrowRight')

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

/**
 * Пункт из данных: подменю, если коллекция завела ему движок (`submenus`),
 * иначе действие. Запись подменю у пункта устойчива — те же `ctrl` и
 * `engine`, — а подменю читает их при сборке. Ключ — `uid` пункта: пункт,
 * переехавший внутри секции, остаётся тем же узлом.
 *
 * Слоты пункта пробрасываются целиком: у каждого слота строки есть
 * `item-<слот>`, scope — scope слота строки плюс сам пункт (`item`). Со своим
 * scope строки слот пункт получает функцией (`relaySlot`), а не готовым
 * узлом: узел, нарисованный владельцем, scope строки терял бы. `default` у
 * действия — `item`, у подменю — `item-content`: пусто — подменю рисует свои
 * пункты из данных. Свои `item` и `item-*` владелец отдаёт подменю как есть —
 * слоты одни на все уровни.
 */
function drawItem(state: TItemsState, slots: TItemSlots, item: IMenuItem): ReactElement {
	const entry = state.submenus?.get(item)

	if (!entry) {
		return (
			<MenuItem
				key={item.uid}
				ctrl={item}
				leading={renderSlot(slots['item-leading'], { item })}
				trailing={renderSlot(slots['item-trailing'], { item })}
			>
				{relaySlot(slots.item, { item })}
			</MenuItem>
		)
	}

	return (
		<MenuSubmenu
			key={item.uid}
			ctrl={entry.ctrl}
			engine={entry.engine}
			leading={renderSlot(slots['item-leading'], { item })}
			header={relaySlot(slots['item-header'], { item })}
			arrow-icon={renderSlot(slots['item-arrow-icon'], { item })}
			item={slots.item}
			item-leading={slots['item-leading']}
			item-trailing={slots['item-trailing']}
			item-header={slots['item-header']}
			item-arrow-icon={slots['item-arrow-icon']}
			item-content={slots['item-content']}
		>
			{renderSlot(slots['item-content'], { item })}
		</MenuSubmenu>
	)
}

/**
 * Секция: разделитель перед ней, если она не первая и владелец их просит
 * (`separated`), а дальше группа с подписью или пункты без группы прямо в
 * списке. Ключи — разные у всех видов: у пункта — `uid` (число), у группы —
 * ключ секции, у разделителя — свой от ключа секции.
 */
function drawSection(
	state: TItemsState,
	slots: TItemSlots,
	section: TGroupSection<IMenuItem>,
	separated: boolean,
): ReactElement[] {
	const items = section.items.map((item) => drawItem(state, slots, item))
	const separator = separated ? [<MenuSeparator key={`separator:${section.key}`} />] : []

	if (!section.group) return [...separator, ...items]

	return [
		...separator,
		<MenuGroup key={section.key} label={section.group.label}>
			{items}
		</MenuGroup>,
	]
}

/**
 * Пункты из данных (`items`) — одна разметка на меню и подменю, и подменю
 * рисует ею свои уровни само: у Vue её четыре копии только из-за шаблонов.
 *
 * Пункты — по секциям показанных (`sections`): группа с подписью — в
 * `MenuGroup`, пункты без группы — прямо в списке, между соседними секциями,
 * пока его просит владелец (`groupSeparators`), — разделитель. Секции идут
 * порядком показанного, поэтому стрелки ходят так же, как пункты стоят на
 * экране; без групп секция одна — ни обёртки, ни разделителя. Секции — новые
 * записи на каждую смену, а узлы держат ключи: группа — по ключу секции,
 * пункт — по `uid`, — и смена подписи или новый пункт строк не пересоздают.
 */
export function drawItems(state: TItemsState, slots: TItemSlots): ReactElement[] {
	return (state.sections ?? []).flatMap((section, index) =>
		drawSection(state, slots, section, state.groupSeparators === true && index > 0),
	)
}

/**
 * MenuSubmenu — пункт с подменю: строка пункта в меню над ним и своя панель с
 * пунктами, как `Menu.Submenu` у Vue.
 *
 * Корень по `tag` несёт состояние для темы (`data-highlighted`,
 * `data-disabled`, `data-open`), `attrs` и модификаторы размера меню и своего
 * варианта, а строка красится от него, как у пункта: открытый пункт горит,
 * пока открыта его панель. Корень — якорь панели: его прямоугольник —
 * строка, значением рендера его отдаёт `useRootElement`. Атрибуты
 * потребителя делятся, как у пункта: класс и стиль — корню, остальное —
 * строке, поверх её `aria`.
 *
 * Строка — `Button` на `div` (`menu.row`): на ней ARIA пункта — роль
 * `menuitem`, `aria-haspopup="menu"`, `aria-expanded`, `id` и
 * `aria-controls` на панель, `tabindex="-1"` от меню — и DOM-фокус, когда
 * пункт подсвечен. Нажатие строки открывает подменю, а не переключает:
 * открытое наведением клик не закроет. Решает меню
 * (`adapters.menu.open()`): выключенному отказывает. Стрелку к концу строки,
 * Enter и пробел клавиатура пункта гасит сама и открывает подменю на первом
 * пункте — клика из них нет.
 *
 * Текст строки — слот `header` (scope — `text` и `open`), без него — текст
 * пункта; стрелка у конца строки — слот `arrow-icon` в обёртке, которая
 * держит её место, зеркалит её в RTL и скрыта от скринридера (подменю
 * объявляет `aria-haspopup`), без слота — иконка роли `arrowRight`. Значок —
 * слот `leading` в обёртке колонки: пустую тема прячет по `:empty`.
 *
 * Панель — Frame, как у меню: телепорт, слой выше панели меню над ним
 * (нажатие в ней меню мимо не считает), привязка к корню пункта и пометка
 * владельцем. Встаёт у конца строки, верхом вровень с ней, без зазора
 * (`end-start`); у края окна привязка переводит её к началу строки, в RTL —
 * наоборот. На неё ложится набор панели (`panelAria`): `role="menu"`, `id`,
 * на который ссылается `aria-controls` строки, и `aria-labelledby` на строку —
 * имя подменю. `tabIndex={-1}` — фокус встаёт на саму панель, пока ни один
 * пункт не подсвечен. Открытость — `visible` панели, а не `rendered`: пункты
 * входят в коллекцию подменю при монтировании, и закрытие не должно её
 * вычищать. Классы — свой набор (`panelClasses`): блок панели меню с
 * размером подменю и вариантом его панели — своим вариантом подменю, а без
 * него вариантом меню над ним; строкой его раскладывает адаптер
 * (`toPartClass`).
 *
 * Панель — в слое лифта подменю (`Elevate`): пункт, смонтированный в ней,
 * прочтёт движок и регистратор подменю и войдёт в его коллекцию, а не в
 * коллекцию меню над ним. Пункты — дети (`<Menu.Item>`), а без них — свои
 * пункты из данных (`drawItems`).
 *
 * Логики здесь нет — см. `useSetupMenuSubmenu`.
 */
export function MenuSubmenu(props: MenuSubmenuProps): ReactElement | null {
	const { ref, forwardProps, state, context, rootElement, layer } = useSetupMenuSubmenu(props)

	const {
		rendered,
		tag,
		text,
		size,
		disabled,
		open,
		aria,
		dataset,
		attrs,
		panelAria,
		panelClasses,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const { onClick, ...row } = toControlAttrs<MenuSubmenuAttributes>(forwardProps)

	// Корню — его наборы, класс и стиль потребителя; `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<Button
				embedded="menu.row"
				tag="div"
				size={size}
				disabled={disabled}
				{...toAriaProps(aria)}
				{...row}
				onClick={(event) => {
					context?.adapters.menu.open()
					onClick?.(event)
				}}
				leading={<span className="so-menu-item__icon">{renderSlot(props.leading)}</span>}
				trailing={
					<span className="so-menu-item__arrow" aria-hidden="true">
						{renderSlot(props['arrow-icon']) ?? (
							<Icon embedded="menu.arrow" tag={ArrowIcon} size={size} />
						)}
					</span>
				}
			>
				{renderSlot(props.header, { text: text ?? '', open: open ?? false }) ?? text}
			</Button>
			<Elevate layer={layer}>
				<Frame
					embedded="menu.submenu-frame"
					className={toPartClass(panelClasses)}
					tabIndex={-1}
					visible={open}
					position="fixed"
					anchor_anchor={rootElement}
					anchor_placement="end-start"
					{...toAriaProps(panelAria)}
					{...toAriaProps(dismiss_ownerAttribute)}
				>
					<div className="so-menu__list">
						{hasSlot(props.children)
							? renderSlot(props.children)
							: drawItems(state, props)}
					</div>
				</Frame>
			</Elevate>
		</Tag>
	)
}
