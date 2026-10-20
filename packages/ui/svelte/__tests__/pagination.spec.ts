/**
 * Pagination в Svelte — проводка на настоящей разметке.
 *
 * Окно, текущую страницу и её связь со значением проверяет ядро, раскладку и
 * фокус — браузер (`playground/vue/browser/pagination.spec.ts`). Здесь важно,
 * что выходы доезжают туда, куда должны: окно — в список, наборы страницы —
 * на её кнопку и место, выключенность и имена — на стрелки, а нажатия на
 * настоящей разметке доходят до модели и значение возвращается пропом.
 * Сценарии — те же, что у Vue (`pagination.spec.ts`); сервер — в
 * `collections.server.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import {
	TPagination,
	createEnginePagination,
	type IPaginationItem,
	type TPaginationValue,
} from '@soldy-ui/core'
import { arEG, ruRU } from '@soldy-ui/plugins'
import { Pagination, type PaginationProps } from '@soldy-ui/svelte'
import Surround from './Surround.test.svelte'
import { find, mount } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { markup, scopeMarkup } from './snippets.svelte'

const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

function findAll(selector: string, scope: ParentNode = document): HTMLElement[] {
	return [...scope.querySelectorAll(selector)].filter(
		(element): element is HTMLElement => element instanceof HTMLElement,
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

			const button = node('button', place)
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

/**
 * Пагинация, значение которой ведёт потребитель: смену он возвращает пропом,
 * как привязка. Последнее значение — в `props.value`.
 */
function withModel(initial: TPaginationValue, extra: PaginationProps = {}): PaginationProps {
	const props = reactiveProps<PaginationProps>({
		...extra,
		value: initial,
		onChangeValue: ({ newValue }) => {
			props.value = newValue
		},
	})

	mount(Pagination, props)

	return props
}

/** Нажатие кнопки — и такт Svelte. */
function click(button: HTMLElement): void {
	button.click()
	flushSync()
}

describe('разметка', () => {
	it('ряд: стрелки по краям, между ними — список страниц и пропусков', () => {
		const root = mount(Pagination, { total: 100, value: 5 }).root()

		expect(root.localName).toBe('nav')
		expect(row()).toBe('1 … 4 [5] 6 … 10')
		expect([...root.children].map((child) => child.className.split(' ')[0])).toEqual([
			'so-button',
			'so-pagination__list',
			'so-button',
		])
		expect(node('.so-pagination__list').localName).toBe('ol')
		expect(root.firstElementChild?.classList.contains('so-pagination__prev')).toBe(true)
		expect(root.lastElementChild?.classList.contains('so-pagination__next')).toBe(true)
	})

	it('страница: li с data-*, кнопка с aria-current — только у текущей', () => {
		mount(Pagination, { total: 100, value: 5 })

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

	it('стрелки: имена от локали, type="button", без вида', () => {
		mount(Pagination, { total: 100, value: 5 })

		const prev = node('.so-pagination__prev')
		const next = node('.so-pagination__next')

		expect(prev.getAttribute('aria-label')).toBe('Previous page')
		expect(next.getAttribute('aria-label')).toBe('Next page')
		expect(prev.getAttribute('type')).toBe('button')
		expect(next.getAttribute('type')).toBe('button')
		expect(prev.querySelector('.so-icon')).not.toBeNull()
		expect(prev.className).not.toMatch(/--view-/)
	})

	it('имя ряду даёт приложение: aria_label на nav', () => {
		mount(Pagination, { total: 100, aria_label: 'Страницы результатов' })

		expect(node('.so-pagination').getAttribute('aria-label')).toBe('Страницы результатов')
	})

	it('размер и вариант — у стрелок и страниц', () => {
		mount(Pagination, { total: 30, size: 'lg', variant: 'brand' })

		for (const button of findAll('.so-pagination button')) {
			expect(button.classList.contains('so-button--size-lg')).toBe(true)
			expect(button.classList.contains('so-button--variant-brand')).toBe(true)
		}
	})

	it('атрибуты потребителя — на nav', () => {
		mount(Pagination, { total: 30, title: 'Страницы', class: 'mine' })

		const root = node('.so-pagination')

		expect(root.title).toBe('Страницы')
		expect([...root.classList].at(-1)).toBe('mine')
	})
})

describe('нажатия → значение', () => {
	it('нажатие страницы — значение пропом и окно вокруг неё', () => {
		const props = withModel(5, { total: 100 })

		click(page('6'))

		expect(props.value).toBe(6)
		expect(row()).toBe('1 … 5 [6] 7 … 10')

		click(page('10'))

		expect(props.value).toBe(10)
		expect(row()).toBe('1 … 6 7 8 9 [10]')
	})

	it('стрелки листают и гаснут на краях', () => {
		const props = withModel(1, { total: 30 })

		const prev = node('.so-pagination__prev')
		const next = node('.so-pagination__next')

		expect(prev.hasAttribute('disabled')).toBe(true)
		expect(next.hasAttribute('disabled')).toBe(false)

		click(next)

		expect(props.value).toBe(2)
		expect(prev.hasAttribute('disabled')).toBe(false)

		click(next)

		expect(props.value).toBe(3)
		expect(next.hasAttribute('disabled')).toBe(true)
		expect(row()).toBe('1 2 [3]')

		click(prev)

		expect(props.value).toBe(2)
	})

	it('значение от потребителя — окно вокруг него', () => {
		const props = withModel(1, { total: 100 })

		props.value = 7
		flushSync()

		expect(row()).toBe('1 … 6 [7] 8 9 10')
	})

	it('страница, оставшаяся на экране, — тот же узел, и фокус на ней остаётся', () => {
		withModel(5, { total: 100 })

		const six = page('6')
		const first = page('1')

		six.focus()
		click(six)

		expect(page('6')).toBe(six)
		expect(page('1')).toBe(first)
		expect(document.activeElement).toBe(six)
	})

	it('свой ctrl: значение из кода — окно вокруг него', () => {
		const ctrl = new TPagination({ total: 100 })

		mount(Pagination, { ctrl })

		ctrl.value = 7
		flushSync()

		expect(row()).toBe('1 … 6 [7] 8 9 10')
	})

	it('движок снаружи: страницы окна — его элементы', () => {
		const engine = createEnginePagination()

		mount(Pagination, { engine, total: 30, value: 2 })

		expect(row()).toBe('1 [2] 3')
		expect(engine.extensions.batch.items.map((item) => item.text)).toEqual(['1', '2', '3'])
	})

	it('выключенная пагинация — выключены стрелки и страницы', () => {
		mount(Pagination, { total: 100, value: 5, disabled: true })

		const buttons = findAll('.so-pagination button')

		expect(buttons.length).toBeGreaterThan(2)
		expect(buttons.every((button) => button.hasAttribute('disabled'))).toBe(true)
		expect(node('.so-pagination').dataset.disabled).toBe('true')
	})
})

describe('текст и слоты', () => {
	const PAGES = ['Админ', 'Записи', 'Конференция', 'Отчёты', 'Почта', 'Склад', 'Настройки']

	it('текстовые страницы — по порядку списка, value — ключ страницы', () => {
		// Середина 1: при середине 3 семь страниц видны все, и пропусков нет
		const props = withModel('reports', {
			pages: PAGES.map((text, index) => ({
				text,
				value: index === 3 ? 'reports' : undefined,
			})),
			middleCount: 1,
		})

		expect(row()).toBe('Админ … [Отчёты] … Настройки')

		click(page('Настройки'))

		// У страницы без своего ключа ключ — её номер
		expect(props.value).toBe(7)
		expect(row()).toBe('Админ … Почта Склад [Настройки]')
	})

	it('слот item получает страницу и её текст', () => {
		mount(Pagination, {
			total: 30,
			value: 2,
			item: scopeMarkup<{ item: IPaginationItem; text: string }>(
				({ item, text }) => `<span class="so-test-page">${item.value}:${text}</span>`,
			),
		})

		expect(findAll('.so-test-page').map((probe) => probe.textContent)).toEqual([
			'1:1',
			'2:2',
			'3:3',
		])
		// Текущую отмечает кнопка, а слот — только её содержимое
		expect(node('[aria-current="page"] .so-test-page').textContent).toBe('2:2')
	})

	it('слоты значков стрелок', () => {
		mount(Pagination, {
			total: 30,
			'prev-icon': markup('<i class="so-test-prev"></i>'),
			'next-icon': markup('<i class="so-test-next"></i>'),
		})

		expect(node('.so-pagination__prev .so-test-prev')).toBeTruthy()
		expect(node('.so-pagination__next .so-test-next')).toBeTruthy()
		expect(document.querySelector('.so-pagination__prev .so-icon')).toBeNull()
	})
})

describe('локаль поддерева', () => {
	it('имена стрелок и цифры номеров — от провайдера, на лету', () => {
		const props = reactiveProps({
			around: 'locale' as const,
			control: 'pagination' as const,
			locale: ruRU,
			pagination: { total: 200_000, value: 12_345 },
		})

		mount(Surround, props)

		expect(node('.so-pagination__prev').getAttribute('aria-label')).toBe('Предыдущая страница')
		expect(node('.so-pagination__next').getAttribute('aria-label')).toBe('Следующая страница')

		const ru = new Intl.NumberFormat('ru-RU')

		expect(row()).toBe(
			['1', '…', ru.format(12_344), `[${ru.format(12_345)}]`, ru.format(12_346), '…'].join(
				' ',
			) + ` ${ru.format(20_000)}`,
		)

		const current = page(ru.format(12_345))

		props.locale = arEG
		flushSync()

		expect(node('.so-pagination__prev').getAttribute('aria-label')).toBe(
			arEG.translations.pagination.prev,
		)
		// Те же страницы, текст — в цифрах новой локали
		expect(page('١٢٬٣٤٥')).toBe(current)
	})
})
