// @vitest-environment jsdom

/**
 * `TListHeightPlugin` — единственное списочное свойство, которому нужен плагин.
 *
 * `contentFit` ядро применяет само (`data-*`), `scrollBehavior` только читают,
 * а `maxRows` требует измерений: высоту строк без DOM не узнать.
 *
 * Само свойство лежит на инстансе — плагин его читает и подписан на
 * `change:maxRows`. Проверяется здесь и это тоже: попытка отдать свойство
 * плагину сделала ядро несамодостаточным, и мы её откатили.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { createPluginContext, installResizeObserverStub, observerCount } from './helpers'
import { TListBox, TListBoxItem, TListBoxCollectionFacade } from '@soldy/core'
import type { IListBoxItem } from '@soldy/core'
import {
	TListHeightPlugin,
	TElementPlugin,
	TCollectionElements,
	TCollectionBundlesPlugin,
	TPluginBundle,
} from '@soldy/plugins'

const ROW_HEIGHT = 20
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

beforeEach(installResizeObserverStub)

afterEach(() => {
	document.body.innerHTML = ''
})

/**
 * Собирает список без адаптера фреймворка.
 *
 * Корень компонента и панель со списком — **разные узлы и не вложены**: так
 * устроен Select, у которого корень это поле, а список лежит в
 * телепортированной панели.
 */
async function setup(rows: number, maxRows: number, panelStyle?: Partial<CSSStyleDeclaration>) {
	const owner = new TListBox({ maxRows })
	const facade = new TListBoxCollectionFacade({}, { owner })
	const items = Array.from(
		{ length: rows },
		(_, i) => new TListBoxItem({ value: `i${i}`, text: `Item ${i}` }),
	)

	facade.items = items as IListBoxItem[]

	const root = document.createElement('div')
	const panel = document.createElement('div')

	if (panelStyle) {
		Object.assign(panel.style, panelStyle)
	}

	document.body.append(root, panel)

	const rootElement = new TElementPlugin()
	const bundles = new TCollectionBundlesPlugin()
	const elements = new TCollectionElements()
	const height = new TListHeightPlugin()

	const ctx = createPluginContext(owner, [rootElement, bundles, elements])

	bundles.install(ctx)
	elements.install(ctx)
	height.install(ctx)

	for (const item of items) {
		const bundle = new TPluginBundle(item)

		bundle.use(TElementPlugin)
		bundles.register(bundle, item)

		const element = document.createElement('div')

		// jsdom не считает раскладку — высоту строки задаём сами
		Object.defineProperty(element, 'offsetHeight', { value: ROW_HEIGHT })
		panel.appendChild(element)
		;(bundle.get(TElementPlugin) as TElementPlugin).element = element
	}

	bundles.bindEngine(facade.engine)

	rootElement.element = root
	await nextFrame()
	await nextFrame()

	return { root, panel, owner, rootElement }
}

describe('высота контейнера по maxRows', () => {
	/**
	 * Ограничивается **родитель элементов**, а не корень компонента. Для ListBox
	 * это одно и то же, для Select — нет; пока плагин писал в корень, поле
	 * получало `max-height` и схлопывалось в полосу.
	 */
	it('высоту получает панель, а не корень компонента', async () => {
		const { root, panel } = await setup(4, 2)

		expect(panel.style.maxHeight).toBe(`${2 * ROW_HEIGHT}px`)
		expect(root.style.maxHeight).toBe('')
	})

	it('строк меньше лимита — прокрутки нет', async () => {
		const { panel } = await setup(2, 5)

		expect(panel.style.maxHeight).toBe(`${2 * ROW_HEIGHT}px`)
		expect(panel.style.overflowY).toBe('hidden')
	})

	/**
	 * `0` — «предела нет», и плагин обязан **ничего не писать**, а не выставить
	 * предел по содержимому. У Select потолок панели задаёт тема
	 * (`.s-select__list { max-h-64 }`), а инлайновый стиль класс перебивает:
	 * список из сотни опций разворачивался бы во весь экран без прокрутки.
	 */
	it('maxRows = 0 предела не ставит — потолок остаётся за темой', async () => {
		const { panel } = await setup(3, 0)

		expect(panel.style.maxHeight).toBe('')
		expect(panel.style.overflowY).toBe('')
	})

	/** Свойство живёт на инстансе — плагин следит за ним, а не владеет им. */
	it('смена maxRows у компонента пересчитывает предел', async () => {
		const { panel, owner } = await setup(4, 2)

		owner.maxRows = 3
		await nextFrame()
		await nextFrame()

		expect(panel.style.maxHeight).toBe(`${3 * ROW_HEIGHT}px`)
	})

	/**
	 * `max-height` пишется в контейнер с `box-sizing: border-box` — тема
	 * добавила вертикальные паддинги (`.s-list-box`/`.s-select__list`), и без
	 * компенсации последняя строка обрезалась бы.
	 */
	it('border-box: паддинги и рамка контейнера входят в предел', async () => {
		const { panel } = await setup(4, 2, {
			boxSizing: 'border-box',
			paddingTop: '4px',
			paddingBottom: '4px',
			borderTopWidth: '1px',
			borderBottomWidth: '1px',
			borderTopStyle: 'solid',
			borderBottomStyle: 'solid',
		})

		expect(panel.style.maxHeight).toBe(`${2 * ROW_HEIGHT + 4 + 4 + 1 + 1}px`)
	})

	it('border-box: строк меньше лимита — тот же запас, ничего не обрезано', async () => {
		const { panel } = await setup(2, 5, {
			boxSizing: 'border-box',
			paddingTop: '4px',
			paddingBottom: '4px',
		})

		expect(panel.style.maxHeight).toBe(`${2 * ROW_HEIGHT + 4 + 4}px`)
		expect(panel.style.overflowY).toBe('hidden')
	})
})

describe('наблюдатель корня', () => {
	/**
	 * Прежний наблюдатель корня обязан отключиться до создания нового, иначе
	 * повторный `ready` оставит его висеть, и тот продолжит планировать
	 * пересчёт высоты. Повтор присылается прямым эмитом в обход сеттера: тест
	 * проверяет сам плагин, а не то, умеет ли `TElementPlugin` такой повтор
	 * произвести.
	 */
	it('повторный ready без removed не оставляет за корнем второго наблюдателя', async () => {
		const { root, rootElement } = await setup(4, 2)

		rootElement.events.emit('ready', root)

		expect(observerCount(root)).toBe(1)
	})
})
