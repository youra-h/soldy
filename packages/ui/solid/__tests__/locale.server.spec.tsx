/**
 * Локаль поддерева на сервере: источник у каждого провайдера свой, а не у
 * процесса, и сервер, рисуя запросы на разных языках, их не смешивает.
 *
 * Тело провайдера Solid создаёт источник с локалью первой отрисовки, а
 * плагины имён пишут имена при установке, синхронно: имя кнопки очистки есть
 * уже в серверной разметке, где эффектов нет. Так же язык: формат поля даты —
 * язык ряда, подсказки и имена частей — плагин языка пишет при установке.
 */

import { describe, it, expect } from 'vitest'
import { renderToString } from 'solid-js/web'
import { enUS, ruRU, zhCN, type TLocale } from '@soldy-ui/plugins'
import { DateInput, Input, LocaleProvider } from '@soldy-ui/solid'

/** Страница запроса — поле под провайдером его языка. */
const page = async (locale: TLocale) =>
	renderToString(() => (
		<LocaleProvider locale={locale}>
			<Input clearable name="Город" />
		</LocaleProvider>
	))

/** Страница запроса — поле даты под провайдером его языка. */
const datePage = async (locale: TLocale) =>
	renderToString(() => (
		<LocaleProvider locale={locale}>
			<DateInput />
		</LocaleProvider>
	))

/** Имя части «день» на языке `tag` — так его называет поле. */
const dayName = (tag: string) =>
	new Intl.DisplayNames([tag, 'en-US'], { type: 'dateTimeField' }).of('day')

describe('серверный рендер', () => {
	it('параллельные запросы на разных языках не смешиваются', async () => {
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
})
