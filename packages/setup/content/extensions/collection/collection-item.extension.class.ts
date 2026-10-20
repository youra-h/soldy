/**
 * TCollectionItemExtension — элемент коллекции: сборка при монтировании и вход в коллекцию.
 *
 * Режим фасада: facade + itemDescriptor (Tabs/Accordion/...).
 *
 * Работа разделена по фазам контекста:
 *
 * - **сборка** (конструктор) — движок своей коллекции, её регистратор и
 *   связка группы разметки над элементом через лифт, контекст элемента в
 *   фасад, `meta` из пропсов. В чужое хранилище она не пишет. Пропсы сборки
 *   контекст держит до `connect()`, поэтому расширение ставят до него — сразу
 *   за сборкой контекста;
 * - **вход** (`attach` контекста) — регистрация в коллекции владельца и
 *   `meta.apply`. Это запись в чужое хранилище, поэтому она ждёт, пока
 *   фреймворк примет компонент: у React сборка идёт на рендере, и отброшенный
 *   рендер оставил бы в движке фантом, а элемент, добавленный после
 *   монтирования, обновлял бы владельца посреди рендера ребёнка;
 * - **снятие** (`destroy` контекста) — выход из коллекции и освобождение
 *   контекста элемента.
 *
 * Когда наступает `attach`, решает рантайм адаптера.
 *
 * Своя коллекция — ближайшая выше по дереву, если элемент её. Лифт отдаёт
 * движок ближайшей коллекции, а она бывает чужой: тег вне Tags под
 * `<Toasts>`, который оборачивает приложение, тег или радио в панели Tabs.
 * Чей элемент, знает фабрика движка (`factoryOf`): всё, что не элемент её
 * класса (`isSource`), она превращает в новый элемент своего класса, — радио,
 * вошедшее из панели в Tabs, становилось табом. А фасаду элемента нужны
 * расширения своей коллекции — тегу выбор, — и под чужой без них сборка
 * падала. Набор расширений признаком не годится: при совпавшем чужая
 * коллекция прошла бы проверку (радио под Tabs).
 *
 * Чужая коллекция — как будто её нет: ни контекста, ни входа, ни `meta`, и
 * элемент рисуется сам по себе, как тег-чип без набора. Выше лифт не ищет —
 * он отдаёт только ближайший слой. Предупреждения нет: под `<Toasts>` почти
 * любой одиночный элемент стоит под чужой коллекцией, и это законный случай.
 *
 * Контекст элемента (`TItemContext`) — этого монтирования и живёт ровно
 * столько же: сборка отдаёт его фасаду, снятие отвязывает от фасада и
 * отпускает (`release`). Его item-адаптеры подписаны на расширения движка, а
 * движок живёт дольше монтирования: элемент из данных (`items`) остаётся в
 * коллекции, когда фильтр или страница его прячут, и монтируется заново,
 * когда показывают, а React пересобирает элемент, не размонтируя
 * (StrictMode, `<Activity>`). Неотпущенный контекст оставлял бы на движке
 * подписчиков с каждым показом. Отвязать фасад так же обязательно: React
 * перечитывает состояние уже уничтоженной сборки, и фасад, державший
 * отпущенный контекст, создал бы адаптеры заново. Один контекст на элемент
 * для всех монтирований не заводится: таб и его панель берут контекст одного
 * элемента, и освобождение одним сломало бы другого.
 *
 * Удалили элемент из коллекции, пока он смонтирован, — контекст уничтожается
 * (`TItemContext.destroy`): адаптеры отпущены, элемент больше не рисуется.
 * Выход элемента разметки при снятии удалением не считается: элемент уходит
 * из коллекции потому, что кончилось его монтирование, и `rendered` чужого
 * `ctrl` остаётся его — смонтированный снова, он рисуется.
 *
 * Элемент внутри группы разметки (`Menu.Group`, `ListBox.Group` и соседи)
 * входит в её группу: ключ, который опускает проводка группы
 * (`TItemGroupExtension`), ложится в `meta` элемента меткой `group` — тем же
 * каналом, что `_.group` в данных. Ключ берёт только элемент, которого вход
 * добавляет в состав (сверка — до регистрации, как `owned` у регистратора):
 * у элемента из данных метка своя, из данных, даже когда владелец рисует его
 * в группе секции. И только из своей коллекции: пункты подменю в группе меню
 * — элементы коллекции подменю, а не меню.
 */

import { TItemContext, batchOf, factoryOf, metaOf, plainOf } from '@soldy-ui/core'
import type { TCollectionEngine, TRemoveEvent } from '@soldy-ui/core'
import type { TInstanceContext } from '../../../protected/adapter/context'
import {
	COLLECTION_ENGINE_ELEVATOR,
	ITEM_CONTEXT_ELEVATOR,
} from '../../../protected/adapter/elevator/keys'
import { ITEM_GROUP_ELEVATOR } from '../item-group/keys'
import { collectItemProps } from './item-props'
import type { ICollectionItemExtensionOptions, TCollectionItemFacade } from './types'

/** Движок ближайшей коллекции, если элемент её: фабрика признаёт его своим. */
function ownEngine(
	engine: TCollectionEngine<any, any> | undefined,
	item: object,
): TCollectionEngine<any, any> | undefined {
	const factory = factoryOf(engine)

	return factory && !factory.isSource(item) ? engine : undefined
}

export class TCollectionItemExtension {
	private _leave: (() => void) | undefined

	constructor(
		context: TInstanceContext<TCollectionItemFacade>,
		options: ICollectionItemExtensionOptions,
	) {
		const { item, elevator } = options
		const { props } = context

		// Пропсы сборки контекст отпускает на `connect()`. Пустой `meta` вместо
		// ошибки молча потерял бы `selected` и `active` из разметки
		if (!props) {
			throw new Error(
				'TCollectionItemExtension ставится до connect(): пропсы сборки, из которых берётся meta элемента, контекст уже отпустил',
			)
		}

		// Чужая коллекция — как будто её нет
		const engine = ownEngine(elevator(ITEM_CONTEXT_ELEVATOR).up(), item)
		// Регистратор кладёт тот же владелец, что и движок: у чужой коллекции
		// и он чужой
		const register = engine ? elevator(COLLECTION_ENGINE_ELEVATOR).up() : undefined
		// Группа разметки над элементом — если она группа его коллекции
		const link = engine ? elevator(ITEM_GROUP_ELEVATOR).up() : undefined
		const groupKey = link && link.engine === engine ? link.key : undefined
		// Пропсы элемента для `meta` движка — из пропсов сборки
		const meta = collectItemProps(context.descriptor.props, props)
		// Контекст элемента — этого монтирования. Фасад получает его при сборке:
		// разметка читает его с первой отрисовки
		const itemContext = engine ? new TItemContext(item, engine.extensions) : undefined
		const plain = plainOf<object>(engine)

		if (itemContext) context.instance.setContext(itemContext)

		// Элемент удалили из коллекции, пока он смонтирован
		const removed = (e: TRemoveEvent<object>): void => {
			if (e.item === item) itemContext?.destroy()
		}

		context.events.on('attach', () => {
			plain?.events.on('item:removed', removed)

			// Ключ группы разметки — только элементу, которого вход добавит в
			// состав: у элемента из данных метка группы — из данных
			const grouped = groupKey !== undefined && !batchOf<object>(engine)?.items.includes(item)

			if (register) this._leave = register(item, context.bundle)

			// `meta` — после регистрации: движок применяет его к элементу, который уже в нём
			metaOf<object>(engine)?.apply(item, grouped ? { ...meta, group: groupKey } : meta)
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
