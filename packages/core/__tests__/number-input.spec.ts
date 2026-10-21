import { describe, expect, it, vi } from 'vitest'
import { TChangeEvent, TNumberInput } from '@soldy-ui/core'
import type { INumberInputProps, TNumberInputFormatOptions } from '@soldy-ui/core'
import { numberFormat } from '../src/components/custom/number-input/format'

/**
 * Поле числа — число в формате локали, шаг и границы.
 *
 * Строки Intl — группы, разделители, знаки, валюта и единица — сверяются с тем
 * же форматтером, а не с литералом: ICU разных версий Node пишет их
 * по-разному. Команды зовутся так, как их позовут плагины: какая клавиша
 * какой команде соответствует, ядро не знает.
 */

/** Строка числа у `Intl.NumberFormat` с теми же тегом и опциями. */
function intl(value: number, locale: string, options: Intl.NumberFormatOptions = {}): string {
	return new Intl.NumberFormat(locale, options).format(value)
}

function field(props: Partial<INumberInputProps> = {}): TNumberInput {
	return new TNumberInput(props)
}

describe('формат: текст — строка Intl целиком', () => {
	it.each([
		['en-US', {}],
		['ru-RU', {}],
		['de-DE', {}],
		['ar-EG', {}],
		['fa-IR', {}],
		['he-IL', {}],
		['ru-RU', { style: 'percent' }],
		['ru-RU', { style: 'currency', currency: 'RUB' }],
		['he-IL', { style: 'currency', currency: 'ILS' }],
		['ru-RU', { style: 'unit', unit: 'kilogram' }],
	] as const)('%s %j', (locale, options) => {
		const format = numberFormat(locale, options)

		expect(format.format(-1234.5)).toBe(intl(-1234.5, locale, options))
		expect(format.format(undefined)).toBe('')
	})
})

describe('формат: разбор', () => {
	it.each(['en-US', 'ru-RU', 'de-DE', 'ar-EG', 'fa-IR', 'he-IL', 'fr-FR', 'hi-IN', 'de-CH'])(
		'%s: свой текст читается тем же числом',
		(locale) => {
			const format = numberFormat(locale, { maximumFractionDigits: 2 })

			for (const value of [0, 7, -1234.5, 1234567.25, 0.5]) {
				expect(format.parse(format.format(value))).toBe(value)
			}
		},
	)

	it('цифры локали, ASCII и полноширинные', () => {
		const arabic = numberFormat('ar-EG', {})

		expect(arabic.parse('١٢٣')).toBe(123)
		expect(arabic.parse('123')).toBe(123)
		expect(numberFormat('en-US', {}).parse('１２３')).toBe(123)
		expect(numberFormat('fa-IR', {}).parse('۱۲۳')).toBe(123)
	})

	it('группы и пробелы пропускаются', () => {
		const en = numberFormat('en-US', {})
		const ru = numberFormat('ru-RU', {})

		expect(en.parse('1,234,567')).toBe(1234567)
		expect(ru.parse('1 234 567')).toBe(1234567)
		expect(ru.parse(' 12 ')).toBe(12)
	})

	it('десятичный — локали; точка — тоже, если она не разделитель групп', () => {
		expect(numberFormat('ru-RU', {}).parse('12,5')).toBe(12.5)
		expect(numberFormat('ru-RU', {}).parse('12.5')).toBe(12.5)
		expect(numberFormat('ar-EG', {}).parse('١٢٫٥')).toBe(12.5)
		// У `de-DE` точка — разделитель групп: «1.5» — пятнадцать
		expect(numberFormat('de-DE', {}).parse('1,5')).toBe(1.5)
		expect(numberFormat('de-DE', {}).parse('1.5')).toBe(15)
		// У `en-US` запятая — разделитель групп
		expect(numberFormat('en-US', {}).parse('1,5')).toBe(15)
	})

	it('знак — минус ASCII, U+2212 и локали, плюс; только в начале', () => {
		const en = numberFormat('en-US', {})

		expect(en.parse('-5')).toBe(-5)
		expect(en.parse('−5')).toBe(-5)
		expect(en.parse('+5')).toBe(5)
		expect(en.parse('－５')).toBe(-5)
		expect(en.parse('5-')).toBeUndefined()
		expect(en.parse('--5')).toBeUndefined()
		expect(numberFormat('fa-IR', {}).parse(intl(-5, 'fa-IR'))).toBe(-5)
	})

	it('валюта, процент, единица и метки направления снимаются', () => {
		expect(
			numberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).parse('1 234,50 ₽'),
		).toBe(1234.5)
		expect(numberFormat('en-US', { style: 'currency', currency: 'EUR' }).parse('-€12.50')).toBe(
			-12.5,
		)
		expect(numberFormat('ru-RU', { style: 'unit', unit: 'kilogram' }).parse('5 кг')).toBe(5)
		expect(numberFormat('he-IL', { style: 'currency', currency: 'ILS' }).parse('‏12 ‏₪')).toBe(
			12,
		)
	})

	it('единица во всех формах числа: «километр», «километра», «километров»', () => {
		const format = numberFormat('ru-RU', {
			style: 'unit',
			unit: 'kilometer',
			unitDisplay: 'long',
		})

		for (const value of [1, 2, 5, 21, 1.5]) {
			expect(format.parse(format.format(value))).toBe(value)
		}

		expect(format.parse('15 километр')).toBe(15)
	})

	it('процент — делённое на 100, без шума плавающей точки', () => {
		const percent = numberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 })

		expect(percent.parse('12%')).toBe(0.12)
		expect(percent.parse('1.1%')).toBe(0.011)
		expect(percent.parse('5')).toBe(0.05)
		expect(percent.parse('150')).toBe(1.5)
		expect(percent.parse(percent.format(0.125))).toBe(0.125)
	})

	it('не число — пусто: цифр нет, лишние знаки, буквы', () => {
		const en = numberFormat('en-US', {})

		for (const text of ['', '-', '.', 'abc', '1.2.3', '12a', '1e5']) {
			expect(en.parse(text)).toBeUndefined()
		}
	})

	it('минус ноль — ноль', () => {
		expect(Object.is(numberFormat('en-US', {}).parse('-0'), 0)).toBe(true)
	})
})

describe('формат: правило набора', () => {
	it('частичное число годится: пусто, знак, разделитель без цифр', () => {
		const en = numberFormat('en-US', {})

		for (const text of ['', '-', '-.', '1.', '.5', '12,345', '1,']) {
			expect(en.accepts(text, true)).toBe(true)
		}
	})

	it('минус — только со знаком', () => {
		const en = numberFormat('en-US', {})

		expect(en.accepts('-5', false)).toBe(false)
		expect(en.accepts('-', false)).toBe(false)
		expect(en.accepts('+5', false)).toBe(true)
	})

	it('разделитель — только у формата с дробью', () => {
		const integer = numberFormat('ru-RU', { maximumFractionDigits: 0 })
		const percent = numberFormat('ru-RU', { style: 'percent' })

		expect(integer.fraction).toBe(false)
		expect(integer.accepts('12,', true)).toBe(false)
		expect(percent.fraction).toBe(false)
		expect(percent.accepts('12,5 %', true)).toBe(false)
		expect(numberFormat('ru-RU', {}).fraction).toBe(true)
	})

	it('буквы, лишний разделитель и знак не на месте — не годятся', () => {
		const ru = numberFormat('ru-RU', {})

		for (const text of ['a', '1a', '1,2,3', '1-', '5 кг']) {
			expect(ru.accepts(text, true)).toBe(false)
		}
	})
})

describe('формат: опции и локаль', () => {
	it('опции, текст которых не разобрать, снимаются', () => {
		const options = {
			notation: 'compact',
			currencySign: 'accounting',
			signDisplay: 'never',
			style: 'currency',
			currency: 'USD',
		}
		// Опции мимо типа — как из JS: тип их не пускает
		const format = numberFormat('en-US', Object.fromEntries(Object.entries(options)))

		expect(format.format(-1234)).toBe(
			intl(-1234, 'en-US', { style: 'currency', currency: 'USD' }),
		)
	})

	it('опции, с которыми Intl не строит формат, — простое число', () => {
		const format = numberFormat('en-US', { style: 'currency' })

		expect(format.format(1234.5)).toBe(intl(1234.5, 'en-US'))
	})

	it('невалидный и пустой тег — en-US', () => {
		expect(numberFormat('not a tag', {}).format(1234.5)).toBe(intl(1234.5, 'en-US'))
		expect(numberFormat('', {}).lang).toBe('en-US')
	})

	it('объект — один на тег и опции; опции сверяются по содержимому', () => {
		const a: TNumberInputFormatOptions = { style: 'percent', maximumFractionDigits: 1 }
		const b: TNumberInputFormatOptions = { maximumFractionDigits: 1, style: 'percent' }

		expect(numberFormat('ru-RU', a)).toBe(numberFormat('ru-RU', b))
		expect(numberFormat('ru-RU', a)).not.toBe(numberFormat('en-US', a))
	})

	it('направление — числа в формате: валюта и единица справа налево у ar, he, fa', () => {
		expect(numberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).direction).toBe('rtl')
		expect(numberFormat('he-IL', { style: 'currency', currency: 'ILS' }).direction).toBe('rtl')
		expect(numberFormat('fa-IR', { style: 'unit', unit: 'kilogram' }).direction).toBe('rtl')
		expect(numberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).direction).toBe('ltr')
		expect(numberFormat('en-US', {}).direction).toBe('ltr')
	})

	it('язык — тег формата', () => {
		expect(numberFormat('ar-EG', {}).lang).toBe('ar-EG')
	})
})

describe('значение', () => {
	it('по умолчанию пусто, текст пуст; число — строкой формата', () => {
		expect(field().value).toBeUndefined()
		expect(field().text).toBe('')
		expect(field({ value: 1234.5 }).text).toBe(intl(1234.5, 'en-US'))
		expect(field({ value: 1234.5, locale: 'ru-RU' }).text).toBe(intl(1234.5, 'ru-RU'))
	})

	it('не число — пусто', () => {
		for (const value of [Number.NaN, Infinity]) {
			expect(field({ value }).value).toBeUndefined()
		}
	})

	it('итог прижат к min и max, а хранится как задано; к шагу не приводится', () => {
		const input = field({ value: 150, max: 100 })

		expect(input.value).toBe(100)

		input.max = 200

		expect(input.value).toBe(150)
		expect(field({ value: 2.5, step: 1 }).value).toBe(2.5)
	})

	it('запись снаружи — текст из значения; эхо итога текст не трогает', () => {
		const input = field({ max: 100 })

		input.typeText('150')

		expect(input.value).toBe(100)
		expect(input.text).toBe('150')

		// `v-model` вернул итог
		input.value = 100

		expect(input.text).toBe('150')

		input.value = 42

		expect(input.text).toBe('42')
	})

	it('смена локали и опций — текст строкой нового формата, значение то же', () => {
		const input = field({ value: 1234.5 })

		input.locale = 'de-DE'

		expect(input.text).toBe(intl(1234.5, 'de-DE'))

		input.formatOptions = { style: 'currency', currency: 'EUR' }

		expect(input.text).toBe(intl(1234.5, 'de-DE', { style: 'currency', currency: 'EUR' }))
		expect(input.value).toBe(1234.5)
	})

	it('те же опции новым объектом — не смена', () => {
		const input = field({ formatOptions: { style: 'percent' } })
		const spy = vi.fn()

		input.events.on('change:formatOptions', spy)
		input.formatOptions = { style: 'percent' }

		expect(spy).not.toHaveBeenCalled()
	})
})

describe('набор — буфер правки', () => {
	it('пока набрано число, значение пишется на каждый знак', () => {
		const input = field({ locale: 'ru-RU' })
		const values: unknown[] = []

		input.events.on('change:value', ({ newValue }) => values.push(newValue))

		for (const text of ['1', '12', '12,', '12,5']) {
			expect(input.typeText(text)).toBe(true)
			expect(input.text).toBe(text)
		}

		expect(values).toEqual([1, 12, 12.5])
		expect(input.value).toBe(12.5)
	})

	it('недописанное — пусто, а текст остаётся', () => {
		const input = field({ value: 5 })

		input.typeText('-')

		expect(input.value).toBeUndefined()
		expect(input.text).toBe('-')
	})

	it('не годится — ничего: ни текста, ни значения', () => {
		const input = field({ value: 5 })

		expect(input.typeText('5a')).toBe(false)
		expect(input.text).toBe('5')
		expect(input.value).toBe(5)
	})

	it('минус — только если min не задан или меньше нуля', () => {
		expect(field().signed).toBe(true)
		expect(field({ min: -10 }).signed).toBe(true)
		expect(field({ min: 0 }).signed).toBe(false)
		expect(field({ min: 0 }).typeText('-1')).toBe(false)
		expect(field({ min: 0 }).acceptsText('-')).toBe(false)
	})

	it('отменённая в change:value:before правка — ни текста, ни значения', () => {
		const input = field({ value: 5 })

		input.events.on('change:value:before', (e: TChangeEvent<number | undefined>) =>
			e.preventDefault(),
		)

		expect(input.typeText('7')).toBe(false)
		expect(input.text).toBe('5')
		expect(input.value).toBe(5)
	})

	it('поправленная правка — текст показывает итог', () => {
		const input = field()

		input.events.on('change:value:before', (e: TChangeEvent<number | undefined>) => {
			e.value = 10
		})

		input.typeText('7')

		expect(input.value).toBe(10)
		expect(input.text).toBe('10')
	})

	it('выключенное и только для чтения поле набора не принимает', () => {
		expect(field({ disabled: true }).typeText('1')).toBe(false)
		expect(field({ readonly: true }).typeText('1')).toBe(false)
	})
})

describe('commit — конец действия', () => {
	it('значение — с точностью формата, текст — строкой формата', () => {
		const input = field({ locale: 'ru-RU' })

		input.typeText('1234,56789')
		input.commit()

		expect(input.value).toBe(1234.568)
		expect(input.text).toBe(intl(1234.568, 'ru-RU'))
	})

	it('процент — точность видимого: 12,345 % при целых процентах — 0,12', () => {
		const input = field({ locale: 'ru-RU', formatOptions: { style: 'percent' } })

		input.typeText('12')
		input.commit()

		expect(input.value).toBe(0.12)
		expect(input.text).toBe(intl(0.12, 'ru-RU', { style: 'percent' }))
	})

	it('commit — одно на действие, если оно сменило значение', () => {
		const input = field({ value: 1 })
		const spy = vi.fn()

		input.events.on('commit', spy)
		input.typeText('12')
		input.typeText('123')
		input.commit()
		input.commit()

		expect(spy).toHaveBeenCalledTimes(1)
		expect(spy).toHaveBeenCalledWith({ newValue: 123, oldValue: 1 })
	})

	it('набрали и вернули то же — без commit', () => {
		const input = field({ value: 1 })
		const spy = vi.fn()

		input.events.on('commit', spy)
		input.typeText('12')
		input.typeText('1')
		input.commit()

		expect(spy).not.toHaveBeenCalled()
	})

	it('недописанное — пусто, текст очищен', () => {
		const input = field({ value: 5 })

		input.typeText('-')
		input.commit()

		expect(input.value).toBeUndefined()
		expect(input.text).toBe('')
	})

	it('итог за границей — значение и текст прижаты', () => {
		const input = field({ max: 100 })

		input.typeText('150')
		input.commit()

		expect(input.value).toBe(100)
		expect(input.text).toBe('100')
	})

	it('запись снаружи начинает новое действие — commit от неё', () => {
		const input = field({ value: 1 })
		const spy = vi.fn()

		input.events.on('commit', spy)
		input.value = 5
		input.commit()

		expect(spy).not.toHaveBeenCalled()

		input.typeText('6')
		input.commit()

		expect(spy).toHaveBeenCalledWith({ newValue: 6, oldValue: 5 })
	})

	it('у выключенного и только для чтения — ничего', () => {
		const input = field({ value: 1.23456, readonly: true })
		const spy = vi.fn()

		input.events.on('commit', spy)
		input.commit()

		expect(input.value).toBe(1.23456)
		expect(spy).not.toHaveBeenCalled()
	})
})

describe('шаг', () => {
	it('на шаг шкалы; текст — строкой формата', () => {
		const input = field({ value: 5, step: 2.5 })

		input.shift(1)

		expect(input.value).toBe(7.5)
		expect(input.text).toBe('7.5')

		input.shift(-2)

		expect(input.value).toBe(2.5)
	})

	it('вне сетки — к соседнему узлу: с 2,5 вверх на 3, вниз на 2', () => {
		const up = field({ value: 2.5 })
		const down = field({ value: 2.5 })

		up.shift(1)
		down.shift(-1)

		expect(up.value).toBe(3)
		expect(down.value).toBe(2)
	})

	it('сетка — от min, без него — от нуля', () => {
		const fromMin = field({ value: 0.5, min: 0.5, step: 2 })
		const fromZero = field({ value: 1, step: 2 })

		fromMin.shift(1)
		fromZero.shift(1)

		expect(fromMin.value).toBe(2.5)
		expect(fromZero.value).toBe(2)
	})

	it('с пустого — вверх к min, вниз к max; без границы — 0', () => {
		const bounded = (count: number) => {
			const input = field({ min: 3, max: 9 })

			input.shift(count)

			return input.value
		}
		const open = (count: number) => {
			const input = field()

			input.shift(count)

			return input.value
		}

		expect(bounded(1)).toBe(3)
		expect(bounded(-1)).toBe(9)
		expect(open(1)).toBe(0)
		expect(open(-1)).toBe(0)
	})

	it('у края в его сторону шага нет, и кнопка выключена', () => {
		const input = field({ value: 10, min: 0, max: 10 })

		expect(input.incrementDisabled).toBe(true)
		expect(input.decrementDisabled).toBe(false)

		input.shift(1)

		expect(input.value).toBe(10)

		input.value = 0

		expect(input.decrementDisabled).toBe(true)
	})

	it('max вне сетки: число между последним узлом и max — у края', () => {
		const input = field({ value: 10, max: 10, step: 3 })

		expect(input.incrementDisabled).toBe(true)

		input.shift(1)

		expect(input.value).toBe(10)

		input.shift(-1)

		expect(input.value).toBe(9)
	})

	it('шаг действия не закрывает: commit — после', () => {
		const input = field({ value: 1 })
		const spy = vi.fn()

		input.events.on('commit', spy)
		input.shift(1)
		input.shift(1)

		expect(spy).not.toHaveBeenCalled()

		input.commit()

		expect(spy).toHaveBeenCalledWith({ newValue: 3, oldValue: 1 })
	})

	it('у выключенного и только для чтения — ничего, обе кнопки выключены', () => {
		for (const props of [{ disabled: true }, { readonly: true }]) {
			const input = field({ value: 1, ...props })

			input.shift(1)

			expect(input.value).toBe(1)
			expect(input.incrementDisabled).toBe(true)
			expect(input.decrementDisabled).toBe(true)
		}
	})

	it('Home и End — к заданной границе; границы нет — ничего', () => {
		const bounded = field({ value: 5, min: 1, max: 10.5 })
		const open = field({ value: 5 })

		bounded.moveToEdge('start')

		expect(bounded.value).toBe(1)

		bounded.moveToEdge('end')

		expect(bounded.value).toBe(10.5)

		open.moveToEdge('end')

		expect(open.value).toBe(5)
	})
})

describe('очистка', () => {
	it('пусто и значение, и текст; законченное действие — commit', () => {
		const input = field({ value: 5 })
		const spy = vi.fn()

		input.events.on('commit', spy)
		input.typeText('-')
		input.clear()

		expect(input.value).toBeUndefined()
		expect(input.text).toBe('')
		expect(spy).toHaveBeenCalledWith({ newValue: undefined, oldValue: 5 })
	})
})

describe('разметка', () => {
	it('блок so-number-input; aria — на вложенном вводе, labelable', () => {
		const input = field({ required: true, readonly: true })

		expect(input.classes.toString()).toContain('so-number-input')
		expect(input.labelable).toBe(true)
		// `required` на readonly-поле браузер не проверяет — нужен `aria-required`
		expect(input.aria.get('aria-required')).toBe('true')
		expect(input.aria.get('aria-readonly')).toBeUndefined()
		expect(input.aria.get('aria-disabled')).toBeUndefined()
	})

	it('ARIA счётчика: число, его строка и только заданные границы', () => {
		expect(
			field({ value: 0.25, min: 0, formatOptions: { style: 'percent' } }).inputAria,
		).toEqual({
			role: 'spinbutton',
			'aria-valuenow': '0.25',
			'aria-valuetext': intl(0.25, 'en-US', { style: 'percent' }),
			'aria-valuemin': '0',
			'aria-valuemax': null,
		})
		expect(field().inputAria).toEqual({
			role: 'spinbutton',
			'aria-valuenow': null,
			'aria-valuetext': null,
			'aria-valuemin': null,
			'aria-valuemax': null,
		})
	})

	it('роль из набора поля снимает значение', () => {
		const input = field({ value: 5, min: 0, max: 10 })

		input.inputSets.aria.add('role', 'textbox')

		expect(input.inputAria).toEqual({
			role: 'textbox',
			'aria-valuenow': null,
			'aria-valuetext': null,
			'aria-valuemin': null,
			'aria-valuemax': null,
		})
	})

	it('dir и lang числа, клавиатура — с разделителем у дроби; набор поля поверх', () => {
		const input = field({
			locale: 'ar-EG',
			formatOptions: { style: 'currency', currency: 'EGP' },
		})

		expect(input.inputAttrs).toEqual({ dir: 'rtl', lang: 'ar-EG', inputmode: 'decimal' })
		expect(field({ formatOptions: { maximumFractionDigits: 0 } }).inputAttrs.inputmode).toBe(
			'numeric',
		)

		input.inputSets.attrs.add('inputmode', 'text')

		expect(input.inputAttrs.inputmode).toBe('text')
	})

	/**
	 * Связка перечитывает `inputAria` и `inputAttrs` на `change:locale` и
	 * `change:formatOptions` — это их триггеры в дескрипторе. Формат к событию
	 * уже новый: иначе скринридер слышал бы прежнюю строку числа, а `lang` и
	 * клавиатура оставались бы от прежнего формата до следующей правки.
	 */
	it('на change:locale и change:formatOptions формат уже новый: текст, lang, inputmode, aria-valuetext', () => {
		const input = field({ value: 0.5, locale: 'ru-RU' })
		const seen: Array<Record<string, string | null>> = []
		const read = (): void => {
			seen.push({
				text: input.text,
				lang: input.inputAttrs.lang,
				inputmode: input.inputAttrs.inputmode,
				valuetext: input.inputAria['aria-valuetext'],
			})
		}

		input.events.on('change:locale', read)
		input.events.on('change:formatOptions', read)
		input.locale = 'zh-CN'
		input.formatOptions = { style: 'percent' }

		const number = intl(0.5, 'zh-CN')
		const percent = intl(0.5, 'zh-CN', { style: 'percent' })

		expect(seen).toEqual([
			{ text: number, lang: 'zh-CN', inputmode: 'decimal', valuetext: number },
			{ text: percent, lang: 'zh-CN', inputmode: 'numeric', valuetext: percent },
		])
	})

	it('набор поля сообщает о смене: change:inputSets', () => {
		const input = field()
		const spy = vi.fn()

		input.events.on('change:inputSets', spy)
		input.inputSets.aria.add('role', 'textbox')
		input.inputSets.attrs.add('inputmode', 'text')

		expect(spy).toHaveBeenCalledTimes(2)
	})

	it('кнопки шага — не остановки Tab, наборы живые', () => {
		const input = field()
		const aria = vi.fn()
		const dataset = vi.fn()

		expect(input.decrementAria.get('tabindex')).toBe('-1')
		expect(input.incrementAria.get('tabindex')).toBe('-1')

		input.events.on('change:incrementAria', aria)
		input.events.on('change:incrementDataset', dataset)
		input.incrementAria.add('aria-label', 'Увеличить')
		input.incrementDataset.add('pressed', true)

		expect(aria).toHaveBeenCalledWith({ tabindex: '-1', 'aria-label': 'Увеличить' })
		expect(dataset).toHaveBeenCalledWith({ 'data-pressed': 'true' })
	})
})
