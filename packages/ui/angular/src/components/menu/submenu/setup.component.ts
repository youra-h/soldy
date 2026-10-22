import {
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
	TCollectionExtension,
	TCollectionItemExtension,
	type DescriptorPluginOutputs,
} from '@soldy-ui/setup'
import type {
	IMenuSubmenu,
	IMenuSubmenuProps,
	TMenuCollectionFacade,
	TMenuItemCollectionFacade,
} from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/** Выходы плагинов подменю — их читает шаблон: пометку панели владельцем. */
export type TMenuSubmenuOutputs = DescriptorPluginOutputs<typeof MenuSubmenuDescriptor>

/**
 * setupMenuSubmenu — setup-слой пункта с подменю.
 *
 * Три контекста на одном наборе, как у Vue, Solid и Web Components:
 * собственный (`MenuSubmenuDescriptor` — текст, открытость, наборы панели),
 * фасад пункта (`MenuCollectionItemDescriptor` — вход в коллекцию меню над ним)
 * и фасад меню (`MenuSubmenuCollectionDescriptor` — свои пункты). Пункт с
 * подменю — пункт меню, в котором стоит, и меню своих пунктов. Одной связкой
 * их сводит `joinBindings` третьим параметром: состояние — одним видом, входы и
 * события — всех трёх, а фасад, через контекст которого шаблон зовёт нажатие
 * строки, — фасад пункта.
 *
 * Коллекции у пункта и его пунктов разные по построению, в каком бы порядке
 * сборка ни звала лифт: фасад пункта читает слой над подменю (`up()` —
 * `skipSelf`) — коллекцию меню над ним, — а фасад меню пишет свой (`down()` —
 * в слой подменю, `provideElevator()` в его `providers`), и его находят пункты
 * подменю — разметкой в его содержимом и из данных в его шаблоне.
 *
 * Готовая коллекция снаружи — как у меню: дали `engine` (подменю из данных
 * получает свой движок входом от меню над ним) — фасад работает на нём, не
 * дали — соберёт свою (`completeEngine`).
 *
 * Логики здесь нет: открытие клавишами — `TMenuSubmenuKeyboardPlugin`,
 * наведением — `TMenuHoverPlugin` меню над подменю, фокус, Escape и Tab —
 * `TMenuSubmenuFocusPlugin`, нажатие и уход фокуса мимо — `TDismissPlugin`,
 * координаты панели у строки — `TAnchorPlugin` её Frame.
 */
export function setupMenuSubmenu(
	ctrl: IMenuSubmenu | undefined,
	props: object,
	engine: IMenuSubmenuProps['engine'],
): TBinding<IMenuSubmenu, TMenuItemCollectionFacade, TMenuSubmenuOutputs, TMenuCollectionFacade> {
	const adapter = createAngularAdapterContext(MenuSubmenuDescriptor(), { ctrl, props })
	// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
	const owner = useAdapter(adapter)

	// В меню над ним — пункт
	const item = createAngularAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	// Для своих пунктов — меню
	const menu = createAngularAdapterContext(
		MenuSubmenuCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item), useCollectionAdapter(menu))
}
