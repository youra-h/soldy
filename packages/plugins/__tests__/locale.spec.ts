/**
 * Локаль (`src/locale/`): готовые локали, правка поверх готовой
 * (`extendLocale`), строки с именем части (`formatName`), источник локали
 * поддерева (`TLocaleSource`) в контексте плагина и плагин языка.
 *
 * Источник у каждого набора свой — от провайдера адаптера или свой
 * английский, — поэтому общего состояния между тестами нет.
 */

import { describe, expect, it, vi } from 'vitest'
import { TCalendar, TDateInput, TTable } from '@soldy-ui/core'
import {
	TLocalePlugin,
	TLocaleSource,
	TPluginBundle,
	arEG,
	enUS,
	esES,
	extendLocale,
	formatName,
	frFR,
	ruRU,
	zhCN,
} from '../src'
import type { TLocale, TTranslations } from '../src'

/** Готовые локали — шесть языков ООН. */
const PACKS: Record<string, TLocale> = { enUS, ruRU, zhCN, frFR, esES, arEG }

/** Строки с местом для имени части. */
const NAMED: ReadonlyArray<readonly [keyof TTranslations, string]> = [
	['tabs', 'close'],
	['tags', 'close'],
	['field', 'clear'],
]

/** Ключи разделов локали: «раздел.ключ». */
function keysOf(translations: TTranslations): string[] {
	return Object.entries(translations).flatMap(([section, strings]) =>
		Object.keys(strings).map((key) => `${section}.${key}`),
	)
}

/** Строка локали по разделу и ключу — перебором значений раздела. */
function stringOf(translations: TTranslations, section: keyof TTranslations, key: string): unknown {
	return Object.entries(translations[section]).find(([name]) => name === key)?.[1]
}

describe('готовые локали', () => {
	it.each(Object.entries(PACKS))('%s: те же разделы и ключи, что у английской', (_, locale) => {
		expect(keysOf(locale.translations)).toEqual(keysOf(enUS.translations))
	})

	it.each(Object.entries(PACKS))('%s: все строки непустые, локаль — данные', (_, locale) => {
		for (const strings of Object.values(locale.translations)) {
			for (const value of Object.values(strings)) {
				expect(typeof value).toBe('string')
				expect(String(value).trim()).not.toBe('')
			}
		}

		// Данные, а не код: локаль переживает JSON без потерь
		expect(JSON.parse(JSON.stringify(locale))).toEqual(locale)
	})

	it.each(Object.entries(PACKS))(
		'%s: строки с именем части несут место для имени',
		(_, locale) => {
			for (const [section, key] of NAMED) {
				expect(stringOf(locale.translations, section, key)).toContain('{name}')
			}
		},
	)

	it.each(Object.entries(PACKS))('%s: тег — канонический BCP 47', (_, locale) => {
		expect(Intl.getCanonicalLocales(locale.tag)).toEqual([locale.tag])
	})

	it.each(Object.entries(PACKS))('%s: заморожена вместе с разделами', (_, locale) => {
		expect(Object.isFrozen(locale)).toBe(true)
		expect(Object.isFrozen(locale.translations)).toBe(true)
		expect(Object.isFrozen(locale.translations.calendar)).toBe(true)
	})
})

describe('extendLocale — правка поверх готовой локали', () => {
	it('свой тег, строки — от основы: другой регион того же языка', () => {
		const esMX = extendLocale(esES, { tag: 'es-MX' })

		expect(esMX.tag).toBe('es-MX')
		expect(esMX.translations).toEqual(esES.translations)
	})

	it('свои строки — поверх раздела основы, остальное раздела остаётся', () => {
		const mn = extendLocale(enUS, {
			tag: 'mn-MN',
			translations: { scroller: { next: 'Цааш' }, modal: { close: 'Хаах' } },
		})

		expect(mn.translations.scroller).toEqual({ prev: 'Scroll back', next: 'Цааш' })
		expect(mn.translations.modal).toEqual({ close: 'Хаах' })
		expect(mn.translations.calendar).toEqual(enUS.translations.calendar)
	})

	it('без тега — тег основы; ключ со значением undefined строку не задаёт', () => {
		const patched = extendLocale(ruRU, { translations: { modal: { close: undefined } } })

		expect(patched.tag).toBe('ru-RU')
		expect(patched.translations.modal.close).toBe('Закрыть')
	})

	it('основу не трогает, результат заморожен вместе с разделами', () => {
		const patched = extendLocale(enUS, { translations: { modal: { close: 'Shut' } } })

		expect(enUS.translations.modal.close).toBe('Close')
		expect(Object.isFrozen(patched)).toBe(true)
		expect(Object.isFrozen(patched.translations.modal)).toBe(true)
	})
})

describe('formatName — строка с именем части', () => {
	it('имя встаёт на место {name}: порядок слов — дело шаблона', () => {
		expect(formatName('Close {name}', 'Settings')).toBe('Close Settings')
		expect(formatName('{name} を閉じる', '設定')).toBe('設定 を閉じる')
		expect(formatName('关闭{name}', '设置')).toBe('关闭设置')
	})

	it('имя без пробелов по краям', () => {
		expect(formatName('Закрыть {name}', '  Почта  ')).toBe('Закрыть Почта')
	})

	it('пустое имя — без него: пробел не повисает ни по краям, ни в середине', () => {
		expect(formatName('Закрыть {name}', '')).toBe('Закрыть')
		expect(formatName('{name} を閉じる', '   ')).toBe('を閉じる')
		expect(formatName('Убрать {name} из списка', '')).toBe('Убрать из списка')
	})
})

describe('TLocaleSource — локаль поддерева', () => {
	it('смена — событие с новой локалью; та же — молча', () => {
		const source = new TLocaleSource(enUS)
		const changed = vi.fn()

		source.events.on('change', changed)
		source.locale = ruRU
		source.locale = ruRU

		expect(source.locale).toBe(ruRU)
		expect(changed).toHaveBeenCalledExactlyOnceWith(ruRU)
	})
})

describe('локаль в наборе плагинов', () => {
	it('без провайдера — своя английская у каждого набора, не общая', () => {
		const first = new TPluginBundle({})
		const second = new TPluginBundle({})

		expect(first.locale.locale).toBe(enUS)
		expect(first.locale).not.toBe(second.locale)
	})

	it('источник от адаптера — тот же у набора', () => {
		const source = new TLocaleSource(ruRU)
		const bundle = new TPluginBundle(new TTable(), 'm1', source)

		expect(bundle.locale).toBe(source)
	})
})

describe('TLocalePlugin — тег локали компоненту', () => {
	it('пишет тег при установке, синхронно', () => {
		const calendar = new TCalendar()

		new TPluginBundle(calendar, 'm1', new TLocaleSource(ruRU)).use(TLocalePlugin)

		expect(calendar.locale).toBe('ru-RU')
	})

	it('смену локали пишет на лету — и внешнему ctrl тоже', () => {
		const field = new TDateInput({ locale: 'de-DE' })
		const source = new TLocaleSource(enUS)

		new TPluginBundle(field, 'm1', source).use(TLocalePlugin)

		expect(field.locale).toBe('en-US')

		source.locale = zhCN

		expect(field.locale).toBe('zh-CN')
	})

	it('после destroy() набора смена локали компонент не трогает', () => {
		const table = new TTable()
		const source = new TLocaleSource(enUS)
		const bundle = new TPluginBundle(table, 'm1', source).use(TLocalePlugin)

		bundle.destroy()
		source.locale = frFR

		expect(table.locale).toBe('en-US')
	})
})
