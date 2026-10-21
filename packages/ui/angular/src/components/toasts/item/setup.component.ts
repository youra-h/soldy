import {
	TCollectionItemExtension,
	ToastsCollectionItemDescriptor,
	ToastsItemDescriptor,
} from '@soldy-ui/setup'
import type { IToastsItem, TToastsItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupToastsItem — setup-слой тоста.
 *
 * Два контекста, как у тоста Vue и страницы пагинации: собственный
 * (`ToastsItemDescriptor` — текст, вид, ожидание, крестик) и фасада
 * (`ToastsCollectionItemDescriptor` — место в коллекции тостов), одной
 * связкой. Расширение элемента берёт лифтом из слоя менеджера движок и
 * регистратор. Логики здесь нет: имя крестика — `TToastsItemNamesPlugin`,
 * жест — `TSwipePlugin`, роль, `tabindex`, `data-*` и модификатор вида — ядро
 * тоста, отсчёт и удаление догасших — плагины менеджера.
 */
export function setupToastsItem(
	ctrl: IToastsItem | undefined,
	props: object,
): TBinding<IToastsItem, TToastsItemCollectionFacade> {
	const adapter = createAngularAdapterContext(ToastsItemDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		ToastsCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
