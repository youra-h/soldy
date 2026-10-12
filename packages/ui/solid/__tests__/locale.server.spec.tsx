/**
 * Локаль поддерева на сервере: источник у каждого провайдера свой, а не у
 * процесса, и сервер, рисуя запросы на разных языках, их не смешивает.
 *
 * Тело провайдера Solid создаёт источник с локалью первой отрисовки, а
 * плагины имён пишут имена при установке, синхронно: имя кнопки очистки есть
 * уже в серверной разметке, где эффектов нет.
 */

import { describe, it, expect } from 'vitest'
import { renderToString } from 'solid-js/web'
import { enUS, ruRU, zhCN, type TLocale } from '@soldy-ui/plugins'
import { Input, LocaleProvider } from '@soldy-ui/solid'

/** Страница запроса — поле под провайдером его языка. */
const page = async (locale: TLocale) =>
	renderToString(() => (
		<LocaleProvider locale={locale}>
			<Input clearable name="Город" />
		</LocaleProvider>
	))

describe('серверный рендер', () => {
	it('параллельные запросы на разных языках не смешиваются', async () => {
		const [ru, en, zh] = await Promise.all([page(ruRU), page(enUS), page(zhCN)])

		expect(ru).toContain('aria-label="Очистить Город"')
		expect(en).toContain('aria-label="Clear Город"')
		expect(zh).toContain('aria-label="清除Город"')
	})
})
