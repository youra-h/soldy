import type { ElementType, ReactElement } from 'react'
import {
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
	useClickAction,
} from '../../../adapter'
import { ItemRow } from '../../item-row'
import { Icon } from '../../icon'
import { useSetupMenuCheckboxItem } from './setup.component'
import type { MenuCheckboxItemAttributes, MenuCheckboxItemProps } from './base.component'

/** Отметка без слота — иконка из пакета по роли, компонент на роль один на модуль. */
const CheckIcon = roleIcon('check')

/**
 * MenuCheckboxItem — флажок меню: строка пункта с отметкой в начале. Обёртка отметки — прямой
 * ребёнок строки и у неотмеченного: по ней тема узнаёт колонку отметок.
 */
export function MenuCheckboxItem(props: MenuCheckboxItemProps): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupMenuCheckboxItem(props)
	const toggle = useClickAction(() => context?.adapters.menu.toggle())

	const { rendered, tag, text, size, disabled, selected, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const checked = selected ?? false
	const row = toControlAttrs<MenuCheckboxItemAttributes>(forwardProps)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<ItemRow
				embedded="menu.row"
				tag="div"
				size={size}
				disabled={disabled}
				{...toAriaProps(aria)}
				{...row}
				ref={toggle}
				leading={
					<>
						<span className="so-menu-item__indicator" aria-hidden="true">
							{renderSlot(props['indicator-icon'], { selected: checked }) ??
								(checked ? (
									<Icon embedded="menu.indicator" tag={CheckIcon} size={size} />
								) : null)}
						</span>
						<span className="so-menu-item__icon">{renderSlot(props.leading)}</span>
					</>
				}
				trailing={
					<span className="so-menu-item__shortcut">{renderSlot(props.trailing)}</span>
				}
			>
				{renderSlot(props.children, { text: text ?? '', selected: checked }) ?? text}
			</ItemRow>
		</Tag>
	)
}
