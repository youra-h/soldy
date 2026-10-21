/**
 * Копия образца с содержимым — узлу шаблона, который без образца рисует своё:
 * подписи метки и подсказке ручки Slider, слою звезды Rating, образцу ячейки
 * строки таблицы.
 *
 * Слот со scope у Web Components — образец (`TSlotTarget` с `sample`): копию
 * его содержимого контекст отдаёт на каждый вызов (`sample`), и каждый узел
 * получает свою. Пустой образец — `<template>` без содержимого — как не
 * заданный: узел рисует своё, как у остальных адаптеров пустой слот уступает
 * место запасному содержимому. Что считается содержимым, решает то же
 * правило, что у слотов базы (`isContent`).
 */

import { isContent } from '../runtime/content'
import type { ITemplateContext } from './types'

/** Копия образца `name`; образца нет или в нём нет содержимого — `null`. */
export function sampleOf(
	ctx: Pick<ITemplateContext, 'sample'>,
	name: string,
): DocumentFragment | null {
	const copy = ctx.sample(name)

	return copy && Array.from(copy.childNodes).some(isContent) ? copy : null
}
