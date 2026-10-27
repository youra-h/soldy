/**
 * TTabsContentBindingExtension — связывает панель с её табом.
 *
 * Панель не регистрируется в коллекции: её нет в `items`. Она находит уже
 * существующий таб по совпадению `value` и берёт контекст этого таба
 * (`TItemContext`) — свой, на время монтирования: адаптеры те же, что у
 * `TTabsItemCollectionFacade`, но отпускает их панель сама — при перепривязке
 * к другому табу или ни к какому и при снятии. Общий с табом контекст,
 * отпущенный одним из них, сломал бы другого. У панели без таба контекста нет
 * вовсе: иначе её `active` отвечал бы за прежний таб. Что активность панели
 * сменилась вместе с контекстом, сообщает фасад — связка его только меняет.
 *
 * Здесь же проставляется сторона панели в связке с табом — `id` и
 * `aria-labelledby` — прямо в `aria` панели. Это единственное место, где
 * известно, что панель нашла свой таб. Своей формулы `id` у панели нет: таб
 * (`TTabsItemIdsPlugin`) записал `id` панели в свой `aria-controls` и свой
 * `id`, и панель берёт ровно их. Формула одна, у таба, и половинки не
 * разойдутся. Таб смонтировали заново или сменили его `id` в `TIdPlugin` — у
 * него новые `id` (`change:aria`), и панель идёт за ним.
 *
 * `id`, который панели задало приложение (`TIdPlugin` панели), главнее
 * формулы: он встаёт на панель — с первой отрисовки и без таба тоже, узел
 * его, — и на него ведёт `aria-controls` таба. Пишет `aria-controls` только
 * плагин таба, поэтому принятая панель отдаёт ему свой `TIdPlugin`
 * (`bindPanel`), а при отвязке и снятии забирает (`unbindPanel`) — ссылка
 * снова на формулу. Плагин таба — нынешнего его монтирования — панель берёт
 * из реестра наборов коллекции (`TCollectionBundlesPlugin`), который владелец
 * опускает рядом с движком (`COLLECTION_BUNDLES_ELEVATOR`). Набор таба входит
 * в реестр на входе таба — бывает, позже панели, и заново, когда таб
 * смонтировали снова, — поэтому панель отдаёт свой `id` и на каждую
 * регистрацию (`bundle:registered`).
 *
 * Перерешение нужно в двух случаях: панель смонтировалась раньше своего таба
 * (тогда ждём `item:added`) и у панели сменилось `value`.
 *
 * Таб ищется только в движке Tabs — в том, где стоит расширение табов
 * (`TTabsExtension`). Лифт отдаёт движок ближайшей коллекции, и она бывает
 * чужой: панель вне своих табов под `<Toasts>`, который оборачивает
 * приложение. Чужая коллекция — как будто её нет, как у элемента коллекции
 * (`TCollectionItemExtension`): иначе панель связалась бы с чужим элементом,
 * чьё `value` совпало, — молча под RadioGroup и с падением сборки там, где
 * активации нет.
 *
 * Работа разделена по фазам контекста, как у `TCollectionItemExtension`:
 *
 * - **сборка** — первое связывание. Оно пишет только своё — фасад панели и её
 *   `aria`. Таб из данных (`items`) в коллекции уже есть, а список табов
 *   рисуется раньше панелей, поэтому панель под него попадает в первую же
 *   отрисовку, в том числе серверную. `aria-controls` таба в ней — на формулу:
 *   таб нарисован раньше, чем собралась панель;
 * - **вход** (`attach` контекста) — связывание ещё раз, сторона таба и
 *   подписки на `item:added` движка, `bundle:registered` реестра,
 *   `change:value` панели, `change:id` её `TIdPlugin` и `change:aria`
 *   связанного таба. Табы разметки входят в коллекцию на своём `attach`, и
 *   панель, что стоит в документе после них, находит их вторым поиском.
 *   Подписки и запись табу ждут входа, потому что шины и таб не свои: движок и
 *   реестр — владельца, таб — коллекции, панель могла прийти снаружи (`ctrl`),
 *   а у React сборка идёт на рендере, и отброшенный рендер оставил бы на них
 *   лишнего подписчика, а у таба — `id` панели, которой нет. Поэтому таб,
 *   найденный сборкой, вход перечитывает после подписки: то, что он записал о
 *   связке между сборкой и входом (у React — `id` таба в его `TIdPlugin`
 *   эффектом), иначе до панели не дошло бы;
 * - **снятие** (`destroy` контекста) — отписка, атрибуты панели, её `id` у
 *   таба и контекст таба. Контекст, собранный, но так и не принятый,
 *   уничтожается тоже: подписок входа у него нет, а атрибуты и контекст таба,
 *   взятые сборкой, уходят.
 *
 * An accepted panel is a member of the collection (`TCollectionMembers`), as
 * an item is: the owner's `detach` detaches its own context and the facade's,
 * and the panel does not hear the tabs go.
 */

import { TItemContext, TTabsExtension } from '@soldy-ui/core'
import type {
	ITabsItem,
	TCollectionEngine,
	TTabsCollection,
	TTabsCollectionExtensions,
} from '@soldy-ui/core'
import { TIdPlugin, TTabsItemIdsPlugin } from '@soldy-ui/plugins'
import type { TCollectionBundlesPlugin } from '@soldy-ui/plugins'
import type { TInstanceContext } from '../../../protected/adapter/context'
import { ITEM_CONTEXT_ELEVATOR } from '../../../protected/adapter/elevator/keys'
import type { TCollectionItemFacade } from '../collection'
import { COLLECTION_BUNDLES_ELEVATOR, COLLECTION_MEMBERS_ELEVATOR } from '../collection/keys'
import type { ITabsContentBindingOptions } from './types'

/** Движок Tabs: в нём стоит расширение табов. Движок другой коллекции панели чужой. */
function isTabsEngine(engine: TCollectionEngine<any, any> | undefined): engine is TTabsCollection {
	return engine?.extensions.tabs instanceof TTabsExtension
}

/** Реестр наборов той коллекции, чей движок у панели: реестр другой ей чужой. */
function registryOf(
	bundles: TCollectionBundlesPlugin | null | undefined,
	engine: TTabsCollection,
): TCollectionBundlesPlugin | undefined {
	return bundles?.engine === engine ? bundles : undefined
}

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
		const { elevator } = options
		const content = options.content.instance

		// Лифт отдаёт движок ближайшей коллекции, и она бывает не Tabs. Чужая —
		// как будто её нет: панель — ни с каким табом, и работы у связки нет
		const engine = elevator(ITEM_CONTEXT_ELEVATOR).up()

		if (!isTabsEngine(engine)) return

		const extensions: TTabsCollectionExtensions = engine.extensions
		/** Наборы табов: в нём панель находит плагин связок своего таба. */
		const bundles = registryOf(elevator(COLLECTION_BUNDLES_ELEVATOR).up(), engine)
		/** Members of the same collection: lifted beside the engine, as the registry. */
		const members = elevator(COLLECTION_MEMBERS_ELEVATOR).up()
		/** `id`, который панели задало приложение. */
		const idPlugin = context.bundle?.get(TIdPlugin)

		/** Таб, с которым связаны сейчас. */
		let boundItem: ITabsItem | undefined
		/**
		 * Контекст таба у фасада панели. Отпускает его отвязка: перед новой
		 * привязкой и при снятии.
		 */
		let boundContext: TItemContext<ITabsItem, TTabsCollectionExtensions> | undefined
		/** Плагин связок таба, которому панель отдала свой `TIdPlugin`. */
		let boundIds: TTabsItemIdsPlugin | undefined
		/** Контекст принят: на чужие шины уже можно подписываться. */
		let attached = false

		/**
		 * Сторона панели: свой `id` приложения, иначе тот, что записал таб, и
		 * ссылка на таб. Без таба остаётся только свой `id`.
		 */
		const linkPanel = (): void => {
			content.aria.add('id', idPlugin?.id ?? boundItem?.aria.get('aria-controls'))
			content.aria.add('aria-labelledby', boundItem?.aria.get('id'))
		}

		/** Таб больше не ведёт `aria-controls` по этой панели — снова на формулу. */
		const unlinkTab = (): void => {
			if (idPlugin) boundIds?.unbindPanel(idPlugin)

			boundIds = undefined
		}

		/**
		 * Сторона таба: его плагин связок ведёт `aria-controls` на `id` панели.
		 * Только у принятой панели — таб ей чужой, — и плагин нынешнего
		 * монтирования таба: у таба, смонтированного заново, он новый.
		 */
		const linkTab = (): void => {
			const ids =
				idPlugin && attached && boundItem
					? bundles?.getByItem(boundItem)?.get(TTabsItemIdsPlugin)
					: undefined

			if (ids === boundIds) return

			unlinkTab()

			if (!idPlugin || !ids) return

			boundIds = ids
			ids.bindPanel(idPlugin)
		}

		/**
		 * Панель — ни с каким табом: ссылки на таб нет, `aria-controls` таба на
		 * неё не ведёт, и контекста у фасада тоже нет, иначе его `active`
		 * отвечал бы за прежний таб. Фасад отвязывается раньше, чем контекст
		 * отпускают: фасад читают и после снятия, и чтение отпущенного контекста
		 * создало бы адаптеры заново.
		 */
		const unbind = (): void => {
			if (attached) boundItem?.events.off('change:aria', linkPanel)

			unlinkTab()

			context.instance.clearContext()
			boundContext?.release()

			boundContext = undefined
			boundItem = undefined
		}

		/** Связаться с табом или ни с каким: сторону панели пишет и то и другое. */
		const bind = (item: ITabsItem | undefined): void => {
			unbind()

			if (item) {
				boundContext = new TItemContext(item, extensions)
				boundItem = item

				if (attached) item.events.on('change:aria', linkPanel)
			}

			linkPanel()
			linkTab()

			// Последним: о смене активности фасад сообщает, когда связка уже на месте
			if (boundContext) context.instance.setContext(boundContext)
		}

		const resolve = (): void => {
			const item = findByValue(engine, content.value)

			if (item !== boundItem) bind(item)
		}

		bind(findByValue(engine, content.value))

		context.events.on('attach', () => {
			attached = true
			members?.add(options.content, context)
			// Таб, найденный сборкой: подписка на него ждала входа, а записанное
			// им с тех пор панель берёт сейчас — после подписки, как связка
			boundItem?.events.on('change:aria', linkPanel)
			idPlugin?.events.on('change:id', linkPanel)
			linkPanel()
			linkTab()

			resolve()

			// Панель могла смонтироваться раньше своего таба, а набор таба —
			// войти в реестр позже панели или заново
			engine.extensions.plain.events.on('item:added', resolve)
			bundles?.events.on('bundle:registered', linkTab)
			content.events.on('change:value', resolve)
		})

		context.events.on('destroy', () => {
			engine.extensions.plain.events.off('item:added', resolve)
			bundles?.events.off('bundle:registered', linkTab)
			content.events.off('change:value', resolve)
			idPlugin?.events.off('change:id', linkPanel)

			members?.delete(options.content, context)
			unbind()
			attached = false

			content.aria.remove('id')
			content.aria.remove('aria-labelledby')
		})
	}
}
