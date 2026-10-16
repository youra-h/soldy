import {
	TCollectionExtension,
	TToastsApiExtension,
	ToastsDescriptor,
	ToastsCollectionDescriptor,
} from '@soldy-ui/setup'
import {
	exposeRoot,
	useAdapter,
	useExpose,
	useCollectionAdapter,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseToasts, { type ToastsProps } from './base.component'

/**
 * Логики здесь нет: очередь, предел видимых и подъём региона — расширение
 * коллекции `toasts`, отсчёт — `TToastsTimerPlugin`, удаление догасших —
 * `TToastsRemovalPlugin`, F8 и Escape — `TToastsKeyboardPlugin`, слой в
 * стилях — `TToastsLayoutPlugin`, имя региона — `TToastsNamesPlugin`.
 * Разметка раскладывает то, что отдали ядро и плагины.
 */
export default {
	name: '_Toasts',
	extends: BaseToasts,
	expose: useExpose(),
	setup(props: ToastsProps, { emit, expose }: SetupContext) {
		const adapter = createVueAdapterContext(ToastsDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const refs = useAdapter(adapter, props, emit)

		// API тостов — потомкам (`useToasts()`): лифт опускает очередь движка
		const collectionAdapter = createVueAdapterContext(
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
			.use(TCollectionExtension, { elevator: VueElevatorFactory })
			.use(TToastsApiExtension, { elevator: VueElevatorFactory })

		const refsCollection = useCollectionAdapter(collectionAdapter, props, emit)

		// Первый узел шаблона — приложение в слоте, регион телепортирован:
		// `$el` потребителю — регион, а не начало фрагмента
		exposeRoot(expose, refs.rootElement)

		return { ...refs, ...refsCollection }
	},
}
