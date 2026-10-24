// @vitest-environment jsdom

/**
 * Ссылка `aria-activedescendant` ListBox в окне (обёртка `Virtual`): в
 * документе только видимые элементы, а стрелки ходят по всем показанным и
 * уводят подсветку к элементу, которого окно ещё не нарисовало.
 *
 * Такой элемент навигация закрепляет в рисовании (база,
 * `list-navigation-window.plugin.spec.ts`), а своего `id` и узла у него нет,
 * пока окно его не нарисовало. Поэтому узел списка получает ссылку на его `id`,
 * когда регистрируется его набор, — до того ссылки нет вовсе, а не ссылки в
 * пустоту. Элементы «монтирует» тест — набор с узлом, плагином подсветки и
 * плагином `id` в реестр, как адаптер. Как это выглядит в браузере, —
 * `playground/vue/browser/list-box-virtual.spec.ts`; Select в окне —
 * `select-keyboard-window.plugin.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TListBox, TListBoxCollectionFacade, TWindowStrategy } from '@soldy-ui/core'
import type { IListBoxItem } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TListItemPlugin,
	TListKeyboardPlugin,
	TOptionIdsPlugin,
	TPluginBundle,
} from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

const STEP = 30
const COUNT = 200

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

/** Монтирований элемента — для своего `id` у каждого. */
let mounts = 0

/**
 * ListBox из 200 элементов в окне: видны первые 20 (места 0–9 и запас) — их
 * тест монтирует сразу, как адаптер. Клавиши — с узла списка, как в разметке
 * ListBox: роль `listbox` и остановка Tab.
 */
async function setup() {
	const owner = new TListBox()
	const facade = new TListBoxCollectionFacade(
		{
			items: Array.from({ length: COUNT }, (_, index) => ({
				value: `v${index + 1}`,
				text: `Пункт ${index + 1}`,
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
		.use(TListKeyboardPlugin)

	bundles.push(bundle)

	const registry = pluginOf(bundle, TCollectionBundlesPlugin)
	const root = document.createElement('div')
	const list = document.createElement('div')

	list.setAttribute('role', 'listbox')
	list.tabIndex = 0
	root.append(list)
	document.body.append(root)
	registry.bindEngine(engine)
	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	const items = batch.items

	/** Смонтировать элемент: набор с узлом, подсветкой и `id` — в реестр. */
	const mountItem = (item: IListBoxItem): TPluginBundle => {
		const node = document.createElement('div')

		list.append(node)

		const itemBundle = new TPluginBundle(item, `m${++mounts}`)
			.use(TElementPlugin)
			.use(TListItemPlugin)
			.use(TOptionIdsPlugin)

		bundles.push(itemBundle)
		pluginOf(itemBundle, TElementPlugin).element = node
		registry.register(itemBundle, item)

		return itemBundle
	}

	/** Снять монтирование элемента из данных: он в коллекции, но не в документе. */
	const unmountItem = (item: IListBoxItem, itemBundle: TPluginBundle): void => {
		registry.release(itemBundle, item)
		bundles.splice(bundles.indexOf(itemBundle), 1)
		itemBundle.destroy()
	}

	const mounted = new Map<IListBoxItem, TPluginBundle>()

	for (const entry of draw.drawn) {
		if (entry.kind === 'item') mounted.set(entry.item, mountItem(entry.item))
	}

	const press = (key: string) =>
		list.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

	/** Ссылка узла списка на подсвеченный элемент — в наборе `aria` списка. */
	const activeDescendant = () => owner.aria.get('aria-activedescendant') ?? null

	return { engine, items, mounted, mountItem, unmountItem, press, activeDescendant }
}

describe('aria-activedescendant в окне', () => {
	it('элемента нет в документе — ссылки нет; набор зарегистрирован — ссылка на его `id`', async () => {
		const { items, mountItem, press, activeDescendant } = await setup()
		const last = items[COUNT - 1]

		// С пустой подсветки ↑ ведёт на последний — окно его не рисовало
		press('ArrowUp')

		expect(activeDescendant()).toBeNull()

		mountItem(last)

		expect(last.aria.get('id')).toEqual(expect.any(String))
		expect(activeDescendant()).toBe(last.aria.get('id'))
	})

	it('`id` прошлого монтирования ссылкой не становится — ждём нового', async () => {
		const { items, mountItem, unmountItem, press, activeDescendant } = await setup()
		const last = items[COUNT - 1]

		// Элемент уже рисовали: от того монтирования у него остался `id`
		unmountItem(last, mountItem(last))

		const stale = last.aria.get('id')

		press('ArrowUp')

		expect(activeDescendant()).toBeNull()

		mountItem(last)

		expect(activeDescendant()).toBe(last.aria.get('id'))
		expect(activeDescendant()).not.toBe(stale)
	})

	it('элемент в документе — ссылка сразу', async () => {
		const { items, press, activeDescendant } = await setup()

		press('ArrowDown')

		expect(activeDescendant()).toBe(items[0].aria.get('id'))
	})

	it('монтирование подсвеченного сняли — ссылка снята', async () => {
		const { items, mounted, unmountItem, press, activeDescendant } = await setup()
		const first = items[0]
		const firstBundle = mounted.get(first)

		if (!firstBundle) throw new Error('первый элемент не смонтирован')

		press('ArrowDown')
		unmountItem(first, firstBundle)

		expect(activeDescendant()).toBeNull()
	})

	it('позиция без отметки (за выбором) — смонтированный элемент ссылкой не становится', async () => {
		const { engine, items, mountItem, activeDescendant } = await setup()

		// Выбор ставит позицию навигации, но подсветку не показывает
		engine.extensions.selection.select(items[150])
		mountItem(items[150])

		expect(activeDescendant()).toBeNull()
	})
})
