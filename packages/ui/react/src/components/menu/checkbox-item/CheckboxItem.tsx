import type { ElementType, ReactElement } from 'react'
import {
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../../adapter'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { useSetupMenuCheckboxItem } from './setup.component'
import type { MenuCheckboxItemAttributes, MenuCheckboxItemProps } from './base.component'

/** Отметка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const CheckIcon = roleIcon('check')

/**
 * MenuCheckboxItem — флажок меню: строка пункта с отметкой в начале, как у
 * Vue.
 *
 * Корень несёт состояние для темы (`data-highlighted`, `data-disabled`,
 * `data-selected`) и модификаторы размера меню и своего варианта, а строка
 * красится от него: носитель `dataset` один. На строке — ARIA флажка (роль
 * `menuitemcheckbox`, `aria-checked` и `tabindex="-1"` от меню) и DOM-фокус,
 * когда флажок подсвечен. Атрибуты потребителя делятся, как у пункта: класс и
 * стиль — корню, остальное — строке.
 *
 * Нажатие — клик строки, из Enter и пробела его делает сама строка. Решает
 * меню (`adapters.menu.toggle()`): выключенному отказывает, а доступному
 * переключает отметку — выбор коллекции — и остаётся открытым. Клик
 * потребителя приходит после.
 *
 * Отметка — у неотмеченного флажка тоже: обёртка держит колонку, а её наличие
 * в списке тема читает как «у меню есть колонка отметок» — прямым ребёнком
 * строки, поэтому обёртки отметки и значка лежат в слоте `leading` строки
 * сами, без своей обёртки. Рисунок внутри — только у отмеченного, слот
 * `indicator-icon` (scope — `selected`) подменяет его. Обёртка скрыта от
 * скринридера: состояние объявляет `aria-checked`.
 */
export function MenuCheckboxItem(props: MenuCheckboxItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupMenuCheckboxItem(props)

	const { rendered, tag, text, size, disabled, selected, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const checked = selected ?? false
	const { onClick, ...row } = toControlAttrs<MenuCheckboxItemAttributes>(forwardProps)

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
					context?.adapters.menu.toggle()
					onClick?.(event)
				}}
				leading={
					<>
						<span className="so-menu-item__indicator" aria-hidden="true">
							{renderSlot(props['indicator-icon'], { selected: checked }) ??
								(checked ? (
									<Icon embedded="menu.indicator" tag={CheckIcon} size={size} />
								) : null)}
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
