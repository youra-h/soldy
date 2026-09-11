import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'

/**
 * TTabsContentWarnPlugin — предупреждает, если DOM-узел панели `Tabs.Content`
 * оказался внутри `[role="tablist"]`.
 *
 * Верный знак, что панель положили в слот `default` вместо `content`: `default`
 * рендерится внутри списка табов (`[role=tablist]`), `content` — снаружи.
 * Перепутанный слот иначе виден только глазами.
 *
 * Диагностика, не защита: исключение не бросаем — позиция панели не мешает
 * работе, связка с табом по `value` и ARIA остаются корректными независимо от
 * того, куда панель попала в разметке.
 *
 * Узел берётся у `TElementPlugin` из общего bundle: сразу, если элемент уже
 * готов, иначе по событию `ready`. До монтирования (в т.ч. SSR) узла нет —
 * проверка молчит.
 */
export class TTabsContentWarnPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const elementPlugin = ctx.get(TElementPlugin)

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
}
