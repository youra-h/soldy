import type { ElementType, ReactElement } from 'react'
import type { IMenuItem, TGroupSection, TMenuSubmenuEntries } from '@soldy-ui/core'
import {
	Elevate,
	hasSlot,
	relaySlot,
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toPartClass,
	toRootForward,
	toRootProps,
} from '../../../adapter'
import { Button } from '../../button'
import { Frame } from '../../frame'
import { Icon } from '../../icon'
import { MenuGroup } from '../group'
import { MenuItem } from '../item'
import { MenuSeparator } from '../separator'
import { useSetupMenuSubmenu } from './setup.component'
import type { MenuSubmenuAttributes, MenuSubmenuProps } from './base.component'

/** Стрелка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const ArrowIcon = roleIcon('arrowRight')

/** Что пунктам из данных нужно от состояния владельца — меню или подменю. */
type TItemsState = {
	/** Секции показанных пунктов: группа с подписью или пункты без группы. */
	readonly sections?: ReadonlyArray<TGroupSection<IMenuItem>>
	/** Подменю из данных по пункту — пункт и движок его пунктов. */
	readonly submenus?: TMenuSubmenuEntries
	/** Рисовать ли разделитель между соседними секциями. */
	readonly groupSeparators?: boolean
}

/** Слоты пунктов из данных — одни у меню и подменю, и на все уровни. */
type TItemSlots = Pick<
	MenuSubmenuProps,
	'item' | 'item-leading' | 'item-trailing' | 'item-header' | 'item-arrow-icon' | 'item-content'
>

/** Пункт из данных: подменю, если коллекция завела ему движок (`submenus`), иначе действие. */
function drawItem(state: TItemsState, slots: TItemSlots, item: IMenuItem): ReactElement {
	const entry = state.submenus?.get(item)

	if (!entry) {
		return (
			<MenuItem
				key={item.uid}
				ctrl={item}
				leading={renderSlot(slots['item-leading'], { item })}
				trailing={renderSlot(slots['item-trailing'], { item })}
			>
				{relaySlot(slots.item, { item })}
			</MenuItem>
		)
	}

	return (
		<MenuSubmenu
			key={item.uid}
			ctrl={entry.ctrl}
			engine={entry.engine}
			leading={renderSlot(slots['item-leading'], { item })}
			header={relaySlot(slots['item-header'], { item })}
			arrow-icon={renderSlot(slots['item-arrow-icon'], { item })}
			item={slots.item}
			item-leading={slots['item-leading']}
			item-trailing={slots['item-trailing']}
			item-header={slots['item-header']}
			item-arrow-icon={slots['item-arrow-icon']}
			item-content={slots['item-content']}
		>
			{renderSlot(slots['item-content'], { item })}
		</MenuSubmenu>
	)
}

/** Ключи пункта (`uid`), группы и разделителя секции не пересекаются. */
function drawSection(
	state: TItemsState,
	slots: TItemSlots,
	section: TGroupSection<IMenuItem>,
	separated: boolean,
): ReactElement[] {
	const items = section.items.map((item) => drawItem(state, slots, item))
	const separator = separated ? [<MenuSeparator key={`separator:${section.key}`} />] : []

	if (!section.group) return [...separator, ...items]

	return [
		...separator,
		<MenuGroup key={section.key} label={section.group.label}>
			{items}
		</MenuGroup>,
	]
}

/** Пункты из данных по секциям — одна разметка на меню и подменю всех уровней. */
export function drawItems(state: TItemsState, slots: TItemSlots): ReactElement[] {
	return (state.sections ?? []).flatMap((section, index) =>
		drawSection(state, slots, section, state.groupSeparators === true && index > 0),
	)
}

/**
 * MenuSubmenu — пункт с подменю: строка в меню над ним и своя панель с пунктами; панель —
 * в слое лифта подменю, и её пункты входят в его коллекцию, а не в коллекцию меню.
 */
export function MenuSubmenu(props: MenuSubmenuProps): ReactElement | null {
	const { ref, forwardProps, state, context, rootElement, layer } = useSetupMenuSubmenu(props)

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
		panelClasses,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const { onClick, ...row } = toControlAttrs<MenuSubmenuAttributes>(forwardProps)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<Button
				embedded="menu.row"
				tag="div"
				size={size}
				disabled={disabled}
				{...toAriaProps(aria)}
				{...row}
				onClick={(event) => {
					context?.adapters.menu.open()
					onClick?.(event)
				}}
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
			</Button>
			<Elevate layer={layer}>
				<Frame
					embedded="menu.submenu-frame"
					className={toPartClass(panelClasses)}
					tabIndex={-1}
					visible={open}
					position="fixed"
					anchor_anchor={rootElement}
					anchor_placement="end-start"
					{...toAriaProps(panelAria)}
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
