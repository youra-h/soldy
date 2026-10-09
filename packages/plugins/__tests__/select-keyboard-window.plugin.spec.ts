// @vitest-environment jsdom

/**
 * Клавиатура Select в окне (обёртка `Virtual`): в панели только видимые опции,
 * а клавиши ходят по всем показанным — End, буква и Enter на выбранной ведут
 * подсветку и к опции, которой в документе нет.
 *
 * Такую опцию навигация закрепляет в рисовании (база,
 * `list-navigation-window.plugin.spec.ts`), а своего `id` и узла у неё нет,
 * пока окно её не нарисовало. Поэтому `aria-activedescendant` получает её `id`,
 * когда регистрируется её набор, — до того ссылки нет вовсе, а не ссылки в
 * пустоту, — а прокрутка к ней идёт в следующем кадре: узел и панель адаптер
 * рисует уже после обработчика клавиши. Опции «монтирует» тест — набор с
 * узлом, плагином подсветки и плагином связок в реестр, как адаптер. Как это
 * выглядит в браузере, — `playground/vue/browser/select-virtual.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TSelect, TSelectCollectionFacade, TWindowStrategy } from '@soldy-ui/core'
import type { ISelectItem } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TListItemPlugin,
	TPluginBundle,
	TSelectItemIdsPlugin,
	TSelectKeyboardPlugin,
} from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

const STEP = 30
const COUNT = 200
/** Опция с особой первой буквой — к ней ведёт набор по буквам. */
const APPLE = 150

/** Плагин, который тест поставил сам: без него дальше проверять нечего. */
function pluginOf<P extends IPlugin<any, any>>(
	bundle: TPluginBundle,
	ctor: IPluginConstructor<any, any, P>,
): P {
	const plugin = bundle.get(ctor)

	if (!plugin) throw new Error(`${ctor.name} не установлен в bundle`)

	return plugin
}

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	document.body.innerHTML = ''
})

/** Монтирований опции — для своего `id` у каждого. */
let mounts = 0

/**
 * Select из 200 опций в окне: видны первые 20 (места 0–9 и запас) — их тест
 * монтирует сразу, как адаптер. Прокрутка мгновенная: `scrollIntoView` в
 * jsdom нет, и узлы опций отдают свой, который запоминает вызовы.
 */
async function setup() {
	const owner = new TSelect({ scrollBehavior: 'instant' })
	const facade = new TSelectCollectionFacade(
		{
			items: Array.from({ length: COUNT }, (_, index) => ({
				value: `v${index + 1}`,
				text: index === APPLE ? 'Яблоко' : `Пункт ${index + 1}`,
			})),
		},
		{ owner },
	)
	const engine = facade.engine
	const { draw, batch } = engine.extensions

	draw.useStrategy(new TWindowStrategy())
	draw.notifyViewport({ top: 0, bottom: 10 * STEP, step: STEP })

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(TSelectKeyboardPlugin)

	bundles.push(bundle)

	const registry = pluginOf(bundle, TCollectionBundlesPlugin)
	const keyboard = pluginOf(bundle, TSelectKeyboardPlugin)
	const root = document.createElement('div')
	const input = document.createElement('input')

	root.append(input)
	document.body.append(root)
	registry.bindEngine(engine)
	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	const items = batch.items
	/** Опции, к которым прокрутили, — текстом, по порядку вызовов. */
	const scrolled: string[] = []

	/** Нарисовано ли окном: опция среди записей `drawn`. */
	const drawn = (item: ISelectItem): boolean =>
		draw.drawn.some((entry) => entry.kind === 'item' && entry.item === item)

	/** Смонтировать опцию: набор с узлом, подсветкой и `id` — в реестр. */
	const mountItem = (item: ISelectItem): TPluginBundle => {
		const node = document.createElement('div')

		node.scrollIntoView = () => {
			scrolled.push(item.text)
		}
		root.append(node)

		const itemBundle = new TPluginBundle(item, `m${++mounts}`)
			.use(TElementPlugin)
			.use(TListItemPlugin)
			.use(TSelectItemIdsPlugin)

		bundles.push(itemBundle)
		pluginOf(itemBundle, TElementPlugin).element = node
		registry.register(itemBundle, item)

		return itemBundle
	}

	/** Снять монтирование опции: окно её больше не рисует. */
	const unmountItem = (item: ISelectItem, itemBundle: TPluginBundle): void => {
		registry.release(itemBundle, item)
		bundles.splice(bundles.indexOf(itemBundle), 1)
		itemBundle.destroy()
	}

	for (const entry of draw.drawn) if (entry.kind === 'item') mountItem(entry.item)

	/** Клавиша с поля — там, где по APG живёт фокус комбобокса. */
	const press = (key: string) =>
		input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

	/** Ссылка поля на подсвеченную опцию. */
	const activeDescendant = () => owner.field.aria.get('aria-activedescendant') ?? null

	return {
		owner,
		engine,
		bundle,
		keyboard,
		items,
		drawn,
		mountItem,
		unmountItem,
		press,
		activeDescendant,
		scrolled,
	}
}

describe('клавиши ходят по всем показанным опциям', () => {
	it('End — к последней: окно закрепляет её и рисует на месте', async () => {
		const { owner, keyboard, items, drawn, press } = await setup()
		const last = items[COUNT - 1]

		owner.open = true
		press('End')

		expect(keyboard.highlightedUid).toBe(last.uid)
		expect(drawn(last)).toBe(true)
	})

	it('буква — к первой опции на неё, хоть её и нет в документе', async () => {
		const { owner, keyboard, items, drawn, press } = await setup()

		owner.open = true
		press('я')

		expect(keyboard.highlightedUid).toBe(items[APPLE].uid)
		expect(drawn(items[APPLE])).toBe(true)
	})

	it('Enter на закрытой — открывает на выбранной вне окна и закрепляет её', async () => {
		const { owner, engine, keyboard, items, drawn, press } = await setup()

		engine.extensions.selection.select(items[120])
		press('Enter')

		expect(owner.open).toBe(true)
		expect(keyboard.highlightedUid).toBe(items[120].uid)
		expect(drawn(items[120])).toBe(true)
	})
})

describe('aria-activedescendant', () => {
	it('опции нет в документе — ссылки нет; набор зарегистрирован — ссылка на её `id`', async () => {
		const { owner, items, mountItem, press, activeDescendant } = await setup()
		const last = items[COUNT - 1]

		owner.open = true
		press('End')

		expect(activeDescendant()).toBeNull()

		mountItem(last)

		expect(last.aria.get('id')).toEqual(expect.any(String))
		expect(activeDescendant()).toBe(last.aria.get('id'))
	})

	it('`id` прошлого монтирования ссылкой не становится — ждём нового', async () => {
		const { owner, items, mountItem, unmountItem, press, activeDescendant } = await setup()
		const last = items[COUNT - 1]

		// Опцию уже рисовали: от того монтирования у неё остался `id`
		unmountItem(last, mountItem(last))

		const stale = last.aria.get('id')

		owner.open = true
		press('End')

		expect(activeDescendant()).toBeNull()

		mountItem(last)

		expect(activeDescendant()).toBe(last.aria.get('id'))
		expect(activeDescendant()).not.toBe(stale)
	})

	it('опция в документе — ссылка сразу', async () => {
		const { owner, items, press, activeDescendant } = await setup()

		owner.open = true
		press('ArrowDown')

		expect(activeDescendant()).toBe(items[0].aria.get('id'))
	})
})

describe('прокрутка к подсвеченной опции', () => {
	it('в следующем кадре, а не в обработчике клавиши', async () => {
		const { owner, press, scrolled } = await setup()

		owner.open = true
		press('ArrowDown')

		expect(scrolled).toEqual([])

		await nextFrame()

		expect(scrolled).toEqual(['Пункт 1'])
	})

	it('опция вне окна — прокрутка к ней, когда окно её нарисовало', async () => {
		const { owner, items, mountItem, press, scrolled } = await setup()

		owner.open = true
		press('End')
		await nextFrame()

		// Узла ещё нет — прокручивать не к чему
		expect(scrolled).toEqual([])

		mountItem(items[COUNT - 1])
		await nextFrame()

		expect(scrolled).toEqual([`Пункт ${COUNT}`])
	})

	it('подряд в одном кадре — одна прокрутка, к последней подсветке', async () => {
		const { owner, press, scrolled } = await setup()

		owner.open = true
		press('ArrowDown')
		press('ArrowDown')
		press('ArrowDown')
		await nextFrame()

		expect(scrolled).toEqual(['Пункт 3'])
	})

	it('подсветку сняли до кадра — прокрутки нет', async () => {
		const { owner, press, scrolled } = await setup()

		owner.open = true
		press('ArrowDown')
		press('Escape')
		await nextFrame()

		expect(scrolled).toEqual([])
	})

	it('плагин уничтожен до кадра — прокрутки нет', async () => {
		const { owner, bundle, press, scrolled } = await setup()

		owner.open = true
		press('ArrowDown')
		bundles.splice(bundles.indexOf(bundle), 1)
		bundle.destroy()
		await nextFrame()

		expect(scrolled).toEqual([])
	})
})
