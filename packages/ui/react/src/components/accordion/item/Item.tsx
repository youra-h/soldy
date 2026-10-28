import type { ElementType, ReactElement, ReactNode } from 'react'
import {
	hasSlot,
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
	useClickAction,
	withRenderBoundary,
} from '../../../adapter'
import { Button } from '../../button'
import { Icon } from '../../icon'
import { useSetupAccordionItem } from './setup.component'
import type { AccordionItemAttributes, AccordionItemProps } from './base.component'

/**
 * AccordionItem — секция: заголовок `Button` и панель с набором `contentAria`.
 * Атрибуты потребителя — заголовку: AGENTS.md (React), «Корень и `ref` потребителя».
 */
export const AccordionItem = withRenderBoundary(function AccordionItem(
	props: AccordionItemProps,
): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupAccordionItem(props)
	const toggle = useClickAction(() => context?.adapters.selection.toggle())

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
	const header = toControlAttrs<AccordionItemAttributes>(forwardProps)

	// Класс стрелки — на обёртке: тема поворачивает по нему и подменённую слотом иконку
	const arrowAt = (side: 'start' | 'end', slot: ReactNode) =>
		hasSlot(slot) || arrowPlacement === side ? (
			<span className="so-accordion-item__arrow">
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
				type="button"
				className="so-accordion-item__header"
				view={view}
				disabled={disabled}
				size={size}
				variant={variant}
				{...toAriaProps(aria)}
				{...header}
				ref={toggle}
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
			<div className="so-accordion-item__body">
				<div className="so-accordion-item__content" {...toAriaProps(contentAria)}>
					{renderSlot(props.children)}
				</div>
			</div>
		</Tag>
	)
})
