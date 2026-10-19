/**
 * Значение в коде примера — литерал JS, один на все хосты.
 *
 * Пять копий литерала в хостах разошлись: у Vue строка не экранировала `\`, а
 * объект и список все отдавали JSON, чьи двойные кавычки обрывали атрибут
 * шаблона Vue. Код примера обязан читаться тем же значением, поэтому каждый
 * литерал тест ещё и вычисляет.
 */

import { describe, it, expect } from 'vitest'
import { snippetLiteral } from '../src/snippet-literal'

/** Значение, которое прочтёт код с этим литералом. */
function evaluate(literal: string): unknown {
	return new Function(`return (${literal})`)()
}

describe('snippetLiteral', () => {
	it('строка — в одинарных кавычках, обратная косая и кавычка экранируются', () => {
		const text = String.raw`It's C:\temp`

		expect(snippetLiteral(text)).toBe(String.raw`'It\'s C:\\temp'`)
		expect(evaluate(snippetLiteral(text))).toBe(text)
	})

	it('число и флаг — как пишутся', () => {
		expect(snippetLiteral(1.5)).toBe('1.5')
		expect(snippetLiteral(false)).toBe('false')
	})

	it('объект — ключи без кавычек, строки в одинарных', () => {
		const options = { style: 'percent', maximumFractionDigits: 1 }

		expect(snippetLiteral(options)).toBe("{ style: 'percent', maximumFractionDigits: 1 }")
		expect(evaluate(snippetLiteral(options))).toEqual(options)
	})

	it('список объектов — каждый элемент литералом', () => {
		const marks = [
			{ value: 0, label: '0' },
			{ value: 25, label: "25 o'clock" },
		]

		expect(snippetLiteral(marks)).toBe(
			"[{ value: 0, label: '0' }, { value: 25, label: '25 o\\'clock' }]",
		)
		expect(evaluate(snippetLiteral(marks))).toEqual(marks)
	})

	it('ключ, который не идентификатор, — строкой', () => {
		const value = { 'aria-label': 'Имя', '1st': true, $own: 1, _list: [1, 2] }

		expect(snippetLiteral(value)).toBe(
			"{ 'aria-label': 'Имя', '1st': true, $own: 1, _list: [1, 2] }",
		)
		expect(evaluate(snippetLiteral(value))).toEqual(value)
	})

	it('пустые объект и список', () => {
		expect(snippetLiteral({})).toBe('{}')
		expect(snippetLiteral([])).toBe('[]')
	})
})
