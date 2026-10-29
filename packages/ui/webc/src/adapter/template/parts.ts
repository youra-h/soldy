/**
 * Элементы, которые строит шаблон: деталь разметки (кнопка очистки, строка
 * таба) и элемент коллекции из данных. Оба — разметка владельца, их события
 * не всплывают. Деталь несёт имя места (`embedded`), обязательное в типе:
 * сторожа разметки, как у остальных адаптеров, у кода шаблона нет. AGENTS.md
 * (Web Components), «Разметка владельца».
 */

import { isContent } from '../runtime/content'
import { registrationOf } from '../runtime/defineElement'
import { markOwnerMarkup } from '../runtime/marks'
import { lend } from './lend'
import type { ITemplateContext } from './types'

/** Класс элемента: по нему шаблон находит имя и тег, под которыми тот зарегистрирован. */
export type TPartClass<T extends HTMLElement> = {
	[Symbol.hasInstance](node: unknown): node is T
}

export type TDetailOptions = {
	/** Имя места в разметке владельца: `input.clear`. */
	readonly embedded: string
	/** Статика тега детали: `<button>` без `type="button"` отправил бы форму. */
	readonly attributes?: Readonly<Record<string, string>>
}

/** Слот владельца (`item-leading`) → слот элемента (`leading`). */
export type TItemSlots = Readonly<Record<string, string>>

/** Элемент коллекции из данных. Незарегистрированная часть — ошибка, а не обычный узел. */
export function createItem<T extends HTMLElement>(owner: Document, part: TPartClass<T>): T {
	const registration = registrationOf(part)

	if (!registration) {
		throw new Error('[soldy] Класс элемента не зарегистрирован: модуль элемента не загружен')
	}

	const element = owner.createElement(registration.tag, { is: registration.name })

	if (!(element instanceof part)) {
		throw new Error(
			`[soldy] <${registration.tag} is="${registration.name}"> не элемент своего класса`,
		)
	}

	markOwnerMarkup(element)

	return element
}

export function createDetail<T extends HTMLElement>(
	owner: Document,
	part: TPartClass<T>,
	{ embedded, attributes = {} }: TDetailOptions,
): T {
	const element = createItem(owner, part)

	element.setAttribute('embedded', embedded)

	for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)

	return element
}

/** Копия образца с содержимым; пустой `<template>` — как не заданный. */
export function sampleOf(
	ctx: Pick<ITemplateContext, 'sample'>,
	name: string,
): DocumentFragment | null {
	const copy = ctx.sample(name)

	return copy && Array.from(copy.childNodes).some(isContent) ? copy : null
}

/** Копии образцов `item-*` — в слоты элемента из данных; нет образца — элемент рисует своё. */
export function lendSamples(
	ctx: Pick<ITemplateContext, 'sample'>,
	element: Element,
	slots: TItemSlots,
): void {
	for (const [from, to] of Object.entries(slots)) {
		const copy = ctx.sample(from)

		if (copy) lend(element, to, copy)
	}
}

/**
 * Копии образцов — в `<template>` слотов элемента, который сам копирует их
 * дальше (`cell` строки таблицы): инертная копия не подключается вне ячеек.
 */
export function lendTemplates(
	ctx: Pick<ITemplateContext, 'sample'>,
	element: Element,
	slots: TItemSlots,
): void {
	for (const [from, to] of Object.entries(slots)) {
		const copy = sampleOf(ctx, from)

		if (!copy) continue

		const template = element.ownerDocument.createElement('template')

		template.content.append(copy)
		lend(element, to, template)
	}
}

/**
 * Свойства элемента — только сменившиеся: каждая запись идёт через связку, а
 * у нативного свойства (`disabled` кнопки) — ещё и через атрибут.
 */
export function patch<T extends object, K extends keyof T>(target: T, values: Pick<T, K>): void {
	for (const key in values) {
		if (target[key] !== values[key]) target[key] = values[key]
	}
}
