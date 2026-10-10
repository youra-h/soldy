import type { ElementType, ReactElement, ReactNode } from 'react'
import {
	hasSlot,
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
 * Заголовок несёт `aria` — `aria-expanded` пишет коллекция, сторону связки с
 * панелью (`id`, `aria-controls`) — плагин секции. Панель несёт набор секции
 * `contentAria` (`role="region"`, `id`, `aria-labelledby`): своего экземпляра
 * у неё нет. Атрибуты потребителя делятся, как у ListBox.Item: класс и стиль —
 * корню, остальное — заголовку, поверх его `aria`.
 *
 * Клик заголовка раскрывает или сворачивает секцию, потом зовёт клик
 * потребителя — как у Vue, где слушатели складываются.
 *
 * Стрелка — по краю заголовка со стороны `arrowPlacement`. Слоты
 * `leading-icon` и `trailing-icon` подменяют её, по умолчанию она — иконка
 * пакета по роли `arrowRight`. Стрелка — в обёртке, и класс стрелки на
 * обёртке, а не на иконке: тема поворачивает стрелку раскрытой секции по
 * `.s-accordion-item__arrow`, и подменённая иконка поворачивается так же.
 * Обёртка стоит, пока на её стороне стрелка по умолчанию или задан слот.
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
		contentAria,
		aria,
		dataset,
		attrs,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const { onClick, ...header } = toControlAttrs<AccordionItemAttributes>(forwardProps)

	/** Стрелка стороны: слот, а без него — иконка, если стрелка на этой стороне. */
	const arrowAt = (side: 'start' | 'end', slot: ReactNode) =>
		hasSlot(slot) || arrowPlacement === side ? (
			<span className="s-accordion-item__arrow">
				{hasSlot(slot) ? (
					renderSlot(slot)
				) : (
					<Icon embedded="accordion.arrow" tag={roleIcon('arrowRight')} size={size} />
				)}
			</span>
		) : null

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
						{arrowAt('start', props['leading-icon'])}
						{renderSlot(props.leading)}
					</>
				}
				trailing={
					<>
						{renderSlot(props.trailing)}
						{arrowAt('end', props['trailing-icon'])}
					</>
				}
			>
				{renderSlot(props.header, { text: text ?? '', selected: selected ?? false }) ??
					text}
			</Button>
			<div className="s-accordion-item__body">
				<div className="s-accordion-item__content" {...toAriaProps(contentAria)}>
					{renderSlot(props.children)}
				</div>
			</div>
		</Tag>
	)
}
