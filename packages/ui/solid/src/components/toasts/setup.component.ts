/**
 * setupToasts — setup-слой Toasts.
 *
 * Два контекста, как у Vue: свой (`ToastsDescriptor`) и фасада коллекции
 * (`ToastsCollectionDescriptor`) на общем наборе. Оба собираются один раз,
 * при выполнении тела компонента; фасад делит набор менеджера, и id
 * монтирования у него менеджера.
 *
 * Логики здесь нет: очередь, предел видимых и подъём региона — расширение
 * коллекции `toasts`, отсчёт — `TToastsTimerPlugin`, удаление догасших —
 * `TToastsRemovalPlugin`, F8 и Escape — `TToastsKeyboardPlugin`, листание
 * стопки — `TToastsCascadePlugin`, слой в стилях — `TToastsLayoutPlugin`, имя
 * региона — `TToastsNamesPlugin`. Разметка раскладывает то, что они отдали.
 *
 * Движок снаружи — как у остальных коллекций. Движок и регистратор тостов
 * расширение коллекции опускает в слой лифта менеджера (`useElevator`), а API
 * тостов — своё расширение (`TToastsApiExtension`): детям слой отдаёт
 * `Elevate` в разметке. Приложение под ним берёт API `useToasts()`, а тосты в
 * регионе — движок: регион телепортирован, но содержимое портала собирается
 * под владельцем места, где стоит телепорт, — внутри того же `Elevate`.
 */

import {
	TCollectionExtension,
	TToastsApiExtension,
	ToastsCollectionDescriptor,
	ToastsDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { ToastsProps } from './base.component'

export function setupToasts(props: ToastsProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(ToastsDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		ToastsCollectionDescriptor(),
		{
			props,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TToastsApiExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(owner.state, collectionBinding.state),
		forwardProps: collectionBinding.forwardProps,
		layer,
	}
}
