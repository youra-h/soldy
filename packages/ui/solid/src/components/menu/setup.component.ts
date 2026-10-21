/**
 * setupMenu — setup-слой Menu.
 *
 * Два контекста, как у Vue и ListBox: свой (`MenuDescriptor` — открытость,
 * сторона, наборы связки) и фасада коллекции (`MenuCollectionDescriptor` —
 * пункты) на общем наборе: плагины меню видят его коллекцию. Оба собираются
 * один раз, при выполнении тела компонента; фасад делит набор меню, и id
 * монтирования у него меню.
 *
 * Расширение коллекции опускает движок и регистратор пунктов в слой лифта
 * меню (`useElevator`), детям его отдаёт `Elevate` в разметке: пункт,
 * смонтированный в панели, прочтёт их при своей сборке и войдёт в коллекцию
 * меню.
 *
 * Состояние у контекстов своё, а разметка читает его одним видом
 * (`joinState`); атрибуты корня — то, что не съели ни меню, ни фасад.
 *
 * Логики здесь нет: открытие — клик по кнопке или контекстное меню у точки
 * вызова — и наведение — `TMenuPointerPlugin` и `TMenuHoverPlugin`, клавиши —
 * `TMenuKeyboardPlugin`, фокус, Escape и Tab — `TMenuFocusPlugin`, нажатие
 * мимо — `TDismissPlugin`, координаты панели у корня или у точки —
 * `TAnchorPlugin` её Frame. Разметка раскладывает то, что отдали ядро и
 * плагины.
 */

import { MenuCollectionDescriptor, MenuDescriptor, TCollectionExtension } from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { MenuProps } from './base.component'

export function setupMenu(props: MenuProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(MenuDescriptor(), { ctrl: props.ctrl, props })
	// Выход `dismiss_ownerAttribute` разметка раскладывает на панель
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		MenuCollectionDescriptor(),
		{
			props,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		rootElement: owner.rootElement,
		state: joinState(owner.state, collectionBinding.state),
		forwardProps: collectionBinding.forwardProps,
		layer,
	}
}
