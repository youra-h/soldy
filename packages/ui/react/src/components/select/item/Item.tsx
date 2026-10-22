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
import { useSetupSelectItem } from './setup.component'
import type { SelectItemAttributes, SelectItemProps } from './base.component'

/** Отметка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const CheckIcon = roleIcon('check')

/**
 * SelectItem — опция списка панели: корень по `tag` (по умолчанию `div`) и
 * строка внутри — `Button` на `span`, как у Vue.
 *
 * Наборы ядра стоят на двух элементах. Корень несёт `dataset`, `attrs` и место
 * в коллекции (`order`): опции стоят флексом по месту в составе. Строка несёт
 * `aria` — вся ARIA опции на элементе, который и есть опция: `role="option"`
 * от ядра, `id` и `aria-selected` от коллекции, — и тот же `dataset`: фон при
 * подсветке и выборе тема рисует на самой кнопке и читает `data-highlighted`
 * и `data-selected` с неё. Набор опции ложится поверх того, что `Button`
 * пишет себе сам: `role="option"` перекрывает `role="button"`, а
 * `tabIndex={-1}` выводит строку из обхода — фокус остаётся на поле. Атрибуты
 * потребителя делятся, как у Vue: класс и стиль — корню, остальное — строке,
 * поверх её наборов.
 *
 * Тег строки фиксирован (`span`), а не берётся из `tag` опции: `tag` — тег
 * корня, под фиксированный тег строки написан `TSelectItem._ariaTag`. Вида у
 * строки нет: значения вида объявляет тема, строку опции она красит по
 * контексту (`.so-select-item`).
 *
 * Выбор — клик по корню, как `@click` корня у Vue: выбирает через Select
 * (`adapters.select.choose()`), а выключенной опции отказывает он сам. Клик
 * потребителя стоит на строке и приходит раньше, всплытием.
 *
 * Обёртка отметки рисуется, пока `indicator` не `none`, — и у невыбранных
 * тоже: она резервирует место, и строка не прыгает при выборе. Иконка внутри
 * — только у выбранной, слот `indicator-icon` подменяет её. `aria-hidden`:
 * состояние скринридеру объявляет `aria-selected`.
 */
export function SelectItem(props: SelectItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupSelectItem(props)

	const {
		rendered,
		tag,
		text,
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

	const mark = (
		<span className="so-select-item__indicator" aria-hidden="true">
			{renderSlot(props['indicator-icon'], { selected: chosen }) ??
				(chosen ? <Icon embedded="select.indicator" tag={CheckIcon} size={size} /> : null)}
		</span>
	)

	return (
		<Tag
			{...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}
			onClick={() => context?.adapters.select.choose()}
		>
			<Button
				embedded="select.row"
				tag="span"
				size={size}
				variant={variant}
				disabled={disabled}
				tabIndex={-1}
				{...toAriaProps(aria)}
				{...toAriaProps(dataset)}
				{...toControlAttrs<SelectItemAttributes>(forwardProps)}
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
