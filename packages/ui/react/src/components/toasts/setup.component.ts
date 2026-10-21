/**
 * useSetupToasts — setup-слой Toasts (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой: свой (`ToastsDescriptor`) и фасада коллекции
 * (`ToastsCollectionDescriptor`) на общем наборе. Фасад собран на инстансе
 * владельца, поэтому пересобираются и уничтожаются они вместе.
 *
 * Логики здесь нет: очередь, предел видимых и подъём региона — расширение
 * коллекции `toasts`, отсчёт — `TToastsTimerPlugin`, удаление догасших —
 * `TToastsRemovalPlugin`, F8 и Escape — `TToastsKeyboardPlugin`, листание
 * стопки — `TToastsCascadePlugin`, слой в стилях — `TToastsLayoutPlugin`, имя
 * региона — `TToastsNamesPlugin`. Разметка раскладывает то, что они отдали.
 *
 * Движок снаружи — как у остальных коллекций. Движок и регистратор тостов
 * расширение коллекции опускает лифтом компонента, а API тостов — своё
 * расширение (`TToastsApiExtension`): детям слой (`layer`) отдаёт `Elevate` в
 * разметке. Приложение под ним берёт API `useToasts()`, а тосты в регионе —
 * движок: регион в портале, а портал React контекст сохраняет.
 *
 * Пересобранный менеджер (StrictMode, `<Activity>`) — новый движок, если его
 * не дали снаружи, и с ним новый API: слой детям меняется, и `useToasts()` под
 * менеджером отдаёт уже его.
 */

import {
	TCollectionExtension,
	TToastsApiExtension,
	ToastsCollectionDescriptor,
	ToastsDescriptor,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../adapter'
import type { ToastsProps } from './base.component'

export function useSetupToasts(props: ToastsProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(ToastsDescriptor(), { ctrl: props.ctrl, props })

		const collectionAdapter = create(
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

		return [adapter, collectionAdapter] as const
	})

	const owner = useAdapter(adapter, props)
	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: collectionBinding.forwardProps,
		state: { ...owner.state, ...collectionBinding.state },
		layer,
	}
}
