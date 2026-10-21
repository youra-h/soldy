import {
	TCollectionExtension,
	TToastsApiExtension,
	ToastsCollectionDescriptor,
	ToastsDescriptor,
} from '@soldy-ui/setup'
import type { IToasts, IToastsProps, TToastsCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

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
 * Расширения коллекции опускают лифтом в слой менеджера
 * (`provideElevator()` в его `providers`) движок с регистратором тостов
 * (`TCollectionExtension`) — тосты региона берут их при своей сборке — и API
 * тостов (`TToastsApiExtension`) — его берёт `useToasts()` у компонента под
 * менеджером.
 *
 * `engine` — готовая коллекция снаружи, вход менеджера: фасад работает на ней,
 * а без неё собирает свою (`completeEngine`). Тем же движком код вне
 * компонентов показывает тосты (`engine.extensions.toasts.show`).
 */
export function setupToasts(
	ctrl: IToasts | undefined,
	props: object,
	engine: IToastsProps['engine'],
): TBinding<IToasts, TToastsCollectionFacade> {
	const adapter = createAngularAdapterContext(ToastsDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		ToastsCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator: AngularElevatorFactory })
		.use(TToastsApiExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
