/**
 * setupMenu — setup-слой Menu.
 *
 * Два контекста, как у Vue, Solid и ListBox: собственный (`MenuDescriptor` —
 * открытость, сторона, способ открытия, точка вызова, наборы связки) и фасада
 * коллекции (`MenuCollectionDescriptor` — пункты, группы, подменю из данных)
 * на общем наборе, одной связкой.
 *
 * Расширение коллекции опускает движок и регистратор пунктов лифтом — хосту
 * меню: пункты в панели находят их вверх по документу — от увезённой панели
 * поиск идёт к её якорю, в корень меню — и входят в коллекцию меню, а пункты
 * подменю — в коллекцию своего подменю, ближайшую.
 *
 * `engine` — готовая коллекция снаружи, свойство элемента (`el.engine`):
 * фасад работает на ней, а без неё собирает свою (`completeEngine`).
 *
 * Логики здесь нет: открытие — клик по кнопке или контекстное меню у точки
 * вызова — и наведение — `TMenuPointerPlugin`, клавиши — `TMenuKeyboardPlugin`,
 * фокус, Escape и Tab — `TMenuFocusPlugin`, нажатие мимо — `TDismissPlugin`,
 * координаты панели у корня или у точки — `TAnchorPlugin` её Frame. Шаблон
 * раскладывает то, что отдали ядро и плагины: связку — панели и триггеру, а
 * выход `dismiss_ownerAttribute` — пометкой на панель.
 */

import {
	MenuCollectionDescriptor,
	MenuDescriptor,
	TCollectionExtension,
	type DescriptorPluginOutputs,
} from '@soldy-ui/setup'
import type { IMenu, TMenuCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

/** Выходы плагинов Menu — их читает шаблон: пометку панели владельцем. */
export type TMenuOutputs = DescriptorPluginOutputs<typeof MenuDescriptor>

export function setupMenu(
	host: HTMLElement,
	ctrl: IMenu | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IMenu, TMenuCollectionFacade, TMenuOutputs> {
	const adapter = createWebcAdapterContext(host, MenuDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter, host, onUpdate)

	const collectionAdapter = createWebcAdapterContext(
		host,
		MenuCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: createWebcElevator(host) })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, host, onUpdate))
}
