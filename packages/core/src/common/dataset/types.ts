import type { TAttributesMap } from '../attributes'

/**
 * Снимок набора `data-*`, вычисленный ядром. Ключи уже с префиксом.
 *
 * Тип тот же, что у ARIA: за границу core → ui оба набора уходят одинаково —
 * обычным объектом, который разметка раскладывает спредом.
 */
export type TDatasetAttributes = TAttributesMap

/**
 * Что можно положить в `data-*`.
 *
 * Булево и число приводятся к строке самим набором — именно ради того, чтобы
 * это преобразование не повторялось в шаблоне каждого адаптера.
 */
export type TDatasetValue = string | boolean | number | null | undefined

export type { TAttributesEvents as TDatasetEvents } from '../attributes'
