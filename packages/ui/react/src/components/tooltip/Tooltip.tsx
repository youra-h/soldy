import type { ElementType, ReactElement } from 'react'
import { renderSlot, toAriaProps, toRootProps } from '../../adapter'
import { Frame } from '../frame'
import { useSetupTooltip } from './setup.component'
import type { TooltipProps } from './base.component'

/** Tooltip — подсказка у триггера; панель — Frame, якорь — корень значением, как у Popover. */
export function Tooltip(props: TooltipProps): ReactElement | null {
	const { ref, forwardProps, state, rootElement } = useSetupTooltip(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		open,
		placement,
		triggerAria,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], forwardProps)}>
			{renderSlot(props.trigger, { triggerAria: triggerAria ?? {} })}
			<Frame
				embedded="tooltip.frame"
				className="so-tooltip__panel"
				visible={open}
				position="fixed"
				anchor_anchor={rootElement}
				anchor_placement={placement}
				anchor_offset={6}
				{...toAriaProps(aria)}
				{...toAriaProps(dismiss_ownerAttribute)}
			>
				<div className="so-tooltip__content">{renderSlot(props.children)}</div>
			</Frame>
		</Tag>
	)
}
