import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TChangeEvent, TDateInput } from '@soldy-ui/core'
import type {
	IDateInputProps,
	TDateFieldPart,
	TDateInputPart,
	TDateInputSegment,
} from '@soldy-ui/core'
import { parseFieldText } from '../src/components/custom/date-input/date-time'
import { fieldFormat } from '../src/components/custom/date-input/format'

/**
 * Поле даты — части по формату локали и правка их с клавиатуры.
 *
 * Команды зовутся так, как их позовут плагины: какая клавиша какой команде
 * соответствует, ядро не знает. Строки Intl — порядок частей, литералы,
 * цифры, цикл часов, имена частей и периодов суток — сверяются с тем же
 * форматтером, а не с литералом: ICU разных версий Node пишет их по-разному.
 * Подсказки — данные библиотеки, их сверяют литералом.
 *
 * Сейчас во всех тестах — суббота 2026-09-26, полдень по часам среды: ↑ на
 * пустой части начинает с числа текущего момента.
 */

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(2026, 8, 26, 12))
})

afterEach(() => {
	vi.useRealTimers()
})

/** Поле с фокусом на части — так его оставляет плагин клавиатуры. */
function field(props: Partial<IDateInputProps> = {}, focused?: TDateFieldPart): TDateInput {
	const input = new TDateInput(props)

	if (focused) input.focusSegment(focused)

	return input
}

/** Набрать строку: каждый знак — клавиша в часть под фокусом. */
function type(input: TDateInput, keys: string): void {
	for (const key of keys) input.typeKey(key)
}

/** Части поля без разделителей. */
function partsOf(input: TDateInput): TDateInputPart[] {
	return input.segments.filter((segment): segment is TDateInputPart => segment.type !== 'literal')
}

/** Часть поля по типу. */
function part(input: TDateInput, type: TDateFieldPart): TDateInputPart {
	const found = partsOf(input).find((segment) => segment.type === type)

	if (!found) throw new Error(`части ${type} нет`)

	return found
}

/** Текст поля — части и разделители подряд, как его видит пользователь. */
function text(input: TDateInput): string {
	return input.segments.map((segment) => segment.text).join('')
}

/** Форматтер поля для сверки — с теми же опциями, что у формата поля. */
function fieldFormatter(locale: string, calendar = 'gregory'): Intl.DateTimeFormat {
	return new Intl.DateTimeFormat([locale, 'en-US'], {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		calendar,
		timeZone: 'UTC',
	})
}

/** Части и литералы даты по форматтеру — как выход `segments`. */
function expectedSegments(formatter: Intl.DateTimeFormat, date: string): string[] {
	const [year, month, day] = date.split('-').map(Number)

	return formatter.formatToParts(Date.UTC(year, month - 1, day)).map(({ value }) => value)
}

/** Имя части по `Intl.DisplayNames`. */
function partName(locale: string, type: TDateFieldPart): string | undefined {
	return new Intl.DisplayNames([locale, 'en-US'], { type: 'dateTimeField' }).of(type)
}

/** Форматтер поля со временем для сверки — с теми же опциями, что у формата поля. */
function timeFormatter(locale: string): Intl.DateTimeFormat {
	return new Intl.DateTimeFormat([locale, 'en-US'], {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		calendar: 'gregory',
		timeZone: 'UTC',
	})
}

/** Момент даты со временем `YYYY-MM-DDTHH:mm` в UTC — то, что форматирует поле. */
function utcOf(dateTime: string): number {
	const [date, time] = dateTime.split('T')
	const [year, month, day] = date.split('-').map(Number)
	const [hour, minute] = time.split(':').map(Number)

	return Date.UTC(year, month - 1, day, hour, minute)
}

/** Части и литералы даты со временем по форматтеру — как выход `segments`. */
function expectedTimeSegments(locale: string, dateTime: string): string[] {
	return timeFormatter(locale)
		.formatToParts(utcOf(dateTime))
		.map(({ value }) => value)
}

/** Часть даты со временем по форматтеру — как её пишет локаль. */
function formattedPart(locale: string, dateTime: string, type: string): string | undefined {
	return timeFormatter(locale)
		.formatToParts(utcOf(dateTime))
		.find((partOf) => partOf.type === type)?.value
}

/** Порядок частей поля. */
function orderOf(input: TDateInput): TDateFieldPart[] {
	return partsOf(input).map(({ type }) => type)
}

describe('формат поля', () => {
	it('части и литералы — в порядке formatToParts локали', () => {
		for (const locale of ['ru-RU', 'en-US', 'ja-JP', 'ko-KR', 'bg-BG', 'ar-EG', 'de-DE']) {
			const input = field({ locale, value: '2026-05-12' })

			expect(
				input.segments.map((segment) => segment.text),
				locale,
			).toEqual(expectedSegments(fieldFormatter(locale), '2026-05-12'))
		}
	})

	it('ru — день, месяц, год; en-US — месяц, день, год; ja-JP — год, месяц, день', () => {
		const order = (locale: string) => partsOf(field({ locale })).map(({ type }) => type)

		expect(order('ru-RU')).toEqual(['day', 'month', 'year'])
		expect(order('en-US')).toEqual(['month', 'day', 'year'])
		expect(order('ja-JP')).toEqual(['year', 'month', 'day'])
	})

	it('ключ части — её тип, ключ разделителя — место в формате', () => {
		const keys = field({ locale: 'ru-RU' }).segments.map((segment) => segment.key)

		expect(keys).toEqual(['day', 'literal-1', 'month', 'literal-3', 'year'])
	})

	it('разделитель скрыт от скринридера и несёт метки направления как есть', () => {
		const literals = field({ locale: 'ar-EG' }).segments.filter(
			(segment) => segment.type === 'literal',
		)
		const expected = fieldFormatter('ar-EG')
			.formatToParts(Date.UTC(2026, 4, 12))
			.filter((partOf) => partOf.type === 'literal')
			.map(({ value }) => value)

		expect(literals.map((literal) => literal.text)).toEqual(expected)
		expect(literals.every((literal) => literal.aria['aria-hidden'] === 'true')).toBe(true)
		expect(expected.some((value) => value.includes('‏'))).toBe(true)
	})

	it('цифры — системы счисления локали: у ar-EG арабские', () => {
		const input = field({ locale: 'ar-EG', value: '2026-05-12' })
		const parts = fieldFormatter('ar-EG').formatToParts(Date.UTC(2026, 4, 12))
		const value = (type: string) => parts.find((partOf) => partOf.type === type)?.value

		expect(part(input, 'day').text).toBe(value('day'))
		expect(part(input, 'year').text).toBe(value('year'))
		expect(part(input, 'day').aria['aria-valuenow']).toBe('12')
	})

	it('th-TH — буддийский год, как у заголовка календаря', () => {
		const input = field({ locale: 'th-TH', value: '2026-05-12' })
		const year = fieldFormatter('th-TH', 'buddhist')
			.formatToParts(Date.UTC(2026, 4, 12))
			.find((partOf) => partOf.type === 'year')?.value

		expect(year).toBe('2569')
		expect(part(input, 'year').text).toBe(year)
		expect(part(input, 'year').aria['aria-valuenow']).toBe('2569')
		expect(part(input, 'year').aria['aria-valuemin']).toBe('544')
		expect(part(input, 'year').aria['aria-valuemax']).toBe('10542')
	})

	it('японский календарь — годы григорианские: части эры у поля нет', () => {
		const input = field({ locale: 'ja-JP-u-ca-japanese', value: '2026-05-12' })

		expect(part(input, 'year').text).toBe('2026')
	})

	it('направление ряда — по первому сильному знаку даты', () => {
		expect(field({ locale: 'ar-EG' }).segmentsDirection).toBe('rtl')
		expect(field({ locale: 'he-IL' }).segmentsDirection).toBe('ltr')
		expect(field({ locale: 'en-US' }).segmentsDirection).toBe('ltr')
		expect(field({ locale: 'ar-EG' }).segmentsAttrs).toEqual({ dir: 'rtl', lang: 'ar-EG' })
		expect(field({ locale: 'he-IL' }).segmentsAttrs).toEqual({ dir: 'ltr', lang: 'he-IL' })
	})

	it('язык ряда — локаль форматтера: тега без данных движка нет — en-US', () => {
		expect(field({ locale: 'xx-YY' }).segmentsAttrs.lang).toBe('en-US')
		expect(field({ locale: 'не тег' }).segmentsAttrs.lang).toBe('en-US')
	})

	it('подсказки пустых частей — по языку локали, неизвестный язык — английские', () => {
		const placeholders = (locale: string) => partsOf(field({ locale })).map(({ text }) => text)

		expect(placeholders('ru-RU')).toEqual(['дд', 'мм', 'гггг'])
		expect(placeholders('en-US')).toEqual(['mm', 'dd', 'yyyy'])
		expect(placeholders('de-AT')).toEqual(['tt', 'mm', 'jjjj'])
		expect(placeholders('sr-Latn-RS')).toEqual(['dd', 'mm', 'gggg'])
		expect(placeholders('sr-RS')).toEqual(['дд', 'мм', 'гггг'])
		expect(placeholders('zh-HK')[0]).toBe('日')
		expect(placeholders('xx-YY')).toEqual(['mm', 'dd', 'yyyy'])
	})

	it('имя части — Intl.DisplayNames на языке локали', () => {
		for (const locale of ['ru-RU', 'en-US', 'ar-EG']) {
			const input = field({ locale })

			for (const type of ['day', 'month', 'year'] as const) {
				expect(part(input, type).name, `${locale} ${type}`).toBe(partName(locale, type))
				expect(part(input, type).aria['aria-label'], `${locale} ${type}`).toBe(
					partName(locale, type),
				)
			}
		}
	})
})

describe('набор', () => {
	it('цифры копятся, пока число в ходе части, и фокус уходит на следующую часть', () => {
		const input = field({ locale: 'ru-RU' }, 'day')

		type(input, '1')
		expect(input.focusedSegment).toBe('day')
		expect(part(input, 'day').text).toBe('01')

		type(input, '2')
		expect(part(input, 'day').text).toBe('12')
		expect(input.focusedSegment).toBe('month')

		type(input, '05')
		expect(input.focusedSegment).toBe('year')

		type(input, '2026')
		expect(input.value).toBe('2026-05-12')
		expect(text(input)).toBe('12.05.2026')
		// Дописывать некуда, а следующей части нет — фокус остаётся
		expect(input.focusedSegment).toBe('year')
	})

	it('цифра, с которой число не дописать, переводит фокус сразу', () => {
		const input = field({ locale: 'ru-RU' }, 'day')

		type(input, '4')
		expect(part(input, 'day').text).toBe('04')
		expect(input.focusedSegment).toBe('month')

		type(input, '2')
		expect(input.focusedSegment).toBe('year')
	})

	it('число за ходом части начинает её с новой цифры', () => {
		const input = field({ locale: 'ru-RU' }, 'month')

		type(input, '13')
		expect(part(input, 'month').text).toBe('03')
		expect(input.focusedSegment).toBe('year')
	})

	it('ноль первой цифрой значения не даёт: из «0» и «5» выходит 5', () => {
		const input = field({ locale: 'ru-RU' }, 'day')

		type(input, '0')
		expect(part(input, 'day').placeholder).toBe(true)
		expect(input.focusedSegment).toBe('day')

		type(input, '5')
		expect(part(input, 'day').text).toBe('05')
		expect(input.focusedSegment).toBe('month')
	})

	it('год — четыре цифры, с нулями впереди тоже', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' }, 'year')

		type(input, '0005')
		expect(input.value).toBe('0005-05-12')
		expect(part(input, 'year').text).toBe('5')
	})

	it('пока дата не собрана, значения нет; собранная — пишется на каждом знаке', () => {
		const input = field({ locale: 'ru-RU' }, 'day')
		const values: Array<string | undefined> = []

		input.events.on('change:value', ({ newValue }) => values.push(newValue))

		type(input, '1205')
		expect(input.value).toBeUndefined()

		type(input, '20')
		expect(values).toEqual(['0002-05-12', '0020-05-12'])
	})

	it('цифры локали и полноширинные — тоже цифры', () => {
		const arabic = field({ locale: 'ar-EG' }, 'day')
		const digits = new Intl.NumberFormat('ar-EG').format(12)

		type(arabic, digits)
		expect(arabic.focusedSegment).toBe('month')
		expect(part(arabic, 'day').aria['aria-valuenow']).toBe('12')

		const wide = field({ locale: 'ru-RU' }, 'day')

		type(wide, '１２')
		expect(part(wide, 'day').aria['aria-valuenow']).toBe('12')
	})

	it('не цифра — не набор: команда отвечает false и частей не трогает', () => {
		const input = field({ locale: 'ru-RU' }, 'day')

		expect(input.typeKey('a')).toBe(false)
		expect(input.typeKey('.')).toBe(false)
		expect(part(input, 'day').placeholder).toBe(true)
	})

	it('набранные цифры живут до смены части', () => {
		const input = field({ locale: 'ru-RU' }, 'day')

		type(input, '1')
		input.focusSegment('month')
		input.focusSegment('day')
		type(input, '5')

		// После возврата набор начат заново: «5», а не «15»
		expect(part(input, 'day').text).toBe('05')
	})

	it('th-TH вводит буддийский год, значение — григорианское', () => {
		const input = field({ locale: 'th-TH' }, 'day')

		type(input, '1205')
		type(input, '25')
		expect(part(input, 'year').text).toBe('25')
		expect(input.value).toBeUndefined()

		type(input, '69')
		expect(input.value).toBe('2026-05-12')
		expect(part(input, 'year').text).toBe('2569')
	})
})

describe('день не длиннее месяца', () => {
	it('смена месяца прижимает день: 31-е в апреле — 30-е', () => {
		const input = field({ locale: 'ru-RU', value: '2026-03-31' }, 'month')

		type(input, '04')
		expect(input.value).toBe('2026-04-30')
	})

	it('смена года прижимает 29 февраля к 28-му', () => {
		const input = field({ locale: 'ru-RU', value: '2024-02-29' }, 'year')

		type(input, '2026')
		expect(input.value).toBe('2026-02-28')
	})

	it('известен только месяц — день не длиннее его наибольшей длины', () => {
		const input = field({ locale: 'ru-RU' }, 'day')

		type(input, '31')
		input.focusSegment('month')
		type(input, '02')

		expect(part(input, 'day').text).toBe('29')
		expect(part(input, 'day').aria['aria-valuemax']).toBe('29')
	})

	it('день в феврале известного года набирается до 28', () => {
		const input = field({ locale: 'ru-RU' }, 'month')

		type(input, '022026')
		input.focusSegment('day')
		type(input, '3')

		expect(part(input, 'day').text).toBe('03')
		expect(input.value).toBe('2026-02-03')
		// «30» за ходом: часть не ждёт второй цифры
		expect(input.focusedSegment).toBe('month')
	})
})

describe('стрелки, Home и End', () => {
	it('↑/↓ — день и месяц по кругу', () => {
		const input = field({ locale: 'ru-RU', value: '2026-12-31' }, 'month')

		input.shiftSegment(1)
		expect(input.value).toBe('2026-01-31')

		input.focusSegment('day')
		input.shiftSegment(1)
		expect(input.value).toBe('2026-01-01')

		input.shiftSegment(-1)
		expect(input.value).toBe('2026-01-31')
	})

	it('↑/↓ — год до края хода, без круга', () => {
		const input = field({ locale: 'ru-RU', value: '9999-01-01' }, 'year')

		input.shiftSegment(1)
		expect(input.value).toBe('9999-01-01')

		input.moveSegmentToEdge('start')
		expect(input.value).toBe('0001-01-01')

		input.shiftSegment(-1)
		expect(input.value).toBe('0001-01-01')
	})

	it('пустая часть начинает с сегодняшнего числа', () => {
		const input = field({ locale: 'ru-RU' }, 'day')

		input.shiftSegment(1)
		expect(part(input, 'day').text).toBe('26')

		input.focusSegment('month')
		input.shiftSegment(-1)
		expect(part(input, 'month').text).toBe('09')

		input.focusSegment('year')
		input.shiftSegment(1)
		expect(input.value).toBe('2026-09-26')
	})

	it('Home и End — края хода части', () => {
		const input = field({ locale: 'ru-RU', value: '2026-02-10' }, 'day')

		input.moveSegmentToEdge('end')
		expect(input.value).toBe('2026-02-28')

		input.moveSegmentToEdge('start')
		expect(input.value).toBe('2026-02-01')
	})
})

describe('стирание', () => {
	it('Backspace стирает последнюю цифру: «12» — 1, «01» — пусто', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' }, 'day')

		input.eraseDigit()
		expect(part(input, 'day').text).toBe('01')
		expect(input.value).toBe('2026-05-01')

		input.eraseDigit()
		expect(part(input, 'day').placeholder).toBe(true)
		expect(input.value).toBeUndefined()
		expect(input.focusedSegment).toBe('day')
	})

	it('после стирания набор дописывает к тому, что осталось', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' }, 'day')

		input.eraseDigit()
		type(input, '5')

		expect(input.value).toBe('2026-05-15')
	})

	it('Backspace на пустой части — фокус на предыдущую', () => {
		const input = field({ locale: 'ru-RU' }, 'month')

		input.eraseDigit()
		expect(input.focusedSegment).toBe('day')
	})

	it('Delete очищает часть под фокусом, clearSegments — заданные', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' }, 'month')

		input.clearSegment()
		expect(part(input, 'month').placeholder).toBe(true)
		expect(input.value).toBeUndefined()

		input.clearSegments(['day', 'year'])
		expect(partsOf(input).every(({ placeholder }) => placeholder)).toBe(true)
	})

	it('цифра вместо выделенных частей: они пустеют, цифра — в первую, фокус — туда же', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' }, 'year')

		expect(input.replaceSegments(['year', 'month'], '1')).toBe(true)
		expect(input.focusedSegment).toBe('month')
		expect(part(input, 'month').text).toBe('01')
		expect(part(input, 'year').placeholder).toBe(true)
		expect(part(input, 'day').text).toBe('12')
	})

	it('не цифра вместо выделенных частей — ничего не меняется', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' }, 'year')

		expect(input.replaceSegments(['day', 'month', 'year'], 'x')).toBe(false)
		expect(input.value).toBe('2026-05-12')
	})
})

describe('вставка', () => {
	it('ISO заменяет всю дату в любой части', () => {
		const input = field({ locale: 'ru-RU', value: '2020-01-01' }, 'month')

		expect(input.paste('2026-05-12')).toBe(true)
		expect(input.value).toBe('2026-05-12')
	})

	it('формат поля: ru — день, месяц, год с любыми разделителями', () => {
		const input = field({ locale: 'ru-RU' }, 'day')

		expect(input.paste(' 12.05.2026 ')).toBe(true)
		expect(input.value).toBe('2026-05-12')

		expect(input.paste('1/6/2027')).toBe(true)
		expect(input.value).toBe('2027-06-01')
	})

	it('ar-EG: арабские цифры и метки направления', () => {
		const input = field({ locale: 'ar-EG' }, 'day')
		const formatted = fieldFormatter('ar-EG').format(Date.UTC(2026, 4, 12))

		expect(formatted).toContain('‏')
		expect(input.paste(formatted)).toBe(true)
		expect(input.value).toBe('2026-05-12')
	})

	it('полноширинные цифры', () => {
		const input = field({ locale: 'ja-JP' }, 'day')

		expect(input.paste('２０２６／０５／１２')).toBe(true)
		expect(input.value).toBe('2026-05-12')

		expect(input.paste('２０２７-０１-０２')).toBe(true)
		expect(input.value).toBe('2027-01-02')
	})

	it('th-TH: год в календаре поля', () => {
		const input = field({ locale: 'th-TH' }, 'day')

		expect(input.paste('12/05/2569')).toBe(true)
		expect(input.value).toBe('2026-05-12')
	})

	it('не дата — ничего не меняется', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' }, 'day')

		for (const text of ['31.02.2026', '12.05', 'вчера', '2026-05-12T10:00', '']) {
			expect(input.paste(text), text).toBe(false)
			expect(input.value, text).toBe('2026-05-12')
		}
	})

	it('разбор вставки — та же функция для любого формата поля', () => {
		const format = fieldFormat('en-US', 'date')

		expect(parseFieldText('05/12/2026', format)).toBe('2026-05-12')
		expect(parseFieldText('12/31/2026', format)).toBe('2026-12-31')
		expect(parseFieldText('31/12/2026', format)).toBeUndefined()
	})
})

describe('значение', () => {
	it('запись снаружи — части из неё; не дата — части пусты', () => {
		const input = field({ locale: 'ru-RU' })

		input.value = '2026-05-12'
		expect(text(input)).toBe('12.05.2026')

		input.value = 'вчера'
		expect(partsOf(input).every(({ placeholder }) => placeholder)).toBe(true)
	})

	it('эхо своей записи частей не трогает', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' }, 'day')
		const segments = vi.fn()

		input.clearSegment()
		expect(input.value).toBeUndefined()
		input.events.on('change:segments', segments)

		// v-model вернул то же значение, что поле записало само
		input.value = undefined

		expect(text(input)).toBe('дд.05.2026')
		expect(segments).not.toHaveBeenCalled()
	})

	it('отменённая запись в change:value:before — правки нет', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' }, 'day')

		input.events.on('change:value:before', (e: TChangeEvent<string | undefined>) =>
			e.preventDefault(),
		)

		type(input, '2')

		expect(input.value).toBe('2026-05-12')
		expect(part(input, 'day').text).toBe('12')
		expect(input.focusedSegment).toBe('day')
	})

	it('поправленная в change:value:before запись — части показывают итог', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' }, 'year')

		input.events.on('change:value:before', (e: TChangeEvent<string | undefined>) => {
			if (e.value !== undefined && e.value < '2000-01-01') e.value = '2000-01-01'
		})

		type(input, '1')

		expect(input.value).toBe('2000-01-01')
		expect(text(input)).toBe('01.01.2000')
	})

	it('смена локали частей не трогает: другим становится только текст', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' })

		input.locale = 'en-US'
		expect(text(input)).toBe(expectedSegments(fieldFormatter('en-US'), '2026-05-12').join(''))

		input.locale = 'th-TH'
		expect(part(input, 'year').text).toBe('2569')
		expect(input.value).toBe('2026-05-12')
	})

	it('недописанная дата переживает смену локали', () => {
		const input = field({ locale: 'en-US' }, 'month')

		type(input, '05')
		input.locale = 'ja-JP'

		expect(part(input, 'month').text).toBe('05')
		expect(partsOf(input).map(({ type }) => type)).toEqual(['year', 'month', 'day'])
	})
})

describe('состояния', () => {
	it('дата вне min/max — invalid: data-invalid у корня, aria-invalid у частей', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12', min: '2026-06-01' })

		expect(input.invalid).toBe(true)
		expect(input.dataset.get('invalid')).toBe('true')
		expect(partsOf(input).every(({ aria }) => aria['aria-invalid'] === 'true')).toBe(true)

		input.min = undefined
		expect(input.invalid).toBe(false)
		expect(input.dataset.get('invalid')).toBe('false')
		expect(part(input, 'day').aria['aria-invalid']).toBeNull()

		// Не прижимается: дату видно такой, какой её набрали
		input.max = '2026-01-01'
		expect(input.value).toBe('2026-05-12')
		expect(input.invalid).toBe(true)
	})

	it('readonly — фокус и стрелки по частям есть, правок нет', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12', readonly: true }, 'day')

		expect(input.typeKey('3')).toBe(true)
		input.shiftSegment(1)
		input.eraseDigit()
		input.clearSegments(['day', 'month', 'year'])

		expect(input.paste('2020-01-01')).toBe(false)
		expect(input.value).toBe('2026-05-12')

		input.shiftFocus(1)
		expect(input.focusedSegment).toBe('month')
		expect(part(input, 'day').aria['aria-readonly']).toBe('true')
	})

	it('disabled — частей вне порядка Tab, правок нет', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12', disabled: true }, 'day')

		input.typeKey('3')
		expect(input.value).toBe('2026-05-12')
		expect(partsOf(input).every(({ aria }) => aria.tabindex === null)).toBe(true)
		expect(part(input, 'day').aria['aria-disabled']).toBe('true')
	})

	it('часть — spinbutton со своей остановкой Tab и значением для скринридера', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12', required: true })

		expect(part(input, 'month').aria).toMatchObject({
			role: 'spinbutton',
			tabindex: '0',
			'aria-valuenow': '5',
			'aria-valuetext': '05',
			'aria-valuemin': '1',
			'aria-valuemax': '12',
			'aria-required': 'true',
		})
		expect(part(input, 'month').dataset).toEqual({
			'data-type': 'month',
			'data-placeholder': 'false',
		})
	})

	it('у пустой части нет значения для скринридера, только ход', () => {
		const day = part(field({ locale: 'ru-RU' }), 'day')

		expect(day.aria['aria-valuenow']).toBeNull()
		expect(day.aria['aria-valuetext']).toBeNull()
		expect(day.aria['aria-valuemax']).toBe('31')
		expect(day.dataset['data-placeholder']).toBe('true')
	})

	it('корень — группа; aria-required и aria-readonly у частей, а не у корня', () => {
		const input = field({ required: true, readonly: true })

		expect(input.aria.get('role')).toBe('group')
		expect(input.aria.has('aria-required')).toBe(false)
		expect(input.aria.has('aria-readonly')).toBe(false)
	})

	it('разделитель пустой даты — часть подсказки', () => {
		const literal = (input: TDateInput): TDateInputSegment | undefined =>
			input.segments.find((segment) => segment.type === 'literal')

		expect(literal(field({ locale: 'ru-RU' }))?.placeholder).toBe(true)
		expect(literal(field({ locale: 'ru-RU', value: '2026-05-12' }))?.placeholder).toBe(false)
	})
})

describe('фокус части', () => {
	it('←/→ — соседняя часть в порядке формата; за краем — никуда', () => {
		const input = field({ locale: 'en-US' }, 'month')
		const moves = vi.fn()

		input.events.on('change:focusedSegment', moves)

		input.shiftFocus(1)
		expect(input.focusedSegment).toBe('day')

		input.shiftFocus(1)
		input.shiftFocus(1)
		expect(input.focusedSegment).toBe('year')

		input.shiftFocus(-1)
		expect(input.focusedSegment).toBe('day')
		expect(moves.mock.calls).toEqual([['day'], ['year'], ['day']])
	})

	it('без фокуса в поле команды части ничего не делают', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' })

		expect(input.typeKey('1')).toBe(false)
		input.shiftSegment(1)
		input.eraseDigit()
		input.clearSegment()
		input.shiftFocus(1)

		expect(input.value).toBe('2026-05-12')
		expect(input.focusedSegment).toBeUndefined()
	})
})

describe('время: формат', () => {
	it('en-US — 12 часов: части и литералы в порядке formatToParts, период суток последним', () => {
		const input = field({ locale: 'en-US', kind: 'datetime', value: '2026-05-12T14:30' })

		expect(input.segments.map((segment) => segment.text)).toEqual(
			expectedTimeSegments('en-US', '2026-05-12T14:30'),
		)
		expect(orderOf(input)).toEqual(['month', 'day', 'year', 'hour', 'minute', 'dayPeriod'])
		expect(part(input, 'hour').text).toBe(formattedPart('en-US', '2026-05-12T14:30', 'hour'))
		expect(part(input, 'dayPeriod').text).toBe(
			formattedPart('en-US', '2026-05-12T14:30', 'dayPeriod'),
		)
	})

	it('ru — 24 часа: периода суток нет', () => {
		const input = field({ locale: 'ru-RU', kind: 'datetime', value: '2026-05-12T14:30' })

		expect(input.segments.map((segment) => segment.text)).toEqual(
			expectedTimeSegments('ru-RU', '2026-05-12T14:30'),
		)
		expect(orderOf(input)).toEqual(['day', 'month', 'year', 'hour', 'minute'])
		expect(part(input, 'hour').text).toBe('14')
	})

	it('ko-KR и zh-TW — период суток перед часом, как его ставит локаль', () => {
		for (const locale of ['ko-KR', 'zh-TW']) {
			const input = field({ locale, kind: 'datetime', value: '2026-05-12T09:05' })

			expect(
				input.segments.map((segment) => segment.text),
				locale,
			).toEqual(expectedTimeSegments(locale, '2026-05-12T09:05'))
			expect(orderOf(input).slice(-3), locale).toEqual(['dayPeriod', 'hour', 'minute'])
		}
	})

	it('ar-EG — цифры и имя периода суток локали', () => {
		const input = field({ locale: 'ar-EG', kind: 'datetime', value: '2026-05-12T14:30' })

		expect(input.segments.map((segment) => segment.text)).toEqual(
			expectedTimeSegments('ar-EG', '2026-05-12T14:30'),
		)
		expect(part(input, 'minute').aria['aria-valuenow']).toBe('30')
		expect(input.segmentsDirection).toBe('rtl')
	})

	it('ход часа — по циклу локали: h12 — 1–12, h23 — 0–23', () => {
		const en = part(field({ locale: 'en-US', kind: 'datetime' }), 'hour')
		const ru = part(field({ locale: 'ru-RU', kind: 'datetime' }), 'hour')

		expect([en.aria['aria-valuemin'], en.aria['aria-valuemax']]).toEqual(['1', '12'])
		expect([ru.aria['aria-valuemin'], ru.aria['aria-valuemax']]).toEqual(['0', '23'])
	})

	it('цикл часов — только от локали: ключ -u-hc- его меняет', () => {
		expect(orderOf(field({ locale: 'en-US-u-hc-h23', kind: 'datetime' }))).not.toContain(
			'dayPeriod',
		)
		expect(orderOf(field({ locale: 'ru-RU-u-hc-h12', kind: 'datetime' }))).toContain(
			'dayPeriod',
		)

		// h11: полдень — 0 после полудня, а не 12
		const h11 = field({
			locale: 'ja-JP-u-hc-h11',
			kind: 'datetime',
			value: '2026-05-12T12:00',
		})

		expect(part(h11, 'hour').text).toBe(
			formattedPart('ja-JP-u-hc-h11', '2026-05-12T12:00', 'hour'),
		)
		expect(part(h11, 'hour').aria['aria-valuemax']).toBe('11')

		// h24: полночь — 24
		const h24 = field({
			locale: 'en-US-u-hc-h24',
			kind: 'datetime',
			value: '2026-05-12T00:15',
		})

		expect(part(h24, 'hour').text).toBe('24')
	})

	it('подсказки частей времени — черта, имена — Intl.DisplayNames на языке локали', () => {
		const input = field({ locale: 'en-US', kind: 'datetime' })

		expect(partsOf(input).map(({ text }) => text)).toEqual([
			'mm',
			'dd',
			'yyyy',
			'––',
			'––',
			'––',
		])

		for (const locale of ['ru-RU', 'en-US', 'ko-KR']) {
			const named = field({ locale, kind: 'datetime' })

			for (const type of ['hour', 'minute'] as const) {
				expect(part(named, type).aria['aria-label'], `${locale} ${type}`).toBe(
					partName(locale, type),
				)
			}
		}

		expect(part(input, 'dayPeriod').aria['aria-label']).toBe(partName('en-US', 'dayPeriod'))
	})

	it('один формат на тег и вид поля', () => {
		expect(fieldFormat('ru-RU', 'datetime')).toBe(fieldFormat('ru-RU', 'datetime'))
		expect(fieldFormat('ru-RU', 'datetime')).not.toBe(fieldFormat('ru-RU', 'date'))
		expect(fieldFormat('ru-RU', 'date').kind).toBe('date')
	})

	it('период суток для скринридера: значение — 0 или 1, текст — имя периода', () => {
		const input = field({ locale: 'en-US', kind: 'datetime', value: '2026-05-12T14:30' })

		expect(part(input, 'dayPeriod').aria).toMatchObject({
			role: 'spinbutton',
			'aria-valuenow': '1',
			'aria-valuetext': formattedPart('en-US', '2026-05-12T14:30', 'dayPeriod'),
			'aria-valuemin': '0',
			'aria-valuemax': '1',
		})
		expect(part(input, 'hour').aria['aria-valuenow']).toBe('2')
	})
})

describe('время: набор', () => {
	it('ru: час и минута цифрами, значение — дата со временем', () => {
		const input = field({ locale: 'ru-RU', kind: 'datetime' }, 'day')

		type(input, '12052026')
		expect(input.focusedSegment).toBe('hour')
		expect(input.value).toBeUndefined()

		type(input, '14')
		expect(input.focusedSegment).toBe('minute')

		type(input, '30')
		expect(input.value).toBe('2026-05-12T14:30')
	})

	it('en-US: без периода суток значения нет; буква выбирает период', () => {
		const input = field({ locale: 'en-US', kind: 'datetime' }, 'month')

		type(input, '05122026')
		type(input, '0230')
		expect(input.focusedSegment).toBe('dayPeriod')
		expect(input.value).toBeUndefined()

		expect(input.typeKey('p')).toBe(true)
		expect(input.value).toBe('2026-05-12T14:30')

		// Регистр не важен
		expect(input.typeKey('A')).toBe(true)
		expect(input.value).toBe('2026-05-12T02:30')
	})

	it('буква не периода — не набор, а с которой начинаются оба имени — период не меняет', () => {
		const en = field({ locale: 'en-US', kind: 'datetime', value: '2026-05-12T14:30' })

		en.focusSegment('dayPeriod')
		expect(en.typeKey('x')).toBe(false)
		expect(en.typeKey('5')).toBe(false)
		expect(en.value).toBe('2026-05-12T14:30')

		// ko-KR: «오전» и «오후» — оба с «오»
		const ko = field({ locale: 'ko-KR', kind: 'datetime', value: '2026-05-12T14:30' })
		const am = formattedPart('ko-KR', '2026-05-12T02:30', 'dayPeriod') ?? ''
		const pm = formattedPart('ko-KR', '2026-05-12T14:30', 'dayPeriod') ?? ''

		expect(am[0]).toBe(pm[0])
		ko.focusSegment('dayPeriod')
		expect(ko.typeKey(am[0])).toBe(true)
		expect(ko.value).toBe('2026-05-12T14:30')
	})

	it('буква периода — как в имени локали: es-MX «a.m.» и «p.m.»', () => {
		const input = field({ locale: 'es-MX', kind: 'datetime', value: '2026-05-12T14:30' })

		input.focusSegment('dayPeriod')
		input.typeKey('a')
		expect(input.value).toBe('2026-05-12T02:30')
		expect(part(input, 'dayPeriod').text).toBe(
			formattedPart('es-MX', '2026-05-12T02:30', 'dayPeriod'),
		)
	})

	it('час и минута h23 начинаются с нуля, час h12 — нет', () => {
		const ru = field({ locale: 'ru-RU', kind: 'datetime', value: '2026-05-12T14:30' }, 'hour')

		type(ru, '0')
		expect(part(ru, 'hour').text).toBe('00')
		expect(ru.value).toBe('2026-05-12T00:30')
		expect(ru.focusedSegment).toBe('hour')

		type(ru, '7')
		expect(ru.value).toBe('2026-05-12T07:30')
		expect(ru.focusedSegment).toBe('minute')

		type(ru, '00')
		expect(ru.value).toBe('2026-05-12T07:00')

		const en = field({ locale: 'en-US', kind: 'datetime' }, 'hour')

		type(en, '0')
		expect(part(en, 'hour').placeholder).toBe(true)

		type(en, '9')
		expect(part(en, 'hour').text).toBe('09')
		expect(en.focusedSegment).toBe('minute')
	})

	it('час 12-часового цикла: «12» до полудня — полночь, после — полдень', () => {
		const input = field(
			{ locale: 'en-US', kind: 'datetime', value: '2026-05-12T09:15' },
			'hour',
		)

		type(input, '12')
		expect(input.value).toBe('2026-05-12T00:15')

		input.focusSegment('dayPeriod')
		input.typeKey('p')
		expect(input.value).toBe('2026-05-12T12:15')
		expect(part(input, 'hour').text).toBe('12')
	})

	it('набранный час идёт в половину суток выбранного периода', () => {
		const input = field(
			{ locale: 'en-US', kind: 'datetime', value: '2026-05-12T14:30' },
			'hour',
		)

		type(input, '3')
		expect(input.value).toBe('2026-05-12T15:30')
	})

	it('период выбран раньше часа — час набирается в его половину суток', () => {
		const input = field({ locale: 'en-US', kind: 'datetime' }, 'dayPeriod')

		input.typeKey('p')
		input.focusSegment('hour')
		type(input, '0445')
		input.focusSegment('month')
		type(input, '05122026')

		expect(input.value).toBe('2026-05-12T16:45')
	})
})

describe('время: стрелки, Home и End', () => {
	it('↑/↓ у периода суток — другой период, час переезжает за ним', () => {
		const input = field(
			{ locale: 'en-US', kind: 'datetime', value: '2026-05-12T14:30' },
			'dayPeriod',
		)

		input.shiftSegment(1)
		expect(input.value).toBe('2026-05-12T02:30')

		input.shiftSegment(-1)
		expect(input.value).toBe('2026-05-12T14:30')
	})

	it('↑/↓ у часа 12-часового цикла — по кругу в своей половине суток', () => {
		const input = field(
			{ locale: 'en-US', kind: 'datetime', value: '2026-05-12T11:30' },
			'hour',
		)

		input.shiftSegment(1)
		expect(input.value).toBe('2026-05-12T00:30')
		expect(part(input, 'hour').text).toBe('12')

		input.shiftSegment(-1)
		expect(input.value).toBe('2026-05-12T11:30')

		input.value = '2026-05-12T23:30'
		input.shiftSegment(1)
		expect(input.value).toBe('2026-05-12T12:30')
	})

	it('↑/↓ у часа 24-часового цикла и у минуты — по кругу, соседей не трогают', () => {
		const input = field(
			{ locale: 'ru-RU', kind: 'datetime', value: '2026-05-12T23:59' },
			'hour',
		)

		input.shiftSegment(1)
		expect(input.value).toBe('2026-05-12T00:59')

		input.focusSegment('minute')
		input.shiftSegment(1)
		expect(input.value).toBe('2026-05-12T00:00')
	})

	it('пустая часть времени начинает с текущего момента', () => {
		const input = field({ locale: 'en-US', kind: 'datetime', value: '2026-05-12' }, 'hour')

		input.shiftSegment(1)
		expect(part(input, 'hour').text).toBe('12')

		input.focusSegment('minute')
		input.shiftSegment(1)
		expect(part(input, 'minute').text).toBe('00')

		// Полдень — после полудня
		input.focusSegment('dayPeriod')
		input.shiftSegment(1)
		expect(input.value).toBe('2026-05-12T12:00')
	})

	it('Home и End — края хода: час по циклу, период — до и после полудня', () => {
		const input = field(
			{ locale: 'en-US', kind: 'datetime', value: '2026-05-12T14:30' },
			'hour',
		)

		input.moveSegmentToEdge('start')
		expect(input.value).toBe('2026-05-12T13:30')

		input.moveSegmentToEdge('end')
		expect(input.value).toBe('2026-05-12T12:30')

		input.focusSegment('dayPeriod')
		input.moveSegmentToEdge('start')
		expect(input.value).toBe('2026-05-12T00:30')
	})
})

describe('время: стирание', () => {
	it('Backspace стирает цифру минуты, а период суток — целиком', () => {
		const input = field(
			{ locale: 'en-US', kind: 'datetime', value: '2026-05-12T14:30' },
			'minute',
		)

		input.eraseDigit()
		expect(part(input, 'minute').text).toBe('03')

		input.focusSegment('dayPeriod')
		input.eraseDigit()
		expect(part(input, 'dayPeriod').placeholder).toBe(true)
		expect(input.value).toBeUndefined()

		// Час остался в своей половине суток: период вернули — то же время
		input.typeKey('p')
		expect(input.value).toBe('2026-05-12T14:03')
	})

	it('Delete очищает часть времени, и значения нет', () => {
		const input = field(
			{ locale: 'ru-RU', kind: 'datetime', value: '2026-05-12T14:30' },
			'hour',
		)

		input.clearSegment()
		expect(part(input, 'hour').placeholder).toBe(true)
		expect(input.value).toBeUndefined()
	})
})

describe('время: вставка', () => {
	it('ISO со временем заменяет всё значение', () => {
		const input = field({ locale: 'ru-RU', kind: 'datetime' }, 'hour')

		expect(input.paste('2026-05-12T14:30')).toBe(true)
		expect(input.value).toBe('2026-05-12T14:30')
	})

	it('формат поля: en-US — с периодом суток, ru — 24 часа', () => {
		const en = field({ locale: 'en-US', kind: 'datetime' }, 'day')

		expect(en.paste('05/12/2026, 02:30 PM')).toBe(true)
		expect(en.value).toBe('2026-05-12T14:30')

		expect(en.paste('5/12/2026 12:05 am')).toBe(true)
		expect(en.value).toBe('2026-05-12T00:05')

		const ru = field({ locale: 'ru-RU', kind: 'datetime' }, 'day')

		expect(ru.paste('12.05.2026, 14:30')).toBe(true)
		expect(ru.value).toBe('2026-05-12T14:30')
	})

	it('текст поля вставляется обратно в поле той же локали', () => {
		for (const locale of ['en-US', 'ar-EG', 'ko-KR', 'ru-RU', 'th-TH']) {
			const source = field({ locale, kind: 'datetime', value: '2026-05-12T14:30' })
			const target = field({ locale, kind: 'datetime' }, 'day')

			expect(target.paste(text(source)), locale).toBe(true)
			expect(target.value, locale).toBe('2026-05-12T14:30')
		}
	})

	it('не значение — ничего не меняется', () => {
		const en = field({ locale: 'en-US', kind: 'datetime', value: '2026-05-12T14:30' }, 'day')

		for (const value of [
			// Без периода суток у 12-часового цикла час не прочесть
			'05/12/2026, 02:30',
			'05/12/2026, 14:30',
			'05/12/2026, 13:30 PM',
			'05/12/2026, 02:60 PM',
			// Дата без времени и дата с секундами
			'2026-05-12',
			'2026-05-12T14:30:00',
			'05/12/2026',
		]) {
			expect(en.paste(value), value).toBe(false)
			expect(en.value, value).toBe('2026-05-12T14:30')
		}

		const ru = field({ locale: 'ru-RU', kind: 'datetime', value: '2026-05-12T14:30' }, 'day')

		expect(ru.paste('12.05.2026, 24:00')).toBe(false)
		expect(ru.value).toBe('2026-05-12T14:30')
	})

	it('разбор вставки — по виду поля', () => {
		const day = fieldFormat('ru-RU', 'date')
		const minute = fieldFormat('ru-RU', 'datetime')

		expect(parseFieldText('12.05.2026', day)).toBe('2026-05-12')
		expect(parseFieldText('12.05.2026', minute)).toBeUndefined()
		expect(parseFieldText('12.05.2026, 9:05', minute)).toBe('2026-05-12T09:05')
		expect(parseFieldText('2026-05-12T09:05', day)).toBeUndefined()
	})
})

describe('вид поля', () => {
	it('по умолчанию — дата', () => {
		const input = field({ locale: 'ru-RU' })

		expect(input.kind).toBe('date')
		expect(orderOf(input)).toEqual(['day', 'month', 'year'])
	})

	it('смена вида: части сохраняются по типу, значение собирается в новом виде', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' })
		const values: Array<string | undefined> = []

		input.events.on('change:value', ({ newValue }) => values.push(newValue))

		input.kind = 'datetime'
		expect(input.value).toBeUndefined()
		expect(part(input, 'day').text).toBe('12')
		expect(part(input, 'hour').placeholder).toBe(true)

		input.focusSegment('hour')
		type(input, '1430')
		expect(input.value).toBe('2026-05-12T14:30')

		input.kind = 'date'
		expect(input.value).toBe('2026-05-12')

		// Время осталось в частях и вернулось
		input.kind = 'datetime'
		expect(input.value).toBe('2026-05-12T14:30')
		expect(values).toEqual([
			undefined,
			'2026-05-12T14:03',
			'2026-05-12T14:30',
			'2026-05-12',
			'2026-05-12T14:30',
		])
	})

	it('значение со временем у поля даты — время в частях и вернётся', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12T14:30' })
		const values = vi.fn()

		expect(text(input)).toBe('12.05.2026')

		input.events.on('change:value', values)
		input.kind = 'datetime'

		expect(input.value).toBe('2026-05-12T14:30')
		expect(values).not.toHaveBeenCalled()
		expect(part(input, 'minute').text).toBe('30')
	})

	it('дата у поля даты и времени — части даты из неё, время пустое', () => {
		const input = field({ locale: 'ru-RU', kind: 'datetime', value: '2026-05-12' })

		expect(part(input, 'year').text).toBe('2026')
		expect(part(input, 'hour').placeholder).toBe(true)
		// Записанное снаружи не переписывается, пока поле его не правило
		expect(input.value).toBe('2026-05-12')
	})

	it('отменённая запись при смене вида оставляет значение', () => {
		const input = field({ locale: 'ru-RU', kind: 'datetime', value: '2026-05-12T14:30' })

		input.events.on('change:value:before', (e: TChangeEvent<string | undefined>) =>
			e.preventDefault(),
		)
		input.kind = 'date'

		expect(input.kind).toBe('date')
		expect(input.value).toBe('2026-05-12T14:30')
		expect(text(input)).toBe('12.05.2026')
	})

	it('части под фокусом нет в новом формате — фокуса в поле нет', () => {
		const input = field({ locale: 'en-US', kind: 'datetime' }, 'dayPeriod')

		input.locale = 'ru-RU'
		expect(input.focusedSegment).toBeUndefined()

		input.focusSegment('hour')
		input.kind = 'date'
		expect(input.focusedSegment).toBeUndefined()

		// Часть есть и в новом формате — фокус на ней
		input.focusSegment('month')
		input.kind = 'datetime'
		expect(input.focusedSegment).toBe('month')
	})

	it('вставка у поля даты меняет дату, а скрытое время остаётся', () => {
		const input = field({ locale: 'ru-RU', kind: 'datetime', value: '2026-05-12T14:30' })

		input.kind = 'date'
		input.focusSegment('day')
		expect(input.paste('01.06.2027')).toBe(true)
		expect(input.value).toBe('2027-06-01')

		input.kind = 'datetime'
		expect(input.value).toBe('2027-06-01T14:30')
	})

	it('набранные цифры при смене вида сбрасываются', () => {
		const input = field({ locale: 'ru-RU', kind: 'datetime' }, 'year')

		type(input, '20')
		input.kind = 'date'
		type(input, '5')

		expect(part(input, 'year').text).toBe('5')
	})
})

describe('время: смена цикла часов', () => {
	it('час, набранный в 24 часах, выбирает период: в 12 часах значение то же', () => {
		const input = field({ locale: 'ru-RU', kind: 'datetime' }, 'day')

		type(input, '120520261430')
		expect(input.value).toBe('2026-05-12T14:30')

		input.locale = 'en-US'
		expect(input.value).toBe('2026-05-12T14:30')
		expect(part(input, 'dayPeriod').placeholder).toBe(false)
		expect(part(input, 'dayPeriod').text).toBe(
			formattedPart('en-US', '2026-05-12T14:30', 'dayPeriod'),
		)
	})

	it('час без выбранного периода — значение там, где период не нужен', () => {
		const input = field({ locale: 'en-US', kind: 'datetime' }, 'month')
		const values: Array<string | undefined> = []

		type(input, '051220260230')
		expect(input.value).toBeUndefined()
		input.events.on('change:value', ({ newValue }) => values.push(newValue))

		input.locale = 'ru-RU'
		expect(input.value).toBe('2026-05-12T02:30')

		input.locale = 'en-US'
		expect(input.value).toBeUndefined()
		expect(part(input, 'dayPeriod').placeholder).toBe(true)
		expect(values).toEqual(['2026-05-12T02:30', undefined])
	})

	it('записанное снаружи и полем не собранное значение смена формата не трогает', () => {
		const input = field({ locale: 'ru-RU', value: 'вчера' })

		input.locale = 'en-US'
		expect(input.value).toBe('вчера')

		input.kind = 'datetime'
		expect(input.value).toBe('вчера')
	})
})

describe('время: границы', () => {
	it('min и max со временем сравниваются до минуты', () => {
		const input = field({
			locale: 'ru-RU',
			kind: 'datetime',
			value: '2026-05-12T14:30',
			min: '2026-05-12T15:00',
		})

		expect(input.invalid).toBe(true)
		expect(input.dataset.get('invalid')).toBe('true')

		input.min = '2026-05-12T14:30'
		expect(input.invalid).toBe(false)

		// max раньше min — граница схлопывается в min
		input.max = '2026-05-12T14:29'
		expect(input.invalid).toBe(false)

		input.value = '2026-05-12T14:31'
		expect(input.invalid).toBe(true)
	})

	it('дата и дата со временем сравниваются по дню', () => {
		const input = field({
			locale: 'ru-RU',
			kind: 'datetime',
			value: '2026-05-12T23:59',
			max: '2026-05-12',
		})

		// Граница-дата max пропускает любое время своего дня
		expect(input.invalid).toBe(false)

		input.value = '2026-05-13T00:00'
		expect(input.invalid).toBe(true)

		// Дата в границах, у которых граница-момент внутри её дня
		const day = field({ locale: 'ru-RU', value: '2026-05-12', min: '2026-05-12T15:00' })

		expect(day.invalid).toBe(false)
	})
})

describe('наборы частей', () => {
	it('набор части — поверх своего ядра; его смена — change:segments', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' })
		const changes = vi.fn()

		input.events.on('change:segments', changes)

		const sets = input.segmentSets('day')

		// Набор у части один: его берут и плагин связок, и сенсорный плагин
		expect(input.segmentSets('day')).toBe(sets)

		sets.aria.add('id', 'f-day')
		sets.attrs.add('contenteditable', 'true')

		expect(part(input, 'day').aria).toMatchObject({ id: 'f-day', role: 'spinbutton' })
		expect(part(input, 'day').attrs).toEqual({ contenteditable: 'true' })
		expect(part(input, 'month').attrs).toEqual({})
		expect(changes).toHaveBeenCalledTimes(2)

		// То же значение набор не меняет — и перечитывать нечего
		sets.attrs.add('contenteditable', 'true')
		expect(changes).toHaveBeenCalledTimes(2)
	})

	it('роль из набора — текстовое поле: значения счётчика у части нет', () => {
		const input = field({ locale: 'ru-RU', value: '2026-05-12' })
		const { aria } = input.segmentSets('month')

		aria.add('role', 'textbox')

		expect(part(input, 'month').aria).toMatchObject({
			role: 'textbox',
			'aria-label': partName('ru-RU', 'month'),
			'aria-valuenow': null,
			'aria-valuetext': null,
			'aria-valuemin': null,
			'aria-valuemax': null,
			tabindex: '0',
		})
		expect(part(input, 'day').aria).toMatchObject({ role: 'spinbutton', 'aria-valuenow': '12' })

		aria.remove('role')

		expect(part(input, 'month').aria).toMatchObject({
			role: 'spinbutton',
			'aria-valuenow': '5',
			'aria-valuemax': '12',
		})
	})

	it('имя из набора перекрывает aria-label части, а name остаётся её именем', () => {
		const input = field({ locale: 'ru-RU' })
		const name = partName('ru-RU', 'day')

		input.segmentSets('day').aria.add('aria-label', `${name}, Дата рождения`)

		expect(part(input, 'day').aria['aria-label']).toBe(`${name}, Дата рождения`)
		expect(part(input, 'day').name).toBe(name)
	})

	it('набор — по типу части: смена локали переставляет части, записанное едет с ними', () => {
		const input = field({ locale: 'ru-RU' })

		input.segmentSets('day').aria.add('id', 'f-day')
		input.locale = 'en-US'

		expect(partsOf(input).map(({ type, aria }) => [type, aria.id])).toEqual([
			['month', undefined],
			['day', 'f-day'],
			['year', undefined],
		])
	})
})
