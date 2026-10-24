import type { IControl } from '@soldy-ui/core'
import type { TPluginEvents } from '../../../base'

/**
 * Видимая подсветка списка — аргумент `change:highlight`.
 *
 * `item` — элемент, на котором встала отметка, в том числе на месте, где
 * позиция уже стояла без неё; `null` — видимой отметки больше нет: подсветку
 * сняли или позиция ушла без отметки. Позиция без отметки события не шлёт.
 *
 * Соседи — доступные элементы до и после подсвеченного, тем порядком, каким по
 * ним ходят стрелки; у края и без подсветки — `null`. Навигации и прокрутке
 * они не нужны: это данные подписчику снаружи, который знает о подсветке
 * только из события (`keyboard:change:highlight` у Select).
 */
export type THighlightPayload = {
	item: IControl | null
	prevItem: IControl | null
	nextItem: IControl | null
}

export type TListNavigationPluginEvents = TPluginEvents & {
	'change:highlight': (payload: THighlightPayload) => void
}

/** Край списка для `highlightEdge`. */
export type TListEdge = 'first' | 'last'
