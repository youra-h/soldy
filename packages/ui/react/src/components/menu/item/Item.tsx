import type { ElementType, ReactElement } from 'react'
import {
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../../adapter'
import { Button } from '../../button'
import { useSetupMenuItem } from './setup.component'
import type { MenuItemAttributes, MenuItemProps } from './base.component'

/**
 * MenuItem — пункт-действие: корень по `tag` (по умолчанию `div`) и строка
 * внутри — `Button` на `div`, как у Vue. Строку флажок и переключатель рисуют
 * свою: у них отметка в начале строки и другое нажатие.
 *
 * Корень несёт состояние для темы (`dataset`: `data-highlighted`,
 * `data-disabled`), `attrs` и модификаторы размера меню и своего варианта, а
 * строка красится от него: носитель `dataset` один. На строке — ARIA пункта
 * (роль `menuitem`, `tabindex="-1"` от меню) и DOM-фокус, когда пункт
 * подсвечен. Размер и `disabled` — пункта; вида и варианта строка не
 * получает: вид ей даёт тема по контексту, а цвет она берёт с пункта и панели.
 * Атрибуты потребителя делятся, как у Vue: класс и стиль — корню, остальное —
 * строке, поверх её `aria`.
 *
 * Нажатие — клик строки: Enter и пробел на ней превращает в клик сама строка
 * (`TActionPlugin`), и путь у мыши и клавиатуры один. Решает меню
 * (`adapters.menu.choose()`): выключенному пункту оно отказывает, а доступный
 * выполняет и закрывается. Клик потребителя приходит после — как у Vue, где
 * слушатели складываются.
 *
 * Значок — слот `leading` в обёртке колонки, подсказка сочетания клавиш —
 * `trailing` в обёртке у конца строки. Обёртки есть у каждого пункта, а
 * пустой слот ничего в них не кладёт: пустую тема прячет по `:empty`.
 */
export function MenuItem(props: MenuItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupMenuItem(props)

	const { rendered, tag, text, size, disabled, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const { onClick, ...row } = toControlAttrs<MenuItemAttributes>(forwardProps)

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
					context?.adapters.menu.choose()
					onClick?.(event)
				}}
				leading={<span className="so-menu-item__icon">{renderSlot(props.leading)}</span>}
				trailing={
					<span className="so-menu-item__shortcut">{renderSlot(props.trailing)}</span>
				}
			>
				{renderSlot(props.children, { text: text ?? '' }) ?? text}
			</Button>
		</Tag>
	)
}
