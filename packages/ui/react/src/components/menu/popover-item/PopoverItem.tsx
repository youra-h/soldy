import type { ElementType, ReactElement } from 'react'
import {
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
	useClickAction,
	withRenderBoundary,
} from '../../../adapter'
import { ItemRow } from '../../item-row'
import { Frame } from '../../frame'
import { Icon } from '../../icon'
import { useSetupMenuPopoverItem } from './setup.component'
import type { MenuPopoverItemAttributes, MenuPopoverItemProps } from './base.component'

/** Стрелка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const ArrowIcon = roleIcon('arrowRight')

/**
 * MenuPopoverItem — пункт со своей панелью сбоку с любым содержимым. Текст строки — слот
 * `header`: `default` — содержимое панели, как у `Accordion.Item` и `Popover`.
 */
export const MenuPopoverItem = withRenderBoundary(function MenuPopoverItem(
	props: MenuPopoverItemProps,
): ReactElement | null {
	const { ref, forwardProps, state, context, rootElement } = useSetupMenuPopoverItem(props)
	const expand = useClickAction(() => context?.adapters.menu.open())

	const {
		rendered,
		tag,
		text,
		size,
		disabled,
		open,
		aria,
		dataset,
		attrs,
		panelAria,
		contentRendered,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const row = toControlAttrs<MenuPopoverItemAttributes>(forwardProps)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<ItemRow
				embedded="menu.row"
				tag="div"
				size={size}
				disabled={disabled}
				{...toAriaProps(aria)}
				{...row}
				ref={expand}
				leading={<span className="so-menu-item__icon">{renderSlot(props.leading)}</span>}
				trailing={
					<span className="so-menu-item__arrow" aria-hidden="true">
						{renderSlot(props['arrow-icon']) ?? (
							<Icon embedded="menu.arrow" tag={ArrowIcon} size={size} />
						)}
					</span>
				}
			>
				{renderSlot(props.header, { text: text ?? '', open: open ?? false }) ?? text}
			</ItemRow>
			<Frame
				embedded="menu.popover-item-frame"
				className="so-menu-item__panel"
				tabIndex={-1}
				visible={open}
				position="fixed"
				anchor_anchor={rootElement}
				anchor_placement="end-start"
				{...toAriaProps(panelAria)}
				{...toAriaProps(dismiss_ownerAttribute)}
			>
				<div className="so-menu-item__content">
					{contentRendered ? renderSlot(props.children) : null}
				</div>
			</Frame>
		</Tag>
	)
})
