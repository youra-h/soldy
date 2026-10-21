/**
 * setupToastsItem — setup-слой тоста.
 *
 * Два контекста, как у тоста Vue и страницы пагинации: собственный
 * (`ToastsItemDescriptor` — текст, вид, ожидание, крестик) и фасада
 * (`ToastsCollectionItemDescriptor` — место в коллекции тостов), одной
 * связкой. Расширение элемента берёт лифтом движок и регистратор менеджера —
 * ближайшего выше по документу: тост стоит в регионе, а регион, увезённый в
 * цель, ищет от своего якоря в `<so-toasts>`. Логики здесь нет: имя крестика —
 * `TToastsItemNamesPlugin`, жест — `TSwipePlugin`, роль, `tabindex`, `data-*`
 * и модификатор вида — ядро тоста, отсчёт и удаление догасших — плагины
 * менеджера.
 */

import {
	TCollectionItemExtension,
	ToastsCollectionItemDescriptor,
	ToastsItemDescriptor,
} from '@soldy-ui/setup'
import type { IToastsItem, TToastsItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupToastsItem(
	host: HTMLElement,
	ctrl: IToastsItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IToastsItem, TToastsItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, ToastsItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		ToastsCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		elevator: createWebcElevator(host),
	})

	const item = useCollectionAdapter(itemAdapter, adapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
