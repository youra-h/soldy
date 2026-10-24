// @vitest-environment jsdom

/**
 * `TTableHeadPlugin` — высота закреплённой шапки Table для CSS общего слоя тем.
 *
 * По переменной `--so-table-head-height` на корне таблицы общий слой
 * (`components/table.css`) держит фокус в теле ниже закреплённой шапки
 * отступом прокрутки; без неё отступ — строка шапки, и шапка в несколько
 * строк закрывает фокус. Плагин собран настоящим набором, без адаптера:
 * разметку — корень и шапку — тест строит сам, а размер шапки сообщает за
 * браузер (`resize-observer.ts`). Что фокус встаёт ниже шапки в настоящей
 * раскладке, — `playground/vue/browser/table-sticky-head.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TTable } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle } from '@soldy-ui/plugins'
import { TTableHeadPlugin } from '../setup'
import { expectObserved, resize, stubResizeObserver } from './resize-observer'

const HEAD_HEIGHT = '--so-table-head-height'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

const bundles: TPluginBundle[] = []

beforeEach(() => stubResizeObserver())

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	vi.unstubAllGlobals()
	document.body.innerHTML = ''
})

/** Таблица с плагином: корень и шапка — как их рисует разметка; узел объявлен. */
async function mount(stickyHead: boolean) {
	const owner = new TTable({ stickyHead })
	const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TTableHeadPlugin)
	const element = bundle.get(TElementPlugin)
	const root = document.createElement('table')
	const head = document.createElement('thead')

	if (!element) throw new Error('TElementPlugin не установлен в bundle')

	bundles.push(bundle)
	head.className = 'so-table__head'
	root.append(head, document.createElement('tbody'))
	document.body.append(root)

	element.element = root
	await nextFrame()

	return { owner, bundle, element, root, head }
}

describe('TTableHeadPlugin', () => {
	it('пока шапка закреплена, пишет её высоту на корень на каждую смену', async () => {
		const { root, head } = await mount(true)

		expectObserved(head)

		resize(head, 48)
		expect(root.style.getPropertyValue(HEAD_HEIGHT)).toBe('48px')

		// Подписи перенеслись — шапка выросла
		resize(head, 72)
		expect(root.style.getPropertyValue(HEAD_HEIGHT)).toBe('72px')
	})

	it('незакреплённую шапку не меряет; закрепили — меряет, открепили — переменной нет', async () => {
		const { owner, root, head } = await mount(false)

		expectObserved()

		owner.stickyHead = true
		expectObserved(head)

		resize(head, 48)
		expect(root.style.getPropertyValue(HEAD_HEIGHT)).toBe('48px')

		owner.stickyHead = false
		expectObserved()
		expect(root.style.getPropertyValue(HEAD_HEIGHT)).toBe('')
	})

	it('узел сняли — наблюдения и переменной нет', async () => {
		const { element, root, head } = await mount(true)

		resize(head, 48)
		element.element = null

		expectObserved()
		expect(root.style.getPropertyValue(HEAD_HEIGHT)).toBe('')
	})

	it('набор уничтожен — наблюдения и переменной нет', async () => {
		const { bundle, root, head } = await mount(true)

		resize(head, 48)
		bundle.destroy()

		expectObserved()
		expect(root.style.getPropertyValue(HEAD_HEIGHT)).toBe('')
	})
})
