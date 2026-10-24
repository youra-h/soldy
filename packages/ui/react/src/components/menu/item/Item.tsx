import type { ElementType, ReactElement } from 'react'
import {
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../../adapter'
import { Button } from '../../button'
import { useSetupMenuItem } from './setup.component'
import type { MenuItemAttributes, MenuItemProps } from './base.component'

/**
 * MenuItem — пункт-действие: корень по `tag` и строка — `Button` над экземпляром пункта
 * (`row`, `TItemRow` на `div`) с ARIA пункта: тег, размер и выключенность ей пишет пункт, а
 * роль и `tabindex` — его набор `aria`. Ключ — экземпляр: пересобранный пункт без `ctrl` —
 * новая строка, и кнопка над ней монтируется заново (AGENTS.md (React), «Пересобранный
 * инстанс и `key`»).
 */
export function MenuItem(props: MenuItemProps): ReactElement | null {
	const { ref, forwardProps, state, context, row } = useSetupMenuItem(props)

	const { rendered, tag, text, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	// Клик потребителя — после выбора меню, как у Vue, где слушатели складываются
	const { onClick, ...rowAttrs } = toControlAttrs<MenuItemAttributes>(forwardProps)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<Button
				key={row.uid}
				embedded="menu.row"
				ctrl={row}
				{...toAriaProps(aria)}
				{...rowAttrs}
				onClick={(event) => {
					context?.adapters.menu.choose()
					onClick?.(event)
				}}
				leading={<span className="so-menu-item__icon">{renderSlot(props.leading)}</span>}
				trailing={
					<span className="so-menu-item__shortcut">{renderSlot(props.trailing)}</span>
				}
			>
				{renderSlot(props.children, { text: text ?? '' }) ?? text}
			</Button>
		</Tag>
	)
}
