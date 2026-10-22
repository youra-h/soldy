/**
 * Локаль поддерева на сервере: источник у каждого провайдера свой, а не у
 * процесса, и сервер, рисуя запросы на разных языках, их не смешивает: ни имя
 * кнопки очистки, ни формат поля даты, ни заголовок месяца календаря.
 */

import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import { enUS, ruRU, zhCN, type TLocale } from '@soldy-ui/plugins'
import LocaleInput from './LocaleInput.test.svelte'
import Surround from './Surround.test.svelte'

/** Страница запроса — поле даты под провайдером его языка. */
const datePage = async (locale: TLocale) =>
	render(Surround, { props: { around: 'locale', control: 'date-input', locale } }).body

/** Страница запроса — календарь под провайдером его языка. */
const calendarPage = async (locale: TLocale) =>
	render(Surround, {
		props: {
			around: 'locale',
			control: 'calendar',
			locale,
			calendar: { months: ['2026-09-01'] },
		},
	}).body

/** Имя части «день» на языке `tag` — так его называет поле. */
const dayName = (tag: string) =>
	new Intl.DisplayNames([tag, 'en-US'], { type: 'dateTimeField' }).of('day')

/** Заголовок сетки сентября 2026 на языке `tag` — так его подписывает календарь. */
const monthTitle = (tag: string) =>
	new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
		Date.UTC(2026, 8, 1),
	)

describe('серверный рендер', () => {
	it('параллельные запросы на разных языках не смешиваются', async () => {
		const page = async (locale: TLocale) => render(LocaleInput, { props: { locale } }).body
		const [ru, en, zh] = await Promise.all([page(ruRU), page(enUS), page(zhCN)])

		expect(ru).toContain('aria-label="Очистить Город"')
		expect(en).toContain('aria-label="Clear Город"')
		expect(zh).toContain('aria-label="清除Город"')
	})

	it('поле даты: язык, подсказки и имена частей — своего запроса', async () => {
		const [ru, en, zh] = await Promise.all([datePage(ruRU), datePage(enUS), datePage(zhCN)])

		expect(ru).toContain('lang="ru-RU"')
		expect(ru).toContain(`aria-label="${dayName('ru-RU')}"`)
		expect(ru).toContain('>дд</span>')
		expect(en).toContain('lang="en-US"')
		expect(en).toContain(`aria-label="${dayName('en-US')}"`)
		expect(en).not.toContain('lang="ru-RU"')
		expect(en).not.toContain('>дд</span>')
		expect(zh).toContain('lang="zh-CN"')
		expect(zh).toContain(`aria-label="${dayName('zh-CN')}"`)
	})

	it('календарь: заголовок месяца и имена кнопок листания — своего запроса', async () => {
		const [ru, en, zh] = await Promise.all([
			calendarPage(ruRU),
			calendarPage(enUS),
			calendarPage(zhCN),
		])

		expect(ru).toContain(`>${monthTitle('ru-RU')}</span>`)
		expect(ru).toContain('aria-label="Предыдущий месяц"')
		expect(ru).not.toContain(monthTitle('en-US'))
		expect(en).toContain(`>${monthTitle('en-US')}</span>`)
		expect(en).toContain('aria-label="Previous month"')
		expect(en).not.toContain(monthTitle('ru-RU'))
		expect(zh).toContain(`>${monthTitle('zh-CN')}</span>`)
		expect(zh).toContain('aria-label="上个月"')
	})
})
