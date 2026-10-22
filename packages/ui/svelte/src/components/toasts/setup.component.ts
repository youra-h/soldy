/**
 * setupToasts — setup-слой Toasts.
 *
 * Два контекста, как у Vue: свой (`ToastsDescriptor`) и фасада коллекции
 * (`ToastsCollectionDescriptor`) на общем наборе, с тем же id монтирования.
 *
 * Логики здесь нет: очередь, предел видимых и подъём региона — расширение
 * коллекции `toasts`, отсчёт — `TToastsTimerPlugin`, удаление догасших —
 * `TToastsRemovalPlugin`, F8 и Escape — `TToastsKeyboardPlugin`, листание
 * стопки — `TToastsCascadePlugin`, слой в стилях — `TToastsLayoutPlugin`, имя
 * региона — `TToastsNamesPlugin`. Разметка раскладывает то, что они отдали.
 *
 * Движок снаружи — как у остальных коллекций. Движок и регистратор тостов
 * расширение коллекции опускает лифтом (`setContext`), а API тостов — своё
 * расширение (`TToastsApiExtension`): потомок берёт его `useToasts()`. Тосты в
 * регионе — в цели телепорта, отдельным корнем Svelte, и лифт доходит до них
 * контекстами места (`Teleport`).
 */

import {
	TCollectionExtension,
	TToastsApiExtension,
	ToastsCollectionDescriptor,
	ToastsDescriptor,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { ToastsProps } from './base.component'

export function setupToasts(getProps: () => ToastsProps, mountId: string, receive: TRootReceiver) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(ToastsDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const collectionAdapter = createSvelteAdapterContext(
		ToastsCollectionDescriptor(),
		{
			props,
			mountId,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TToastsApiExtension, { elevator })

	const collectionBinding = useCollectionAdapter(
		collectionAdapter,
		getProps,
		() => owner.forwardProps,
	)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(owner.state, collectionBinding.state),

		get forwardProps() {
			return collectionBinding.forwardProps
		},
	}
}
