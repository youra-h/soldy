/**
 * setupPaginationItem — setup-слой страницы пагинации.
 *
 * Два контекста, как у Vue: собственный (`PaginationItemDescriptor` — ключ,
 * текст и наборы, их пишет расширение коллекции) и фасада
 * (`PaginationCollectionItemDescriptor` — членство в коллекции). Расширение
 * элемента берёт лифтом движок и регистратор пагинации — из слоя, который
 * страница увидела при сборке (`useElevator`), — и отдаёт фасаду контекст
 * страницы.
 *
 * Пропсов у фасада нет: текущую страницу отмечают расширения коллекции прямо
 * в её наборах — `data-selected` и `aria-current`. `context` отдаётся разметке
 * явно: нажатие делает страницу текущей активацией коллекции, как у таба.
 */

import {
	PaginationCollectionItemDescriptor,
	PaginationItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { PaginationItemProps } from './base.component'

export function setupPaginationItem(props: PaginationItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(PaginationItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		PaginationCollectionItemDescriptor(),
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
