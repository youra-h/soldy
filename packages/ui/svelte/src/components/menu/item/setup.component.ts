/**
 * setupMenuItem — setup-слой пункта меню.
 *
 * Два контекста, как у пункта Vue и элемента ListBox: собственный
 * (`MenuItemDescriptor` — текст и значение пункта) и фасада
 * (`MenuCollectionItemDescriptor` — вход в коллекцию меню). Расширение
 * элемента берёт лифтом движок и регистратор меню и отдаёт фасаду контекст
 * пункта.
 *
 * В коллекцию пункт входит, когда контекст фасада принят, — при
 * инициализации компонента. Пункт стоит в панели меню, а панель — в
 * телепорте Frame: `Teleport` монтирует её эффектом, и на сервере, где
 * эффектов нет, пунктов нет.
 *
 * `context` отдаётся разметке явно: нажатие — метод item-адаптера `menu`.
 */

import {
	MenuCollectionItemDescriptor,
	MenuItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { MenuItemProps } from './base.component'

export function setupMenuItem(
	getProps: () => MenuItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(MenuItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(facade.state, owner.state),
		context: item.instance.context,

		get forwardProps() {
			return facade.forwardProps
		},
	}
}
