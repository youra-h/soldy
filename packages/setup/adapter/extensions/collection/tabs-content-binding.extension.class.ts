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
 *
 * Здесь же — диагностика неверного использования. Разметка Tabs кладёт
 * `Tabs.Content` в слот `content`, а не в `default` (тот идёт внутрь
 * `[role="tablist"]`); перепутавший слот потребитель увидит панель внутри
 * списка табов и без подсказки не поймёт, почему. Бросать исключение нельзя —
 * позиция панели не мешает работе, только выглядит неверно.
 */

import { TItemContextRegistry } from '@soldy/core'
import type { TAria, TAriaAttributes } from '@soldy/core'
import { TElementPlugin } from '@soldy/plugins'
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
	for (const item of engine.driver) {
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

/**
 * Печатает предупреждение, если DOM-узел панели оказался внутри
 * `[role="tablist"]` — верный знак, что `Tabs.Content` положили в `default`
 * вместо слота `content`. Узел берётся у `TElementPlugin` из общего bundle,
 * на его готовности: до монтирования (в т.ч. SSR) элемента нет, и проверка
 * молчит. Исключение не бросаем — позиция панели не мешает работе.
 */
function reportIfInsideTablist(context: IAdapterContext): void {
	const elementPlugin = context.bundle?.get?.(TElementPlugin) as TElementPlugin | undefined

	if (!elementPlugin) return

	const check = (el: HTMLElement | null): void => {
		if (!el || !el.closest('[role="tablist"]')) return

		console.warn(
			'[soldy] Tabs.Content оказался внутри [role="tablist"]: панель нужно ' +
				'класть в слот `content`, а не в `default`.',
		)
	}

	if (elementPlugin.element) {
		check(elementPlugin.element)
		return
	}

	const onReady = (el: HTMLElement): void => {
		elementPlugin.events.off('ready', onReady)
		check(el)
	}

	elementPlugin.events.on('ready', onReady)
}

export class TTabsContentBindingExtension {
	constructor(context: IAdapterContext, options: ITabsContentBindingOptions) {
		const { content, elevator } = options
		const engine = elevator(ITEM_CONTEXT_ELEVATOR).up() as any

		if (!engine) return

		const facade = context.instance as any
		const registry = new TItemContextRegistry(engine.getCore())

		reportIfInsideTablist(context)

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
		engine.driver.events.on('item:added', resolve)
		content.events.on('change:value', resolve)

		context.events.on('destroy', () => {
			engine.driver.events.off('item:added', resolve)
			content.events.off('change:value', resolve)

			unbind()
		})
	}
}
