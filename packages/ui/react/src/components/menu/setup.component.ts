/**
 * useSetupMenu — setup-слой Menu (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у ListBox: свой (`MenuDescriptor` —
 * открытость, сторона, наборы связки) и фасада коллекции
 * (`MenuCollectionDescriptor` — пункты) на общем наборе: плагины меню видят
 * его коллекцию. Фасад собран на инстансе меню, поэтому пересобираются и
 * уничтожаются они вместе.
 *
 * Расширение коллекции опускает движок и регистратор пунктов лифтом
 * компонента; детям его слой (`layer`) отдаёт `Elevate` в разметке: пункт,
 * смонтированный в панели, прочтёт их при своей сборке и при коммите войдёт в
 * коллекцию меню.
 *
 * Корень служит панели якорем, а разметке он нужен значением рендера: его
 * отдаёт хук адаптера `useRootElement` — `null` на сервере и до коммита, узел
 * после, — как у Popover.
 *
 * Логики здесь нет: открытие — клик по кнопке или контекстное меню у точки
 * вызова — и наведение — `TMenuPointerPlugin` и `TMenuHoverPlugin`, клавиши —
 * `TMenuKeyboardPlugin`, фокус, Escape и Tab — `TMenuFocusPlugin`, нажатие
 * мимо — `TDismissPlugin`, координаты панели у корня или у точки —
 * `TAnchorPlugin` её Frame. Разметка раскладывает то, что отдали ядро и
 * плагины.
 */

import { MenuCollectionDescriptor, MenuDescriptor, TCollectionExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter, useRootElement } from '../../adapter'
import type { MenuProps } from './base.component'

export function useSetupMenu(props: MenuProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(MenuDescriptor(), { ctrl: props.ctrl, props })

		const collectionAdapter = create(
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

		return [adapter, collectionAdapter] as const
	})

	// Выход `dismiss_ownerAttribute` разметка раскладывает на панель
	const owner = useAdapter(adapter, props)
	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: collectionBinding.forwardProps,
		state: { ...owner.state, ...collectionBinding.state },
		rootElement: useRootElement(owner.root),
		layer,
	}
}
