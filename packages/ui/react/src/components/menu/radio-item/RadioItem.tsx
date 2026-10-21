import type { ElementType, ReactElement } from 'react'
import {
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../../adapter'
import { Button } from '../../button'
import { useSetupMenuRadioItem } from './setup.component'
import type { MenuRadioItemAttributes, MenuRadioItemProps } from './base.component'

/**
 * MenuRadioItem — переключатель меню: строка пункта с отметкой-точкой в
 * начале, как у Vue.
 *
 * Корень несёт состояние для темы (`data-highlighted`, `data-disabled`,
 * `data-selected`) и модификаторы размера меню и своего варианта, а строка
 * красится от него. На строке — ARIA переключателя (роль `menuitemradio`,
 * `aria-checked` и `tabindex="-1"` от меню) и DOM-фокус, когда переключатель
 * подсвечен. Атрибуты потребителя делятся, как у флажка: класс и стиль —
 * корню, остальное — строке.
 *
 * Нажатие — клик строки, из Enter и пробела его делает сама строка. Решает
 * меню (`adapters.menu.check()`): выключенному отказывает, а доступный
 * отмечает — с остальных переключателей группы отметка снимается — и
 * остаётся открытым. Отмеченный нажатием не снимается. Клик потребителя
 * приходит после.
 *
 * Отметка — у неотмеченного переключателя тоже: обёртка держит колонку
 * отметок, прямым ребёнком строки, как у флажка. Точка внутри — только у
 * отмеченного, её рисует тема, без иконки; слот `indicator-icon` (scope —
 * `selected`) подменяет её. Обёртка скрыта от скринридера: состояние
 * объявляет `aria-checked`.
 */
export function MenuRadioItem(props: MenuRadioItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupMenuRadioItem(props)

	const { rendered, tag, text, size, disabled, selected, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const checked = selected ?? false
	const { onClick, ...row } = toControlAttrs<MenuRadioItemAttributes>(forwardProps)

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
					context?.adapters.menu.check()
					onClick?.(event)
				}}
				leading={
					<>
						<span className="so-menu-item__indicator" aria-hidden="true">
							{renderSlot(props['indicator-icon'], { selected: checked }) ??
								(checked ? <span className="so-menu-item__dot" /> : null)}
						</span>
						<span className="so-menu-item__icon">{renderSlot(props.leading)}</span>
					</>
				}
				trailing={
					<span className="so-menu-item__shortcut">{renderSlot(props.trailing)}</span>
				}
			>
				{renderSlot(props.children, { text: text ?? '', selected: checked }) ?? text}
			</Button>
		</Tag>
	)
}
