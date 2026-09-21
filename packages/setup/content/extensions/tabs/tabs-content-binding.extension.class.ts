/**
 * TTabsContentBindingExtension — связывает панель с её табом.
 *
 * Живёт в adapter-слое и не имеет отношения к одноимённому по смыслу
 * TTabsContentExtension из ядра: то — расширение коллекции, раздающее
 * item-адаптеры; это — проводка, находящая нужный таб по значению.
 *
 * Панель не регистрируется в коллекции: её нет в `items`. Она находит уже
 * существующий таб по совпадению `value` и берёт его `TItemContext` — тот же
 * контекст, с которым работает `TTabsItemCollectionFacade`.
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
 */

import { TItemContextRegistry } from '@soldy/core'
import type { ITabsItem, TAria, TAriaAttributes, TTabsCollection } from '@soldy/core'
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

		const registry = new TItemContextRegistry(engine.getCore())

		/**
		 * Таб, с которым связаны сейчас, и что именно проставлено панели.
		 * Набор сохраняется целиком, чтобы снимать ровно свои ключи:
		 * перечислять их здесь заново значило бы держать формулу связки в двух
		 * местах.
		 */
		let boundItem: ITabsItem | undefined
		let boundPanelAria: TAriaAttributes | undefined

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

			const itemContext = registry.get(item)

			context.instance.setContext(itemContext)

			boundItem = item
			boundPanelAria = itemContext.adapters.content.panelAria

			applyAria(content.aria, boundPanelAria)
		}

		resolve()

		// Панель могла смонтироваться раньше своего таба
		engine.extensions.plain.events.on('item:added', resolve)
		content.events.on('change:value', resolve)

		context.events.on('destroy', () => {
			engine.extensions.plain.events.off('item:added', resolve)
			content.events.off('change:value', resolve)

			unbind()
		})
	}
}
