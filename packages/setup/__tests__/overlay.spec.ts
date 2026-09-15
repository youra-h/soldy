// @vitest-environment jsdom

/**
 * Слой оверлея: привязка к якорю и закрытие по нажатию мимо.
 *
 * Общий для всего, что открывается поверх страницы — Select, Menu, Popover.
 * Строится до самих компонентов именно потому, что общий: иначе каждый
 * заводил бы своё и они бы разошлись.
 *
 * Раскладка и привязка — разные плагины: `TFrameLayoutPlugin` превращает
 * собственные пропсы Frame в стили, `TAnchorPlugin` следит за посторонним
 * элементом и пишет во Frame координаты. Здесь проверяется вторая половина —
 * что она кладёт во Frame, включая flip, shift и RTL поверх выбора
 * потребителя.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
	createPluginContext,
	installResizeObserverStub,
	observerCount,
	triggerResize,
} from './helpers'
import { TAnchorPlugin, TDismissPlugin, TElementPlugin } from '@soldy/plugins'
import { TFrame } from '@soldy/core'

/** Якорь с заданным прямоугольником: jsdom сам ничего не раскладывает. */
function anchorAt(rect: Partial<DOMRect>): HTMLElement {
	const element = document.createElement('div')

	element.getBoundingClientRect = () =>
		({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, ...rect }) as DOMRect

	document.body.appendChild(element)

	return element
}

/** Панель заданного размера — нужна только для `*-end`, `top-*`, flip и shift. */
function panelOf(width: number, height: number): { element: HTMLElement; plugin: TElementPlugin } {
	const element = document.createElement('div')

	element.getBoundingClientRect = () =>
		({ left: 0, top: 0, right: width, bottom: height, width, height }) as DOMRect

	document.body.appendChild(element)

	return { element, plugin: new TElementPlugin() }
}

/**
 * `TElementPlugin` отдаёт `ready` через `requestAnimationFrame`, поэтому все
 * плагины получают элемент кадром позже. Ждём кадр, а не микрозадачу.
 */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

function anchorFor(frame: TFrame, elementPlugin?: TElementPlugin): TAnchorPlugin {
	const plugin = new TAnchorPlugin()

	plugin.install(createPluginContext(frame, elementPlugin ? [elementPlugin] : []))

	return plugin
}

beforeEach(() => {
	installResizeObserverStub()
	window.innerWidth = 1000
	window.innerHeight = 800
})

afterEach(() => {
	document.body.innerHTML = ''
})

describe('привязка к якорю', () => {
	it('bottom-start ставит панель под якорь по его левому краю', () => {
		const frame = new TFrame({ position: 'fixed' })

		anchorFor(frame).setAnchor(anchorAt({ left: 100, bottom: 250, right: 300, width: 200 }))

		expect(frame.x).toBe(100)
		expect(frame.y).toBe(250)
	})

	it('bottom-end выравнивает правый край панели по правому краю якоря', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 60)
		const plugin = anchorFor(frame, panel.plugin)

		plugin.placement = 'bottom-end'
		plugin.setAnchor(anchorAt({ left: 100, bottom: 250, right: 300 }))
		panel.plugin.element = panel.element
		await nextFrame()

		expect(frame.x).toBe(180)
	})

	it('top-start поднимает панель над якорем на её высоту', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 60)
		const plugin = anchorFor(frame, panel.plugin)

		plugin.placement = 'top-start'
		plugin.setAnchor(anchorAt({ left: 100, top: 250 }))
		panel.plugin.element = panel.element
		await nextFrame()

		expect(frame.y).toBe(190)
	})

	it('matchWidth тянет ширину панели по якорю', () => {
		const frame = new TFrame({ position: 'fixed', width: 42 })
		const plugin = anchorFor(frame)

		plugin.matchWidth = true
		plugin.setAnchor(anchorAt({ left: 0, bottom: 0, width: 320 }))

		expect(frame.width).toBe(320)
	})

	/**
	 * При `matchWidth` ширина панели для `x` берётся из якоря, а не из DOM: во
	 * Frame она уже записана, но до узла доедет только после рендера адаптера.
	 * Панель под `v-show` меряется нулём, и `*-end` съехал бы на ширину якоря.
	 */
	it('bottom-end + matchWidth при нулевой ширине панели ставит x по левому краю якоря', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(0, 60)
		const plugin = anchorFor(frame, panel.plugin)

		plugin.placement = 'bottom-end'
		plugin.matchWidth = true
		panel.plugin.element = panel.element
		await nextFrame()

		plugin.setAnchor(anchorAt({ left: 100, bottom: 250, right: 300, width: 200 }))

		expect(frame.x).toBe(100)
	})

	it('bottom-end + matchWidth без панели ставит x по левому краю якоря', () => {
		const frame = new TFrame({ position: 'fixed' })
		const plugin = anchorFor(frame)

		plugin.placement = 'bottom-end'
		plugin.matchWidth = true
		plugin.setAnchor(anchorAt({ left: 100, bottom: 250, right: 300, width: 200 }))

		expect(frame.x).toBe(100)
	})

	it('самый частый случай не зависит от того, отрисовалась ли панель', () => {
		// Список под полем по левому краю считается только из якоря
		const frame = new TFrame({ position: 'fixed' })

		anchorFor(frame).setAnchor(anchorAt({ left: 40, bottom: 90 }))

		expect(frame.x).toBe(40)
		expect(frame.y).toBe(90)
	})

	it('при position=absolute якорь игнорируется', () => {
		// Привязка опирается на координаты окна, а их даёт только fixed:
		// при absolute отсчёт идёт от позиционированного предка
		const frame = new TFrame({ position: 'absolute', x: 10, y: 20 })

		anchorFor(frame).setAnchor(anchorAt({ left: 100, bottom: 250 }))

		expect(frame.x).toBe(10)
		expect(frame.y).toBe(20)
	})

	it('offset сдвигает панель вниз при bottom-*', () => {
		const frame = new TFrame({ position: 'fixed' })
		const plugin = anchorFor(frame)

		plugin.offset = 4
		plugin.setAnchor(anchorAt({ left: 100, bottom: 250, right: 300, width: 200 }))

		expect(frame.y).toBe(254)
	})

	it('offset сдвигает панель вверх при top-*', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 60)
		const plugin = anchorFor(frame, panel.plugin)

		plugin.placement = 'top-start'
		plugin.offset = 4
		plugin.setAnchor(anchorAt({ left: 100, top: 250 }))
		panel.plugin.element = panel.element
		await nextFrame()

		expect(frame.y).toBe(186)
	})

	it('смена placement пересчитывает координаты', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 60)
		const plugin = anchorFor(frame, panel.plugin)

		panel.plugin.element = panel.element
		await nextFrame()

		plugin.setAnchor(anchorAt({ left: 100, top: 200, bottom: 250, right: 300 }))
		expect(frame.y).toBe(250)

		plugin.placement = 'top-start'

		expect(frame.y).toBe(140)
	})
})

describe('flip: сторона у края экрана', () => {
	it('у нижнего края окна bottom становится top, data-placement = top-start', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 100)
		const plugin = anchorFor(frame, panel.plugin)

		panel.plugin.element = panel.element
		await nextFrame()

		// Якорю почти некуда расти вниз (20px до края), а сверху места много
		plugin.setAnchor(anchorAt({ left: 100, top: 750, bottom: 780, right: 220 }))

		expect(frame.y).toBe(650)
		expect(frame.dataset.get('placement')).toBe('top-start')
	})

	it('места мало с обеих сторон — остаётся выбранная сторона', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 500)
		const plugin = anchorFor(frame, panel.plugin)

		panel.plugin.element = panel.element
		await nextFrame()

		// Якорь посередине окна: сверху и снизу поровну, панель не влезает никуда
		plugin.setAnchor(anchorAt({ left: 100, top: 380, bottom: 420, right: 220 }))

		expect(frame.y).toBe(420)
		expect(frame.dataset.get('placement')).toBe('bottom-start')
	})

	it('flip = false: у нижнего края остаётся bottom-start', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 100)
		const plugin = anchorFor(frame, panel.plugin)

		plugin.flip = false
		panel.plugin.element = panel.element
		await nextFrame()

		plugin.setAnchor(anchorAt({ left: 100, top: 750, bottom: 780, right: 220 }))

		expect(frame.y).toBe(780)
		expect(frame.dataset.get('placement')).toBe('bottom-start')
	})

	it('flip = false: top-start у верхнего края остаётся сверху', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 100)
		const plugin = anchorFor(frame, panel.plugin)

		plugin.placement = 'top-start'
		plugin.flip = false
		panel.plugin.element = panel.element
		await nextFrame()

		plugin.setAnchor(anchorAt({ left: 100, top: 20, bottom: 50, right: 220 }))

		expect(frame.y).toBe(-80)
		expect(frame.dataset.get('placement')).toBe('top-start')
	})

	it('переключение flip на лету пересчитывает y и data-placement', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 100)
		const plugin = anchorFor(frame, panel.plugin)

		panel.plugin.element = panel.element
		await nextFrame()

		plugin.setAnchor(anchorAt({ left: 100, top: 750, bottom: 780, right: 220 }))
		expect(frame.dataset.get('placement')).toBe('top-start')

		plugin.flip = false

		expect(frame.y).toBe(780)
		expect(frame.dataset.get('placement')).toBe('bottom-start')

		plugin.flip = true

		expect(frame.y).toBe(650)
		expect(frame.dataset.get('placement')).toBe('top-start')
	})

	it('запись того же значения flip события не шлёт', () => {
		const plugin = anchorFor(new TFrame({ position: 'fixed' }))
		const handler = vi.fn()

		plugin.events.on('change:flip', handler)
		plugin.flip = true

		expect(handler).not.toHaveBeenCalled()

		plugin.flip = false

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith(false)
	})
})

describe('shift: сдвиг внутрь окна', () => {
	it('у левого края не даёт панели уйти за x=0', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 60)
		const plugin = anchorFor(frame, panel.plugin)

		panel.plugin.element = panel.element
		await nextFrame()

		plugin.setAnchor(anchorAt({ left: -50, bottom: 250, right: 50 }))

		expect(frame.x).toBe(0)
	})

	it('у правого края не даёт панели уйти за правый край окна', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 60)
		const plugin = anchorFor(frame, panel.plugin)

		panel.plugin.element = panel.element
		await nextFrame()

		// Якорь у самого правого края 1000px-окна
		plugin.setAnchor(anchorAt({ left: 950, bottom: 250, right: 1050 }))

		expect(frame.x).toBe(880) // 1000 - 120
	})
})

describe('RTL', () => {
	it('в rtl -start выравнивает панель по правому краю якоря', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 60)
		const plugin = anchorFor(frame, panel.plugin)

		panel.plugin.element = panel.element
		await nextFrame()

		const anchor = anchorAt({ left: 100, bottom: 250, right: 300 })

		anchor.style.direction = 'rtl'
		plugin.setAnchor(anchor)

		expect(frame.x).toBe(180) // 300 - 120, как -end в LTR
	})
})

describe('подписка на скролл', () => {
	it('снимает слушателей у всех предков якоря', () => {
		// Одна переменная цикла, захваченная всеми замыканиями, к моменту
		// очистки была бы уже null — слушатели остались бы висеть
		const parent = document.createElement('div')
		const anchor = anchorAt({ left: 0, bottom: 0 })

		parent.appendChild(anchor)
		document.body.appendChild(parent)

		const remove = vi.spyOn(parent, 'removeEventListener')
		const plugin = anchorFor(new TFrame({ position: 'fixed' }))

		plugin.setAnchor(anchor)
		plugin.removeAnchor()

		expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
	})

	it('destroy тоже снимает подписки', () => {
		const anchor = anchorAt({ left: 0, bottom: 0 })
		const remove = vi.spyOn(window, 'removeEventListener')
		const plugin = anchorFor(new TFrame({ position: 'fixed' }))

		plugin.setAnchor(anchor)
		plugin.destroy()

		expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
	})

	it('изменение размера якоря без скролла пересчитывает координаты', () => {
		// Тег в поле Select удалили, соседние сместились — сам якорь не
		// скроллился и не менял размеры окна, но подвинулся его край
		const frame = new TFrame({ position: 'fixed' })
		const anchor = anchorAt({ left: 100, bottom: 250, right: 300 })
		const plugin = anchorFor(frame)

		plugin.setAnchor(anchor)
		expect(frame.x).toBe(100)

		anchor.getBoundingClientRect = () =>
			({ left: 40, top: 0, right: 240, bottom: 250, width: 200, height: 0 }) as DOMRect
		triggerResize(anchor)

		expect(frame.x).toBe(40)
	})

	it('removeAnchor снимает data-placement и отключает наблюдатели', () => {
		const frame = new TFrame({ position: 'fixed' })
		const anchor = anchorAt({ left: 100, bottom: 250, right: 300 })
		const plugin = anchorFor(frame)

		plugin.setAnchor(anchor)
		expect(frame.dataset.get('placement')).toBe('bottom-start')
		expect(observerCount(anchor)).toBe(1)

		plugin.removeAnchor()

		expect(frame.dataset.has('placement')).toBe(false)
		expect(observerCount(anchor)).toBe(0)
	})
})

describe('наблюдатель панели', () => {
	/**
	 * Прежний наблюдатель панели обязан отключиться до создания нового, иначе
	 * повторный `ready` оставит его висеть. Повтор присылается прямым эмитом в
	 * обход сеттера: тест проверяет сам плагин, а не то, умеет ли
	 * `TElementPlugin` такой повтор произвести.
	 */
	it('повторный ready без removed не оставляет за панелью второго наблюдателя', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 60)

		anchorFor(frame, panel.plugin)
		panel.plugin.element = panel.element
		await nextFrame()

		panel.plugin.events.emit('ready', panel.element)

		expect(observerCount(panel.element)).toBe(1)
	})
})

describe('нажатие мимо', () => {
	const setup = async (uid: number) => {
		const element = document.createElement('div')

		document.body.appendChild(element)

		const elementPlugin = new TElementPlugin()
		const dismiss = new TDismissPlugin()

		dismiss.install(createPluginContext({ uid }, [elementPlugin]))

		elementPlugin.element = element
		await nextFrame()

		return { dismiss, element, elementPlugin }
	}

	/** Мышь или перо: решение принимается на самом нажатии. */
	const press = (target: Element, pointerType: 'mouse' | 'pen' = 'mouse') =>
		target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType }))

	/**
	 * Шаг касания пальцем. Прокрутку jsdom не изображает, поэтому то, чем её
	 * отмечает браузер, — `pointercancel` — тест шлёт сам.
	 */
	const touch = (
		type: 'pointerdown' | 'pointerup' | 'pointercancel',
		target: Element,
		pointerId = 1,
	) =>
		target.dispatchEvent(
			new PointerEvent(type, { bubbles: true, pointerType: 'touch', pointerId }),
		)

	it('пока не включён, ничего не слушает', async () => {
		const { dismiss } = await setup(1)
		const handler = vi.fn()

		dismiss.events.on('dismiss', handler)
		press(document.body)

		expect(handler).not.toHaveBeenCalled()
	})

	it('включённый сообщает о нажатии снаружи', async () => {
		const { dismiss } = await setup(2)
		const handler = vi.fn()

		dismiss.events.on('dismiss', handler)
		dismiss.enabled = true
		press(document.body)

		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('нажатие внутрь владельца не считается', async () => {
		const { dismiss, element } = await setup(3)
		const handler = vi.fn()
		const inner = document.createElement('span')

		element.appendChild(inner)

		dismiss.events.on('dismiss', handler)
		dismiss.enabled = true
		press(inner)

		expect(handler).not.toHaveBeenCalled()
	})

	it('нажатие в телепортированную панель владельца не считается', async () => {
		// Панель лежит вне поддерева владельца, поэтому одного contains() мало
		const { dismiss } = await setup(4)
		const handler = vi.fn()
		const panel = document.createElement('div')

		// Так же, как это делает разметка: спред набора атрибутов на узел
		for (const [name, value] of Object.entries(dismiss.ownerAttribute)) {
			panel.setAttribute(name, value)
		}

		document.body.appendChild(panel)

		dismiss.events.on('dismiss', handler)
		dismiss.enabled = true
		press(panel)

		expect(handler).not.toHaveBeenCalled()
	})

	it('панель чужого владельца считается нажатием мимо', async () => {
		const { dismiss } = await setup(5)
		const handler = vi.fn()
		const foreign = document.createElement('div')

		foreign.dataset.owner = '999'
		document.body.appendChild(foreign)

		dismiss.events.on('dismiss', handler)
		dismiss.enabled = true
		press(foreign)

		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('выключение снимает слушателя', async () => {
		const { dismiss } = await setup(6)
		const handler = vi.fn()

		dismiss.events.on('dismiss', handler)
		dismiss.enabled = true
		dismiss.enabled = false
		press(document.body)

		expect(handler).not.toHaveBeenCalled()
	})

	it('ownerAttribute несёт uid владельца — им помечается панель', async () => {
		expect((await setup(7)).dismiss.ownerAttribute).toEqual({ 'data-owner': '7' })
	})

	it('перо закрывает на pointerdown, как мышь', async () => {
		const { dismiss } = await setup(8)
		const handler = vi.fn()

		dismiss.events.on('dismiss', handler)
		dismiss.enabled = true
		press(document.body, 'pen')

		expect(handler).toHaveBeenCalledTimes(1)
	})

	describe('касание пальцем', () => {
		it('pointerdown мимо не закрывает — с него же начинается прокрутка', async () => {
			const { dismiss } = await setup(9)
			const handler = vi.fn()

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			touch('pointerdown', document.body)

			expect(handler).not.toHaveBeenCalled()
		})

		it('pointerdown и pointerup мимо закрывают один раз', async () => {
			const { dismiss } = await setup(10)
			const handler = vi.fn()

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			touch('pointerdown', document.body)
			touch('pointerup', document.body)
			// Второе отпускание без нового касания ожидания уже не застаёт
			touch('pointerup', document.body)

			expect(handler).toHaveBeenCalledTimes(1)
		})

		it('после pointercancel не закрывает — касание ушло в прокрутку', async () => {
			const { dismiss } = await setup(11)
			const handler = vi.fn()

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			touch('pointerdown', document.body)
			touch('pointercancel', document.body)
			// Браузер после отмены pointerup не шлёт. Здесь он проверяет, что
			// ожидание сброшено, а не просто не дождалось отпускания
			touch('pointerup', document.body)

			expect(handler).not.toHaveBeenCalled()
		})

		it('pointerup чужого касания не закрывает', async () => {
			const { dismiss } = await setup(12)
			const handler = vi.fn()

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			touch('pointerdown', document.body, 1)
			touch('pointerup', document.body, 2)

			expect(handler).not.toHaveBeenCalled()
		})

		it('касание внутрь владельца не закрывает', async () => {
			const { dismiss, element } = await setup(13)
			const handler = vi.fn()
			const inner = document.createElement('span')

			element.appendChild(inner)

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			touch('pointerdown', inner)
			touch('pointerup', inner)

			expect(handler).not.toHaveBeenCalled()
		})

		it('касание внутрь снимает ожидание пальца, лежавшего мимо', async () => {
			// Один палец придерживает страницу, другой работает с панелью:
			// отпускание первого панель не закрывает
			const { dismiss, element } = await setup(14)
			const handler = vi.fn()
			const inner = document.createElement('span')

			element.appendChild(inner)

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			touch('pointerdown', document.body, 1)
			touch('pointerdown', inner, 2)
			touch('pointerup', inner, 2)
			touch('pointerup', document.body, 1)

			expect(handler).not.toHaveBeenCalled()
		})

		it('выключение сбрасывает ожидание касания', async () => {
			// Панель закрыли и открыли снова, пока палец лежал на странице:
			// отпускание того касания к новому открытию не относится
			const { dismiss } = await setup(15)
			const handler = vi.fn()

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			touch('pointerdown', document.body)
			dismiss.enabled = false
			dismiss.enabled = true
			touch('pointerup', document.body)

			expect(handler).not.toHaveBeenCalled()
		})
	})
})
