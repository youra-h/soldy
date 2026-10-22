/**
 * setupMenuSubmenu — setup-слой пункта с подменю.
 *
 * Три контекста на одном наборе, как у Vue и Solid: собственный
 * (`MenuSubmenuDescriptor` — текст, открытость, наборы панели), фасад пункта
 * (`MenuCollectionItemDescriptor` — вход в коллекцию меню над ним) и фасад
 * меню (`MenuSubmenuCollectionDescriptor` — свои пункты). Пункт с подменю —
 * пункт меню, в котором стоит, и меню своих пунктов: фасад пункта берёт
 * лифтом (`getContext`) коллекцию меню над ним, а фасад меню опускает
 * (`setContext`) свою — её прочтут пункты в его панели.
 *
 * Порядок сборки здесь важен: фасад пункта — раньше фасада меню. Ключ у
 * коллекции один, а `getContext` Svelte читает карту компонента — копию слоя
 * предка вместе с его же `setContext`, и фасад пункта, собранный после фасада
 * меню, взял бы свою коллекцию вместо коллекции меню над ним. Временно, до
 * 869fkthx3: лифт сборки, которому порядок не важен.
 *
 * Готовая коллекция снаружи — как у меню: дали `engine` (подменю из данных
 * отдаёт свой движок пропом) — фасад работает на нём, не дали — соберёт свою.
 * Состояние у контекстов своё, а разметка читает его одним видом
 * (`joinState`); атрибуты корня — то, что не съел ни один из трёх.
 *
 * Отдаёт разметке ещё две вещи: `context` фасада пункта — нажатие строки —
 * метод item-адаптера `menu`, — и якорь панели — `rootElement` связки
 * подменю, геттером над руной адаптера.
 *
 * Логики здесь нет: открытие клавишами — `TMenuSubmenuKeyboardPlugin`,
 * наведением — `TMenuHoverPlugin` меню над подменю, фокус, Escape и Tab —
 * `TMenuSubmenuFocusPlugin`, нажатие и уход фокуса мимо — `TDismissPlugin`,
 * координаты панели у строки — `TAnchorPlugin` её Frame.
 */

import {
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
	TCollectionExtension,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	type TRootReceiver,
} from '../../../adapter'
import type { MenuSubmenuProps } from './base.component'

export function setupMenuSubmenu(
	getProps: () => MenuSubmenuProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const props = getProps()
	const adapter = createSvelteAdapterContext(MenuSubmenuDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})

	// Выход `dismiss_ownerAttribute` разметка кладёт спредом на панель
	const owner = useAdapter(adapter, getProps, receive)

	// В меню над ним — пункт. Раньше фасада меню: см. шапку
	const item = createSvelteAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: SvelteElevatorFactory })

	const facade = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	// Для своих пунктов — меню
	const collectionAdapter = createSvelteAdapterContext(
		MenuSubmenuCollectionDescriptor(),
		{ props, mountId, options: { owner: adapter.instance, engine: props.engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: SvelteElevatorFactory })

	const collectionBinding = useCollectionAdapter(
		collectionAdapter,
		getProps,
		() => facade.forwardProps,
	)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(joinState(facade.state, owner.state), collectionBinding.state),
		context: item.instance.context,

		get forwardProps() {
			return collectionBinding.forwardProps
		},

		get rootElement() {
			return owner.rootElement
		},
	}
}
