/**
 * setupMenuCheckboxItem — setup-слой флажка меню.
 *
 * Два контекста, как у пункта: собственный (`MenuCheckboxItemDescriptor` —
 * текст и значение флажка) и фасада (`MenuCollectionCheckboxItemDescriptor` —
 * вход в коллекцию меню и отметка: она — выбор коллекции). Движок и
 * регистратор меню расширение элемента берёт лифтом, из слоя, который флажок
 * увидел при сборке (`useElevator`).
 *
 * `context` отдаётся разметке явно: нажатие — метод item-адаптера `menu`.
 */

import {
	MenuCheckboxItemDescriptor,
	MenuCollectionCheckboxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { MenuCheckboxItemProps } from './base.component'

export function setupMenuCheckboxItem(props: MenuCheckboxItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(MenuCheckboxItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		MenuCollectionCheckboxItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(facade.state, owner.state),
		context: item.instance.context,
		forwardProps: facade.forwardProps,
	}
}
