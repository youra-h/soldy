/**
 * useSetupToastsItem — setup-слой тоста (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у страницы пагинации: собственный
 * (`ToastsItemDescriptor` — текст, описание, вид, ожидание, крестик, своё
 * содержимое) и фасада (`ToastsCollectionItemDescriptor` — место в
 * коллекции). Расширение элемента берёт лифтом движок и регистратор менеджера
 * — из слоя, который тост увидел на рендере, — и отдаёт фасаду контекст тоста.
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
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { ToastsItemProps } from './base.component'

export function useSetupToastsItem(props: ToastsItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(ToastsItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			ToastsCollectionItemDescriptor(),
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
	}
}
