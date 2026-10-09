// @vitest-environment jsdom

/**
 * Навигация с клавиатуры в окне (обёртка `Virtual`): в документе только
 * видимые элементы, а стрелка уводит подсветку и к тем, кого окно не
 * нарисовало, — у них нет ни узла, ни `TListItemPlugin`.
 *
 * Поэтому подсвеченный элемент навигация закрепляет в рисовании коллекции
 * (`draw.pin`): окно рисует его на месте, — а когда его набор
 * зарегистрирован заново (элемент смонтирован), возвращает ему отметку и
 * сообщает наследнику, что подсвеченный элемент вошёл в документ
 * (`onHighlightedMounted`). Подсветка снята — закрепление тоже. Как это
 * выглядит в браузере, — `playground/vue/browser/list-box-virtual.spec.ts`;
 * клавиатура Select в окне — `select-keyboard-window.plugin.spec.ts`.
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
	TPluginBundle,
} from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

const STEP = 30

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

/** Клавиатура списка, которая помнит, о каких элементах ей сказали «вошёл в документ». */
class TMountedProbe extends TListKeyboardPlugin {
	readonly mounted: Array<string | number> = []

	protected override onHighlightedMounted(uid: string | number): void {
		this.mounted.push(uid)
	}
}

/**
 * Список из 200 элементов в окне: видны первые 20 (места 0–9 и запас), узлов
 * у элементов нет — их «монтирует» тест (`mountItem`), как адаптер.
 * Клавиатура — `TListKeyboardPlugin` или его наследник.
 */
async function setup(
	Keyboard: IPluginConstructor<any, any, TListKeyboardPlugin> = TListKeyboardPlugin,
) {
	const owner = new TListBox()
	const facade = new TListBoxCollectionFacade(
		{
			items: Array.from({ length: 200 }, (_, index) => ({
				value: `v${index + 1}`,
				text: `Пункт ${index + 1}`,
			})),
		},
		{ owner },
	)
	const engine = facade.engine
	const draw = engine.extensions.draw

	draw.useStrategy(new TWindowStrategy())
	draw.notifyViewport({ top: 0, bottom: 10 * STEP, step: STEP })

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)
		.use(Keyboard)

	bundles.push(bundle)

	const registry = pluginOf(bundle, TCollectionBundlesPlugin)
	const keyboard = pluginOf(bundle, Keyboard)
	const root = document.createElement('div')

	registry.bindEngine(engine)
	document.body.append(root)
	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	const items = engine.extensions.batch.items

	/** Нарисовано ли окном: элемент среди записей `drawn`. */
	const drawn = (item: IListBoxItem): boolean =>
		draw.drawn.some((entry) => entry.kind === 'item' && entry.item === item)

	/** Смонтировать элемент: его набор с плагином подсветки — в реестр. */
	const mountItem = (item: IListBoxItem): TListItemPlugin => {
		const itemBundle = new TPluginBundle(item).use(TListItemPlugin)

		bundles.push(itemBundle)
		registry.register(itemBundle, item)

		return pluginOf(itemBundle, TListItemPlugin)
	}

	const press = (key: string) =>
		root.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

	return { bundle, engine, keyboard, items, drawn, mountItem, press, registry }
}

describe('подсветка в окне', () => {
	it('стрелка увела подсветку за окно — элемент закреплён и нарисован на месте', async () => {
		const { keyboard, items, drawn, press } = await setup()
		const last = items[199]

		expect(drawn(last)).toBe(false)

		// С пустой подсветки ↑ ведёт на последний
		press('ArrowUp')

		expect(keyboard.highlightedUid).toBe(last.uid)
		expect(drawn(last)).toBe(true)
	})

	it('подсветка ушла дальше — прежний элемент окно больше не держит', async () => {
		const { items, drawn, press } = await setup()

		press('ArrowUp')
		// Навигация зациклена: с последнего ↓ ведёт на первый
		press('ArrowDown')

		expect(drawn(items[199])).toBe(false)
		expect(drawn(items[0])).toBe(true)
	})

	it('подсвеченный элемент смонтировали — отметка вернулась', async () => {
		const { items, mountItem, press } = await setup()

		press('ArrowUp')

		const plugin = mountItem(items[199])

		expect(plugin.highlighted).toBe(true)
		expect(items[199].dataset.get('highlighted')).toBe('true')
	})

	it('смонтировали другой элемент — отметки у него нет', async () => {
		const { items, mountItem, press } = await setup()

		press('ArrowUp')

		expect(mountItem(items[5]).highlighted).toBe(false)
	})

	it('позиция без отметки (за выбором) — смонтированный элемент отметку не получает', async () => {
		const { engine, items, mountItem, keyboard } = await setup()

		// Выбор ставит позицию навигации, но подсветку не показывает
		engine.extensions.selection.select(items[150])

		expect(keyboard.highlightedUid).toBe(items[150].uid)
		expect(mountItem(items[150]).highlighted).toBe(false)
	})

	it('плагин уничтожен — подсветка и закрепление сняты', async () => {
		const { bundle, items, drawn, press } = await setup()

		press('ArrowUp')
		bundles.splice(bundles.indexOf(bundle), 1)
		bundle.destroy()

		expect(drawn(items[199])).toBe(false)
	})
})

/**
 * Наследнику мало отметки: у смонтированного элемента появилось то, чего не
 * было, когда на него перешла подсветка, — `id` и узел. Об этом навигация
 * сообщает хуком `onHighlightedMounted` — тогда же, когда возвращает отметку.
 */
describe('подсвеченный элемент вошёл в документ', () => {
	it('смонтировали подсвеченный — наследник узнаёт его', async () => {
		const { bundle, items, mountItem, press } = await setup(TMountedProbe)
		const probe = pluginOf(bundle, TMountedProbe)

		press('ArrowUp')

		expect(probe.mounted).toEqual([])

		mountItem(items[199])

		expect(probe.mounted).toEqual([items[199].uid])
	})

	it('смонтировали другой элемент — хук молчит', async () => {
		const { bundle, items, mountItem, press } = await setup(TMountedProbe)

		press('ArrowUp')
		mountItem(items[5])

		expect(pluginOf(bundle, TMountedProbe).mounted).toEqual([])
	})

	it('позиция без отметки (за выбором) — хук молчит: подсветки не видно', async () => {
		const { bundle, engine, items, mountItem } = await setup(TMountedProbe)

		engine.extensions.selection.select(items[150])
		mountItem(items[150])

		expect(pluginOf(bundle, TMountedProbe).mounted).toEqual([])
	})

	it('подсветка ушла дальше до монтирования — о прежнем элементе хук молчит', async () => {
		const { bundle, items, mountItem, press } = await setup(TMountedProbe)

		press('ArrowUp')
		// Навигация зациклена: с последнего ↓ ведёт на первый
		press('ArrowDown')
		mountItem(items[199])
		mountItem(items[0])

		expect(pluginOf(bundle, TMountedProbe).mounted).toEqual([items[0].uid])
	})
})
