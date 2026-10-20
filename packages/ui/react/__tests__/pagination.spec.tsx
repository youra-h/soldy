/**
 * Pagination в React — проводка на настоящей разметке.
 *
 * Окно, текущую страницу и её связь со значением проверяет ядро, раскладку и
 * фокус — браузер (`playground/vue/browser/pagination.spec.ts`). Здесь важно,
 * что выходы доезжают туда, куда должны: окно — в список, наборы страницы —
 * на её кнопку и место, выключенность и имена — на стрелки, а нажатия на
 * настоящей разметке доходят до модели и возвращаются управляемым значением.
 * Сценарии — те же, что у Vue (`pagination.spec.ts`).
 *
 * Своё у React — момент входа страницы в коллекцию: при коммите, а не на
 * рендере. Страницы окна кладёт в коллекцию расширение пагинации ещё при
 * сборке, поэтому окно, текущая и её наборы есть уже в серверной разметке, и
 * гидратация сходится.
 */

import { describe, it, expect, vi } from 'vitest'
import { StrictMode, act, useState, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { TPagination, createEnginePagination } from '@soldy-ui/core'
import type { TPaginationValue } from '@soldy-ui/core'
import { arEG, ruRU } from '@soldy-ui/plugins'
import { LocaleProvider, Pagination, type PaginationProps } from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

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

			const button = find(place, 'button', HTMLButtonElement)
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

const prev = () => find(document, '.so-pagination__prev', HTMLButtonElement)
const next = () => find(document, '.so-pagination__next', HTMLButtonElement)

/** Нажатие, как у пользователя: меняет состояние — внутри `act`. */
function click(target: HTMLElement): void {
	act(() => target.click())
}

/**
 * Пагинация, чьё значение возвращается пропом, — как `v-model:value` у Vue:
 * значение держит состояние родителя, а смена приходит `onChangeValue`.
 * Последнее значение родителя тест читает из `model.value`.
 */
function withModel(initial: TPaginationValue, props: PaginationProps = {}) {
	const model = { value: initial, set: (_: TPaginationValue) => {} }

	function Controlled(): ReactElement {
		const [value, setValue] = useState(initial)

		model.value = value
		model.set = setValue

		return (
			<Pagination
				{...props}
				value={value}
				onChangeValue={(payload) => setValue(payload.newValue)}
			/>
		)
	}

	return { model, view: <Controlled /> }
}

describe('разметка', () => {
	it('ряд: стрелки по краям, между ними — список страниц и пропусков', () => {
		const { root } = mount(<Pagination total={100} value={5} />)

		expect(root().localName).toBe('nav')
		expect(row()).toBe('1 … 4 [5] 6 … 10')
		expect([...root().children].map((child) => child.className.split(' ')[0])).toEqual([
			'so-button',
			'so-pagination__list',
			'so-button',
		])
		expect(find(document, '.so-pagination__list', HTMLElement).localName).toBe('ol')
		expect(root().firstElementChild?.classList.contains('so-pagination__prev')).toBe(true)
		expect(root().lastElementChild?.classList.contains('so-pagination__next')).toBe(true)
	})

	it('страница: li с data-*, кнопка с aria-current — только у текущей', () => {
		mount(<Pagination total={100} value={5} />)

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
		mount(<Pagination total={100} value={5} />)

		expect(prev().getAttribute('aria-label')).toBe('Previous page')
		expect(next().getAttribute('aria-label')).toBe('Next page')
		expect(prev().getAttribute('type')).toBe('button')
		expect(next().getAttribute('type')).toBe('button')
		expect(prev().querySelector('.so-icon')).not.toBeNull()
		expect(prev().className).not.toMatch(/--view-/)
	})

	it('имя ряду даёт приложение: aria_label на nav', () => {
		const { root } = mount(<Pagination total={100} aria_label="Страницы результатов" />)

		expect(root().getAttribute('aria-label')).toBe('Страницы результатов')
	})

	it('размер и вариант — у стрелок и страниц', () => {
		mount(<Pagination total={30} size="lg" variant="brand" />)

		for (const button of findAll('.so-pagination button')) {
			expect(button.classList.contains('so-button--size-lg')).toBe(true)
			expect(button.classList.contains('so-button--variant-brand')).toBe(true)
		}
	})

	it('атрибуты потребителя — корню', () => {
		const { root } = mount(<Pagination total={30} className="mine" data-probe="1" />)

		expect(root().classList.contains('mine')).toBe(true)
		expect(root().dataset.probe).toBe('1')
	})
})

describe('нажатия → управляемое значение', () => {
	it('нажатие страницы — onChangeValue и окно вокруг неё', () => {
		const { model, view } = withModel(5, { total: 100 })

		mount(view)

		click(page('6'))

		expect(model.value).toBe(6)
		expect(row()).toBe('1 … 5 [6] 7 … 10')

		click(page('10'))

		expect(model.value).toBe(10)
		expect(row()).toBe('1 … 6 7 8 9 [10]')
	})

	it('стрелки листают и гаснут на краях', () => {
		const { model, view } = withModel(1, { total: 30 })

		mount(view)

		expect(prev().hasAttribute('disabled')).toBe(true)
		expect(next().hasAttribute('disabled')).toBe(false)

		click(next())

		expect(model.value).toBe(2)
		expect(prev().hasAttribute('disabled')).toBe(false)

		click(next())

		expect(model.value).toBe(3)
		expect(next().hasAttribute('disabled')).toBe(true)
		expect(row()).toBe('1 2 [3]')

		click(prev())

		expect(model.value).toBe(2)
	})

	it('значение из модели — окно вокруг него', () => {
		const { model, view } = withModel(1, { total: 100 })

		mount(view)

		act(() => model.set(7))

		expect(row()).toBe('1 … 6 [7] 8 9 10')
	})

	/**
	 * Выключенная кнопка фокус теряет, и браузер сбросил бы его в начало
	 * документа. Плагин фокуса уводит его на текущую страницу в том же событии,
	 * раньше, чем React перерисует стрелку выключенной; кнопку текущей он берёт
	 * из реестра узлов страниц — в React страницы входят в него при коммите.
	 */
	it('стрелка погасла у края под фокусом — фокус на кнопке текущей страницы', async () => {
		const { model, view } = withModel(2, { total: 30 })

		mount(view)
		await nextFrame()

		act(() => next().focus())
		click(next())

		expect(model.value).toBe(3)
		expect(next().hasAttribute('disabled')).toBe(true)
		expect(document.activeElement).toBe(page('3'))
	})

	it('страница, оставшаяся на экране, — тот же узел, и фокус на ней остаётся', () => {
		const { view } = withModel(5, { total: 100 })

		mount(view)

		const six = page('6')
		const first = page('1')

		act(() => six.focus())
		click(six)

		expect(page('6')).toBe(six)
		expect(page('1')).toBe(first)
		expect(document.activeElement).toBe(six)
	})

	it('свой ctrl: значение из кода — окно вокруг него', () => {
		const ctrl = new TPagination({ total: 100 })

		mount(<Pagination ctrl={ctrl} />)

		act(() => {
			ctrl.value = 7
		})

		expect(row()).toBe('1 … 6 [7] 8 9 10')
	})

	it('движок снаружи: страницы окна — в нём', () => {
		const engine = createEnginePagination()

		mount(<Pagination engine={engine} total={100} value={5} />)

		expect(engine.extensions.batch.items.map((item) => item.value)).toEqual([1, 4, 5, 6, 10])
		expect(row()).toBe('1 … 4 [5] 6 … 10')
	})

	it('выключенная пагинация — выключены стрелки и страницы', () => {
		const { root } = mount(<Pagination total={100} value={5} disabled />)

		const buttons = findAll('.so-pagination button')

		expect(buttons.length).toBeGreaterThan(2)
		expect(buttons.every((button) => button.hasAttribute('disabled'))).toBe(true)
		expect(root().dataset.disabled).toBe('true')
	})
})

describe('текст и слоты', () => {
	const PAGES = ['Админ', 'Записи', 'Конференция', 'Отчёты', 'Почта', 'Склад', 'Настройки']

	it('текстовые страницы — по порядку списка, value — ключ страницы', () => {
		// Середина 1: при середине 3 семь страниц видны все, и пропусков нет
		const { model, view } = withModel('reports', {
			pages: PAGES.map((text, index) => ({
				text,
				value: index === 3 ? 'reports' : undefined,
			})),
			middleCount: 1,
		})

		mount(view)

		expect(row()).toBe('Админ … [Отчёты] … Настройки')

		click(page('Настройки'))

		// У страницы без своего ключа ключ — её номер
		expect(model.value).toBe(7)
		expect(row()).toBe('Админ … Почта Склад [Настройки]')
	})

	it('слот item получает страницу и её текст', () => {
		mount(
			<Pagination
				total={30}
				value={2}
				item={({ item, text }) => (
					<span className="so-test-page">
						{String(item.value)}:{text}
					</span>
				)}
			/>,
		)

		expect(findAll('.so-test-page').map((node) => node.textContent)).toEqual([
			'1:1',
			'2:2',
			'3:3',
		])
		// Текущую отмечает кнопка, а слот — только её содержимое
		expect(find(document, '[aria-current="page"] .so-test-page', HTMLElement).textContent).toBe(
			'2:2',
		)
	})

	it('слоты значков стрелок', () => {
		mount(
			<Pagination
				total={30}
				prev-icon={<i className="so-test-prev" />}
				next-icon={<i className="so-test-next" />}
			/>,
		)

		expect(find(document, '.so-pagination__prev .so-test-prev', HTMLElement)).toBeTruthy()
		expect(find(document, '.so-pagination__next .so-test-next', HTMLElement)).toBeTruthy()
		expect(document.querySelector('.so-pagination__prev .so-icon')).toBeNull()
	})
})

describe('локаль поддерева', () => {
	it('имена стрелок и цифры номеров — от провайдера, на лету', () => {
		const view = (locale: typeof ruRU) => (
			<LocaleProvider locale={locale}>
				<Pagination total={200_000} value={12_345} />
			</LocaleProvider>
		)
		const { render } = mount(view(ruRU))

		expect(prev().getAttribute('aria-label')).toBe('Предыдущая страница')
		expect(next().getAttribute('aria-label')).toBe('Следующая страница')

		const ru = new Intl.NumberFormat('ru-RU')

		expect(row()).toBe(
			['1', '…', ru.format(12_344), `[${ru.format(12_345)}]`, ru.format(12_346), '…'].join(
				' ',
			) + ` ${ru.format(20_000)}`,
		)

		const current = page(ru.format(12_345))

		render(view(arEG))

		expect(prev().getAttribute('aria-label')).toBe(arEG.translations.pagination.prev)
		// Те же страницы, текст — в цифрах новой локали
		expect(page('١٢٬٣٤٥')).toBe(current)
	})
})

/**
 * StrictMode пересобирает пагинацию и её страницы: у пересобранной — новый
 * движок, и страницы окна входят в него при коммите заново. Окно, текущая и
 * нажатия обязаны работать на пересобранной так же.
 */
describe('StrictMode', () => {
	it('окно и текущая на месте, нажатие страницы — значение и окно вокруг неё', () => {
		const { model, view } = withModel(5, { total: 100 })

		mount(<StrictMode>{view}</StrictMode>)

		expect(row()).toBe('1 … 4 [5] 6 … 10')

		click(page('6'))

		expect(model.value).toBe(6)
		expect(row()).toBe('1 … 5 [6] 7 … 10')

		click(next())

		expect(model.value).toBe(7)
		expect(row()).toBe('1 … 6 [7] 8 9 10')
	})
})

describe('серверный рендер', () => {
	const app = (
		<LocaleProvider locale={ruRU}>
			<Pagination total={100} value={5} aria_label="Страницы" />
		</LocaleProvider>
	)

	it('окно, текущая и имена — уже в разметке сервера', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(app)

		expect(row(container)).toBe('1 … 4 [5] 6 … 10')
		expect(
			find(container, '.so-pagination__prev', HTMLElement).getAttribute('aria-label'),
		).toBe('Предыдущая страница')
		expect(find(container, '.so-pagination', HTMLElement).getAttribute('aria-label')).toBe(
			'Страницы',
		)
	})

	it('гидратация — без расхождений', () => {
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(app)
		document.body.append(container)

		act(() => {
			track(hydrateRoot(container, app, { onRecoverableError }))
		})

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(row(container)).toBe('1 … 4 [5] 6 … 10')
	})
})
