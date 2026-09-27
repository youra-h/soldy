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
import { useSetupListBoxItem } from './setup.component'
import type { ListBoxItemAttributes, ListBoxItemProps } from './base.component'

/**
 * ListBoxItem — элемент списка: корень по `tag` (по умолчанию `div`) и строка
 * внутри — `Button`, как у Vue.
 *
 * Наборы ядра стоят на двух элементах. Корень несёт `dataset`, `attrs` и место
 * в коллекции (`order`): тема читает `data-content-fit` с него. Строка несёт
 * `aria` и тот же `dataset` — выбор и подсветку тема красит на `.s-button`.
 * Атрибуты потребителя делятся так же, как у Vue: класс и стиль — корню,
 * остальное — строке, поверх её наборов: `tabindex="-1"` элемента перекрывает
 * `tabindex="0"`, который кнопка на `div` ставит себе сама.
 *
 * Тег строки фиксирован (`div`), а не берётся из `tag` элемента: `tag` — тег
 * корня, под фиксированный тег строки написан `TListBoxItem._ariaTag`.
 *
 * Клик выбирает через `adapters.list.choose()`, а не `selection.toggle()`:
 * выключенному элементу отказывает список, тем же путём, что и клавиатура.
 * Клик потребителя приходит после выбора — как у Vue, где слушатели
 * складываются.
 *
 * Обёртка отметки рисуется, пока `indicator` не `none`, — и у невыбранных
 * тоже: она резервирует место. Иконка внутри — только у выбранного, слот
 * `indicator-icon` подменяет её. `aria-hidden`: состояние скринридеру
 * объявляет `aria-selected`, второй источник того же факта дал бы двойное
 * объявление.
 */
export function ListBoxItem(props: ListBoxItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupListBoxItem(props)

	const {
		rendered,
		tag,
		text,
		view,
		disabled,
		size,
		variant,
		selected,
		indicator,
		aria,
		dataset,
		attrs,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const chosen = selected ?? false
	const { onClick, ...row } = toControlAttrs<ListBoxItemAttributes>(forwardProps)

	const mark = (
		<span className="s-list-box-item__indicator" aria-hidden="true">
			{renderSlot(props['indicator-icon'], { selected: chosen }) ??
				(chosen ? (
					<Icon embedded="list-box.indicator" tag={roleIcon('check')} size={size} />
				) : null)}
		</span>
	)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<Button
				embedded="list-box.row"
				tag="div"
				view={view}
				disabled={disabled}
				size={size}
				variant={variant}
				{...toAriaProps(aria)}
				{...toAriaProps(dataset)}
				{...row}
				onClick={(event) => {
					context?.adapters.list.choose()
					onClick?.(event)
				}}
				leading={
					<>
						{indicator === 'start' ? mark : null}
						{renderSlot(props.leading)}
					</>
				}
				trailing={
					<>
						{renderSlot(props.trailing)}
						{indicator === 'end' ? mark : null}
					</>
				}
			>
				{renderSlot(props.children, { text: text ?? '', selected: chosen }) ?? text}
			</Button>
		</Tag>
	)
}
