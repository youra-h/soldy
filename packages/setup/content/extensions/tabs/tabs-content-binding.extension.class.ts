/**
 * TTabsContentBindingExtension — связывает панель с её табом.
 *
 * Панель не регистрируется в коллекции: её нет в `items`. Она находит уже
 * существующий таб по совпадению `value` и берёт контекст этого таба
 * (`TItemContext`) — свой, на время монтирования: адаптеры те же, что у
 * `TTabsItemCollectionFacade`, но отпускает их панель сама — при перепривязке
 * к другому табу и при снятии. Общий с табом контекст, отпущенный одним из
 * них, сломал бы другого.
 *
 * Здесь же проставляется сторона панели в связке с табом — `id` и
 * `aria-labelledby` — прямо в `aria` панели. Это единственное место, где
 * известно, что панель нашла свой таб. Своей формулы `id` у панели нет: оба
 * значения записал таб (`TTabsItemIdsPlugin`) — `id` панели в своём
 * `aria-controls` и свой `id`, — и панель берёт ровно их. Формула одна, у
 * таба, и половинки не разойдутся. Таб смонтировали заново — у него новые
 * `id` (`change:aria`), и панель идёт за ним. При размонтировании панели
 * снимаются только её атрибуты.
 *
 * Перерешение нужно в двух случаях: панель смонтировалась раньше своего таба
 * (тогда ждём `item:added`) и у панели сменилось `value`.
 *
 * Работа разделена по фазам контекста, как у `TCollectionItemExtension`:
 *
 * - **сборка** — первое связывание. Оно пишет только своё — фасад панели и её
 *   `aria`. Таб из данных (`items`) в коллекции уже есть, а список табов
 *   рисуется раньше панелей, поэтому панель под него попадает в первую же
 *   отрисовку, в том числе серверную;
 * - **вход** (`attach` контекста) — связывание ещё раз и подписки на `item:added`
 *   движка, `change:value` панели и `change:aria` связанного таба. Табы
 *   разметки входят в коллекцию на своём `attach`, и панель, что стоит в
 *   документе после них, находит их вторым поиском. Подписки ждут входа,
 *   потому что шины не свои: движок — владельца, таб — коллекции, панель могла
 *   прийти снаружи (`ctrl`), а у React сборка идёт на рендере, и отброшенный
 *   рендер оставил бы на них лишнего подписчика;
 * - **снятие** (`destroy` контекста) — отписка, атрибуты панели и контекст
 *   таба. Контекст, собранный, но так и не принятый, уничтожается тоже:
 *   подписок входа у него нет, а атрибуты и контекст таба, взятые сборкой,
 *   уходят.
 */

import { TItemContext } from '@soldy-ui/core'
import type { ITabsItem, TTabsCollection, TTabsCollectionExtensions } from '@soldy-ui/core'
import type { TInstanceContext } from '../../../protected/adapter/context'
import { ITEM_CONTEXT_ELEVATOR } from '../../../protected/adapter/elevator/keys'
import type { TCollectionItemFacade } from '../collection'
import type { ITabsContentBindingOptions } from './types'

/** Таб, чьё значение совпало со значением панели. */
function findByValue(engine: TTabsCollection, value: unknown): ITabsItem | undefined {
	for (const item of engine.extensions.batch.items) {
		if (item.value === value) return item
	}

	return undefined
}

export class TTabsContentBindingExtension {
	constructor(
		context: TInstanceContext<TCollectionItemFacade>,
		options: ITabsContentBindingOptions,
	) {
		const { content, elevator } = options

		// Лифт отдаёт движок любой коллекции; над Tabs.Content это движок Tabs.
		const engine: TTabsCollection | undefined = elevator(ITEM_CONTEXT_ELEVATOR).up()

		if (!engine) return

		const extensions: TTabsCollectionExtensions = engine.extensions

		/** Таб, с которым связаны сейчас. */
		let boundItem: ITabsItem | undefined
		/** Контекст таба у фасада панели: его отпускает следующая привязка и снятие. */
		let boundContext: TItemContext<ITabsItem, TTabsCollectionExtensions> | undefined
		/** Контекст принят: на чужие шины уже можно подписываться. */
		let attached = false

		/** Сторона панели — то, что о связке записал таб. */
		const linkPanel = (): void => {
			if (!boundItem) return

			content.aria.add('id', boundItem.aria.get('aria-controls'))
			content.aria.add('aria-labelledby', boundItem.aria.get('id'))
		}

		const unbind = (): void => {
			if (attached) boundItem?.events.off('change:aria', linkPanel)

			content.aria.remove('id')
			content.aria.remove('aria-labelledby')

			boundItem = undefined
		}

		const resolve = (): void => {
			const item = findByValue(engine, content.value)

			if (item === boundItem) return

			unbind()

			if (!item) return

			const itemContext = new TItemContext(item, extensions)

			context.instance.setContext(itemContext)
			// Прежний контекст фасад больше не держит
			boundContext?.release()
			boundContext = itemContext

			boundItem = item

			if (attached) item.events.on('change:aria', linkPanel)

			linkPanel()
		}

		resolve()

		context.events.on('attach', () => {
			attached = true
			// Таб, найденный сборкой: подписка на него ждала входа
			boundItem?.events.on('change:aria', linkPanel)

			resolve()

			// Панель могла смонтироваться раньше своего таба
			engine.extensions.plain.events.on('item:added', resolve)
			content.events.on('change:value', resolve)
		})

		context.events.on('destroy', () => {
			engine.extensions.plain.events.off('item:added', resolve)
			content.events.off('change:value', resolve)

			unbind()
			attached = false
			// Фасад — без контекста: чтение после снятия создало бы адаптеры заново
			context.instance.clearContext()
			boundContext?.release()
		})
	}
}
