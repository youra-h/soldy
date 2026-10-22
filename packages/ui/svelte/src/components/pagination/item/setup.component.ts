/**
 * setupPaginationItem — setup-слой страницы пагинации.
 *
 * Два контекста, как у элементов Vue: собственный (`PaginationItemDescriptor`
 * — ключ, текст, выключенность, размер и вариант) и фасада
 * (`PaginationCollectionItemDescriptor` — членство в коллекции). Расширение
 * элемента берёт лифтом движок и регистратор пагинации и отдаёт фасаду
 * контекст страницы.
 *
 * Своего у страницы в разметке нет — ключ, текст и наборы ей пишет
 * расширение коллекции, а текущей её делает активация коллекции по нажатию.
 * Поэтому `context` отдаётся разметке явно: активация — метод item-адаптера.
 */

import {
	PaginationCollectionItemDescriptor,
	PaginationItemDescriptor,
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
import type { PaginationItemProps } from './base.component'

export function setupPaginationItem(
	getProps: () => PaginationItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(PaginationItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		PaginationCollectionItemDescriptor(),
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
