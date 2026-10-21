/**
 * setupMenuItem — setup-слой пункта меню.
 *
 * Два контекста, как у пункта Vue и элемента ListBox: собственный
 * (`MenuItemDescriptor` — текст и значение пункта) и фасада
 * (`MenuCollectionItemDescriptor` — вход в коллекцию меню). Расширение
 * элемента берёт лифтом движок и регистратор меню — из слоя, который пункт
 * увидел при сборке (`useElevator`), — и отдаёт фасаду контекст пункта.
 *
 * В коллекцию пункт входит, когда контекст фасада принят, — при выполнении
 * тела компонента. Пункт стоит в панели меню, а панель — в телепорте Frame:
 * тело пункта выполняется, когда портал впервые рисует содержимое, и на
 * сервере, где портала нет, пунктов нет.
 *
 * `context` отдаётся разметке явно: нажатие — метод item-адаптера `menu`.
 */

import {
	MenuCollectionItemDescriptor,
	MenuItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { MenuItemProps } from './base.component'

export function setupMenuItem(props: MenuItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(MenuItemDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		MenuCollectionItemDescriptor(),
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
