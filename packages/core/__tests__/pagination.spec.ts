/**
 * Pagination: окно страниц на активации коллекции.
 *
 * Ядро держит три вещи: какие страницы видны (окно — первая, середина вокруг
 * текущей, последняя и пропуски), какая из них текущая и связь текущей со
 * значением пагинации в обе стороны. Окно считают чистые функции
 * (`window.ts`), в коллекцию его кладёт расширение `pagination`, текущая —
 * активация коллекции.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	TItemContextRegistry,
	TPagination,
	TPaginationCollectionFacade,
	TPaginationItem,
	createEnginePagination,
} from '../src'
import type { IPaginationItem, IPaginationProps, TPaginationPage } from '../src'
import {
	middleOf,
	pageCount,
	pageKey,
	pageNumber,
	pagePosition,
	pageWindow,
	samePages,
} from '../src/components/custom/pagination/window'

/** Пагинация с коллекцией — так её собирает разметка. */
function createPagination(props: Partial<IPaginationProps> = {}) {
	const owner = new TPagination(props)
	const facade = new TPaginationCollectionFacade({}, { owner })
	const registry = new TItemContextRegistry(facade.engine.getCore())

	/** Нажать страницу с текстом `text` — как её кнопка в разметке. */
	const press = (text: string) => {
		const page = pageOf(facade, text)

		registry.get(page).adapters.activation.active = true
	}

	return { owner, facade, press }
}

/** Страница окна по тексту. */
function pageOf(facade: TPaginationCollectionFacade, text: string): IPaginationItem {
	const cell = facade.cells.find((entry) => entry.kind === 'item' && entry.item.text === text)

	if (cell?.kind !== 'item') throw new Error(`страницы «${text}» в окне нет`)

	return cell.item
}

/**
 * Окно строкой, как его видит пользователь: текущая — в скобках. Текущую
 * отмечают два набора, и строка сверяет оба: `aria-current` для скринридера,
 * `data-selected` для темы.
 */
function windowOf(facade: TPaginationCollectionFacade): string {
	return facade.cells
		.map((cell) => {
			if (cell.kind === 'ellipsis') return '…'

			const current = cell.item.aria.get('aria-current') === 'page'
			const selected = cell.item.dataset.get('selected') === 'true'

			if (current !== selected)
				throw new Error(`страница ${cell.item.text}: наборы разошлись`)

			return current ? `[${cell.item.text}]` : cell.item.text
		})
		.join(' ')
}

describe('TPagination (чистый класс)', () => {
	it('корень — nav, класс so-pagination, первая страница по умолчанию', () => {
		const owner = new TPagination()

		expect(owner.tag).toBe('nav')
		expect(owner.classes.toArray()).toContain('so-pagination')
		expect(owner.value).toBe(1)
		expect(owner.total).toBe(0)
		expect(owner.pageSize).toBe(10)
		expect(owner.middleCount).toBe(3)
		expect(owner.pages).toBeUndefined()
		expect(owner.locale).toBe('en-US')
	})

	it('стрелки: на краях и без текущей страницы — выключены', () => {
		const owner = new TPagination({ total: 30, pageSize: 10 })

		expect(owner.prevDisabled).toBe(true)
		expect(owner.nextDisabled).toBe(false)

		owner.value = 2

		expect(owner.prevDisabled).toBe(false)
		expect(owner.nextDisabled).toBe(false)

		owner.value = 3

		expect(owner.prevDisabled).toBe(false)
		expect(owner.nextDisabled).toBe(true)

		// Страницы со значением нет — листать не от чего
		owner.value = 7

		expect(owner.prevDisabled).toBe(true)
		expect(owner.nextDisabled).toBe(true)
	})

	it('выключенная пагинация — обе стрелки выключены, prev и next ничего не делают', () => {
		const owner = new TPagination({ total: 30, pageSize: 10, value: 2, disabled: true })

		expect(owner.prevDisabled).toBe(true)
		expect(owner.nextDisabled).toBe(true)

		owner.prev()
		owner.next()

		expect(owner.value).toBe(2)
	})

	it('prev и next пишут значение — ключ соседней страницы', () => {
		const owner = new TPagination({ total: 30, pageSize: 10 })
		const onValue = vi.fn()

		owner.events.on('change:value', onValue)

		owner.next()
		owner.next()
		owner.next()

		expect(owner.value).toBe(3)
		expect(onValue).toHaveBeenCalledTimes(2)

		owner.prev()

		expect(owner.value).toBe(2)
	})

	it('у текстовой пагинации стрелки ведут по ключам страниц', () => {
		const owner = new TPagination({
			pages: [
				{ text: 'Админ', value: 'admin' },
				{ text: 'Записи' },
				{ text: 'Отчёты', value: 'reports' },
			],
			value: 'admin',
		})

		owner.next()

		// У страницы без своего ключа ключ — её номер
		expect(owner.value).toBe(2)

		owner.next()

		expect(owner.value).toBe('reports')
		expect(owner.nextDisabled).toBe(true)
	})

	it('pages сверяются по тексту и ключу, а не по ссылке', () => {
		const owner = new TPagination({ pages: [{ text: 'А', value: 'a' }] })
		const onPages = vi.fn()

		owner.events.on('change:pages', onPages)

		owner.pages = [{ text: 'А', value: 'a' }]

		expect(onPages).not.toHaveBeenCalled()

		owner.pages = [{ text: 'А', value: 'b' }]
		owner.pages = undefined

		expect(onPages).toHaveBeenCalledTimes(2)
	})

	it('наборы стрелок живые: запись сообщает change:prevAria и change:nextAria', () => {
		const owner = new TPagination()
		const onPrev = vi.fn()
		const onNext = vi.fn()

		owner.events.on('change:prevAria', onPrev)
		owner.events.on('change:nextAria', onNext)

		owner.prevAria.add('aria-label', 'Назад')
		owner.nextAria.add('aria-label', 'Вперёд')

		expect(onPrev).toHaveBeenCalledWith({ 'aria-label': 'Назад' })
		expect(onNext).toHaveBeenCalledWith({ 'aria-label': 'Вперёд' })
	})

	it('getProps отдаёт свои входы', () => {
		const pages: TPaginationPage[] = [{ text: 'А' }]
		const owner = new TPagination({ total: 5, pageSize: 2, middleCount: 1, pages })

		expect(owner.getProps()).toMatchObject({ total: 5, pageSize: 2, middleCount: 1, pages })
	})
})

describe('TPaginationItem (чистый класс)', () => {
	it('корень — li, aria — на вложенной кнопке', () => {
		const item = new TPaginationItem({ value: 3, text: '3', disabled: true })

		expect(item.tag).toBe('li')
		expect(item.classes.toArray()).toContain('so-pagination-item')
		expect(item.value).toBe(3)
		expect(item.text).toBe('3')
		// У кнопки свой нативный `disabled`: дубля в `aria` нет, тема читает dataset
		expect(item.aria.has('aria-disabled')).toBe(false)
		expect(item.attrs.has('disabled')).toBe(false)
		expect(item.dataset.get('disabled')).toBe('true')
	})
})

describe('окно — чистые функции', () => {
	const numeric = (total: number, pageSize = 1) => ({ total, pageSize, pages: undefined })

	/** Окно строкой: номера и пропуски. */
	const plan = (count: number, position: number, middle: number) =>
		pageWindow(count, position, middle)
			.map((entry) => (entry.kind === 'page' ? String(entry.position) : '…'))
			.join(' ')

	it('примеры владельца и дизайнера', () => {
		expect(plan(10, 5, 3)).toBe('1 … 4 5 6 … 10')
		expect(plan(10, 5, 5)).toBe('1 … 3 4 5 6 7 … 10')
		expect(plan(10, 1, 3)).toBe('1 2 3 4 … 10')
		expect(plan(10, 2, 3)).toBe('1 2 3 4 … 10')
		expect(plan(10, 10, 3)).toBe('1 … 7 8 9 10')
		expect(plan(5, 3, 3)).toBe('1 2 3 4 5')
		expect(plan(1, 1, 3)).toBe('1')
		expect(plan(10, 5, 0)).toBe('1 … 10')
	})

	it('пропуск — на месте любых пропущенных страниц, даже одной', () => {
		expect(plan(10, 4, 3)).toBe('1 … 3 4 5 … 10')
		expect(plan(7, 4, 3)).toBe('1 … 3 4 5 … 7')
		expect(plan(6, 4, 3)).toBe('1 … 3 4 5 6')
	})

	it('чётной середине лишнее место — после текущей', () => {
		expect(plan(10, 5, 4)).toBe('1 … 4 5 6 7 … 10')
		expect(plan(10, 5, 2)).toBe('1 … 5 6 … 10')
		expect(plan(10, 5, 1)).toBe('1 … 5 … 10')
	})

	it('середина прижата к 0…страниц − 2', () => {
		expect(middleOf(10, -2)).toBe(0)
		expect(middleOf(10, 100)).toBe(8)
		expect(middleOf(10, Infinity)).toBe(8)
		expect(middleOf(10, Number.NaN)).toBe(0)
		expect(middleOf(10, 2.7)).toBe(2)
		expect(middleOf(2, 3)).toBe(0)
		expect(middleOf(1, 3)).toBe(0)

		expect(plan(10, 5, -1)).toBe('1 … 10')
		expect(plan(10, 5, 100)).toBe('1 2 3 4 5 6 7 8 9 10')
	})

	it('одна и две страницы — без середины', () => {
		expect(plan(1, 1, 5)).toBe('1')
		expect(plan(2, 1, 5)).toBe('1 2')
		expect(plan(2, 2, 5)).toBe('1 2')
		expect(plan(0, 1, 3)).toBe('')
	})

	it('текущей страницы нет — окно с начала', () => {
		expect(plan(10, 0, 3)).toBe('1 2 3 4 … 10')
		expect(plan(10, 42, 3)).toBe('1 2 3 4 … 10')
	})

	it('число страниц — ⌈total / pageSize⌉, но не меньше одной', () => {
		expect(pageCount(numeric(95, 10))).toBe(10)
		expect(pageCount(numeric(100, 10))).toBe(10)
		expect(pageCount(numeric(101, 10))).toBe(11)
		expect(pageCount(numeric(0, 10))).toBe(1)
		expect(pageCount(numeric(-5, 10))).toBe(1)
		expect(pageCount(numeric(Number.NaN, 10))).toBe(1)
		expect(pageCount(numeric(50, 0))).toBe(1)
		expect(pageCount(numeric(500_000, 10))).toBe(50_000)
		expect(pageCount({ total: 100, pageSize: 10, pages: [] })).toBe(0)
		expect(pageCount({ total: 100, pageSize: 10, pages: [{ text: 'А' }] })).toBe(1)
	})

	it('ключ по месту и место по ключу', () => {
		const pages = { total: 0, pageSize: 10, pages: [{ text: 'А', value: 'a' }, { text: 'Б' }] }

		expect(pageKey(numeric(30, 10), 2)).toBe(2)
		expect(pageKey(numeric(30, 10), 4)).toBeUndefined()
		expect(pageKey(pages, 1)).toBe('a')
		expect(pageKey(pages, 2)).toBe(2)
		expect(pageKey(pages, 3)).toBeUndefined()

		expect(pagePosition(numeric(30, 10), 3)).toBe(3)
		expect(pagePosition(numeric(30, 10), 4)).toBe(0)
		// Ключ сверяется строго: строка — не номер
		expect(pagePosition(numeric(30, 10), '3')).toBe(0)
		expect(pagePosition(numeric(30, 10), 1.5)).toBe(0)
		expect(pagePosition(pages, 'a')).toBe(1)
		expect(pagePosition(pages, 2)).toBe(2)
		expect(pagePosition(pages, 1)).toBe(0)
	})

	it('страницы сверяются по тексту и ключу', () => {
		expect(samePages(undefined, undefined)).toBe(true)
		expect(samePages([{ text: 'А' }], [{ text: 'А' }])).toBe(true)
		expect(samePages([{ text: 'А' }], [{ text: 'А', value: 1 }])).toBe(false)
		expect(samePages([{ text: 'А' }], undefined)).toBe(false)
		expect(samePages([], undefined)).toBe(false)
	})

	it('номер — в цифрах и с разрядами локали', () => {
		expect(pageNumber(12345, 'en-US')).toBe(new Intl.NumberFormat('en-US').format(12345))
		expect(pageNumber(12345, 'ru-RU')).toBe(new Intl.NumberFormat('ru-RU').format(12345))
		expect(pageNumber(12345, 'ru-RU')).toMatch(/^12\s345$/)
		expect(pageNumber(5, 'ar-EG')).toBe('٥')
		// Невалидный тег — английский, а не исключение
		expect(pageNumber(1234, 'not a tag')).toBe('1,234')
	})
})

describe('окно в коллекции', () => {
	it('коллекция — только страницы окна', () => {
		const { facade } = createPagination({ total: 100, pageSize: 10, value: 5 })

		expect(windowOf(facade)).toBe('1 … 4 [5] 6 … 10')
		expect(facade.items).toHaveLength(5)
	})

	it('50 000 страниц — в коллекции середина + 2', () => {
		const { owner, facade } = createPagination({ total: 500_000, pageSize: 10, value: 25_000 })

		expect(facade.items).toHaveLength(5)
		expect(windowOf(facade)).toBe('1 … 24,999 [25,000] 25,001 … 50,000')

		owner.middleCount = 7

		expect(facade.items).toHaveLength(9)
	})

	it('страница, оставшаяся на экране, — тот же экземпляр', () => {
		const { owner, facade } = createPagination({ total: 100, pageSize: 10, value: 5 })
		const first = pageOf(facade, '1')
		const six = pageOf(facade, '6')
		const last = pageOf(facade, '10')

		owner.value = 6

		expect(windowOf(facade)).toBe('1 … 5 [6] 7 … 10')
		expect(pageOf(facade, '1')).toBe(first)
		expect(pageOf(facade, '6')).toBe(six)
		expect(pageOf(facade, '10')).toBe(last)
	})

	it('ключ пропуска — страница за ним, с минусом; страницы — uid', () => {
		const { facade } = createPagination({ total: 100, pageSize: 10, value: 5 })
		const [first, gap, four] = facade.cells

		expect(first).toMatchObject({ kind: 'item', key: pageOf(facade, '1').uid })
		expect(gap).toEqual({ kind: 'ellipsis', key: -pageOf(facade, '4').uid })
		expect(four).toMatchObject({ kind: 'item', key: pageOf(facade, '4').uid })
		expect(new Set(facade.cells.map((cell) => cell.key)).size).toBe(facade.cells.length)
	})

	it('change:cells — только на смену окна', () => {
		const { owner, facade } = createPagination({ total: 100, pageSize: 10, value: 1 })
		const onCells = vi.fn()

		facade.events.on('change:cells', onCells)

		// Окно у края то же: `1 2 3 4 … 10`
		owner.value = 2

		expect(onCells).not.toHaveBeenCalled()

		owner.value = 5

		expect(onCells).toHaveBeenCalledTimes(1)
	})

	it('смена числа страниц, середины и списка — окно заново', () => {
		const { owner, facade } = createPagination({ total: 100, pageSize: 10, value: 5 })

		owner.middleCount = 5

		expect(windowOf(facade)).toBe('1 … 3 4 [5] 6 7 … 10')

		owner.pageSize = 50

		// Страницы 5 больше нет: текущей нет, значение остаётся
		expect(windowOf(facade)).toBe('1 2')
		expect(owner.value).toBe(5)

		owner.total = 1000

		expect(windowOf(facade)).toBe('1 … 3 4 [5] 6 7 … 20')
	})

	it('текстовая пагинация — страницы из списка по порядку', () => {
		const pages = ['Админ', 'Записи', 'Конференция', 'Отчёты', 'Почта', 'Склад', 'Настройки']
		const { owner, facade, press } = createPagination({
			pages: pages.map((text) => ({ text, value: text.toLowerCase() })),
			value: 'отчёты',
		})

		expect(windowOf(facade)).toBe('Админ … Конференция [Отчёты] Почта … Настройки')

		press('Почта')

		expect(owner.value).toBe('почта')
		expect(windowOf(facade)).toBe('Админ … Отчёты [Почта] Склад Настройки')
	})

	it('пустой список страниц — ни одной страницы, стрелки выключены', () => {
		const { owner, facade } = createPagination({ pages: [] })

		expect(facade.cells).toEqual([])
		expect(facade.items).toHaveLength(0)
		expect(owner.prevDisabled).toBe(true)
		expect(owner.nextDisabled).toBe(true)
	})

	it('номер — в цифрах локали, смена локали переписывает текст тех же страниц', () => {
		const { owner, facade } = createPagination({ total: 200_000, pageSize: 10, value: 12_345 })
		const current = pageOf(facade, '12,345')

		owner.locale = 'ru-RU'

		expect(current.text).toBe(new Intl.NumberFormat('ru-RU').format(12_345))
		expect(pageOf(facade, current.text)).toBe(current)

		owner.locale = 'ar-EG'

		expect(windowOf(facade)).toBe(
			['١', '…', '١٢٬٣٤٤', '[١٢٬٣٤٥]', '١٢٬٣٤٦', '…', '٢٠٬٠٠٠'].join(' '),
		)
	})

	it('без пагинации окна нет', () => {
		const engine = createEnginePagination()

		expect(engine.extensions.pagination.cells).toEqual([])

		const owner = new TPagination({ total: 30, pageSize: 10 })

		engine.options.set({ owner })

		expect(engine.extensions.pagination.cells).toHaveLength(3)

		engine.options.set({ owner: undefined })

		expect(engine.extensions.pagination.cells).toEqual([])
	})
})

describe('текущая страница ⇄ value', () => {
	it('нажатие делает страницу текущей и пишет value', () => {
		const { owner, facade, press } = createPagination({ total: 100, pageSize: 10, value: 5 })
		const onValue = vi.fn()

		owner.events.on('change:value', onValue)

		press('6')

		expect(owner.value).toBe(6)
		expect(onValue).toHaveBeenCalledTimes(1)
		expect(windowOf(facade)).toBe('1 … 5 [6] 7 … 10')

		press('10')

		expect(owner.value).toBe(10)
		expect(windowOf(facade)).toBe('1 … 7 8 9 [10]')
	})

	it('value из кода — окно вокруг него, его страница текущая', () => {
		const { owner, facade } = createPagination({ total: 100, pageSize: 10 })

		expect(windowOf(facade)).toBe('[1] 2 3 4 … 10')

		owner.value = 7

		expect(windowOf(facade)).toBe('1 … 6 [7] 8 … 10')
		expect(facade.activeItem?.value).toBe(7)

		owner.next()

		expect(windowOf(facade)).toBe('1 … 7 [8] 9 10')
	})

	it('aria-current — только у текущей', () => {
		const { facade, press } = createPagination({ total: 100, pageSize: 10, value: 5 })

		press('4')

		const current = facade.cells.flatMap((cell) =>
			cell.kind === 'item' && cell.item.aria.has('aria-current') ? [cell.item.text] : [],
		)

		expect(current).toEqual(['4'])
	})

	it('значение без страницы остаётся: текущей нет, окно с начала', () => {
		const { owner, facade } = createPagination({ total: 100, pageSize: 10, value: 5 })

		owner.total = 0

		expect(owner.value).toBe(5)
		expect(windowOf(facade)).toBe('1')
		expect(facade.activeItem).toBeUndefined()

		// Данные приехали — страница значения снова текущая
		owner.total = 100

		expect(windowOf(facade)).toBe('1 … 4 [5] 6 … 10')
	})

	it('значение из нескольких мест сразу: страница ушла из окна — value не трогается', () => {
		const { owner, facade } = createPagination({ total: 100, pageSize: 10, value: 5 })
		const onValue = vi.fn()

		owner.events.on('change:value', onValue)

		// Середина 0: текущая между первой и последней не видна
		owner.middleCount = 0

		expect(windowOf(facade)).toBe('1 … 10')
		expect(owner.value).toBe(5)
		expect(onValue).not.toHaveBeenCalled()
	})

	it('текущую, снятую на месте кодом, возвращает значение', () => {
		const { owner, facade } = createPagination({ total: 100, pageSize: 10, value: 5 })

		facade.extensions.activation.deactivate(pageOf(facade, '5'))

		expect(owner.value).toBe(5)
		expect(windowOf(facade)).toBe('1 … 4 [5] 6 … 10')
	})

	it('выключенная пагинация выключает страницы, включённая — включает', () => {
		const { owner, facade } = createPagination({ total: 100, pageSize: 10, disabled: true })
		const disabled = () => facade.items.map((item) => item.disabled)

		expect(disabled().every(Boolean)).toBe(true)

		owner.disabled = false

		expect(disabled().some(Boolean)).toBe(false)

		owner.disabled = true
		owner.value = 5

		// Страницы, пришедшие в окно позже, — тоже выключены
		expect(disabled().every(Boolean)).toBe(true)
	})

	it('размер и вариант страниц — пагинации', () => {
		const { owner, facade } = createPagination({ total: 100, pageSize: 10, size: 'lg' })

		expect(facade.items.every((item) => item.size === 'lg')).toBe(true)

		owner.size = 'sm'
		owner.value = 5

		expect(facade.items.every((item) => item.size === 'sm')).toBe(true)
	})
})

describe('отмены не разводят value и текущую', () => {
	it('отменили страницу в item:activate:before — нажатие ничего не меняет', () => {
		const { owner, facade, press } = createPagination({ total: 100, pageSize: 10, value: 5 })

		facade.extensions.activation.events.on('item:activate:before', (e) => {
			if (e.item.value === 6) e.preventDefault()
		})

		press('6')

		expect(owner.value).toBe(5)
		expect(windowOf(facade)).toBe('1 … 4 [5] 6 … 10')
	})

	it('отменили страницу значения из кода — значение возвращается к прежнему', () => {
		const { owner, facade } = createPagination({ total: 100, pageSize: 10, value: 5 })
		const values: unknown[] = []

		owner.events.on('change:value', ({ newValue }) => values.push(newValue))
		facade.extensions.activation.events.on('item:activate:before', (e) => {
			if (e.item.value === 9) e.preventDefault()
		})

		// Страница 9 далеко: прежняя текущая ушла из окна вместе со сдвигом.
		// Возврат пишется из обработчика записи, и подписчик, вставший после
		// расширения, видит его раньше самой записи; итог — прежнее значение
		owner.value = 9

		expect(owner.value).toBe(5)
		expect([...values].sort()).toEqual([5, 9])
		expect(windowOf(facade)).toBe('1 … 4 [5] 6 … 10')
	})

	it('отменили запись value — текущей остаётся страница значения', () => {
		const { owner, facade, press } = createPagination({ total: 100, pageSize: 10, value: 5 })

		owner.events.on('change:value:before', (e) => e.preventDefault())

		press('6')

		expect(owner.value).toBe(5)
		expect(windowOf(facade)).toBe('1 … 4 [5] 6 … 10')
	})

	it('поправили запись value — окно и текущая — по поправленному', () => {
		const { owner, facade, press } = createPagination({ total: 100, pageSize: 10, value: 5 })

		owner.events.on('change:value:before', (e) => {
			if (e.value === 6) e.value = 8
		})

		press('6')

		expect(owner.value).toBe(8)
		expect(windowOf(facade)).toBe('1 … 7 [8] 9 10')
	})
})

describe('движок снаружи', () => {
	it('createEnginePagination с пагинацией — окно сразу', () => {
		const owner = new TPagination({ total: 30, pageSize: 10, value: 2 })
		const engine = createEnginePagination({ owner })

		expect(engine.extensions.batch.items.map((item) => item.value)).toEqual([1, 2, 3])
		expect(engine.extensions.activation.activeItem?.value).toBe(2)
	})

	it('фасад над движком снаружи — то же окно', () => {
		const owner = new TPagination({ total: 100, pageSize: 10, value: 5 })
		const engine = createEnginePagination()
		const facade = new TPaginationCollectionFacade({}, { owner, engine })

		// Чужой движок фасад привязывает при принятии компонента
		facade.bindOwner()

		expect(windowOf(facade)).toBe('1 … 4 [5] 6 … 10')
	})
})
