/**
 * Pagination во Vue — проводка на настоящей разметке.
 *
 * Окно, текущую страницу и её связь со значением проверяет ядро, раскладку и
 * фокус — браузер (`playground/vue/browser/pagination.spec.ts`). Здесь важно,
 * что выходы доезжают туда, куда должны: окно — в список, наборы страницы —
 * на её кнопку и место, выключенность и имена — на стрелки, а нажатия на
 * настоящей разметке доходят до модели и возвращаются `v-model`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { LocaleProvider, Pagination } from '@soldy-ui/vue'
import { TPagination } from '@soldy-ui/core'
import { arEG, ruRU } from '@soldy-ui/plugins'
import type { IPaginationItem, TPaginationValue } from '@soldy-ui/core'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

async function render(content: () => VNode): Promise<void> {
	wrapper = mount(defineComponent({ render: content }), { attachTo: document.body })

	await nextTick()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, scope: ParentNode = document): HTMLElement {
	const element = scope.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

function findAll(selector: string, scope: ParentNode = document): HTMLElement[] {
	return [...scope.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)
}

/**
 * Ряд строкой, как его видит пользователь: пропуск — «…», текущая — в
 * скобках. Текущую сверяет по обоим наборам: `aria-current` у кнопки — для
 * скринридера, `data-selected` у места — для темы.
 */
function row(scope: ParentNode = document): string {
	return findAll('.so-pagination__list > li', scope)
		.map((place) => {
			if (place.classList.contains('so-pagination__ellipsis')) return place.textContent

			const button = find('button', place)
			const text = button.textContent?.trim() ?? ''
			const current = button.getAttribute('aria-current') === 'page'

			if (current !== (place.dataset.selected === 'true')) {
				throw new Error(`страница ${text}: наборы разошлись`)
			}

			return current ? `[${text}]` : text
		})
		.join(' ')
}

/** Кнопка страницы по её тексту. */
function page(text: string): HTMLElement {
	const found = findAll('.so-pagination-item > button').find(
		(button) => button.textContent?.trim() === text,
	)

	if (!found) throw new Error(`страницы «${text}» нет`)

	return found
}

/** Пагинация с `v-model:value`. */
function withModel(initial: TPaginationValue, props: Record<string, unknown> = {}) {
	const value = ref<TPaginationValue>(initial)

	const draw = () =>
		h(Pagination, {
			...props,
			value: value.value,
			'onUpdate:value': (next: TPaginationValue) => {
				value.value = next
			},
		})

	return { value, draw }
}

describe('разметка', () => {
	it('ряд: стрелки по краям, между ними — список страниц и пропусков', async () => {
		await render(() => h(Pagination, { total: 100, value: 5 }))

		const root = find('.so-pagination')

		expect(root.localName).toBe('nav')
		expect(row()).toBe('1 … 4 [5] 6 … 10')
		expect([...root.children].map((child) => child.className.split(' ')[0])).toEqual([
			'so-button',
			'so-pagination__list',
			'so-button',
		])
		expect(find('.so-pagination__list').localName).toBe('ol')
		expect(root.firstElementChild?.classList.contains('so-pagination__prev')).toBe(true)
		expect(root.lastElementChild?.classList.contains('so-pagination__next')).toBe(true)
	})

	it('страница: li с data-*, кнопка с aria-current — только у текущей', async () => {
		await render(() => h(Pagination, { total: 100, value: 5 }))

		const current = page('5')
		const place = current.parentElement

		expect(place?.localName).toBe('li')
		expect(place?.classList.contains('so-pagination-item')).toBe(true)
		expect(place?.dataset.selected).toBe('true')
		expect(place?.hasAttribute('aria-current')).toBe(false)
		expect(current.getAttribute('type')).toBe('button')
		expect(current.getAttribute('aria-current')).toBe('page')
		// Текущая — обычная кнопка: своя остановка Tab
		expect(current.hasAttribute('disabled')).toBe(false)
		expect(findAll('[aria-current]')).toHaveLength(1)
	})

	it('стрелки: имена от локали, type="button", без вида', async () => {
		await render(() => h(Pagination, { total: 100, value: 5 }))

		const prev = find('.so-pagination__prev')
		const next = find('.so-pagination__next')

		expect(prev.getAttribute('aria-label')).toBe('Previous page')
		expect(next.getAttribute('aria-label')).toBe('Next page')
		expect(prev.getAttribute('type')).toBe('button')
		expect(next.getAttribute('type')).toBe('button')
		expect(prev.querySelector('.so-icon')).not.toBeNull()
		expect(prev.className).not.toMatch(/--view-/)
	})

	it('имя ряду даёт приложение: aria_label на nav', async () => {
		await render(() => h(Pagination, { total: 100, aria_label: 'Страницы результатов' }))

		expect(find('.so-pagination').getAttribute('aria-label')).toBe('Страницы результатов')
	})

	it('размер и вариант — у стрелок и страниц', async () => {
		await render(() => h(Pagination, { total: 30, size: 'lg', variant: 'brand' }))

		for (const button of findAll('.so-pagination button')) {
			expect(button.classList.contains('so-button--size-lg')).toBe(true)
			expect(button.classList.contains('so-button--variant-brand')).toBe(true)
		}
	})
})

describe('нажатия → v-model', () => {
	it('нажатие страницы — update:value и окно вокруг неё', async () => {
		const model = withModel(5, { total: 100 })

		await render(model.draw)

		page('6').click()
		await nextTick()

		expect(model.value.value).toBe(6)
		expect(row()).toBe('1 … 5 [6] 7 … 10')

		page('10').click()
		await nextTick()

		expect(model.value.value).toBe(10)
		expect(row()).toBe('1 … 7 8 9 [10]')
	})

	it('стрелки листают и гаснут на краях', async () => {
		const model = withModel(1, { total: 30 })

		await render(model.draw)

		const prev = find('.so-pagination__prev')
		const next = find('.so-pagination__next')

		expect(prev.hasAttribute('disabled')).toBe(true)
		expect(next.hasAttribute('disabled')).toBe(false)

		next.click()
		await nextTick()

		expect(model.value.value).toBe(2)
		expect(prev.hasAttribute('disabled')).toBe(false)

		next.click()
		await nextTick()

		expect(model.value.value).toBe(3)
		expect(next.hasAttribute('disabled')).toBe(true)
		expect(row()).toBe('1 2 [3]')

		prev.click()
		await nextTick()

		expect(model.value.value).toBe(2)
	})

	it('значение из модели — окно вокруг него', async () => {
		const model = withModel(1, { total: 100 })

		await render(model.draw)

		model.value.value = 7
		await nextTick()

		expect(row()).toBe('1 … 6 [7] 8 … 10')
	})

	it('страница, оставшаяся на экране, — тот же узел, и фокус на ней остаётся', async () => {
		const model = withModel(5, { total: 100 })

		await render(model.draw)

		const six = page('6')
		const first = page('1')

		six.focus()
		six.click()
		await nextTick()

		expect(page('6')).toBe(six)
		expect(page('1')).toBe(first)
		expect(document.activeElement).toBe(six)
	})

	it('свой ctrl: значение из кода — окно вокруг него', async () => {
		const ctrl = new TPagination({ total: 100 })

		await render(() => h(Pagination, { ctrl }))

		ctrl.value = 7
		await nextTick()

		expect(row()).toBe('1 … 6 [7] 8 … 10')
	})

	it('выключенная пагинация — выключены стрелки и страницы', async () => {
		await render(() => h(Pagination, { total: 100, value: 5, disabled: true }))

		const buttons = findAll('.so-pagination button')

		expect(buttons.length).toBeGreaterThan(2)
		expect(buttons.every((button) => button.hasAttribute('disabled'))).toBe(true)
		expect(find('.so-pagination').dataset.disabled).toBe('true')
	})
})

describe('текст и слоты', () => {
	const PAGES = ['Админ', 'Записи', 'Конференция', 'Отчёты', 'Почта', 'Склад', 'Настройки']

	it('текстовые страницы — по порядку списка, value — ключ страницы', async () => {
		const model = withModel('reports', {
			pages: PAGES.map((text, index) => ({
				text,
				value: index === 3 ? 'reports' : undefined,
			})),
		})

		await render(model.draw)

		expect(row()).toBe('Админ … Конференция [Отчёты] Почта … Настройки')

		page('Почта').click()
		await nextTick()

		// У страницы без своего ключа ключ — её номер
		expect(model.value.value).toBe(5)
	})

	it('слот item получает страницу и её текст', async () => {
		await render(() =>
			h(
				Pagination,
				{ total: 30, value: 2 },
				{
					item: ({ item, text }: { item: IPaginationItem; text: string }) =>
						h('span', { class: 'so-test-page' }, `${item.value}:${text}`),
				},
			),
		)

		expect(findAll('.so-test-page').map((node) => node.textContent)).toEqual([
			'1:1',
			'2:2',
			'3:3',
		])
		// Текущую отмечает кнопка, а слот — только её содержимое
		expect(find('[aria-current="page"] .so-test-page').textContent).toBe('2:2')
	})

	it('слоты значков стрелок', async () => {
		await render(() =>
			h(
				Pagination,
				{ total: 30 },
				{
					'prev-icon': () => h('i', { class: 'so-test-prev' }),
					'next-icon': () => h('i', { class: 'so-test-next' }),
				},
			),
		)

		expect(find('.so-pagination__prev .so-test-prev')).toBeTruthy()
		expect(find('.so-pagination__next .so-test-next')).toBeTruthy()
		expect(document.querySelector('.so-pagination__prev .so-icon')).toBeNull()
	})
})

describe('локаль поддерева', () => {
	it('имена стрелок и цифры номеров — от провайдера, на лету', async () => {
		const locale = ref(ruRU)

		await render(() =>
			h(LocaleProvider, { locale: locale.value }, () =>
				h(Pagination, { total: 200_000, value: 12_345 }),
			),
		)

		expect(find('.so-pagination__prev').getAttribute('aria-label')).toBe('Предыдущая страница')
		expect(find('.so-pagination__next').getAttribute('aria-label')).toBe('Следующая страница')

		const ru = new Intl.NumberFormat('ru-RU')

		expect(row()).toBe(
			['1', '…', ru.format(12_344), `[${ru.format(12_345)}]`, ru.format(12_346), '…'].join(
				' ',
			) + ` ${ru.format(20_000)}`,
		)

		const current = page(ru.format(12_345))

		locale.value = arEG
		await nextTick()

		expect(find('.so-pagination__prev').getAttribute('aria-label')).toBe(
			arEG.translations.pagination.prev,
		)
		// Те же страницы, текст — в цифрах новой локали
		expect(page('١٢٬٣٤٥')).toBe(current)
	})
})

describe('серверный рендер', () => {
	const app = () =>
		createSSRApp({
			render: () =>
				h(LocaleProvider, { locale: ruRU }, () =>
					h(Pagination, { total: 100, value: 5, aria_label: 'Страницы' }),
				),
		})

	it('окно, текущая и имена — уже в разметке сервера', async () => {
		const html = await renderToString(app())
		const container = document.createElement('div')

		container.innerHTML = html

		expect(row(container)).toBe('1 … 4 [5] 6 … 10')
		expect(find('.so-pagination__prev', container).getAttribute('aria-label')).toBe(
			'Предыдущая страница',
		)
		expect(find('.so-pagination', container).getAttribute('aria-label')).toBe('Страницы')
	})

	it('гидратация — без расхождений', async () => {
		const html = await renderToString(app())
		const container = document.createElement('div')
		const warnings: string[] = []

		container.innerHTML = html
		document.body.append(container)

		const client = app()

		client.config.warnHandler = (message) => warnings.push(message)
		client.mount(container)
		await nextTick()

		expect(warnings).toEqual([])
		expect(row(container)).toBe('1 … 4 [5] 6 … 10')

		client.unmount()
	})
})
