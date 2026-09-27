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
import { useSetupAccordionItem } from './setup.component'
import type { AccordionItemAttributes, AccordionItemProps } from './base.component'

/**
 * AccordionItem — секция: корень по `tag` (по умолчанию `div`), внутри
 * заголовок — `Button` — и панель, как у Vue.
 *
 * Наборы ядра стоят там же, где у Vue. Корень несёт `dataset`, `attrs` и место
 * в коллекции (`order`): тема раскрывает панель по `data-selected` на нём.
 * Заголовок несёт `aria` — `aria-expanded` и сторону связки с панелью (`id`,
 * `aria-controls`) пишет коллекция. Сторона панели (`role="region"`, `id`,
 * `aria-labelledby`) приходит пропом фасада `content_aria`: у панели нет
 * своего компонента, а значит и набора. Атрибуты потребителя делятся, как у
 * ListBox.Item: класс и стиль — корню, остальное — заголовку, поверх его `aria`.
 *
 * Клик заголовка раскрывает или сворачивает секцию, потом зовёт клик
 * потребителя — как у Vue, где слушатели складываются.
 *
 * Стрелка — по краю заголовка со стороны `arrowPlacement`. Слоты
 * `leading-icon` и `trailing-icon` подменяют её, по умолчанию она — иконка
 * пакета по роли `arrowRight`.
 */
export function AccordionItem(props: AccordionItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupAccordionItem(props)

	const {
		rendered,
		tag,
		text,
		view,
		disabled,
		size,
		variant,
		selected,
		arrowPlacement,
		content_aria,
		aria,
		dataset,
		attrs,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const { onClick, ...header } = toControlAttrs<AccordionItemAttributes>(forwardProps)

	const arrow = (
		<Icon
			embedded="accordion.arrow"
			className="s-accordion-item__arrow"
			tag={roleIcon('arrowRight')}
			size={size}
		/>
	)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<Button
				embedded="accordion.header"
				className="s-accordion-item__header"
				view={view}
				disabled={disabled}
				size={size}
				variant={variant}
				{...toAriaProps(aria)}
				{...header}
				onClick={(event) => {
					context?.adapters.selection.toggle()
					onClick?.(event)
				}}
				leading={
					<>
						{renderSlot(props['leading-icon']) ??
							(arrowPlacement === 'start' ? arrow : null)}
						{renderSlot(props.leading)}
					</>
				}
				trailing={
					<>
						{renderSlot(props.trailing)}
						{renderSlot(props['trailing-icon']) ??
							(arrowPlacement === 'end' ? arrow : null)}
					</>
				}
			>
				{renderSlot(props.header, { text: text ?? '', selected: selected ?? false }) ??
					text}
			</Button>
			<div className="s-accordion-item__body">
				<div className="s-accordion-item__content" {...toAriaProps(content_aria)}>
					{renderSlot(props.children)}
				</div>
			</div>
		</Tag>
	)
}
