/**
 * Умолчание в контроле стенда приходит из декларации пропа.
 *
 * Раньше стенд снимал карту `ctor.defaultValues` с компонентного дескриптора и
 * подставлял её по имени — и той же картой накрывал пропы фасада коллекции, у
 * которого свой класс. Поле `IPropDeclaration.default` сделало второй путь
 * лишним, а проверка ниже держит выбранную семантику: значим ключ, а не
 * значение, иначе объявленное `undefined` молча стало бы «умолчания нет».
 */

import { describe, it, expect } from 'vitest'
import { TName, type IPropDeclaration } from '@soldy/accessor'
import { ButtonDescriptor } from '@soldy/setup'
import { propControl } from '../src/props'

/** Проп `button`, которого нет ни в списках значений, ни в пресетах. */
function declaration(rest: Partial<IPropDeclaration> = {}): IPropDeclaration {
	return { name: new TName('text'), type: String, ...rest }
}

describe('propControl: умолчание', () => {
	it('берётся из декларации', () => {
		const control = propControl('button', declaration({ default: 'ок' }))

		expect(control.default).toBe('ок')
	})

	/**
	 * `closable` у элемента Tabs и Tags объявлен именно так: ключ есть, значение
	 * `undefined` — этим элемент и наследует настройку у владельца.
	 */
	it('объявленное `undefined` остаётся объявленным', () => {
		const control = propControl('button', declaration({ default: undefined }))

		expect(Object.hasOwn(control, 'default')).toBe(true)
		expect(control.default).toBeUndefined()
	})

	it('без ключа в декларации ключа нет и в контроле', () => {
		const control = propControl('button', declaration())

		expect(Object.hasOwn(control, 'default')).toBe(false)
	})

	/**
	 * Сквозная проверка: стенд показывает то же, с чем стартует сам класс.
	 * `defaultValues` тут — независимый источник для сверки; странице читать
	 * его больше не нужно, за перенос в декларацию отвечает setup.
	 */
	it('совпадает с `defaultValues` класса на настоящем дескрипторе', () => {
		const descriptor = ButtonDescriptor()
		const expected = descriptor.ctor.defaultValues

		const shown = Object.fromEntries(
			descriptor.props
				.filter((prop) => Object.hasOwn(prop, 'default'))
				.map((prop) => [prop.name.name, propControl('button', prop).default]),
		)

		expect(shown).toEqual(expected)
	})
})
