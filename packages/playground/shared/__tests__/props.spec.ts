/**
 * Умолчание в контроле стенда приходит из декларации пропа.
 *
 * Раньше стенд снимал карту `ctor.defaultValues` с компонентного дескриптора и
 * подставлял её по имени — и той же картой накрывал пропы фасада коллекции, у
 * которого свой класс. Поле `TPropSpec.default` сделало второй путь
 * лишним, а проверка ниже держит выбранную семантику: значим ключ, а не
 * значение, иначе объявленное `undefined` молча стало бы «умолчания нет».
 */

import { describe, it, expect } from 'vitest'
import { TName, TPropSpec } from '@soldy/setup'
import { TAnchorPlugin } from '@soldy/plugins'
import { ButtonDescriptor } from '@soldy/setup'
import { FRAME_PLACEMENTS } from '../src/enums'
import { propControl, propControls } from '../src/props'
import { findComponent } from '../src/registry'

/** Проп `button`, которого нет ни в списках значений, ни в пресетах. */
function declaration(rest: { default?: unknown } = {}): TPropSpec {
	// Умолчание принадлежит классу владельца: описание берёт его из `defaultValues`, и значим ключ
	const defaults = 'default' in rest ? { text: rest.default } : undefined

	return new TPropSpec(new TName('text'), [], { type: String }, defaults)
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

/** Запись реестра по id; без неё проверять нечего. */
function entryOf(id: string) {
	const entry = findComponent(id)

	if (!entry) throw new Error(`нет компонента «${id}»`)

	return entry
}

/**
 * Пропы плагинов — третья группа строк.
 *
 * Проверка на настоящем дескрипторе Frame: у якоря есть и проп с умолчанием из
 * `defaultValues` плагина (`placement`), и проп, которому строка не положена
 * (`anchor` — DOM-элемент).
 */
describe('propControls: пропы плагинов', () => {
	const frame = entryOf('frame')

	/** Строка плагинной группы — с адресом плагина, иначе проверять нечего. */
	function pluginRow(name: string) {
		const row = propControls(frame).pluginControls.find((control) => control.name === name)

		if (row?.scope !== 'plugin') throw new Error(`нет плагинной строки ${name}`)

		return row
	}

	/**
	 * Имя из разметки, а не из декларации: по нему же ищутся описание и список
	 * значений. Голое `placement` занято собственным пропом Select с другим
	 * перечислением, и в общую карту под этим именем список якоря не положить.
	 */
	it('строка называется именем с неймспейсом и знает свой плагин', () => {
		const row = pluginRow('anchor_placement')

		expect(row.plugin).toEqual({ ctor: TAnchorPlugin, name: 'placement' })
		expect(row.kind).toBe('select')
		expect(row.options).toEqual(FRAME_PLACEMENTS)
	})

	it('умолчание доезжает из декларации', () => {
		expect(pluginRow('anchor_placement').default).toBe('bottom-start')
	})

	it('anchor_anchor строки не получает', () => {
		const names = Object.values(propControls(frame))
			.flat()
			.map((control) => control.name)

		expect(names).not.toContain('anchor_anchor')
		expect(names).not.toContain('anchor')
	})
})
