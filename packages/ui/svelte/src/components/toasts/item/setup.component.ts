/**
 * setupToastsItem — setup-слой тоста.
 *
 * Два контекста, как у элементов Vue: собственный (`ToastsItemDescriptor` —
 * текст, описание, вид, ожидание, крестик, своё содержимое) и фасада
 * (`ToastsCollectionItemDescriptor` — место в коллекции). Расширение элемента
 * берёт лифтом движок и регистратор менеджера и отдаёт фасаду контекст тоста.
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
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	type TRootReceiver,
} from '../../../adapter'
import type { ToastsItemProps } from './base.component'

export function setupToastsItem(
	getProps: () => ToastsItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const props = getProps()
	const adapter = createSvelteAdapterContext(ToastsItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		ToastsCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: SvelteElevatorFactory })

	const facade = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(facade.state, owner.state),

		get forwardProps() {
			return facade.forwardProps
		},
	}
}
