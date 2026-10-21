/**
 * setupToastsItem — setup-слой тоста.
 *
 * Два контекста, как у элементов Vue: собственный (`ToastsItemDescriptor` —
 * текст, описание, вид, ожидание, крестик, своё содержимое) и фасада
 * (`ToastsCollectionItemDescriptor` — место в коллекции). Расширение элемента
 * берёт лифтом движок и регистратор менеджера — из слоя, который тост увидел
 * при сборке (`useElevator`), — и отдаёт фасаду контекст тоста.
 *
 * Логики здесь нет: имя крестика — `TToastsItemNamesPlugin`, жест —
 * `TSwipePlugin`, роль, `tabindex`, `data-*` и модификатор вида — ядро тоста,
 * а что ожидающий тост сам не закрывается — его длительность у коллекции.
 */

import {
	TCollectionItemExtension,
	ToastsCollectionItemDescriptor,
	ToastsItemDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { ToastsItemProps } from './base.component'

export function setupToastsItem(props: ToastsItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(ToastsItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		ToastsCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(facade.state, owner.state),
		forwardProps: facade.forwardProps,
	}
}
