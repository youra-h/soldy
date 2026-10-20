/**
 * Запись компонентов в разметке: визуальный компонент — атрибут на обычном
 * теге (`<button so-button>`, `<div so-input>`), свой тег — только у
 * компонента без бокса: `<so-component>`, `<so-virtual>`,
 * `<so-drag-and-drop>`.
 *
 * Схема одна на весь адаптер: строку таблицы (`tr`) и заголовок колонки
 * (`th`) элементом не написать — внутри `table` чужой тег браузер выкинет, —
 * а кнопка-ссылка — это `<a so-button href>`. Атрибутный селектор начинается
 * с тега ядра: по первому селектору Angular строит хост сам
 * (`createComponent`), — а за ним идёт голый атрибут: тег выбирает
 * потребитель.
 */

import { describe, it, expect } from 'vitest'
import { reflectComponentType, type Type } from '@angular/core'
import * as angular from '@soldy-ui/angular'

/** Компоненты без бокса: у них свой тег. Других элементных селекторов нет. */
const ELEMENT_SELECTORS = ['so-component', 'so-drag-and-drop', 'so-virtual']

/**
 * Класс из экспорта: `reflectComponentType` принимает только конструктор.
 * Утилиты экспорта для JS тоже функции с прототипом, но компонента за ними
 * она не найдёт.
 */
function isConstructor(value: unknown): value is Type<unknown> {
	return typeof value === 'function' && typeof value.prototype === 'object'
}

/** Селекторы компонентов экспорта — не ручным списком: новый попадёт под проверку сам. */
function exportedSelectors(): string[] {
	const entries: Record<string, unknown> = angular
	const selectors: string[] = []

	for (const value of Object.values(entries)) {
		const mirror = isConstructor(value) ? reflectComponentType(value) : null

		if (mirror) selectors.push(mirror.selector)
	}

	return selectors
}

/** Части селектора через запятую. */
const partsOf = (selector: string) => selector.split(',').map((part) => part.trim())

/** Элементный селектор — один тег, без атрибута. */
const isElement = (part: string) => /^[a-z][a-z0-9-]*$/.test(part)

describe('селекторы компонентов', () => {
	it('элементный селектор — только у компонентов без бокса', () => {
		const elements = exportedSelectors().filter((selector) => partsOf(selector).some(isElement))

		expect(elements.sort()).toEqual(ELEMENT_SELECTORS)
	})

	/**
	 * `tag[so-x], [so-x]`: тег первым — его Angular берёт, когда строит хост
	 * сам, а голый атрибут даёт потребителю писать компонент на любом теге.
	 */
	it('у визуального компонента с тегом в селекторе — и голый атрибут того же имени', () => {
		for (const selector of exportedSelectors()) {
			const parts = partsOf(selector)
			const tagged = /^[a-z]+\[(so-[a-z-]+)\]$/.exec(parts[0])

			if (!tagged) continue

			expect(parts, selector).toEqual([parts[0], `[${tagged[1]}]`])
		}
	})
})
