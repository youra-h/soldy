/**
 * setupToasts — setup-слой Toasts.
 *
 * Два контекста, как у Vue: свой (`ToastsDescriptor`) и фасада коллекции
 * (`ToastsCollectionDescriptor`) на общем наборе, одной связкой. Логики здесь
 * нет: очередь, предел видимых и подъём региона — расширение коллекции
 * `toasts`, отсчёт — `TToastsTimerPlugin`, удаление догасших —
 * `TToastsRemovalPlugin`, F8 и Escape — `TToastsKeyboardPlugin`, листание
 * стопки — `TToastsCascadePlugin`, слой в стилях — `TToastsLayoutPlugin`, имя
 * региона — `TToastsNamesPlugin`.
 *
 * Расширения коллекции опускают лифтом своему хосту — элементу `<so-toasts>` —
 * движок с регистратором тостов (`TCollectionExtension`) и API тостов
 * (`TToastsApiExtension`). Тосты в регионе находят движок вверх по документу:
 * регион, увезённый в цель, ищет от своего якоря в элементе. API берёт
 * `toastsOf(node)` — у узла под менеджером, где бы он ни стоял.
 *
 * `engine` — готовая коллекция снаружи, свойство элемента (`el.engine`): фасад
 * работает на ней, а без неё собирает свою (`completeEngine`). Тем же движком
 * код вне документа показывает тосты (`engine.extensions.toasts.show`).
 */

import {
	TCollectionExtension,
	TToastsApiExtension,
	ToastsCollectionDescriptor,
	ToastsDescriptor,
} from '@soldy-ui/setup'
import type { IToasts, TToastsCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupToasts(
	host: HTMLElement,
	ctrl: IToasts | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IToasts, TToastsCollectionFacade> {
	const adapter = createWebcAdapterContext(host, ToastsDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter, host, onUpdate)
	const elevator = createWebcElevator(host)

	const collectionAdapter = createWebcAdapterContext(
		host,
		ToastsCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TToastsApiExtension, { elevator })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, host, onUpdate))
}
