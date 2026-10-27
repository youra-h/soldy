import type { ElementType, ReactElement } from 'react'
import {
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
	useClickAction,
} from '../../../adapter'
import { ItemRow } from '../../item-row'
import { useSetupMenuItem } from './setup.component'
import type { MenuItemAttributes, MenuItemProps } from './base.component'

/** MenuItem — пункт-действие: корень по `tag` и строка — `ItemRow` на `div` с ARIA пункта. */
export function MenuItem(props: MenuItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupMenuItem(props)
	const choose = useClickAction(() => context?.adapters.menu.choose())

	const { rendered, tag, text, size, disabled, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const row = toControlAttrs<MenuItemAttributes>(forwardProps)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<ItemRow
				embedded="menu.row"
				tag="div"
				size={size}
				disabled={disabled}
				{...toAriaProps(aria)}
				{...row}
				ref={choose}
				leading={<span className="so-menu-item__icon">{renderSlot(props.leading)}</span>}
				trailing={
					<span className="so-menu-item__shortcut">{renderSlot(props.trailing)}</span>
				}
			>
				{renderSlot(props.children, { text: text ?? '' }) ?? text}
			</ItemRow>
		</Tag>
	)
}
