import { TCollectionExtension, MenuDescriptor, MenuCollectionDescriptor } from '@soldy-ui/setup'
import {
	useAdapter,
	joinBindings,
	useExpose,
	useCollectionAdapter,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseMenu, { type MenuProps } from './base.component'

/**
 * Два адаптерных контекста, как у Select: собственный (открытость, сторона,
 * наборы связки) и коллекционный (пункты). Второй получает `owner` и общий
 * `bundle`, чтобы плагины видели коллекцию.
 *
 * Логики здесь нет: открытие — клик по кнопке или контекстное меню у точки
 * вызова — и наведение — `TMenuPointerPlugin`, клавиши — `TMenuKeyboardPlugin`,
 * фокус, Escape и Tab — `TMenuFocusPlugin`, нажатие мимо — `TDismissPlugin`,
 * координаты панели у корня или у точки — `TAnchorPlugin` её Frame. Разметка
 * раскладывает то, что отдали ядро и плагины.
 */
export default {
	name: '_Menu',
	extends: BaseMenu,
	expose: useExpose(),
	setup(props: MenuProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(MenuDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
		const refs = useAdapter(adapter, props, emit)

		const collectionAdapter = createVueAdapterContext(
			MenuCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `completeEngine`
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useCollectionAdapter(collectionAdapter, props, emit)

		return joinBindings(refs, refsCollection)
	},
}
