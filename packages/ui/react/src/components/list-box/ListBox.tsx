import type { ReactElement } from 'react'
import { Elevate, hasSlot, renderSlot, toRootProps } from '../../adapter'
import { ListBoxItem } from './item'
import { useSetupListBox } from './setup.component'
import type { ListBoxProps } from './base.component'

/**
 * ListBox — список с выбором. Корень — `div` с `tabindex="0"`: список
 * фокусируется сам, и его клавиатура (`TListKeyboardPlugin`) слушает корень.
 *
 * Элементы — дети (`<ListBox.Item>`), а без детей — `shown` коллекции (состав
 * после отбора), по `ListBoxItem` на элемент. Слоты элементов статические и
 * получают элемент через scope: `item`, `item-leading`, `item-trailing`.
 *
 * Всё содержимое — в слое лифта списка (`Elevate`): элемент, смонтированный
 * внутри, прочтёт движок и регистратор этого списка и при коммите войдёт в его
 * коллекцию.
 */
export function ListBox(props: ListBoxProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupListBox(props)

	const { rendered, shown, attrs, aria, dataset } = state

	if (!rendered) return null

	return (
		<div tabIndex={0} {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<Elevate layer={layer}>
				{renderSlot(props.header)}
				{hasSlot(props.children)
					? renderSlot(props.children)
					: shown?.map((item) => (
							<ListBoxItem
								key={item.uid}
								ctrl={item}
								leading={renderSlot(props['item-leading'], { item })}
								trailing={renderSlot(props['item-trailing'], { item })}
							>
								{renderSlot(props.item, { item })}
							</ListBoxItem>
						))}
				{renderSlot(props.footer)}
			</Elevate>
		</div>
	)
}
