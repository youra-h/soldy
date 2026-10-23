import type { ElementType, ReactElement } from 'react'
import { renderSlot, roleIcon, toAriaProps, toRootProps } from '../../adapter'
import { Button } from '../button'
import { Frame } from '../frame'
import { Icon } from '../icon'
import { useSetupPopover } from './setup.component'
import type { PopoverProps } from './base.component'

const CloseIcon = roleIcon('close')

/**
 * Popover — панель у триггера (немодальный диалог). Панель — Frame, якорь —
 * корень значением: AGENTS.md (React), «Корень и `ref` потребителя».
 */
export function Popover(props: PopoverProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state, rootElement } = useSetupPopover(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		open,
		contained,
		placement,
		closable,
		closeAria,
		triggerAria,
		triggerDataset,
		panelDataset,
		contentRendered,
		handleRendered,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], forwardProps)}>
			{renderSlot(props.trigger, {
				triggerAria: triggerAria ?? {},
				triggerDataset: triggerDataset ?? {},
			})}
			<Frame
				embedded="popover.frame"
				className="so-popover__panel"
				tabIndex={-1}
				visible={open}
				contained={contained}
				position="fixed"
				anchor_anchor={rootElement}
				anchor_placement={placement}
				anchor_offset={8}
				{...toAriaProps(aria)}
				{...toAriaProps(panelDataset)}
				{...toAriaProps(dismiss_ownerAttribute)}
			>
				{handleRendered ? <div className="so-popover__handle" aria-hidden="true" /> : null}
				<div className="so-popover__content">
					{contentRendered ? renderSlot(props.children) : null}
				</div>
				<Button
					embedded="popover.close"
					type="button"
					className="so-popover__close"
					rendered={closable}
					onClick={() => {
						ctrl.open = false
					}}
					{...toAriaProps(closeAria)}
				>
					{renderSlot(props['close-icon']) ?? (
						<Icon embedded="popover.close-icon" tag={CloseIcon} />
					)}
				</Button>
			</Frame>
		</Tag>
	)
}
