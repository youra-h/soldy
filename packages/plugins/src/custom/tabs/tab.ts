import type { TTabsCollection } from '@soldy-ui/core'
import type { IPluginContext } from '../../base'
import { TCollectionElements } from '../collection'

/**
 * Узел таба внутри узла элемента. Корень элемента — обёртка для темы, а табом
 * со своей ролью является вложенная строка: на неё и уходит фокус.
 */
const TAB_SELECTOR = '[role="tab"]'

/**
 * Узел таба — строка с ролью `tab` внутри узла элемента. `null` — элемента нет
 * в документе.
 *
 * Одна на клавиатуру Tabs (куда перевести фокус стрелкой) и фокус набора
 * (`tabStopOf`): узел таба оба ищут одним правилом.
 */
export function tabOf(elements: TCollectionElements | null, uid: string | number): Element | null {
	return elements?.getElementByUid(uid)?.querySelector(TAB_SELECTOR) ?? null
}

/**
 * Таб-остановка — узел таба, который держит остановку Tab. `null` — табов, на
 * которые можно перейти, нет, или узла таба нет в документе.
 *
 * Узел фокуса Tabs (`focusTarget` плагина действия): запись `focused = true`
 * ставит фокус туда же, куда ведёт Tab, а не на кнопку в слоте `leading`.
 * Таб берётся по модели — `tabStop` расширения табов, — а не по
 * `[tabindex="0"]` в разметке: в такте смены активного таба разметка ещё
 * старая, и фокус ушёл бы на прежний таб.
 */
export function tabStopOf(_root: Element, ctx: IPluginContext): Element | null {
	const elements = ctx.get(TCollectionElements) ?? null
	// Движок приходит к плагинам без типа, как `engine:bound` клавиатуре табов
	const engine: TTabsCollection | null = elements?.engine ?? null
	const stop = engine?.extensions.tabs.tabStop

	return stop ? tabOf(elements, stop.uid) : null
}
