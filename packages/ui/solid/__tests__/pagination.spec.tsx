/**
 * Pagination в Solid — проводка на настоящей разметке.
 *
 * Окно, текущую страницу и её связь со значением проверяет ядро, раскладку и
 * фокус — браузер (`playground/vue/browser/pagination.spec.ts`). Здесь важно,
 * что выходы доезжают туда, куда должны: окно — в список, наборы страницы —
 * на её кнопку и место, выключенность и имена — на стрелки, а нажатия на
 * настоящей разметке доходят до модели и возвращаются значением. Сценарии —
 * те же, что у Vue (`pagination.spec.ts`); `v-model` Vue здесь — `value` с
 * `onChangeValue`. Серверную разметку проверяет
 * `collections.server.spec.tsx`.
 *
 * Своё у Solid — петля по ключу места (`KeyedFor`): записи окна новые на
 * каждую смену, а страница, оставшаяся на экране, — тот же узел.
 */

import { describe, it, expect, vi } from 'vitest'
import { createSignal } from 'solid-js'
import { TPagination, type TPaginationValue } from '@soldy-ui/core'
import { arEG, ruRU } from '@soldy-ui/plugins'
import { LocaleProvider, Pagination, type PaginationProps } from '@soldy-ui/solid'
import { find, mount, nextFrame } from './mount'

/** Все HTML-узлы по селектору. */
function findAll(selector: string, scope: ParentNode = document): HTMLElement[] {
	return [...scope.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)
}

/** Узел по селектору в документе. */
const node = (selector: string) => find(document, selector, HTMLElement)

/**
 * Ряд строкой, как его видит пользователь: пропуск — «…», текущая — в
 * скобках. Текущую сверяет по обоим наборам: `aria-current` у кнопки — для
 * скринридера, `data-selected` у места — для темы.
 */
function row(scope: ParentNode = document): string {
	return findAll('.so-pagination__list > li', scope)
		.map((place) => {
			if (place.classList.contains('so-pagination__ellipsis')) return place.textContent

			const button = find(place, 'button', HTMLElement)
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
 * Пагинация со значением в сигнале: смена приходит колбэком `onChangeValue`
 * и возвращается пропом — как `v-model:value` у Vue.
 */
function withModel(initial: TPaginationValue, props: PaginationProps = {}) {
	const [value, setValue] = createSignal<TPaginationValue>(initial)

	mount(() => (
		<Pagination
			{...props}
			value={value()}
			onChangeValue={({ newValue }) => {
				setValue(newValue)
			}}
		/>
	))

	return { value, setValue }
}

describe('разметка', () => {
	it('ряд: стрелки по краям, между ними — список страниц и пропусков', () => {
		const root = mount(() => <Pagination total={100} value={5} />).root()

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
		mount(() => <Pagination total={100} value={5} />)

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

	it('пропуск — многоточие текстом, без кнопки и остановки', () => {
		mount(() => <Pagination total={100} value={5} />)

		const gaps = findAll('.so-pagination__ellipsis')

		expect(gaps.map((gap) => gap.localName)).toEqual(['li', 'li'])
		expect(gaps.map((gap) => gap.textContent)).toEqual(['…', '…'])
		expect(gaps.every((gap) => gap.children.length === 0)).toBe(true)
	})

	it('стрелки: имена от локали, type="button", без вида', () => {
		mount(() => <Pagination total={100} value={5} />)

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
		const root = mount(() => (
			<Pagination total={100} aria_label="Страницы результатов" />
		)).root()

		expect(root.getAttribute('aria-label')).toBe('Страницы результатов')
	})

	it('размер и вариант — у стрелок и страниц', () => {
		mount(() => <Pagination total={30} size="lg" variant="brand" />)

		const buttons = findAll('.so-pagination button')

		expect(buttons).toHaveLength(5)

		for (const button of buttons) {
			expect(button.classList.contains('so-button--size-lg')).toBe(true)
			expect(button.classList.contains('so-button--variant-brand')).toBe(true)
		}
	})

	it('атрибуты потребителя — корню nav, поверх наборов', () => {
		const root = mount(() => <Pagination total={30} class="mine" aria-label="Своё" />).root()

		expect([...root.classList].at(-1)).toBe('mine')
		expect(root.getAttribute('aria-label')).toBe('Своё')
	})
})

describe('нажатия → значение', () => {
	it('нажатие страницы — значение и окно вокруг неё', () => {
		const model = withModel(5, { total: 100 })

		page('6').click()

		expect(model.value()).toBe(6)
		expect(row()).toBe('1 … 5 [6] 7 … 10')

		page('10').click()

		expect(model.value()).toBe(10)
		expect(row()).toBe('1 … 6 7 8 9 [10]')
	})

	it('стрелки листают и гаснут на краях', () => {
		const model = withModel(1, { total: 30 })

		const prev = node('.so-pagination__prev')
		const next = node('.so-pagination__next')

		expect(prev.hasAttribute('disabled')).toBe(true)
		expect(next.hasAttribute('disabled')).toBe(false)

		next.click()

		expect(model.value()).toBe(2)
		expect(prev.hasAttribute('disabled')).toBe(false)

		next.click()

		expect(model.value()).toBe(3)
		expect(next.hasAttribute('disabled')).toBe(true)
		expect(row()).toBe('1 2 [3]')

		prev.click()

		expect(model.value()).toBe(2)
	})

	it('значение из модели — окно вокруг него', () => {
		const model = withModel(1, { total: 100 })

		model.setValue(7)

		expect(row()).toBe('1 … 6 [7] 8 9 10')
	})

	it('страница, оставшаяся на экране, — тот же узел, и фокус на ней остаётся', () => {
		withModel(5, { total: 100 })

		const six = page('6')
		const first = page('1')

		six.focus()
		six.click()

		expect(page('6')).toBe(six)
		expect(page('1')).toBe(first)
		expect(document.activeElement).toBe(six)
	})

	it('свой ctrl: значение из кода — окно вокруг него', () => {
		const ctrl = new TPagination({ total: 100 })

		mount(() => <Pagination ctrl={ctrl} />)

		ctrl.value = 7

		expect(row()).toBe('1 … 6 [7] 8 9 10')
	})

	it('выключенная пагинация — выключены стрелки и страницы', () => {
		const root = mount(() => <Pagination total={100} value={5} disabled />).root()

		const buttons = findAll('.so-pagination button')

		expect(buttons.length).toBeGreaterThan(2)
		expect(buttons.every((button) => button.hasAttribute('disabled'))).toBe(true)
		expect(root.dataset.disabled).toBe('true')
	})

	/**
	 * Стрелка, погасшая у края под фокусом, отдаёт его текущей странице
	 * (`TPaginationFocusPlugin`) — раньше, чем разметка выключит стрелку.
	 * Плагин находит корень по `ready` — кадром позже.
	 */
	it('стрелка погасла у края под фокусом — фокус на текущей странице', async () => {
		withModel(2, { total: 30 })
		await nextFrame()

		const next = node('.so-pagination__next')

		next.focus()
		next.click()

		expect(next.hasAttribute('disabled')).toBe(true)
		expect(document.activeElement).toBe(page('3'))
	})
})

describe('текст и слоты', () => {
	const PAGES = ['Админ', 'Записи', 'Конференция', 'Отчёты', 'Почта', 'Склад', 'Настройки']

	it('текстовые страницы — по порядку списка, value — ключ страницы', () => {
		// Середина 1: при середине 3 семь страниц видны все, и пропусков нет
		const model = withModel('reports', {
			pages: PAGES.map((text, index) => ({
				text,
				value: index === 3 ? 'reports' : undefined,
			})),
			middleCount: 1,
		})

		expect(row()).toBe('Админ … [Отчёты] … Настройки')

		page('Настройки').click()

		// У страницы без своего ключа ключ — её номер
		expect(model.value()).toBe(7)
		expect(row()).toBe('Админ … Почта Склад [Настройки]')
	})

	it('слот item получает страницу и её текст', () => {
		mount(() => (
			<Pagination
				total={30}
				value={2}
				item={({ item, text }) => (
					<span class="so-test-page">
						{item.value}:{text}
					</span>
				)}
			/>
		))

		expect(findAll('.so-test-page').map((probe) => probe.textContent)).toEqual([
			'1:1',
			'2:2',
			'3:3',
		])
		// Текущую отмечает кнопка, а слот — только её содержимое
		expect(node('[aria-current="page"] .so-test-page').textContent).toBe('2:2')
	})

	it('слот item вернул пустое — на странице её текст', () => {
		mount(() => (
			<Pagination
				total={30}
				value={2}
				item={({ text }) => (text === '2' ? null : <b>{text}</b>)}
			/>
		))

		expect(row()).toBe('1 [2] 3')
		expect(page('2').querySelector('b')).toBeNull()
	})

	it('слоты значков стрелок', () => {
		mount(() => (
			<Pagination
				total={30}
				prev-icon={<i class="so-test-prev" />}
				next-icon={<i class="so-test-next" />}
			/>
		))

		expect(node('.so-pagination__prev .so-test-prev')).toBeTruthy()
		expect(node('.so-pagination__next .so-test-next')).toBeTruthy()
		expect(document.querySelector('.so-pagination__prev .so-icon')).toBeNull()
	})

	/**
	 * Окно — новые записи на каждую смену. Петля по ссылке пересоздала бы все
	 * страницы и с ними содержимое их слотов; по ключу места страница,
	 * оставшаяся в окне, своё содержимое не пересобирает.
	 */
	it('смена окна не зовёт слот страниц, оставшихся на экране', () => {
		const item = vi.fn(({ text }: { text: string }) => <b>{text}</b>)
		const model = withModel(5, { total: 100, item: (scope) => item(scope) })

		item.mockClear()
		model.setValue(6)

		// В окно вошла одна страница — 7; страницы 4 больше нет
		expect(item.mock.calls.map(([scope]) => scope.text)).toEqual(['7'])
	})
})

describe('локаль поддерева', () => {
	it('имена стрелок и цифры номеров — от провайдера, на лету', () => {
		const [locale, setLocale] = createSignal(ruRU)

		mount(() => (
			<LocaleProvider locale={locale()}>
				<Pagination total={200_000} value={12_345} />
			</LocaleProvider>
		))

		expect(node('.so-pagination__prev').getAttribute('aria-label')).toBe('Предыдущая страница')
		expect(node('.so-pagination__next').getAttribute('aria-label')).toBe('Следующая страница')

		const ru = new Intl.NumberFormat('ru-RU')

		expect(row()).toBe(
			['1', '…', ru.format(12_344), `[${ru.format(12_345)}]`, ru.format(12_346), '…'].join(
				' ',
			) + ` ${ru.format(20_000)}`,
		)

		const current = page(ru.format(12_345))

		setLocale(arEG)

		expect(node('.so-pagination__prev').getAttribute('aria-label')).toBe(
			arEG.translations.pagination.prev,
		)
		// Те же страницы, текст — в цифрах новой локали
		expect(page('١٢٬٣٤٥')).toBe(current)
	})
})
