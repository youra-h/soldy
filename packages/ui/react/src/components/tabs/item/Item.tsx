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
import { useSetupTabsItem } from './setup.component'
import type { TabsItemAttributes, TabsItemProps } from './base.component'

/**
 * TabsItem — таб: корень по `tag` (по умолчанию `div`), внутри строка —
 * `Button` с `role="tab"` — и кнопка закрытия рядом с ней, как у Vue.
 *
 * Наборы ядра стоят там же, где у Vue. Корень несёт `dataset`, `attrs` и место
 * в коллекции (`order`): тема красит активный таб по `data-selected` на нём.
 * Строка несёт `aria` — вся ARIA таба на элементе, который и есть таб: роль от
 * ядра, `aria-selected` и остановку Tab (`tabindex`) от коллекции, связку с
 * панелью (`id`, `aria-controls`). Атрибуты потребителя делятся, как у
 * ListBox.Item: класс и стиль — корню, остальное — строке, поверх её `aria`.
 *
 * Клик строки активирует таб, потом зовёт клик потребителя — как у Vue, где
 * слушатели складываются.
 *
 * Кнопка закрытия — сосед строки, а не её часть: интерактивный потомок у
 * `<button role="tab">` HTML запрещает, а подпись крестика вошла бы в имя
 * таба. Имя кнопке ядро собирает вместе с текстом таба (`closeAria`),
 * рисуется она по итогу закрываемости фасада (`tab_closable`), размер и
 * `disabled` — явно: от строки она их не наследует.
 *
 * Закрывает кнопка по `onActionClick` — нативному клику её `TActionPlugin` — и
 * гасит всплытие у нативного события. Синтетический `stopPropagation` React
 * этого не сделал бы: к нему событие уже прошло корни таба и набора, и их
 * `TActionPlugin` отдал бы `action:press` на клик по крестику. Vue гасит то же
 * `@click.stop`.
 */
export function TabsItem(props: TabsItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupTabsItem(props)

	const {
		rendered,
		tag,
		text,
		disabled,
		size,
		variant,
		active,
		tab_closable,
		closeAria,
		aria,
		dataset,
		attrs,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const { onClick, ...row } = toControlAttrs<TabsItemAttributes>(forwardProps)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<Button
				embedded="tabs.row"
				disabled={disabled}
				size={size}
				variant={variant}
				{...toAriaProps(aria)}
				{...row}
				onClick={(event) => {
					if (context) context.adapters.activation.active = true
					onClick?.(event)
				}}
				leading={renderSlot(props.leading)}
				trailing={renderSlot(props.trailing)}
			>
				{renderSlot(props.children, { text: text ?? '', active: active ?? false }) ?? text}
			</Button>
			<Button
				embedded="tabs.close"
				rendered={tab_closable === true}
				className="s-tabs-item__close"
				disabled={disabled}
				size={size}
				{...toAriaProps(closeAria)}
				onActionClick={(event) => {
					event.stopPropagation()
					context?.adapters.tabs.close()
				}}
			>
				{renderSlot(props['close-icon']) ?? (
					<Icon embedded="tabs.close-icon" tag={roleIcon('close')} size={size} />
				)}
			</Button>
		</Tag>
	)
}
