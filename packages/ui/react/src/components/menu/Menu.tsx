import type { ElementType, ReactElement } from 'react'
import { Elevate, hasSlot, renderSlot, toAriaProps, toPartClass, toRootProps } from '../../adapter'
import { Frame } from '../frame'
import { drawItems } from './submenu/Submenu'
import { useSetupMenu } from './setup.component'
import type { MenuProps } from './base.component'

/**
 * Menu — меню действий у кнопки (APG Menu Button) или контекстное меню области.
 * docs/agents/patterns.md, «Готовые паттерны» (Menu).
 */
export function Menu(props: MenuProps): ReactElement | null {
	const { ref, forwardProps, state, rootElement, layer } = useSetupMenu(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		open,
		point,
		placement,
		triggerAria,
		triggerDataset,
		panelClasses,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], forwardProps)}>
			<Elevate layer={layer}>
				{renderSlot(props.trigger, {
					triggerAria: triggerAria ?? {},
					triggerDataset: triggerDataset ?? {},
				})}
				<Frame
					embedded="menu.frame"
					className={toPartClass(panelClasses)}
					tabIndex={-1}
					visible={open}
					position="fixed"
					anchor_anchor={rootElement}
					anchor_point={point}
					anchor_placement={placement}
					anchor_offset={4}
					{...toAriaProps(aria)}
					{...toAriaProps(dismiss_ownerAttribute)}
				>
					<div className="so-menu__list">
						{hasSlot(props.children)
							? renderSlot(props.children)
							: drawItems(state, props)}
					</div>
				</Frame>
			</Elevate>
		</Tag>
	)
}
