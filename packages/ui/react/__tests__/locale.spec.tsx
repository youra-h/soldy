/**
 * Локаль поддерева в React — на настоящей разметке.
 *
 * Своего языка и своих строк у компонента нет: их даёт ближайший
 * `LocaleProvider` выше по дереву, а компоненту их пишут плагины языка и
 * имён. Смена локали провайдера доезжает до разметки без пересборки
 * контекстов — источник у провайдера тот же, — а сервер, рисуя параллельно
 * запросы на разных языках, их не смешивает.
 */

import { describe, it, expect } from 'vitest'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { TInput } from '@soldy-ui/core'
import { enUS, extendLocale, ruRU, zhCN } from '@soldy-ui/plugins'
import type { TLocale } from '@soldy-ui/plugins'
import { Input, LocaleProvider } from '@soldy-ui/react'
import { find, mount } from './mount'

/** Кнопка очистки поля — её имя собирается из шаблона локали и имени поля. */
const clearName = (scope: ParentNode) =>
	find(scope, '.s-input__clear', HTMLButtonElement).getAttribute('aria-label')

/** Поле под провайдером локали. */
const field = (locale: TLocale, ctrl?: TInput) => (
	<LocaleProvider locale={locale}>
		<Input ctrl={ctrl} clearable name="Город" />
	</LocaleProvider>
)

describe('LocaleProvider', () => {
	it('без провайдера — английские строки', () => {
		const view = mount(<Input clearable name="Город" />)

		expect(clearName(view.container)).toBe('Clear Город')
	})

	it('локаль провайдера — с первой отрисовки', () => {
		const view = mount(field(ruRU))

		expect(clearName(view.container)).toBe('Очистить Город')
	})

	it('смена локали — новое имя без пересборки: инстанс и узел те же', () => {
		const ctrl = new TInput()
		const view = mount(field(enUS, ctrl))
		const button = find(view.container, '.s-input__clear', HTMLButtonElement)

		view.render(field(ruRU, ctrl))

		expect(find(view.container, '.s-input__clear', HTMLButtonElement)).toBe(button)
		expect(button.getAttribute('aria-label')).toBe('Очистить Город')

		view.render(
			field(extendLocale(zhCN, { translations: { field: { clear: '清空{name}' } } }), ctrl),
		)

		expect(button.getAttribute('aria-label')).toBe('清空Город')
	})

	it('под StrictMode — то же: лишний цикл эффектов локаль не теряет', () => {
		const view = mount(<StrictMode>{field(ruRU)}</StrictMode>)

		expect(clearName(view.container)).toBe('Очистить Город')

		view.render(<StrictMode>{field(enUS)}</StrictMode>)

		expect(clearName(view.container)).toBe('Clear Город')
	})

	it('вложенный провайдер даёт поддереву свою локаль', () => {
		const view = mount(
			<LocaleProvider locale={ruRU}>
				<div className="s-test-outer">
					<Input clearable name="Город" />
				</div>
				<LocaleProvider locale={enUS}>
					<div className="s-test-inner">
						<Input clearable name="Город" />
					</div>
				</LocaleProvider>
			</LocaleProvider>,
		)

		expect(clearName(find(view.container, '.s-test-outer', HTMLElement))).toBe('Очистить Город')
		expect(clearName(find(view.container, '.s-test-inner', HTMLElement))).toBe('Clear Город')
	})
})

describe('серверный рендер', () => {
	it('параллельные запросы на разных языках не смешиваются', async () => {
		const page = async (locale: TLocale) => renderToString(field(locale))
		const [ru, en, zh] = await Promise.all([page(ruRU), page(enUS), page(zhCN)])

		expect(ru).toContain('aria-label="Очистить Город"')
		expect(en).toContain('aria-label="Clear Город"')
		expect(zh).toContain('aria-label="清除Город"')
	})
})
