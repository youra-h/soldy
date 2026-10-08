/**
 * Локаль поддерева во Vue — на настоящей разметке.
 *
 * Своего языка и своих строк у компонента нет: их даёт ближайший
 * `LocaleProvider` выше по дереву, а компоненту их пишут плагины языка и
 * имён — при монтировании и на каждую смену. Здесь важно, что смена доезжает
 * до разметки на лету, без перемонтирования; что вложенный провайдер даёт
 * поддереву свой язык; и что сервер, рисуя параллельно два запроса на разных
 * языках, не смешивает их: источник локали — у провайдера, а не у процесса.
 *
 * Как устроены локали и плагины, проверяют `plugins/__tests__/locale.spec.ts`
 * и `names.plugin.spec.ts`; какие компоненты ставят плагины — сторож
 * `setup/__tests__/locale.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { TTable } from '@soldy-ui/core'
import { enUS, extendLocale, ruRU, zhCN } from '@soldy-ui/plugins'
import type { TLocale } from '@soldy-ui/plugins'
import { Calendar, LocaleProvider, Table, Tabs, TabsItem } from '@soldy-ui/vue'

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
function find(selector: string, root: ParentNode = document): HTMLElement {
	const element = root.querySelector(selector)

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

/** Заголовок месяца сетки на языке `locale`. */
const title = (locale: string) =>
	new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
		Date.UTC(2026, 8, 1),
	)

describe('строки библиотеки', () => {
	it('без провайдера — английские', async () => {
		await render(tabs)

		expect(find('.s-tabs-item__close').getAttribute('aria-label')).toBe('Close Почта')
	})

	it('локаль провайдера — в разметке с первой отрисовки', async () => {
		await render(() => h(LocaleProvider, { locale: ruRU }, tabs))

		expect(find('.s-tabs-item__close').getAttribute('aria-label')).toBe('Закрыть Почта')
	})

	it('своя локаль поверх готовой — свои строки, остальное от готовой', async () => {
		const locale = extendLocale(ruRU, { translations: { tabs: { close: 'Убрать «{name}»' } } })

		await render(() => h(LocaleProvider, { locale }, tabs))

		expect(find('.s-tabs-item__close').getAttribute('aria-label')).toBe('Убрать «Почта»')
	})

	it('смена локали провайдера — новое имя крестика без перемонтирования', async () => {
		const locale = ref<TLocale>(enUS)

		await render(() => h(LocaleProvider, { locale: locale.value }, tabs))

		const close = find('.s-tabs-item__close')

		expect(close.getAttribute('aria-label')).toBe('Close Почта')

		locale.value = ruRU
		await nextTick()

		expect(find('.s-tabs-item__close')).toBe(close)
		expect(close.getAttribute('aria-label')).toBe('Закрыть Почта')

		locale.value = zhCN
		await nextTick()

		expect(close.getAttribute('aria-label')).toBe('关闭Почта')
	})
})

describe('язык', () => {
	it('смена локали меняет дни недели календаря на лету', async () => {
		const locale = ref<TLocale>(enUS)

		await render(() =>
			h(LocaleProvider, { locale: locale.value }, () =>
				h(Calendar, { months: ['2026-09-01'] }),
			),
		)

		const table = find('.s-calendar__grid')

		expect(weekdays()).toEqual(week('en-US', 0))

		locale.value = ruRU
		await nextTick()

		expect(find('.s-calendar__grid')).toBe(table)
		expect(weekdays()).toEqual(week('ru-RU', 1))
	})

	it('свой язык внешнего ctrl не держится: язык — поддерева', async () => {
		const ctrl = new TTable({ locale: 'de-DE' })

		await render(() => h(LocaleProvider, { locale: ruRU }, () => h(Table, { ctrl })))

		expect(ctrl.locale).toBe('ru-RU')
	})
})

describe('вложенный провайдер', () => {
	it('даёт поддереву свою локаль, соседи остаются на своей', async () => {
		await render(() =>
			h(LocaleProvider, { locale: ruRU }, () =>
				h('div', [
					h('section', { class: 's-test-outer' }, [tabs()]),
					h(LocaleProvider, { locale: enUS }, () =>
						h('section', { class: 's-test-inner' }, [tabs()]),
					),
				]),
			),
		)

		expect(find('.s-tabs-item__close', find('.s-test-outer')).getAttribute('aria-label')).toBe(
			'Закрыть Почта',
		)
		expect(find('.s-tabs-item__close', find('.s-test-inner')).getAttribute('aria-label')).toBe(
			'Close Почта',
		)
	})
})

describe('серверный рендер', () => {
	/** Страница запроса: табы и календарь под провайдером своей локали. */
	const page = (locale: TLocale) =>
		createSSRApp({
			render: () =>
				h(LocaleProvider, { locale }, () =>
					h('div', [tabs(), h(Calendar, { months: ['2026-09-01'] })]),
				),
		})

	it('строки и язык локали — уже в разметке сервера', async () => {
		const html = await renderToString(page(ruRU))

		expect(html).toContain('aria-label="Закрыть Почта"')
		expect(html).toContain(title('ru-RU'))
	})

	it('параллельные запросы на разных языках не смешиваются', async () => {
		const [ru, en, zh] = await Promise.all([
			renderToString(page(ruRU)),
			renderToString(page(enUS)),
			renderToString(page(zhCN)),
		])

		expect(ru).toContain('aria-label="Закрыть Почта"')
		expect(ru).toContain(title('ru-RU'))
		expect(ru).not.toContain('aria-label="Close Почта"')

		expect(en).toContain('aria-label="Close Почта"')
		expect(en).toContain(title('en-US'))

		expect(zh).toContain('aria-label="关闭Почта"')
		expect(zh).toContain(title('zh-CN'))
	})
})
