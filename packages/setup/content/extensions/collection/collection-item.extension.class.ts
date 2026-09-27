/**
 * TCollectionItemExtension — элемент коллекции: сборка при монтировании и вход в коллекцию.
 *
 * Режим фасада: facade + itemDescriptor (Tabs/Accordion/...).
 *
 * Работа разделена на два шага, и разделяет их момент, а не смысл:
 *
 * - **сборка** (конструктор) — движок и регистратор через лифт, контекст
 *   элемента в фасад, `meta` из пропсов. Ничего чужого она не трогает;
 * - **вход** (`join()`) — регистрация в коллекции владельца и `meta.apply`.
 *   Это запись в чужое хранилище, и зовёт её адаптер в момент монтирования
 *   своего фреймворка: Vue — сразу в `setup()`, React — при коммите. На
 *   рендере React вход был бы ошибкой: отброшенный рендер оставил бы в
 *   движке фантом, а элемент, добавленный после монтирования, обновлял бы
 *   владельца посреди рендера ребёнка.
 *
 * Снятие — при уничтожении контекста. Повторный вход и вход после
 * уничтожения ничего не делают: уничтоженный набор в коллекцию не войдёт, а
 * живой не войдёт дважды.
 */

import { TItemContextRegistry } from '@soldy-ui/core'
import type { TCollectionEngine } from '@soldy-ui/core'
import type { TInstanceContext } from '../../../protected/adapter/context'
import type { TCollectionItemRegister } from '../../../protected/adapter/elevator'
import {
	COLLECTION_ENGINE_ELEVATOR,
	ITEM_CONTEXT_ELEVATOR,
} from '../../../protected/adapter/elevator/keys'
import { collectItemProps } from './item-props'
import type { ICollectionItemExtensionOptions, TCollectionItemFacade } from './types'

export class TCollectionItemExtension {
	private readonly _context: TInstanceContext<TCollectionItemFacade>
	private readonly _item: object
	private readonly _engine: TCollectionEngine<any, any> | undefined
	private readonly _register: TCollectionItemRegister | undefined
	/** Пропсы элемента для `meta` движка — из пропсов сборки. */
	private readonly _meta: Record<string, unknown>

	/** Вход уже был или контекст уничтожен: второй раз элемент не входит. */
	private _closed = false
	private _leave: (() => void) | undefined

	constructor(
		context: TInstanceContext<TCollectionItemFacade>,
		options: ICollectionItemExtensionOptions,
	) {
		const { item, elevator } = options

		this._context = context
		this._item = item
		this._engine = elevator(ITEM_CONTEXT_ELEVATOR).up()
		this._register = elevator(COLLECTION_ENGINE_ELEVATOR).up()
		this._meta = collectItemProps(context.descriptor.props, context.props)

		// context.instance — item-фасад, созданный item-дескриптором. Контекст
		// элемента он получает при сборке: разметка читает его с первой отрисовки
		if (this._engine) {
			const registry = new TItemContextRegistry(this._engine.getCore())

			context.instance.setContext(registry.get(item))
		}

		context.events.on('destroy', () => {
			this._closed = true
			this._leave?.()
			this._leave = undefined
		})
	}

	/** Войти в коллекцию владельца: регистрация и `meta` элемента. */
	join(): void {
		if (this._closed) return

		this._closed = true

		if (this._register) this._leave = this._register(this._item, this._context.bundle)

		if (this._engine?.extensions.meta) this._engine.extensions.meta.apply(this._item, this._meta)
	}
}
