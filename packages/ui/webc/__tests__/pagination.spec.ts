/**
 * `<nav is="so-pagination">` — проводка на настоящей разметке.
 *
 * Окно, текущую страницу и её связь со значением проверяет ядро
 * (`core/__tests__/pagination.spec.ts`), раскладку и фокус — браузер
 * (`playground/vue/browser/pagination.spec.ts`). Сценарии — те же, что у Vue
 * (`pagination.spec.ts`), без сервера, и сверх них, как у Solid: страницы,
 * оставшиеся на экране, переживают сдвиг окна, — и фокус со стрелки, погасшей
 * у края, — на текущую.
 *
 * Угол зрения здесь свой. Корень — элемент потребителя, страница — внутренняя
 * часть `<li is="so-pagination-item">`, которую рисует шаблон пагинации над
 * страницами окна. Слот со scope (`item`) — образец: копию получает каждая
 * страница, а данные копия берёт у страницы — `el.ctrl`. События страницы —
 * разметки пагинации — не всплывают.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton, TPagination, TPaginationItem, type IPaginationItem } from '@soldy-ui/core'
import { TBasePlugin, arEG, ruRU, type IPluginContext } from '@soldy-ui/plugins'
import { PaginationDescriptor, PaginationItemDescriptor, usePlugins } from '@soldy-ui/setup'
import {
	TLocaleProviderElement,
	TPaginationElement,
	type TPaginationElementProps,
} from '@soldy-ui/webc'
import { paginationTemplate } from '../src/components/pagination/pagination.template'
import {
	TPaginationItemElement,
	paginationItemTemplate,
	type TPaginationItemElementProps,
} from '../src/components/pagination/item'
import { bareContext } from './template-context'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него узлы страниц в реестре. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

function isPagination(node: Element | null): node is TPaginationElementProps {
	return node instanceof TPaginationElement
}

function isPage(node: Element | null): node is TPaginationItemElementProps {
	return node instanceof TPaginationItemElement
}

/** Пагинация soldy в разметке. */
function paginationOf(root: ParentNode): TPaginationElementProps {
	const node = root.querySelector('[is="so-pagination"]')

	if (!isPagination(node)) throw new Error('<nav is="so-pagination"> нет')

	return node
}

/**
 * Пагинация из разметки в документе. Свойства — до вставки: текстовые страницы
 * удобнее списком, чем строкой JSON в атрибуте.
 */
async function mount(
	html: string,
	props: Partial<Pick<TPaginationElementProps, 'pages'>> = {},
): Promise<TPaginationElementProps> {
	const host = document.createElement('div')

	host.innerHTML = html

	const el = paginationOf(host)

	Object.assign(el, props)
	document.body.appendChild(host)
	await flush()

	return el
}

/** Пагинация над готовым инстансом: `ctrl` выставлен до подключения. */
async function mountCtrl(ctrl: TPagination): Promise<TPaginationElementProps> {
	const el = document.createElement('nav', { is: 'so-pagination' })

	if (!isPagination(el)) throw new Error('<nav is="so-pagination"> нет')

	el.ctrl = ctrl
	document.body.appendChild(el)
	await flush()

	return el
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

describe('разметка', () => {
	it('ряд: стрелки по краям, между ними — список страниц и пропусков', async () => {
		const root = await mount('<nav is="so-pagination" total="100" value="5"></nav>')

		expect(root).toBeInstanceOf(HTMLElement)
		expect(root.localName).toBe('nav')
		expect(root.classList.contains('so-pagination')).toBe(true)
		expect(row()).toBe('1 … 4 [5] 6 … 10')
		expect([...root.children].map((child) => child.localName)).toEqual([
			'button',
			'ol',
			'button',
		])
		expect(find('.so-pagination__list').localName).toBe('ol')
		expect(root.firstElementChild?.classList.contains('so-pagination__prev')).toBe(true)
		expect(root.lastElementChild?.classList.contains('so-pagination__next')).toBe(true)
	})

	it('тег у ядра — тег элемента: nav', async () => {
		const ctrl = new TPagination()

		await mountCtrl(ctrl)

		expect(ctrl.tag).toBe('nav')
	})

	it('страница: li с data-*, кнопка с aria-current — только у текущей', async () => {
		await mount('<nav is="so-pagination" total="100" value="5"></nav>')

		const current = page('5')
		const place = current.parentElement

		expect(isPage(place)).toBe(true)
		expect(place?.localName).toBe('li')
		expect(place?.classList.contains('so-pagination-item')).toBe(true)
		expect(place?.dataset.selected).toBe('true')
		expect(place?.hasAttribute('aria-current')).toBe(false)
		expect(current.getAttribute('type')).toBe('button')
		expect(current.getAttribute('embedded')).toBe('pagination.page')
		expect(current.getAttribute('aria-current')).toBe('page')
		// Текущая — обычная кнопка: своя остановка Tab
		expect(current.hasAttribute('disabled')).toBe(false)
		expect(findAll('[aria-current]')).toHaveLength(1)
	})

	it('стрелки: имена от локали, type="button", без вида, со значком роли', async () => {
		await mount('<nav is="so-pagination" total="100" value="5"></nav>')

		const prev = find('.so-pagination__prev')
		const next = find('.so-pagination__next')

		expect(prev.getAttribute('aria-label')).toBe('Previous page')
		expect(next.getAttribute('aria-label')).toBe('Next page')
		expect(prev.getAttribute('type')).toBe('button')
		expect(next.getAttribute('type')).toBe('button')
		expect([prev, next].map((arrow) => arrow.getAttribute('embedded'))).toEqual([
			'pagination.prev',
			'pagination.next',
		])
		expect([prev, next].map((arrow) => find('.so-icon', arrow).getAttribute('icon'))).toEqual([
			'arrowRight',
			'arrowRight',
		])
		expect(prev.className).not.toMatch(/--view-/)
	})

	it('имя ряду даёт приложение: aria_label на nav', async () => {
		const root = await mount(
			'<nav is="so-pagination" total="100" aria_label="Страницы результатов"></nav>',
		)

		expect(root.getAttribute('aria-label')).toBe('Страницы результатов')
	})

	it('размер и вариант — у стрелок и страниц', async () => {
		await mount('<nav is="so-pagination" total="30" size="lg" variant="brand"></nav>')

		const buttons = findAll('.so-pagination button')

		expect(buttons).toHaveLength(5)

		for (const button of buttons) {
			expect(button.classList.contains('so-button--size-lg')).toBe(true)
			expect(button.classList.contains('so-button--variant-brand')).toBe(true)
		}
	})

	it('шаблоны объявляют ровно те слоты, что и дескрипторы', () => {
		const owner = document.createElement('nav')
		const item = document.createElement('li')
		const ownerSlots = paginationTemplate.create(owner, bareContext(owner)).slots
		const itemSlots = paginationItemTemplate.create(item, bareContext(item)).slots

		expect(Object.keys(ownerSlots).sort()).toEqual(
			PaginationDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
		expect(ownerSlots['item']?.mode).toBe('sample')
		expect(Object.keys(itemSlots)).toEqual(
			PaginationItemDescriptor().slots.map((slot) => slot.name),
		)
	})
})

describe('нажатия → значение', () => {
	it('нажатие страницы — значение и окно вокруг неё', async () => {
		const root = await mount('<nav is="so-pagination" total="100" value="5"></nav>')

		page('6').click()
		await flush()

		expect(root.value).toBe(6)
		expect(row()).toBe('1 … 5 [6] 7 … 10')

		page('10').click()
		await flush()

		expect(root.value).toBe(10)
		expect(row()).toBe('1 … 6 7 8 9 [10]')
	})

	it('стрелки листают и гаснут на краях', async () => {
		const root = await mount('<nav is="so-pagination" total="30" value="1"></nav>')
		const prev = find('.so-pagination__prev')
		const next = find('.so-pagination__next')

		expect(prev.hasAttribute('disabled')).toBe(true)
		expect(next.hasAttribute('disabled')).toBe(false)

		next.click()
		await flush()

		expect(root.value).toBe(2)
		expect(prev.hasAttribute('disabled')).toBe(false)

		next.click()
		await flush()

		expect(root.value).toBe(3)
		expect(next.hasAttribute('disabled')).toBe(true)
		expect(row()).toBe('1 2 [3]')

		prev.click()
		await flush()

		expect(root.value).toBe(2)
	})

	it('значение свойством — окно вокруг него', async () => {
		const root = await mount('<nav is="so-pagination" total="100" value="1"></nav>')

		root.value = 7
		await flush()

		expect(row()).toBe('1 … 6 [7] 8 9 10')
	})

	it('страница, оставшаяся на экране, — тот же узел, и фокус на ней остаётся', async () => {
		await mount('<nav is="so-pagination" total="100" value="5"></nav>')

		const six = page('6')
		const first = page('1')

		six.focus()
		six.click()
		await flush()

		expect(page('6')).toBe(six)
		expect(page('1')).toBe(first)
		expect(document.activeElement).toBe(six)
	})

	/**
	 * Записи окна — новые на каждую смену, а петля идёт по ключу места: элемент
	 * страницы, оставшейся в окне, тот же, со своей сборкой и своим инстансом.
	 */
	it('сдвиг окна — страницы, оставшиеся в окне, тем же элементом и инстансом', async () => {
		const root = await mount('<nav is="so-pagination" total="100" value="5"></nav>')
		const before = findAll('.so-pagination-item')
		const six = before.find((place) => place.textContent?.trim() === '6') ?? null

		if (!isPage(six)) throw new Error('страницы 6 нет')

		const page = six.ctrl

		root.value = 6
		await flush()

		const after = findAll('.so-pagination-item')

		expect(after.find((place) => place.textContent?.trim() === '6')).toBe(six)
		// Окно `1 … 4 5 6 … 10` → `1 … 5 6 7 … 10`: четыре страницы остались
		expect(after.filter((place) => before.includes(place))).toHaveLength(4)
		expect(six.ctrl).toBe(page)
	})

	it('свой ctrl: значение из кода — окно вокруг него', async () => {
		const ctrl = new TPagination({ total: 100 })

		await mountCtrl(ctrl)

		ctrl.value = 7
		await flush()

		expect(row()).toBe('1 … 6 [7] 8 9 10')
	})

	it('выключенная пагинация — выключены стрелки и страницы', async () => {
		const root = await mount('<nav is="so-pagination" total="100" value="5" disabled></nav>')
		const buttons = findAll('.so-pagination button')

		expect(buttons.length).toBeGreaterThan(2)
		expect(buttons.every((button) => button.hasAttribute('disabled'))).toBe(true)
		expect(root.dataset.disabled).toBe('true')
	})
})

/**
 * Стрелка, погасшая у края под фокусом, отдаёт его текущей странице
 * (`TPaginationFocusPlugin`): выключенная кнопка фокус теряет, и браузер
 * сбросил бы его в начало документа. Узел текущей плагин берёт у реестра узлов
 * страниц — кадром после подключения.
 */
describe('фокус со стрелки, погасшей у края', () => {
	it('«вперёд» у последней страницы — фокус на текущей', async () => {
		await mount('<nav is="so-pagination" total="30" value="2"></nav>')
		await nextFrame()

		const next = find('.so-pagination__next')

		next.focus()
		next.click()
		await flush()

		expect(next.hasAttribute('disabled')).toBe(true)
		expect(document.activeElement).toBe(page('3'))
	})
})

describe('текст и слоты', () => {
	const PAGES = ['Админ', 'Записи', 'Конференция', 'Отчёты', 'Почта', 'Склад', 'Настройки']

	it('текстовые страницы — по порядку списка, value — ключ страницы', async () => {
		// Середина 1: при середине 3 семь страниц видны все, и пропусков нет
		const root = await mount(
			'<nav is="so-pagination" value="reports" middle-count="1"></nav>',
			{
				pages: PAGES.map((text, index) => ({
					text,
					value: index === 3 ? 'reports' : undefined,
				})),
			},
		)

		expect(row()).toBe('Админ … [Отчёты] … Настройки')

		page('Настройки').click()
		await flush()

		// У страницы без своего ключа ключ — её номер
		expect(root.value).toBe(7)
		expect(row()).toBe('Админ … Почта Склад [Настройки]')
	})

	it('образец item — копия в каждую страницу, данные — у страницы', async () => {
		await mount(`<nav is="so-pagination" total="30" value="2">
			<template slot="item"><span class="probe"></span></template>
		</nav>`)

		const probes = findAll('.probe')
		const scope = probes.map((probe) => {
			// Атрибута `is` у страницы нет: её строит код, `createElement` с `is`
			const place = probe.closest('.so-pagination-item')
			const item: IPaginationItem | undefined = isPage(place) ? place.ctrl : undefined

			return [item?.value, item?.text]
		})

		expect(scope).toEqual([
			[1, '1'],
			[2, '2'],
			[3, '3'],
		])
		// Копия — содержимое кнопки страницы, своего текста кнопка не пишет
		expect(probes.map((probe) => probe.closest('button')?.textContent)).toEqual(['', '', ''])
		// Текущую отмечает кнопка, а копия — только её содержимое
		expect(find('[aria-current="page"] .probe')).toBe(probes[1])
	})

	it('пустой образец item — страницы рисуют свой текст', async () => {
		await mount(`<nav is="so-pagination" total="30" value="2">
			<template slot="item"></template>
		</nav>`)

		expect(row()).toBe('1 [2] 3')
	})

	it('слоты значков стрелок — вместо своих иконок', async () => {
		await mount(`<nav is="so-pagination" total="30">
			<i slot="prev-icon" class="probe-prev"></i>
			<i slot="next-icon" class="probe-next"></i>
		</nav>`)

		expect(find('.so-pagination__prev .probe-prev')).toBeTruthy()
		expect(find('.so-pagination__next .probe-next')).toBeTruthy()
		expect(document.querySelector('.so-pagination__prev .so-icon')).toBeNull()
		expect(document.querySelector('.so-pagination__next .so-icon')).toBeNull()
	})

	it('содержимого у пагинации нет: написанное без слота не выводится', async () => {
		await mount('<nav is="so-pagination" total="30"><b class="stray">текст</b></nav>')

		expect(document.querySelector('.stray')).toBeNull()
	})
})

/**
 * Страницу строит шаблон пагинации (`createItem`), а не пишет потребитель: она
 * — разметка пагинации, и её события слышно на самой странице, а до пагинации
 * и выше они не всплывают — как у Vue и React, где событие страницы слышит
 * только разметка пагинации. Нажатую страницу приложению сообщает пагинация —
 * `so:change:value`. Деталью (`embedded`) страница при этом не стала: плагин
 * приложения на страницы ставится, а на кнопку внутри страницы — нет.
 */
describe('события страниц', () => {
	/**
	 * События страницы: сборка и узел, смена текущей (`data-selected` и
	 * `aria-current` — её наборы), выключенность и размер от пагинации, текст
	 * номера от локали.
	 */
	const PAGE_EVENTS = [
		'so:bundle:create',
		'so:element:ready',
		'so:change:dataset',
		'so:change:aria',
		'so:change:disabled',
		'so:change:size',
		'so:change:text',
	] as const

	it('слышны на самой странице, до nav и выше не доходят', async () => {
		const provider = new TLocaleProviderElement()
		const listening = new AbortController()
		const above: string[] = []
		const onPage = new Set<string>()

		provider.innerHTML = '<nav is="so-pagination" total="30" value="1"></nav>'

		const root = paginationOf(provider)

		for (const scope of [root, provider, document]) {
			for (const name of PAGE_EVENTS) {
				scope.addEventListener(
					name,
					({ target }) => {
						if (target instanceof Element && isPage(target)) above.push(name)
					},
					{ signal: listening.signal },
				)
			}
		}

		try {
			document.body.appendChild(provider)

			// Страницы шаблон строит при сборке пагинации, а набор и узел они
			// объявляют позже: микрозадачей и кадром
			const pages = findAll('.so-pagination-item')

			expect(pages).toHaveLength(3)

			for (const place of pages) {
				for (const name of PAGE_EVENTS) place.addEventListener(name, () => onPage.add(name))
			}

			await nextFrame()

			root.value = 2
			await flush()
			root.disabled = true
			await flush()
			root.size = 'lg'
			await flush()
			provider.locale = arEG
			await flush()

			expect([...onPage].sort()).toEqual([...PAGE_EVENTS].sort())
			expect(above).toEqual([])
		} finally {
			listening.abort()
		}
	})

	it('плагин приложения со scope own на страницы ставится, на кнопки страниц — нет', async () => {
		const pages: unknown[] = []
		const buttons: unknown[] = []

		class TPageProbePlugin extends TBasePlugin<TPaginationItem> {
			override install(ctx: IPluginContext, options?: unknown): void {
				super.install(ctx, options)

				pages.push(ctx.getInstance())
			}
		}

		class TButtonProbePlugin extends TBasePlugin<TButton> {
			override install(ctx: IPluginContext, options?: unknown): void {
				super.install(ctx, options)

				buttons.push(ctx.getInstance())
			}
		}

		const disposePages = usePlugins(TPaginationItem, [TPageProbePlugin])
		const disposeButtons = usePlugins(TButton, [TButtonProbePlugin])

		try {
			await mount('<nav is="so-pagination" total="30" value="2"></nav>')

			const drawn = findAll('.so-pagination-item').map((place) =>
				isPage(place) ? place.ctrl : undefined,
			)

			expect(drawn).toHaveLength(3)
			expect(pages).toEqual(drawn)
			// Стрелки и кнопки страниц — детали: плагин приложения на них не встаёт
			expect(buttons).toEqual([])
		} finally {
			disposeButtons()
			disposePages()
		}
	})
})

describe('локаль поддерева', () => {
	it('имена стрелок и цифры номеров — от провайдера, на лету', async () => {
		const provider = new TLocaleProviderElement()

		provider.locale = ruRU
		provider.innerHTML = '<nav is="so-pagination" total="200000" value="12345"></nav>'
		document.body.appendChild(provider)
		await flush()

		expect(find('.so-pagination__prev').getAttribute('aria-label')).toBe('Предыдущая страница')
		expect(find('.so-pagination__next').getAttribute('aria-label')).toBe('Следующая страница')

		const ru = new Intl.NumberFormat('ru-RU')

		expect(row()).toBe(
			['1', '…', ru.format(12_344), `[${ru.format(12_345)}]`, ru.format(12_346), '…'].join(
				' ',
			) + ` ${ru.format(20_000)}`,
		)

		const current = page(ru.format(12_345))

		provider.locale = arEG
		await flush()

		expect(find('.so-pagination__prev').getAttribute('aria-label')).toBe(
			arEG.translations.pagination.prev,
		)
		// Те же страницы, текст — в цифрах новой локали
		expect(page('١٢٬٣٤٥')).toBe(current)
	})
})
