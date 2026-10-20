import type { IScroller } from '@soldy-ui/core'
import type { IPluginContext } from '../../../base'
import { tabStops } from '../../../utils'

/**
 * Вьюпорт ленты — `__viewport` в корне: по классу владельца
 * (`classes.resolve`), а не строкой. Первый в корне — свой: вьюпорт вложенной
 * ленты лежит внутри своего. `null` — вьюпорта в корне нет.
 *
 * Один на вьюпорт ленты (`TScrollerViewportPlugin`) и узел фокуса ленты
 * (`viewportStopOf`).
 */
export function viewportOf(owner: IScroller, root: Element): Element | null {
	return root.querySelector(owner.classes.resolve('__viewport', { point: true }))
}

/**
 * Остановка ленты — узел фокуса Scroller (`focusTarget` плагина действия):
 * запись `focused = true` ставит фокус туда же, куда ведёт Tab, а не на кнопку
 * «назад» перед вьюпортом.
 *
 * Остановку решают так же, как её ставит лента: вьюпорт — сам остановка, пока
 * своих остановок внутри нет, а листать есть куда (`viewportTabIndex` ядра,
 * по замеру `TScrollerViewportPlugin`), — тогда фокус на нём. Иначе — первая
 * остановка внутри вьюпорта: элемент содержимого.
 *
 * `null` — остановок у ленты нет: внутри ни одной, а листать некуда.
 */
export function viewportStopOf(root: Element, ctx: IPluginContext): Element | null {
	const owner = ctx.getInstance<IScroller>()
	const viewport = owner ? viewportOf(owner, root) : null

	if (!owner || !viewport) return null

	if (owner.viewportTabIndex !== undefined) return viewport

	return tabStops(viewport)[0] ?? null
}
