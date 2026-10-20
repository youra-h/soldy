/**
 * useSetupPaginationItem — setup-слой страницы пагинации (аналог
 * setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у таба: собственный
 * (`PaginationItemDescriptor`) и фасада страницы
 * (`PaginationCollectionItemDescriptor`) на общем наборе. Своего у страницы в
 * разметке нет — ключ, текст и наборы ей пишет расширение коллекции, а текущей
 * её делает активация коллекции по нажатию.
 *
 * `context` отдаётся разметке явно: активация — метод item-адаптера.
 */

import {
	PaginationCollectionItemDescriptor,
	PaginationItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { PaginationItemProps } from './base.component'

export function useSetupPaginationItem(props: PaginationItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(PaginationItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			PaginationCollectionItemDescriptor(),
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
		/** Контекст страницы в коллекции — нажатие делает её текущей, как у таба */
		context: item.instance.context,
	}
}
