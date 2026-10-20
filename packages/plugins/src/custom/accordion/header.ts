import { batchOf } from '@soldy-ui/core'
import type { IAccordionItem } from '@soldy-ui/core'
import type { IPluginContext } from '../../base'
import { TCollectionElements } from '../collection'
import { isReachable } from '../collection/reachable'

/**
 * Заголовок секции внутри её узла. Корень секции — обёртка для темы вокруг
 * заголовка и панели, а заголовком является вложенная кнопка: на ней набор
 * `aria` секции, и раскрытость панели по APG Accordion объявляет её
 * `aria-expanded`. Заголовок — первый такой узел: панель и всё, что в ней
 * лежит, идут за ним.
 */
const HEADER_SELECTOR = '[aria-expanded]'

/**
 * Заголовок секции в её узле. `null` — узла нет или заголовка в нём нет.
 *
 * Узел фокуса `Accordion.Item` (`focusTarget` плагина действия): запись
 * `focused = true` ставит фокус на заголовок, а не на обёртку секции.
 */
export function headerIn(node: Element | null): Element | null {
	return node?.querySelector(HEADER_SELECTOR) ?? null
}

/**
 * Заголовок первой секции, на которую можно перейти, — узел фокуса Accordion
 * (`focusTarget` плагина действия). Остановок у аккордеона столько же, сколько
 * заголовков, и запись `focused = true` ставит фокус на первую из них — туда
 * же, куда ведёт Tab. Секции — по коллекции, в порядке показа; заголовок —
 * тем же правилом, что у самой секции (`headerIn`).
 *
 * `null` — секций, на которые можно перейти, нет, или узла секции нет в
 * документе.
 */
export function firstHeaderOf(_root: Element, ctx: IPluginContext): Element | null {
	const elements = ctx.get(TCollectionElements) ?? null
	const section = batchOf<IAccordionItem>(elements?.engine)?.shown.find(isReachable)

	return section ? headerIn(elements?.getElementByItem(section) ?? null) : null
}
