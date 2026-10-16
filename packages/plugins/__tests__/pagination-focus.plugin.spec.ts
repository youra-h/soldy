// @vitest-environment jsdom

/**
 * TPaginationFocusPlugin — фокус со стрелки, погасшей под ним у края, на
 * текущую страницу.
 *
 * Плагины собраны настоящими bundle, как в рантайме, но без адаптера:
 * разметку тест строит сам в том виде, в каком её рисует Vue, — корень, две
 * стрелки по краям и между ними список, где у каждой страницы окна свой узел
 * (`li`, его знает реестр узлов) с кнопкой внутри. Атрибута `disabled` у
 * стрелок никто не ставит: проверка сразу после смены модели — это и есть
 * «раньше, чем разметка выключит стрелку». Перерисовка (`render()`) нужна
 * только тестам, где окно сдвигается.
 *
 * Порядок подписок на пагинацию бывает двух видов, и тесты идут в обоих.
 * Свой движок компонента получает пагинацию после того, как её плагины уже
 * стоят, — расширение `pagination` слышит смену позже плагина. Движок
 * снаружи, собранный вместе с пагинацией, — раньше.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TPagination, createEnginePagination } from '@soldy-ui/core'
import type { IPaginationItem, IPaginationProps } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TPaginationFocusPlugin,
	TPluginBundle,
} from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Плагин, который тест поставил сам: без него дальше проверять нечего. */
function pluginOf<P extends IPlugin<any, any>>(
	bundle: TPluginBundle,
	ctor: IPluginConstructor<any, any, P>,
): P {
	const plugin = bundle.get(ctor)

	if (!plugin) throw new Error(`${ctor.name} не установлен в bundle`)

	return plugin
}

/** Кто из двоих слышит смену пагинации первым. */
type TOrder = 'плагин раньше расширения' | 'расширение раньше плагина'

const ORDERS: readonly TOrder[] = ['плагин раньше расширения', 'расширение раньше плагина']

afterEach(() => {
	document.body.innerHTML = ''
})

async function mountPagination(props: Partial<IPaginationProps>, order: TOrder) {
	const owner = new TPagination(props)
	const pluginFirst = order === 'плагин раньше расширения'
	// Свой движок: пагинацию фасад пишет в него после сборки набора плагинов
	const engine = pluginFirst ? createEnginePagination() : createEnginePagination({ owner })

	const root = document.createElement('nav')
	const prev = document.createElement('button')
	const list = document.createElement('ol')
	const next = document.createElement('button')

	prev.className = 'so-pagination__prev'
	next.className = 'so-pagination__next'
	root.append(prev, list, next)
	document.body.appendChild(root)

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TPaginationFocusPlugin)

	if (pluginFirst) engine.options.set({ owner })

	const bundles = pluginOf(bundle, TCollectionBundlesPlugin)
	const nodes = new Map<IPaginationItem, HTMLLIElement>()

	/**
	 * Разметка по коллекции, как её рисует фреймворк: узел страницы,
	 * оставшейся в окне, — тот же, новой — новый, ушедшей — долой.
	 */
	const render = (): void => {
		const items = engine.extensions.batch.items

		for (const [item, node] of nodes) {
			if (items.includes(item)) continue

			node.remove()
			nodes.delete(item)
		}

		for (const item of items) {
			if (nodes.has(item)) continue

			const node = document.createElement('li')
			const button = document.createElement('button')

			button.textContent = item.text
			node.appendChild(button)
			list.appendChild(node)
			nodes.set(item, node)

			const itemBundle = new TPluginBundle(item).use(TElementPlugin)

			bundles.register(itemBundle, item)
			pluginOf(itemBundle, TElementPlugin).element = node
		}
	}

	bundles.bindEngine(engine)
	render()

	const rootElement = pluginOf(bundle, TElementPlugin)

	rootElement.element = root
	await nextFrame()

	/** Кнопка страницы по её тексту; нет её — тест падает здесь. */
	const page = (text: string): HTMLButtonElement => {
		const found = [...list.querySelectorAll('button')].find(
			(button) => button.textContent === text,
		)

		if (!found) throw new Error(`страницы «${text}» нет`)

		return found
	}

	return { owner, bundle, rootElement, prev, next, page, render }
}

describe.each(ORDERS)('%s', (order) => {
	describe('стрелка погасла у края под фокусом — фокус на текущую страницу', () => {
		it('«вперёд» у предпоследней', async () => {
			const { owner, next, page } = await mountPagination({ total: 30, value: 2 }, order)

			next.focus()
			owner.next()

			expect(owner.nextDisabled).toBe(true)
			expect(document.activeElement).toBe(page('3'))
		})

		it('«назад» у второй', async () => {
			const { owner, prev, page } = await mountPagination({ total: 30, value: 2 }, order)

			prev.focus()
			owner.prev()

			expect(owner.prevDisabled).toBe(true)
			expect(document.activeElement).toBe(page('1'))
		})

		it('погасла от данных: страниц стало меньше, текущая — последняя', async () => {
			const { owner, next, page } = await mountPagination({ total: 50, value: 3 }, order)

			next.focus()
			owner.total = 30

			expect(owner.nextDisabled).toBe(true)
			expect(document.activeElement).toBe(page('3'))
		})

		it('погасла от размера страницы', async () => {
			const { owner, next, page } = await mountPagination({ total: 50, value: 3 }, order)

			next.focus()
			owner.pageSize = 20

			expect(owner.nextDisabled).toBe(true)
			expect(document.activeElement).toBe(page('3'))
		})

		it('погасла от списка страниц: текущая стала последней', async () => {
			const { owner, prev, page } = await mountPagination(
				{ pages: ['Админ', 'Записи', 'Конференция'].map((text) => ({ text })), value: 2 },
				order,
			)

			prev.focus()
			owner.pages = ['Записи', 'Конференция'].map((text, index) => ({
				text,
				value: index + 2,
			}))

			expect(owner.prevDisabled).toBe(true)
			expect(document.activeElement).toBe(page('Записи'))
		})
	})

	describe('фокус остаётся, где был', () => {
		it('стрелка не погасла: листание не у края', async () => {
			const { owner, next } = await mountPagination({ total: 100, value: 5 }, order)

			next.focus()
			owner.next()

			expect(owner.value).toBe(6)
			expect(document.activeElement).toBe(next)
		})

		it('фокус не на стрелке', async () => {
			const { owner, page } = await mountPagination({ total: 30, value: 2 }, order)
			const two = page('2')

			two.focus()
			owner.next()

			expect(owner.nextDisabled).toBe(true)
			expect(document.activeElement).toBe(two)
		})

		it('на стрелке чужого корня', async () => {
			const { owner } = await mountPagination({ total: 30, value: 2 }, order)
			const foreign = document.createElement('button')

			foreign.className = 'so-pagination__next'
			document.body.appendChild(foreign)

			foreign.focus()
			owner.next()

			expect(owner.nextDisabled).toBe(true)
			expect(document.activeElement).toBe(foreign)
		})

		it('пагинация выключена: остановок нет', async () => {
			const { owner, next } = await mountPagination({ total: 30, value: 2 }, order)

			next.focus()
			owner.disabled = true
			owner.value = 3

			expect(document.activeElement).toBe(next)
		})

		it('ключ без страницы: текущей нет', async () => {
			const { owner, next } = await mountPagination({ total: 30, value: 2 }, order)

			next.focus()
			owner.value = 7

			expect(owner.nextDisabled).toBe(true)
			expect(document.activeElement).toBe(next)
		})

		/**
		 * При `middleCount` 0 текущая между краями не видна: страница 3 входит в
		 * окно, только став последней, и узла у неё ещё нет.
		 */
		it('у текущей ещё нет узла: она только вошла в окно', async () => {
			const { owner, next, render, page } = await mountPagination(
				{ total: 50, value: 3, middleCount: 0 },
				order,
			)

			next.focus()
			owner.total = 30

			expect(owner.nextDisabled).toBe(true)
			expect(document.activeElement).toBe(next)

			render()

			// Узел появился, а фокус плагин не догоняет: это уже не стрелкой до края
			expect(page('3').isConnected).toBe(true)
			expect(document.activeElement).toBe(next)
		})

		it('корень снят', async () => {
			const { owner, next, rootElement } = await mountPagination(
				{ total: 30, value: 2 },
				order,
			)

			rootElement.element = null
			next.focus()
			owner.next()

			expect(document.activeElement).toBe(next)
		})

		it('плагин уничтожен', async () => {
			const { owner, next, bundle } = await mountPagination({ total: 30, value: 2 }, order)

			bundle.destroy()
			next.focus()
			owner.next()

			expect(document.activeElement).toBe(next)
		})
	})
})
