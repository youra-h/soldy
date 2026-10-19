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
import { TRating } from '@soldy-ui/core'
import { TName, TPropSpec } from '@soldy-ui/setup'
import { TAnchorPlugin } from '@soldy-ui/plugins'
import { ButtonDescriptor } from '@soldy-ui/setup'
import { FRAME_PLACEMENTS } from '../src/enums'
import { createInstance } from '../src/instance'
import {
	isEmptyField,
	parseNumber,
	parseNumberOrText,
	PREVIEW_PROPS,
	previewProps,
	propControl,
	propControls,
} from '../src/props'
import { findComponent } from '../src/registry'
import type { TPropControl } from '../src/types'

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

/** Строка по имени — из любой группы страницы. */
function rowOf(id: string, name: string): TPropControl {
	const row = Object.values(propControls(entryOf(id)))
		.flat()
		.find((control) => control.name === name)

	if (!row) throw new Error(`нет строки ${name} у ${id}`)

	return row
}

/** Вид строки по имени — из любой группы страницы. */
function kindOf(id: string, name: string) {
	return rowOf(id, name).kind
}

/**
 * Значение превью — то, что превью задаёт компоненту само, — строка получает
 * отдельно от умолчания: открывается с ним, а умолчание остаётся тем, что
 * получит экземпляр, когда поле стёрто. Семантика ключа — та же, что у
 * умолчания.
 */
describe('propControl: значение превью', () => {
	it('у пропа компонента — из пропсов превью, умолчание — из декларации', () => {
		const row = rowOf('button', 'text')

		expect(row.initial).toBe('Кнопка')
		expect(row.default).toBe('')
	})

	it('у пропа плагина — по имени из разметки', () => {
		const row = rowOf('progress-spinner', 'aria_label')

		expect(row.scope).toBe('plugin')
		expect(row.initial).toBe('Загрузка')
		expect(Object.hasOwn(row, 'default')).toBe(true)
		expect(row.default).toBeUndefined()
	})

	it('проп, которого превью не задаёт, ключа не получает', () => {
		expect(Object.hasOwn(rowOf('button', 'size'), 'initial')).toBe(false)
		expect(Object.hasOwn(rowOf('tabs', 'view'), 'initial')).toBe(false)
	})

	/**
	 * Значение превью своего пропа экземпляр второй колонки получает
	 * конструктором. Конструктор, который проп не применил бы, оставил бы
	 * экземпляр на умолчании, а строку и колонку пропа — на значении превью:
	 * колонки разошлись бы с первой отрисовки.
	 */
	const OWN_ROWS = Object.keys(PREVIEW_PROPS).flatMap((id) =>
		propControls(entryOf(id))
			.componentControls.filter((control) => Object.hasOwn(control, 'initial'))
			.map((control) => [id, control.name, control.initial] as const),
	)

	it.each(OWN_ROWS)('%s.%s: экземпляр принимает его конструктором', (id, name, initial) => {
		expect(createInstance(entryOf(id), { [name]: initial })[name]).toEqual(initial)
	})
})

/**
 * Пропсы превью строке — без её пропа: его колонки получают каждая по-своему.
 * Витрине — целиком и тем же объектом: новый на каждую её отрисовку слал бы
 * хосту обновление с теми же пропсами.
 */
describe('previewProps', () => {
	it('без пропа строки — остальные пропсы превью', () => {
		expect(previewProps('field', 'label')).toEqual({ helper: 'Не покажем никому' })
		expect(previewProps('field', 'size')).toEqual({
			label: 'Почта',
			helper: 'Не покажем никому',
		})
	})

	it('целиком — тот же объект на каждый вызов', () => {
		expect(previewProps('button')).toEqual({ text: 'Кнопка' })
		expect(previewProps('button')).toBe(previewProps('button'))
	})

	it('у компонента без пропсов превью — пусто', () => {
		expect(previewProps('tabs')).toEqual({})
		expect(previewProps('нет-такого', 'text')).toEqual({})
	})
})

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

	/**
	 * Объект строкой в поле не набрать: опции формата поля числа выбирают
	 * пресетом по имени, а компоненту уходит объект пресета.
	 */
	it('formatOptions поля числа — пресеты: имена в списке, значения — объекты', () => {
		const row = propControls(entryOf('number-input')).componentControls.find(
			(control) => control.name === 'formatOptions',
		)

		expect(row?.kind).toBe('select')
		expect(row?.options).toEqual(['percent', 'currency', 'unit'])
		expect(row?.values?.percent).toEqual({ style: 'percent', maximumFractionDigits: 1 })
	})

	it('у списка строк значений-пресетов нет', () => {
		expect(pluginRow('anchor_placement')).not.toHaveProperty('values')
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
 * `value` контролы наследуют с типом полей — первым в нём стоит `String`, — и
 * у CheckBox и Switch строка была текстовым полем: набранное уходило компоненту
 * строкой, хотя значение у них да или нет, а код под колонками не проходил
 * проверку типов. Их дескрипторы сужают тип до `Boolean`, как у ядра; у Input
 * поле остаётся текстовым (блок выше).
 */
describe('controlKind: булево значение контрола', () => {
	it.each(['check-box', 'switch'])('%s.value — переключатель', (id) => {
		expect(kindOf(id, 'value')).toBe('switch')
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

/**
 * Текст числового поля → значение пропа.
 *
 * Поле переводило каждое нажатие в `Number(text)`: `-`, `.` и `0,` давали
 * `NaN`, и он уходил и компоненту, и обратно в поле. Теперь числом становится
 * только законченная запись, а незаконченная модель не трогает — набранное
 * поле держит само (`PropControl.vue`).
 */
describe('parseNumber', () => {
	it('пустое и из одних пробелов — проп не задан, а не ноль', () => {
		expect(parseNumber('')).toBeUndefined()
		expect(parseNumber('  ')).toBeUndefined()
	})

	it.each([
		['0.5', 0.5],
		['.5', 0.5],
		['-1', -1],
		['+2', 2],
		['1e1', 10],
		['007', 7],
		['1.', 1],
		[' 3 ', 3],
	])('%s — законченное число', (text, number) => {
		expect(parseNumber(text)).toBe(number)
	})

	it.each([
		['0,5', 0.5],
		[',5', 0.5],
		['1,', 1],
	])('%s — запятая работает как точка', (text, number) => {
		expect(parseNumber(text)).toBe(number)
	})

	it.each(['-', '+', '.', ',', '-.', '1e', '1e-'])(
		'%s — запись не закончена: модель не трогают',
		(text) => {
			expect(parseNumber(text)).toBeNull()
		},
	)

	it.each(['abc', 'NaN', 'Infinity', '1e999', '1,2,3', '0x10'])(
		'%s — не конечное число: NaN не уходит никуда',
		(text) => {
			expect(parseNumber(text)).toBeNull()
		},
	)
})

/**
 * Значение оценки приводится к шагу, как у нативного ползунка: при шаге 1
 * значение 1.3 строки `value` встало бы одной звездой, и куда делись 0.3, не
 * видно. Пресет строки даёт ей мелкий шаг.
 */
describe('пресет строки value у Rating', () => {
	it('шаг пресета держит дробь строки: 1.3 — не одна звезда', () => {
		const row = propControls(entryOf('rating')).componentControls.find(
			(control) => control.name === 'value',
		)

		if (!row) throw new Error('нет строки value у rating')

		const step = row.preset?.step

		if (typeof step !== 'number') throw new Error('пресет строки value не задаёт шаг')

		expect(new TRating({ value: 1.3 }).value).toBe(1)
		expect(new TRating({ step, value: 1.3 }).value).toBe(1.3)
	})
})
