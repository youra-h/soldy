// @vitest-environment jsdom

/**
 * `TToastsFrontPlugin` — высота переднего тоста стопки для CSS общего слоя тем.
 *
 * По переменной `--so-toasts-front-height` на регионе общий слой
 * (`components/toasts.css`) ставит задним тостам стопки высоту переднего, а
 * тема ведёт её переходом. Передний у плагина тот же, что у CSS: тост под
 * фокусом, без фокуса — первый, а за закрытым первым — следующий. Плагин
 * собран настоящим набором, без адаптера: регион, список и тосты тест строит
 * сам, как их рисует разметка, а размер тоста сообщает за браузер
 * (`resize-observer.ts`). Как задние встают высоты переднего в настоящей
 * раскладке, — `playground/vue/browser/toasts.spec.ts` и, без темы,
 * `playground/vue/browser/theme-base-dates.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TToasts } from '@soldy-ui/core'
import type { TToastsLayout } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle } from '@soldy-ui/plugins'
import { TToastsFrontPlugin } from '../setup'
import { expectObserved, resize, stubResizeObserver } from './resize-observer'

const FRONT_HEIGHT = '--so-toasts-front-height'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Записи `MutationObserver` и пересмотр после ухода фокуса приходят микрозадачей. */
const settled = () => new Promise((resolve) => setTimeout(resolve))

const bundles: TPluginBundle[] = []

beforeEach(() => stubResizeObserver())

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	vi.unstubAllGlobals()
	document.body.innerHTML = ''
})

/** Тост, как его рисует разметка: узел под фокус, открытый, со своим текстом. */
function toast(text: string): HTMLElement {
	const node = document.createElement('li')

	node.tabIndex = 0
	node.dataset.open = 'true'
	node.textContent = text

	return node
}

/** Регион тостов с плагином: регион, список и три тоста; узел объявлен. */
async function mount(layout: TToastsLayout) {
	const owner = new TToasts({ layout })
	const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TToastsFrontPlugin)
	const element = bundle.get(TElementPlugin)
	const region = document.createElement('section')
	const list = document.createElement('ol')
	const items = [toast('первый'), toast('второй'), toast('третий')]

	if (!element) throw new Error('TElementPlugin не установлен в bundle')

	bundles.push(bundle)
	list.className = 'so-toasts__list'
	list.append(...items)
	region.append(list)
	document.body.append(region)

	element.element = region
	await nextFrame()

	return { owner, bundle, element, region, list, items }
}

describe('TToastsFrontPlugin', () => {
	it('в стопке меряет первый тост и пишет его высоту на регион', async () => {
		const { region, items } = await mount('cascade')

		expectObserved(items[0])

		resize(items[0], 64)
		expect(region.style.getPropertyValue(FRONT_HEIGHT)).toBe('64px')

		// Задний сменил размер — высота стопки та же
		resize(items[1], 120)
		expect(region.style.getPropertyValue(FRONT_HEIGHT)).toBe('64px')
	})

	it('передний — тост под фокусом, а фокус ушёл из стопки — снова первый', async () => {
		const { region, items } = await mount('cascade')
		const outside = document.createElement('button')

		document.body.append(outside)

		items[2].focus()
		expectObserved(items[2])

		resize(items[2], 90)
		expect(region.style.getPropertyValue(FRONT_HEIGHT)).toBe('90px')

		outside.focus()
		await settled()
		expectObserved(items[0])
	})

	it('закрылся первый — передний следующий: закрытый гаснет, а на его место уже встал он', async () => {
		const { items } = await mount('cascade')

		items[0].dataset.open = 'false'
		await settled()

		expectObserved(items[1])
	})

	it('новый тост в начале списка — передний', async () => {
		const { list } = await mount('cascade')
		const fresh = toast('новый')

		list.prepend(fresh)
		await settled()

		expectObserved(fresh)
	})

	it('в столбце не меряет; стопкой — меряет, снова столбцом — переменной нет', async () => {
		const { owner, region, items } = await mount('list')

		expectObserved()

		owner.layout = 'cascade'
		expectObserved(items[0])

		resize(items[0], 64)
		expect(region.style.getPropertyValue(FRONT_HEIGHT)).toBe('64px')

		owner.layout = 'list'
		expectObserved()
		expect(region.style.getPropertyValue(FRONT_HEIGHT)).toBe('')
	})

	it('узел сняли — наблюдения и переменной нет', async () => {
		const { element, region, items } = await mount('cascade')

		resize(items[0], 64)
		element.element = null

		expectObserved()
		expect(region.style.getPropertyValue(FRONT_HEIGHT)).toBe('')
	})

	it('набор уничтожен — наблюдения и переменной нет', async () => {
		const { bundle, region, items } = await mount('cascade')

		resize(items[0], 64)
		bundle.destroy()

		expectObserved()
		expect(region.style.getPropertyValue(FRONT_HEIGHT)).toBe('')
	})
})
