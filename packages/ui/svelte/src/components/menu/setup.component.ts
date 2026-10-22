/**
 * setupMenu — setup-слой Menu.
 *
 * Два контекста, как у Vue и ListBox: свой (`MenuDescriptor` — открытость,
 * сторона, наборы связки) и фасада коллекции (`MenuCollectionDescriptor` —
 * пункты) на общем наборе: плагины меню видят его коллекцию. Оба собираются
 * один раз, при инициализации компонента, с тем же id монтирования
 * (`$props.id()`): фасад делит набор меню, и id у него меню.
 *
 * Расширение коллекции опускает движок и регистратор пунктов лифтом
 * (`setContext`): пункт, смонтированный в панели, прочтёт их при своей
 * инициализации и войдёт в коллекцию меню. Панель телепортирована, и
 * контексты места ей отдаёт `Teleport`.
 *
 * Состояние у контекстов своё, а разметка читает его одним видом
 * (`joinState`); атрибуты корня — то, что не съели ни меню, ни фасад.
 *
 * Логики здесь нет: открытие — клик по кнопке или контекстное меню у точки
 * вызова — и наведение — `TMenuPointerPlugin` и `TMenuHoverPlugin`, клавиши —
 * `TMenuKeyboardPlugin`, фокус, Escape и Tab — `TMenuFocusPlugin`, нажатие
 * мимо — `TDismissPlugin`, координаты панели у корня или у точки —
 * `TAnchorPlugin` её Frame. Разметка раскладывает то, что отдали ядро и
 * плагины. Якорь панели — `rootElement` связки меню, геттером над руной
 * адаптера: разметка следит за ним, как за состоянием.
 */

import { MenuCollectionDescriptor, MenuDescriptor, TCollectionExtension } from '@soldy-ui/setup'
import {
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	type TRootReceiver,
} from '../../adapter'
import type { MenuProps } from './base.component'

export function setupMenu(getProps: () => MenuProps, mountId: string, receive: TRootReceiver) {
	const props = getProps()
	const adapter = createSvelteAdapterContext(MenuDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})

	// Выход `dismiss_ownerAttribute` разметка кладёт спредом на панель
	const owner = useAdapter(adapter, getProps, receive)

	const collectionAdapter = createSvelteAdapterContext(
		MenuCollectionDescriptor(),
		{
			props,
			mountId,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: SvelteElevatorFactory })

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

		get rootElement() {
			return owner.rootElement
		},
	}
}
