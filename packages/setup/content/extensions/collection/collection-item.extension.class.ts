/**
 * TCollectionItemExtension — элемент коллекции: сборка при монтировании и вход в коллекцию.
 *
 * Режим фасада: facade + itemDescriptor (Tabs/Accordion/...).
 *
 * Работа разделена по фазам контекста:
 *
 * - **сборка** (конструктор) — движок и регистратор через лифт, контекст
 *   элемента в фасад, `meta` из пропсов. Ничего чужого она не трогает;
 * - **вход** (`attach` контекста) — регистрация в коллекции владельца и
 *   `meta.apply`. Это запись в чужое хранилище, поэтому она ждёт, пока
 *   фреймворк примет компонент: у React сборка идёт на рендере, и отброшенный
 *   рендер оставил бы в движке фантом, а элемент, добавленный после
 *   монтирования, обновлял бы владельца посреди рендера ребёнка;
 * - **снятие** (`destroy` контекста).
 *
 * Когда наступает `attach`, решает рантайм адаптера.
 */

import { TItemContextRegistry } from '@soldy-ui/core'
import type { TInstanceContext } from '../../../protected/adapter/context'
import {
	COLLECTION_ENGINE_ELEVATOR,
	ITEM_CONTEXT_ELEVATOR,
} from '../../../protected/adapter/elevator/keys'
import { collectItemProps } from './item-props'
import type { ICollectionItemExtensionOptions, TCollectionItemFacade } from './types'

export class TCollectionItemExtension {
	private _leave: (() => void) | undefined

	constructor(
		context: TInstanceContext<TCollectionItemFacade>,
		options: ICollectionItemExtensionOptions,
	) {
		const { item, elevator } = options
		const engine = elevator(ITEM_CONTEXT_ELEVATOR).up()
		const register = elevator(COLLECTION_ENGINE_ELEVATOR).up()
		// Пропсы элемента для `meta` движка — из пропсов сборки
		const meta = collectItemProps(context.descriptor.props, context.props)

		// context.instance — item-фасад, созданный item-дескриптором. Контекст
		// элемента он получает при сборке: разметка читает его с первой отрисовки
		if (engine) {
			const registry = new TItemContextRegistry(engine.getCore())

			context.instance.setContext(registry.get(item))
		}

		context.events.on('attach', () => {
			if (register) this._leave = register(item, context.bundle)

			// `meta` — после регистрации: движок применяет его к элементу, который уже в нём
			engine?.extensions.meta?.apply(item, meta)
		})

		context.events.on('destroy', () => {
			this._leave?.()
			this._leave = undefined
		})
	}
}
