/**
 * useSetupMenuItem — setup-слой пункта меню (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у пункта Vue и элемента ListBox:
 * собственный (`MenuItemDescriptor` — текст и значение пункта) и фасада
 * (`MenuCollectionItemDescriptor` — вход в коллекцию меню). Расширение
 * элемента берёт лифтом движок и регистратор меню — из слоя, который пункт
 * увидел на рендере, — и отдаёт фасаду контекст пункта.
 *
 * В коллекцию пункт входит, когда `useAdapterContext` принимает контексты при
 * коммите, а не на рендере. Пункт стоит в панели меню, а панель — в телепорте
 * Frame: на сервере портала нет, и пунктов в серверной разметке нет.
 *
 * `context` отдаётся разметке явно: нажатие — метод item-адаптера `menu`.
 */

import {
	MenuCollectionItemDescriptor,
	MenuItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { MenuItemProps } from './base.component'

export function useSetupMenuItem(props: MenuItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(MenuItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			MenuCollectionItemDescriptor(),
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
