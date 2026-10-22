/**
 * setupMenuCheckboxItem — setup-слой флажка меню.
 *
 * Два контекста, как у пункта: собственный (`MenuCheckboxItemDescriptor` —
 * текст и значение флажка) и фасада (`MenuCollectionCheckboxItemDescriptor` —
 * вход в коллекцию меню и отметка: она — выбор коллекции). Движок и
 * регистратор меню расширение элемента берёт лифтом.
 *
 * `context` отдаётся разметке явно: нажатие — метод item-адаптера `menu`.
 */

import {
	MenuCheckboxItemDescriptor,
	MenuCollectionCheckboxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	type TRootReceiver,
} from '../../../adapter'
import type { MenuCheckboxItemProps } from './base.component'

export function setupMenuCheckboxItem(
	getProps: () => MenuCheckboxItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const props = getProps()
	const adapter = createSvelteAdapterContext(MenuCheckboxItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		MenuCollectionCheckboxItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: SvelteElevatorFactory })

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
