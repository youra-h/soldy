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
import { TName, TPropSpec } from '@soldy-ui/setup'
import { TAnchorPlugin } from '@soldy-ui/plugins'
import { ButtonDescriptor } from '@soldy-ui/setup'
import { FRAME_PLACEMENTS } from '../src/enums'
import { isEmptyField, parseNumberOrText, propControl, propControls } from '../src/props'
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

/**
 * Пустое поле — проп не задан, и вторая колонка пишет вместо него умолчание.
 * Ноль и `false` — значения: сочти их пустыми, и выключенный `visible` вернулся
 * бы к `true`, а `largeStep: 0` — к десяти.
 */
describe('isEmptyField', () => {
	it('пусты стёртое поле и снятый выбор', () => {
		expect(isEmptyField('')).toBe(true)
		expect(isEmptyField(undefined)).toBe(true)
	})

	it('ноль и false — значения', () => {
		expect(isEmptyField(0)).toBe(false)
		expect(isEmptyField(false)).toBe(false)
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

/**
 * Вид поля выводится из типа декларации, на настоящих дескрипторах.
 *
 * Длины объявлены объединением `Number` и `String`, и числовое поле, которое
 * они получали по первому конструктору, превращало `10%` и `auto` в `NaN`.
 * Своё поле им положено при любом порядке конструкторов, но только им: тип с
 * числом и чем-то ещё остаётся числовым, а тип, где строка — лишь один из
 * многих, — текстовым.
 */
describe('controlKind: число или текст', () => {
	/** Вид строки по имени — из любой группы страницы. */
	function kindOf(id: string, name: string) {
		const row = Object.values(propControls(entryOf(id)))
			.flat()
			.find((control) => control.name === name)

		if (!row) throw new Error(`нет строки ${name} у ${id}`)

		return row.kind
	}

	it.each([
		['dialog', 'offset'],
		['dialog', 'width'],
		['dialog', 'height'],
		// Порядок `[String, Number]` — тот же вид
		['icon', 'width'],
	])('%s.%s — поле «число или текст»', (id, name) => {
		expect(kindOf(id, name)).toBe('number-or-text')
	})

	it('число с массивом остаётся числовым: step у Slider', () => {
		expect(kindOf('slider', 'step')).toBe('number')
	})

	it('строка среди многих типов остаётся текстом: value у Input', () => {
		expect(kindOf('input', 'value')).toBe('text')
	})
})

/**
 * Текст поля «число или текст» → значение пропа.
 *
 * Поле перерисовывается из значения, поэтому числом становится только текст,
 * который число вернёт тем же: иначе набираемое переписывалось бы под пальцем.
 */
describe('parseNumberOrText', () => {
	it('пустое и из одних пробелов — проп не задан', () => {
		expect(parseNumberOrText('')).toBeUndefined()
		expect(parseNumberOrText('  ')).toBeUndefined()
	})

	it.each([
		['40', 40],
		['-5', -5],
		['1.5', 1.5],
		['0', 0],
	])('%s — число', (text, number) => {
		expect(parseNumberOrText(text)).toBe(number)
	})

	it.each(['10%', '2rem', 'auto'])('%s — CSS-значение строкой', (text) => {
		expect(parseNumberOrText(text)).toBe(text)
	})

	/**
	 * `1.50`, `007` и `1.` — то, что стоит в поле посреди набора: числом они
	 * вернулись бы в поле как `1.5`, `7` и `1`. `Infinity` числом пишется, но
	 * длиной не бывает.
	 */
	it.each(['1.50', '007', '1.', 'Infinity'])(
		'%s — не каноническое конечное число, строка как набрана',
		(text) => {
			expect(parseNumberOrText(text)).toBe(text)
		},
	)
})
