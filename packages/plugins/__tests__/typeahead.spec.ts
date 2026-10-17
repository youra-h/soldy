/**
 * Набор по первым буквам (`TTypeahead`) — правило APG, общее для списков с
 * подсветкой: следующий за подсвеченным элемент на набранное, повтор буквы —
 * по элементам на неё, без совпадения — подсветка на месте.
 *
 * Время передаётся явно: пауза между буквами решает, слово это или новый набор.
 */

import { describe, it, expect } from 'vitest'
import { TTypeahead, TYPEAHEAD_TIMEOUT } from '../src/custom/list/typeahead'

const ITEMS = ['Изменить', 'Сохранить', 'Сохранить как', 'Создать', 'Удалить']

const text = (item: string): string => item

describe('TTypeahead', () => {
	it('буква — первый элемент на неё, без подсветки поиск с первого', () => {
		const typeahead = new TTypeahead()

		expect(typeahead.next('с', ITEMS, null, text, 0)).toBe('Сохранить')
	})

	it('буква ищется со следующего за подсвеченным и по кругу', () => {
		const typeahead = new TTypeahead()

		expect(typeahead.next('и', ITEMS, 'Удалить', text, 0)).toBe('Изменить')
		typeahead.reset()
		expect(typeahead.next('с', ITEMS, 'Сохранить', text, 0)).toBe('Сохранить как')
	})

	it('повтор буквы ходит по элементам на неё', () => {
		const typeahead = new TTypeahead()
		let current: string | null = null

		const seen = [0, 100, 200, 300].map((at) => {
			current = typeahead.next('с', ITEMS, current, text, at)

			return current
		})

		expect(seen).toEqual(['Сохранить', 'Сохранить как', 'Создать', 'Сохранить'])
	})

	it('буквы быстрее паузы — слово: дописанная буква не уводит с подходящего', () => {
		const typeahead = new TTypeahead()

		expect(typeahead.next('с', ITEMS, null, text, 0)).toBe('Сохранить')
		expect(typeahead.next('о', ITEMS, 'Сохранить', text, 100)).toBe('Сохранить')
		expect(typeahead.next('з', ITEMS, 'Сохранить', text, 200)).toBe('Создать')
		expect(typeahead.next('ы', ITEMS, 'Создать', text, 300)).toBe(null)
	})

	it('слово ведёт к первому подходящему: «со» после «Создать» — по кругу', () => {
		const typeahead = new TTypeahead()

		typeahead.next('с', ITEMS, 'Изменить', text, 0)

		expect(typeahead.next('о', ITEMS, 'Создать', text, 100)).toBe('Создать')
		expect(typeahead.next('х', ITEMS, 'Создать', text, 200)).toBe('Сохранить')
	})

	it('пауза дольше таймаута начинает новый набор', () => {
		const typeahead = new TTypeahead()

		typeahead.next('с', ITEMS, null, text, 0)

		expect(typeahead.typing(TYPEAHEAD_TIMEOUT)).toBe(true)
		expect(typeahead.typing(TYPEAHEAD_TIMEOUT + 1)).toBe(false)
		expect(typeahead.next('у', ITEMS, 'Сохранить', text, TYPEAHEAD_TIMEOUT + 1)).toBe('Удалить')
	})

	it('совпадения нет — null: подсветка остаётся на месте', () => {
		expect(new TTypeahead().next('я', ITEMS, 'Создать', text, 0)).toBe(null)
	})

	it('регистр не важен, пробелы у текста — тоже', () => {
		expect(new TTypeahead().next('У', ['  удалить '], null, text, 0)).toBe('  удалить ')
	})

	it('сброс — следующая буква начинает новый набор', () => {
		const typeahead = new TTypeahead(1000)

		typeahead.next('с', ITEMS, null, text, 0)
		typeahead.reset()

		expect(typeahead.typing(10)).toBe(false)
		expect(typeahead.next('и', ITEMS, null, text, 10)).toBe('Изменить')
	})

	it('пустой список — null', () => {
		expect(new TTypeahead().next('с', [], null, text, 0)).toBe(null)
	})
})
