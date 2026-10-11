/**
 * Локаль поддерева на сервере: источник у каждого провайдера свой, а не у
 * процесса, и сервер, рисуя запросы на разных языках, их не смешивает.
 */

import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import { enUS, ruRU, zhCN, type TLocale } from '@soldy-ui/plugins'
import LocaleInput from './LocaleInput.test.svelte'

describe('серверный рендер', () => {
	it('параллельные запросы на разных языках не смешиваются', async () => {
		const page = async (locale: TLocale) => render(LocaleInput, { props: { locale } }).body
		const [ru, en, zh] = await Promise.all([page(ruRU), page(enUS), page(zhCN)])

		expect(ru).toContain('aria-label="Очистить Город"')
		expect(en).toContain('aria-label="Clear Город"')
		expect(zh).toContain('aria-label="清除Город"')
	})
})
