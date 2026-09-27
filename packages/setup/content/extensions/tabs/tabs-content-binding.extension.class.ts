/**
 * TTabsContentBindingExtension — связывает панель с её табом.
 *
 * Живёт в adapter-слое и не имеет отношения к одноимённому по смыслу
 * TTabsContentExtension из ядра: то — расширение коллекции, раздающее
 * item-адаптеры; это — проводка, находящая нужный таб по значению.
 *
 * Панель не регистрируется в коллекции: её нет в `items`. Она находит уже
 * существующий таб по совпадению `value` и берёт контекст этого таба
 * (`TItemContext`) — свой, на время монтирования: адаптеры те же, что у
 * `TTabsItemCollectionFacade`, но отпускает их панель сама — при перепривязке
 * к другому табу и при снятии. Общий с табом контекст, отпущенный одним из
 * них, сломал бы другого.
 *
 * Здесь же проставляется сторона панели ARIA-связки (`role`, `id`,
 * `aria-labelledby`) — прямо в `aria` панели. Это единственное место, где
 * известно, что панель нашла свой таб. Сторону таба (`id`, `aria-controls`)
 * отсюда не пишут: её ставит `TTabsContentExtension` при добавлении элемента,
 * чтобы она попала в первую же отрисовку. При размонтировании панели снимаются
 * только её атрибуты.
 *
 * Сами значения отдаёт item-адаптер `content`, а формула идентификаторов
 * живёт в родительском `TTabsContentExtension`: она должна быть в одном месте,
 * иначе половинки однажды разойдутся.
 *
 * Перерешение нужно в двух случаях: панель смонтировалась раньше своего таба
 * (тогда ждём `item:added`) и у панели сменилось `value`.
 *
 * Работа разделена по фазам контекста, как у `TCollectionItemExtension`:
 *
 * - **сборка** — первое связывание. Оно пишет только своё — фасад панели и её
 *   `aria`. Таб из данных (`items`) в коллекции уже есть, и панель под него
 *   попадает в первую же отрисовку, в том числе серверную;
 * - **вход** (`attach` контекста) — связывание ещё раз и подписки на `item:added`
 *   движка и `change:value` панели. Табы разметки входят в коллекцию на своём
 *   `attach`, и панель, что стоит в документе после них, находит их вторым
 *   поиском. Подписки ждут входа, потому что шины не свои: движок — владельца,
 *   панель могла прийти снаружи (`ctrl`), а у React сборка идёт на рендере, и
 *   отброшенный рендер оставил бы на них лишнего подписчика;
 * - **снятие** (`destroy` контекста) — отписка, атрибуты панели и контекст
 *   таба. Контекст, собранный, но так и не принятый, уничтожается тоже:
 *   подписок входа у него нет, а атрибуты и контекст таба, взятые сборкой,
 *   уходят.
 */

import { TItemContext } from '@soldy-ui/core'
import type {
	ITabsItem,
	TAria,
	TAriaAttributes,
	TTabsCollection,
	TTabsCollectionExtensions,
} from '@soldy-ui/core'
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

/** Кладёт набор в `aria`; `null` внутри означает «не ставить». */
function applyAria(aria: TAria, attributes: TAriaAttributes): void {
	for (const [name, value] of Object.entries(attributes)) {
		aria.add(name, value)
	}
}

/** Снимает ровно то, что было положено — ключи берутся из того же набора. */
function clearAria(aria: TAria, attributes: TAriaAttributes): void {
	for (const name of Object.keys(attributes)) {
		aria.remove(name)
	}
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

		/**
		 * Таб, с которым связаны сейчас, и что именно проставлено панели.
		 * Набор сохраняется целиком, чтобы снимать ровно свои ключи:
		 * перечислять их здесь заново значило бы держать формулу связки в двух
		 * местах.
		 */
		let boundItem: ITabsItem | undefined
		let boundPanelAria: TAriaAttributes | undefined
		/** Контекст таба у фасада панели: его отпускает следующая привязка и снятие. */
		let boundContext: TItemContext<ITabsItem, TTabsCollectionExtensions> | undefined

		const unbind = (): void => {
			if (boundPanelAria) clearAria(content.aria, boundPanelAria)

			boundItem = undefined
			boundPanelAria = undefined
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
			boundPanelAria = itemContext.adapters.content.panelAria

			applyAria(content.aria, boundPanelAria)
		}

		resolve()

		context.events.on('attach', () => {
			resolve()

			// Панель могла смонтироваться раньше своего таба
			engine.extensions.plain.events.on('item:added', resolve)
			content.events.on('change:value', resolve)
		})

		context.events.on('destroy', () => {
			engine.extensions.plain.events.off('item:added', resolve)
			content.events.off('change:value', resolve)

			unbind()
			// Фасад — без контекста: чтение после снятия создало бы адаптеры заново
			context.instance.clearContext()
			boundContext?.release()
		})
	}
}
