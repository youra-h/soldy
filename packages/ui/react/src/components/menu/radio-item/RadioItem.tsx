import type { ElementType, ReactElement } from 'react'
import {
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../../adapter'
import { Button } from '../../button'
import { useSetupMenuRadioItem } from './setup.component'
import type { MenuRadioItemAttributes, MenuRadioItemProps } from './base.component'

/**
 * MenuRadioItem — переключатель меню: строка пункта с точкой-отметкой в начале, как у флажка.
 * Строка — `Button` над экземпляром переключателя (`row`, `TItemRow` на `div`), ключ —
 * экземпляр, как у пункта.
 */
export function MenuRadioItem(props: MenuRadioItemProps): ReactElement | null {
	const { ref, forwardProps, state, context, row } = useSetupMenuRadioItem(props)

	const { rendered, tag, text, selected, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const checked = selected ?? false
	const { onClick, ...rowAttrs } = toControlAttrs<MenuRadioItemAttributes>(forwardProps)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<Button
				key={row.uid}
				embedded="menu.row"
				ctrl={row}
				{...toAriaProps(aria)}
				{...rowAttrs}
				onClick={(event) => {
					context?.adapters.menu.check()
					onClick?.(event)
				}}
				leading={
					<>
						<span className="so-menu-item__indicator" aria-hidden="true">
							{renderSlot(props['indicator-icon'], { selected: checked }) ??
								(checked ? <span className="so-menu-item__dot" /> : null)}
						</span>
						<span className="so-menu-item__icon">{renderSlot(props.leading)}</span>
					</>
				}
				trailing={
					<span className="so-menu-item__shortcut">{renderSlot(props.trailing)}</span>
				}
			>
				{renderSlot(props.children, { text: text ?? '', selected: checked }) ?? text}
			</Button>
		</Tag>
	)
}
