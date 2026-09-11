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
 * Здесь же проставляется ARIA-связка — в оба набора сразу. Это единственное
 * место, где известно, что панель вообще существует: `Tabs` можно
 * использовать и без `Tabs.Content`, отрисовывая содержимое самому. Раньше
 * таб получал `aria-controls` всегда, и без панели ссылка вела в никуда —
 * для скринридера это сломанная связь, а не её отсутствие. Симметрично при
 * размонтировании панели атрибуты с таба снимаются.
 *
 * Сами значения считает item-адаптер `content`: формула идентификаторов
 * должна быть в одном месте, иначе половинки однажды разойдутся.
 *
 * Перерешение нужно в двух случаях: панель смонтировалась раньше своего таба
 * (тогда ждём `item:added`) и у панели сменилось `value`.
 */

import { TItemContextRegistry } from '@soldy/core'
import type { TAria, TAriaAttributes } from '@soldy/core'
import type { IAdapterContext } from '../../context'
import type { TElevatorFactory } from '../../elevator'
import { ITEM_CONTEXT_ELEVATOR } from '../../elevator/keys'

export interface ITabsContentBindingOptions {
	/** Инстанс панели (TTabsContent) — источник `value`. */
	content: any
	elevator: TElevatorFactory
}

/** Таб, чьё значение совпало со значением панели. */
function findByValue(engine: any, value: unknown): any {
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
	constructor(context: IAdapterContext, options: ITabsContentBindingOptions) {
		const { content, elevator } = options
		const engine = elevator(ITEM_CONTEXT_ELEVATOR).up() as any

		if (!engine) return

		const facade = context.instance as any
		const registry = new TItemContextRegistry(engine.getCore())

		/**
		 * Таб, с которым связаны сейчас, и что именно проставлено панели.
		 * Набор сохраняется целиком, чтобы снимать ровно свои ключи:
		 * перечислять их здесь заново значило бы держать формулу связки в двух
		 * местах.
		 */
		let boundItem: any
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

			facade.setContext(itemContext)

			boundItem = item
			boundPanelAria = (itemContext.adapters.content as any).panelAria as TAriaAttributes

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
