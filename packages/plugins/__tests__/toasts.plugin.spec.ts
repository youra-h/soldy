// @vitest-environment jsdom

/**
 * Плагины тостов: отсчёт (`TToastsTimerPlugin`), удаление догасших
 * (`TToastsRemovalPlugin`), клавиатура (`TToastsKeyboardPlugin`) и слой в
 * стилях (`TToastsLayoutPlugin`).
 *
 * Плагины собраны настоящим набором, как в рантайме, но без адаптера: разметку
 * тест строит сам в том виде, в каком её рисует Vue, — регион, в нём список и
 * узел на каждый показанный тост со своим набором в реестре bundles. Движок —
 * `createEngineToasts`, как у компонента: предел видимых, длительность и
 * закрытие считает расширение `toasts`.
 *
 * Переходов темы jsdom не знает: закрытый тост с узлом уходит из коллекции тем
 * же кадром. Как он догасает и уходит в настоящем браузере, —
 * `playground/vue/browser/toasts.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TLayer, TToasts, createEngineToasts } from '@soldy-ui/core'
import type { IToastsItem, IToastsProps, TToastInput } from '@soldy-ui/core'
import {
	TCollectionBundlesPlugin,
	TCollectionElements,
	TElementPlugin,
	TPluginBundle,
	TToastsKeyboardPlugin,
	TToastsLayoutPlugin,
	TToastsRemovalPlugin,
	TToastsTimerPlugin,
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

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	vi.useRealTimers()
	vi.restoreAllMocks()
	document.body.innerHTML = ''
	TLayer.resetZIndexCounter()
})

type TMountOptions = {
	owner?: Partial<IToastsProps>
	plugins: IPluginConstructor<any, any, IPlugin<any, any>>[]
	/** Узел региона ставит тест сам — позже */
	detached?: boolean
}

/**
 * Регион тостов с плагинами: показ рисует показанные тосты, как разметка, —
 * узел и набор каждому новому, а ушедшие из выборки снимает.
 */
function mount({ owner: props, plugins, detached = false }: TMountOptions) {
	const owner = new TToasts(props)
	const engine = createEngineToasts({ owner })
	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TCollectionBundlesPlugin)
		.use(TCollectionElements)

	for (const plugin of plugins) bundle.use(plugin)

	bundles.push(bundle)

	const registry = pluginOf(bundle, TCollectionBundlesPlugin)
	const region = document.createElement('section')
	const list = document.createElement('ol')
	const outside = document.createElement('button')
	const nodes = new Map<IToastsItem, HTMLElement>()

	outside.className = 'so-test-outside'
	region.append(list)
	document.body.append(outside, region)
	registry.bindEngine(engine)

	/** Разметка по выборке: новый тост — узел и набор, ушедший — снять. */
	const draw = (): void => {
		const shown = engine.extensions.batch.shown

		for (const [toast, node] of nodes) {
			if (shown.includes(toast)) continue

			node.remove()
			nodes.delete(toast)
		}

		for (const toast of shown) {
			if (nodes.has(toast)) continue

			const node = document.createElement('li')
			const close = document.createElement('button')

			node.tabIndex = 0
			node.textContent = toast.text
			close.className = 'so-test-close'
			node.append(close)
			list.append(node)

			const itemBundle = new TPluginBundle(toast).use(TElementPlugin)

			pluginOf(itemBundle, TElementPlugin).element = node
			registry.register(itemBundle, toast)
			nodes.set(toast, node)
		}
	}

	const show = (input: TToastInput): IToastsItem => {
		const toast = engine.extensions.toasts.show(input)

		if (!toast) throw new Error('тост не показан')

		draw()

		return toast
	}

	const nodeOf = (toast: IToastsItem): HTMLElement => {
		const node = nodes.get(toast)

		if (!node) throw new Error(`${toast.text}: узла нет`)

		return node
	}

	const attach = (): void => {
		pluginOf(bundle, TElementPlugin).element = region
	}

	if (!detached) attach()

	return { owner, engine, bundle, region, outside, show, draw, nodeOf, attach }
}

/** Клавиша на узле: событие всплывает. Отдаёт событие — по нему видно, погашено ли. */
function press(target: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })

	target.dispatchEvent(event)

	return event
}

describe('TToastsTimerPlugin — отсчёт', () => {
	/** Отсчёт на поддельных часах: узел региона плагины получают кадром позже. */
	function mountTimer(owner?: Partial<IToastsProps>, detached = false) {
		vi.useFakeTimers()

		const mounted = mount({ owner, plugins: [TToastsTimerPlugin], detached })

		vi.advanceTimersToNextFrame()

		return mounted
	}

	it('время вышло — тост закрыт; длительность — владельца', () => {
		const { show } = mountTimer({ duration: 5000 })
		const toast = show('Сохранено')

		vi.advanceTimersByTime(4999)

		expect(toast.open).toBe(true)

		vi.advanceTimersByTime(1)

		expect(toast.open).toBe(false)
	})

	it('своя длительность важнее владельца, 0 — держится, пока не закроют', () => {
		const { show } = mountTimer({ duration: 5000 })
		const quick = show({ text: 'Быстрый', duration: 1000 })
		const sticky = show({ text: 'Важный', duration: 0 })

		vi.advanceTimersByTime(1000)

		expect(quick.open).toBe(false)

		vi.advanceTimersByTime(60_000)

		expect(sticky.open).toBe(true)
	})

	it('владелец с 0 — тосты без своей длительности не закрываются сами', () => {
		const { show } = mountTimer({ duration: 0 })
		const toast = show('Держится')

		vi.advanceTimersByTime(60_000)

		expect(toast.open).toBe(true)
	})

	it('указатель над регионом — пауза для всех; уход снимает её с задержкой', () => {
		const { show, region } = mountTimer({ duration: 5000 })
		const first = show('Первый')

		vi.advanceTimersByTime(2000)

		const second = show('Второй')

		region.dispatchEvent(new PointerEvent('pointerenter'))
		vi.advanceTimersByTime(60_000)

		expect([first.open, second.open]).toEqual([true, true])

		region.dispatchEvent(new PointerEvent('pointerleave'))
		// Пауза держится, пока не прошла задержка
		vi.advanceTimersByTime(399)
		vi.advanceTimersByTime(1)
		// Первому оставалось 3000
		vi.advanceTimersByTime(2999)

		expect(first.open).toBe(true)

		vi.advanceTimersByTime(1)

		expect(first.open).toBe(false)
		expect(second.open).toBe(true)
	})

	it('указатель вернулся раньше задержки — пауза не прерывалась', () => {
		const { show, region } = mountTimer({ duration: 1000 })
		const toast = show('Тост')

		region.dispatchEvent(new PointerEvent('pointerenter'))
		region.dispatchEvent(new PointerEvent('pointerleave'))
		vi.advanceTimersByTime(300)
		region.dispatchEvent(new PointerEvent('pointerenter'))
		vi.advanceTimersByTime(60_000)

		expect(toast.open).toBe(true)
	})

	it('фокус в регионе — пауза; ушёл из региона — отсчёт идёт дальше', () => {
		const { show, region, outside, nodeOf } = mountTimer({ duration: 1000 })
		const toast = show('Тост')
		const node = nodeOf(toast)

		node.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
		vi.advanceTimersByTime(5000)

		expect(toast.open).toBe(true)

		// Фокус внутри региона — пауза держится
		node.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: region }))
		vi.advanceTimersByTime(5000)

		expect(toast.open).toBe(true)

		node.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }))
		vi.advanceTimersByTime(1000)

		expect(toast.open).toBe(false)
	})

	it('вкладка скрыта — пауза; показана — отсчёт идёт', () => {
		const { show } = mountTimer({ duration: 1000 })
		const toast = show('Тост')
		const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)

		document.dispatchEvent(new Event('visibilitychange'))
		vi.advanceTimersByTime(5000)

		expect(toast.open).toBe(true)

		hidden.mockReturnValue(false)
		document.dispatchEvent(new Event('visibilitychange'))
		vi.advanceTimersByTime(1000)

		expect(toast.open).toBe(false)
	})

	it('вытесненный за предел ждёт места с оставшимся временем', () => {
		vi.useFakeTimers()

		const { show, draw } = mount({
			owner: { duration: 5000, max: 1 },
			plugins: [TToastsTimerPlugin, TToastsRemovalPlugin],
		})

		vi.advanceTimersToNextFrame()

		const first = show('Первый')

		vi.advanceTimersByTime(2000)

		const second = show('Второй')

		// Первый не виден — его время стоит
		vi.advanceTimersByTime(5000)

		expect(second.open).toBe(false)
		expect(first.open).toBe(true)

		// Второй догас и ушёл — первый вернулся, ему осталось 3000
		vi.advanceTimersToNextFrame()
		draw()
		vi.advanceTimersByTime(2999)

		expect(first.open).toBe(true)

		vi.advanceTimersByTime(1)

		expect(first.open).toBe(false)
	})

	it('смена длительности — отсчёт заново, с новой', () => {
		const { show } = mountTimer({ duration: 5000 })
		const toast = show({ text: 'Тост', duration: 3000 })

		vi.advanceTimersByTime(2000)
		toast.duration = 4000
		vi.advanceTimersByTime(3999)

		expect(toast.open).toBe(true)

		vi.advanceTimersByTime(1)

		expect(toast.open).toBe(false)
	})

	it('смена длительности владельца — заново у тостов без своей', () => {
		const { owner, show } = mountTimer({ duration: 5000 })
		const inherited = show('Владельца')
		const own = show({ text: 'Своя', duration: 4000 })

		vi.advanceTimersByTime(2000)
		owner.duration = 1000
		vi.advanceTimersByTime(1000)

		expect(inherited.open).toBe(false)
		// Своей длительности смена у владельца не касается: ей осталось 1000
		expect(own.open).toBe(true)

		vi.advanceTimersByTime(1000)

		expect(own.open).toBe(false)
	})

	it('без узла региона отсчёта нет: считать некому', () => {
		const { show, attach } = mountTimer({ duration: 1000 }, true)
		const toast = show('Тост')

		vi.advanceTimersByTime(60_000)

		expect(toast.open).toBe(true)

		attach()
		vi.advanceTimersToNextFrame()
		vi.advanceTimersByTime(1000)

		expect(toast.open).toBe(false)
	})

	it('после destroy таймеров нет', () => {
		const { bundle, show } = mountTimer({ duration: 1000 })
		const toast = show('Тост')

		bundle.destroy()
		vi.advanceTimersByTime(60_000)

		expect(toast.open).toBe(true)
	})
})

describe('TToastsRemovalPlugin — закрытый уходит из коллекции, когда догас', () => {
	it('с узлом — после переходов: кадром позже, переходов в jsdom нет', async () => {
		const { engine, show } = mount({ plugins: [TToastsRemovalPlugin] })
		const toast = show('Тост')

		toast.close()

		expect(engine.extensions.batch.items).toContain(toast)

		await nextFrame()

		expect(engine.extensions.batch.items).not.toContain(toast)
	})

	it('без узла — сразу: гаснуть нечему', () => {
		const { engine } = mount({ plugins: [TToastsRemovalPlugin] })
		const toast = engine.extensions.toasts.show('Не нарисован')

		toast?.close()

		expect(engine.extensions.batch.items).toEqual([])
	})

	it('закрытые до привязки движка — удаляются при привязке', () => {
		const owner = new TToasts()
		const engine = createEngineToasts({ owner })
		const closed = engine.extensions.toasts.show('Закрыт')
		const open = engine.extensions.toasts.show('Открыт')

		closed?.close()

		const bundle = new TPluginBundle(owner)
			.use(TElementPlugin)
			.use(TCollectionBundlesPlugin)
			.use(TCollectionElements)
			.use(TToastsRemovalPlugin)

		bundles.push(bundle)
		pluginOf(bundle, TCollectionBundlesPlugin).bindEngine(engine)

		expect(engine.extensions.batch.items).toEqual([open])
	})

	it('набор уничтожили, пока тост гаснет, — тост удалён сразу', () => {
		const { engine, bundle, show } = mount({ plugins: [TToastsRemovalPlugin] })
		const toast = show('Тост')

		toast.close()
		bundle.destroy()

		expect(engine.extensions.batch.items).toEqual([])
	})
})

describe('TToastsKeyboardPlugin — клавиатура', () => {
	async function mountKeyboard() {
		const mounted = mount({ plugins: [TToastsKeyboardPlugin] })

		await nextFrame()

		return mounted
	}

	it('F8 — фокус на новейший открытый тост и подъём региона', async () => {
		const { owner, outside, show, nodeOf } = await mountKeyboard()

		show('Старый')

		const newest = show('Новый')
		const layer = owner.zIndex

		outside.focus()

		const event = press(outside, 'F8')

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(nodeOf(newest))
		expect(owner.zIndex).toBeGreaterThan(layer)
	})

	it('F8 без тостов — клавиша не наша: не погашена, фокус на месте', async () => {
		const { outside } = await mountKeyboard()

		outside.focus()

		const event = press(outside, 'F8')

		expect(event.defaultPrevented).toBe(false)
		expect(document.activeElement).toBe(outside)
	})

	it('F8 с модификатором и погашенная — не трогает', async () => {
		const { outside, show } = await mountKeyboard()

		show('Тост')
		outside.focus()

		expect(press(outside, 'F8', { ctrlKey: true }).defaultPrevented).toBe(false)

		outside.addEventListener('keydown', (event) => event.preventDefault(), { once: true })
		press(outside, 'F8')

		expect(document.activeElement).toBe(outside)
	})

	it('Escape на тосте под фокусом — тост закрыт, клавиша погашена', async () => {
		const { show, nodeOf } = await mountKeyboard()
		const toast = show('Тост')

		nodeOf(toast).focus()

		const event = press(nodeOf(toast), 'Escape')

		expect(toast.open).toBe(false)
		expect(event.defaultPrevented).toBe(true)
	})

	it('Escape с контрола в тосте — тот же тост', async () => {
		const { show, nodeOf } = await mountKeyboard()
		const toast = show('Тост')
		const close = nodeOf(toast).querySelector('.so-test-close')

		if (!close) throw new Error('крестика нет')

		press(close, 'Escape')

		expect(toast.open).toBe(false)
	})

	it('Escape, погашенный раньше, тост не трогает: клавиша — верхнему слою', async () => {
		const { show, nodeOf } = await mountKeyboard()
		const toast = show('Тост')
		const close = nodeOf(toast).querySelector('.so-test-close')

		if (!close) throw new Error('крестика нет')

		close.addEventListener('keydown', (event) => event.preventDefault())
		press(close, 'Escape')

		expect(toast.open).toBe(true)
	})

	it('закрыли тост с фокусом — фокус соседу, без соседа — туда, откуда пришли', async () => {
		const { outside, show, nodeOf } = await mountKeyboard()
		const older = show('Старый')
		const newest = show('Новый')

		outside.focus()
		press(outside, 'F8')

		expect(document.activeElement).toBe(nodeOf(newest))

		newest.close()

		expect(document.activeElement).toBe(nodeOf(older))

		older.close()

		expect(document.activeElement).toBe(outside)
	})

	it('закрыли тост без фокуса — фокус не трогается', async () => {
		const { outside, show } = await mountKeyboard()
		const toast = show('Тост')

		outside.focus()
		toast.close()

		expect(document.activeElement).toBe(outside)
	})
})

describe('TToastsLayoutPlugin — слой в стилях', () => {
	it('styles — z-index слоя; подъём — новый объект и событие', () => {
		const { owner, bundle } = mount({ plugins: [TToastsLayoutPlugin] })
		const layout = pluginOf(bundle, TToastsLayoutPlugin)
		const before = layout.styles
		const onStyles = vi.fn()

		expect(before).toEqual({ 'z-index': owner.zIndex })

		layout.events.on('change:styles', onStyles)
		owner.raise()

		expect(layout.styles).not.toBe(before)
		expect(layout.styles).toEqual({ 'z-index': owner.zIndex })
		expect(onStyles).toHaveBeenCalledTimes(1)
	})
})
