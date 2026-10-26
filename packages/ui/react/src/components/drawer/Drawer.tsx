import type { ElementType, ReactElement } from 'react'
import {
	Teleport,
	renderSlot,
	roleIcon,
	toAriaProps,
	toRootLayout,
	toRootProps,
} from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { useSetupDrawer } from './setup.component'
import type { DrawerProps } from './base.component'

const CloseIcon = roleIcon('close')

/**
 * Drawer — выезжающая панель: подложка и панель, как у Dialog; `contained`
 * выключает телепорт (AGENTS.md (React), «Teleport»).
 */
export function Drawer(props: DrawerProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state } = useSetupDrawer(props)

	const {
		rendered,
		tag,
		target,
		contained,
		visible,
		attrs,
		aria,
		dataset,
		titleAria,
		closable,
		closeAria,
		handleRendered,
		backdropDataset,
		layout_backdropStyles,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Teleport to={target} disabled={contained}>
			<div
				{...toAriaProps(backdropDataset)}
				{...toRootLayout(
					{ layout_styles: layout_backdropStyles, visible },
					{ className: 'so-drawer__backdrop' },
				)}
			/>
			<Tag
				tabIndex={-1}
				{...toRootProps(
					ref,
					state,
					[attrs, aria, dataset, dismiss_ownerAttribute],
					forwardProps,
				)}
			>
				{handleRendered ? <div className="so-drawer__handle" aria-hidden="true" /> : null}
				<h2 className="so-drawer__title" {...toAriaProps(titleAria)}>
					{renderSlot(props.title)}
				</h2>
				<div className="so-drawer__body">{renderSlot(props.children)}</div>
				<div className="so-drawer__footer">{renderSlot(props.footer)}</div>
				{closable ? (
					<Button
						embedded="drawer.close"
						type="button"
						className="so-drawer__close"
						onClick={() => ctrl.requestClose('button')}
						{...toAriaProps(closeAria)}
					>
						{renderSlot(props['close-icon']) ?? (
							<Icon embedded="drawer.close-icon" tag={CloseIcon} />
						)}
					</Button>
				) : null}
			</Tag>
		</Teleport>
	)
}
