/**
 * Разворачивание содержимого слота.
 *
 * Слот без scope принимает готовый узел, слот со scope — ещё и функцию, потому
 * что данные становятся известны только внутри компонента. Форма содержимого
 * здесь и определяется: функция — вызвать со scope, всё остальное — вернуть
 * как есть.
 *
 * React-элементы это объекты, а не функции, поэтому проверка однозначна.
 */

import type { ReactNode } from 'react'

export type TSlotContent<TScope extends object = object> =
	| ReactNode
	| ((scope: TScope) => ReactNode)

export function renderSlot<TScope extends object = object>(
	content: TSlotContent<TScope> | undefined,
	scope?: TScope,
): ReactNode {
	if (typeof content === 'function') return content((scope ?? {}) as TScope)

	return content
}

/**
 * Передан ли слот — аналог `$slots.x` у Vue: разметка рисует обёртку слота
 * (`s-input__leading`), только когда в неё есть что положить.
 *
 * Не передан — пусто по правилам React: `undefined`, `null` и булево он не
 * рисует, и `leading={cond && <Icon />}` при ложном условии обёртку не
 * оставит. Функция слота передана всегда: её содержимое зависит от scope.
 */
export function hasSlot<TScope extends object>(content: TSlotContent<TScope> | undefined): boolean {
	return content !== undefined && content !== null && typeof content !== 'boolean'
}

/**
 * Проброс слота владельца коллекции в слот элемента — то, что у Vue пишут
 * `<template #default="{ text }"><slot name="item" :item :text /></template>`.
 *
 * Элемент зовёт слот со своим scope, а проброс добавляет к нему то, что знает
 * владелец, — сам элемент (`extra`). Готовый узел, нарисованный владельцем,
 * scope элемента терял бы: `text`, `selected` и `active` держит элемент, и до
 * слота владельца они не доходили.
 *
 * Слот владельца не задан — проброса нет (`undefined`): по наличию слота
 * элемент решает, рисовать ли своё — текст, иконку, обёртку. Функцию
 * `hasSlot` считала бы переданной всегда.
 *
 * Scope элемента выводится из места, куда проброс отдают, — из типа слота
 * элемента. Из слота владельца его не вывести: там он слит с `extra`, и
 * `NoInfer` не даёт выводу туда смотреть.
 */
export function relaySlot<TScope extends object, TExtra extends object>(
	content: TSlotContent<NoInfer<TScope & TExtra>> | undefined,
	extra: TExtra,
): ((scope: TScope) => ReactNode) | undefined {
	if (!hasSlot(content)) return undefined

	return (scope) => renderSlot<TScope & TExtra>(content, { ...scope, ...extra })
}
