/**
 * TCollectionItemExtension — элемент коллекции: сборка при монтировании и вход в коллекцию.
 *
 * Режим фасада: facade + itemDescriptor (Tabs/Accordion/...).
 *
 * Работа разделена по фазам контекста:
 *
 * - **сборка** (конструктор) — движок и регистратор через лифт, контекст
 *   элемента в фасад, `meta` из пропсов. В чужое хранилище она не пишет;
 * - **вход** (`attach` контекста) — регистрация в коллекции владельца и
 *   `meta.apply`. Это запись в чужое хранилище, поэтому она ждёт, пока
 *   фреймворк примет компонент: сборка, которую отбросили, не приняв,
 *   оставила бы в движке фантом, а элемент, добавленный после монтирования,
 *   обновлял бы владельца посреди отрисовки ребёнка;
 * - **снятие** (`destroy` контекста) — выход из коллекции и освобождение
 *   контекста элемента.
 *
 * Когда наступает `attach`, решает рантайм адаптера.
 *
 * Контекст элемента (`TItemContext`) — этого монтирования и живёт ровно
 * столько же: сборка отдаёт его фасаду, снятие отвязывает от фасада и
 * отпускает (`release`). Движок живёт дольше монтирования: элемент из данных
 * (`items`) остаётся в коллекции, когда фильтр или страница его прячут, и
 * монтируется заново, когда показывают, а сборку элемента бывает, что и
 * повторяют, не размонтируя. На расширения движка item-адаптеры подписаны
 * пробросами, и те висят, пока фасад слушает связка фреймворка: сборка,
 * которую так и не приняли, на движке ничего не оставляет. Отпускание —
 * конец адаптеров, не зависящий от слушателей. Отвязать фасад нужно, чтобы
 * снятый фасад читался как элемент вне коллекции: состояние уничтоженной
 * сборки бывает, что и перечитывают, и фасад, державший отпущенный контекст,
 * создал бы на этом чтении адаптеры монтирования, которого уже нет. Один
 * контекст на элемент для всех монтирований не заводится: таб и его панель
 * берут контекст одного элемента, и освобождение одним сломало бы другого.
 *
 * Удалили элемент из коллекции, пока он смонтирован, — контекст уничтожается
 * (`TItemContext.destroy`): адаптеры отпущены, элемент больше не рисуется.
 * Выход элемента разметки при снятии удалением не считается: элемент уходит
 * из коллекции потому, что кончилось его монтирование, и `rendered` чужого
 * `ctrl` остаётся его — смонтированный снова, он рисуется.
 */

import { TItemContext } from '@soldy-ui/core'
import type { TPlainExtension, TRemoveEvent } from '@soldy-ui/core'
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
		// Контекст элемента — этого монтирования. Фасад получает его при сборке:
		// разметка читает его с первой отрисовки
		const itemContext = engine ? new TItemContext(item, engine.extensions) : undefined
		const plain: TPlainExtension<object> | undefined = engine?.extensions.plain

		if (itemContext) context.instance.setContext(itemContext)

		// Элемент удалили из коллекции, пока он смонтирован
		const removed = (e: TRemoveEvent<object>): void => {
			if (e.item === item) itemContext?.destroy()
		}

		context.events.on('attach', () => {
			plain?.events.on('item:removed', removed)

			if (register) this._leave = register(item, context.bundle)

			// `meta` — после регистрации: движок применяет его к элементу, который уже в нём
			engine?.extensions.meta?.apply(item, meta)
		})

		context.events.on('destroy', () => {
			// Подписка снимается до выхода: свой выход — не удаление из коллекции
			plain?.events.off('item:removed', removed)

			this._leave?.()
			this._leave = undefined

			// Фасад — без контекста: чтение после снятия создало бы адаптеры заново
			context.instance.clearContext()
			itemContext?.release()
		})
	}
}
