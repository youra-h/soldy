/**
 * Язык и словарь приложения во Vue — на настоящей разметке.
 *
 * Своего языка и своих строк у компонента нет: их задаёт приложение
 * (`useLocale`, `useTranslations` из `@soldy-ui/plugins`), а компоненту пишут
 * плагины языка и словаря — при монтировании и на каждую смену. Здесь важно,
 * что смена доезжает до разметки на лету, без перемонтирования, и что строки
 * на языке приложения есть уже в разметке сервера: плагины пишут при
 * установке, синхронно.
 *
 * Как словарь собирается из частей и что плагины снимают подписку с набором,
 * проверяет `plugins/__tests__/locale.spec.ts`; какие компоненты ставят
 * плагины — сторож `setup/__tests__/translations.spec.ts`. После каждого теста
 * язык и словарь снова английские — их возвращает общий `setup.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { TTable } from '@soldy-ui/core'
import { useLocale, useTranslations } from '@soldy-ui/plugins'
import { Calendar, Table, Tabs, TabsItem } from '@soldy-ui/vue'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

async function render(content: () => VNode): Promise<void> {
	wrapper = mount(defineComponent({ render: content }), { attachTo: document.body })

	await nextTick()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении атрибута. */
function find(selector: string): HTMLElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Табы с крестиками — так их пишет приложение. */
const tabs = () =>
	h(Tabs, { closable: true }, () => [
		h(TabsItem, { value: 'mail', text: 'Почта', active: true }),
		h(TabsItem, { value: 'settings', text: 'Настройки' }),
	])

/** Подписи колонок календаря по порядку. */
const weekdays = () =>
	[...document.querySelectorAll('.s-calendar__weekday')].map((cell) => cell.textContent?.trim())

/** Узкие имена недели языка `locale`, с первого дня `first` (2026-09-20 — воскресенье). */
function week(locale: string, first: number): string[] {
	const narrow = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' })

	return [0, 1, 2, 3, 4, 5, 6].map((offset) =>
		narrow.format(Date.UTC(2026, 8, 20 + first + offset)),
	)
}

describe('словарь приложения', () => {
	it('заданный до монтирования — в разметке с первой отрисовки', async () => {
		useTranslations({ tabs: { close: (name) => `Закрыть вкладку ${name}` } })

		await render(tabs)

		expect(find('.s-tabs-item__close').getAttribute('aria-label')).toBe('Закрыть вкладку Почта')
	})

	it('сменённый после монтирования — меняет имя крестика без перемонтирования', async () => {
		await render(tabs)

		const close = find('.s-tabs-item__close')

		expect(close.getAttribute('aria-label')).toBe('Close Почта')

		useTranslations({ tabs: { close: (name) => `Закрыть вкладку ${name}` } })
		await nextTick()

		expect(find('.s-tabs-item__close')).toBe(close)
		expect(close.getAttribute('aria-label')).toBe('Закрыть вкладку Почта')

		useTranslations()
		await nextTick()

		expect(close.getAttribute('aria-label')).toBe('Close Почта')
	})
})

describe('язык приложения', () => {
	it('useLocale меняет дни недели календаря на лету', async () => {
		await render(() => h(Calendar, { months: ['2026-09-01'] }))

		const table = find('.s-calendar__grid')

		expect(weekdays()).toEqual(week('en-US', 0))

		useLocale('ru-RU')
		await nextTick()

		expect(find('.s-calendar__grid')).toBe(table)
		expect(weekdays()).toEqual(week('ru-RU', 1))
	})

	it('свой язык внешнего ctrl не держится: язык — приложения', async () => {
		useLocale('ru-RU')

		const ctrl = new TTable({ locale: 'de-DE' })

		await render(() => h(Table, { ctrl }))

		expect(ctrl.locale).toBe('ru-RU')
	})
})

describe('серверный рендер', () => {
	it('строки и язык приложения — уже в разметке сервера', async () => {
		useLocale('ru-RU')
		useTranslations({ tabs: { close: (name) => `Закрыть вкладку ${name}` } })

		const html = await renderToString(
			createSSRApp({
				render: () => h('div', [tabs(), h(Calendar, { months: ['2026-09-01'] })]),
			}),
		)
		const title = new Intl.DateTimeFormat('ru-RU', {
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC',
		}).format(Date.UTC(2026, 8, 1))

		expect(html).toContain('aria-label="Закрыть вкладку Почта"')
		expect(html).toContain(title)
	})
})
