/**
 * useSetupMenuCheckboxItem — setup-слой флажка меню (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у пункта: собственный
 * (`MenuCheckboxItemDescriptor` — текст и значение флажка) и фасада
 * (`MenuCollectionCheckboxItemDescriptor` — вход в коллекцию меню и отметка:
 * она — выбор коллекции). Движок и регистратор меню расширение элемента
 * берёт лифтом, из слоя, который флажок увидел на рендере.
 *
 * `context` отдаётся разметке явно: нажатие — метод item-адаптера `menu`.
 */

import {
	MenuCheckboxItemDescriptor,
	MenuCollectionCheckboxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { MenuCheckboxItemProps } from './base.component'

export function useSetupMenuCheckboxItem(props: MenuCheckboxItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(MenuCheckboxItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			MenuCollectionCheckboxItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter.instance, elevator })

		return [adapter, item] as const
	})

	const owner = useAdapter(adapter, props)
	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: facade.forwardProps,
		state: { ...facade.state, ...owner.state },
		context: item.instance.context,
	}
}
