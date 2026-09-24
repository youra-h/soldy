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
	required,
	triggerResize,
} from './helpers'
import { TAnchorPlugin, TDismissPlugin, TElementPlugin, TPluginBundle } from '@soldy-ui/plugins'
import type { IDismissPluginOptions } from '@soldy-ui/plugins'
import { FRAME_LAYER_ATTRIBUTE, TFrame, TPopover } from '@soldy-ui/core'

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
 * Видимая область уже окна — так выглядит страница с классической полосой
 * прокрутки. Самого `visualViewport` в jsdom нет вовсе, поэтому подставляем
 * его сами; убирает подставленное общий `afterEach`.
 */
function visualViewportOf(width: number, height: number): void {
	Object.defineProperty(window, 'visualViewport', {
		value: { width, height },
		configurable: true,
	})
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
	// Подставленный `visualViewportOf`; у остальных тестов его и не было
	Reflect.deleteProperty(window, 'visualViewport')
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

	/**
	 * Высоту видимой области съедает горизонтальная полоса прокрутки — и
	 * съеденного хватает, чтобы панель перестала влезать снизу.
	 */
	it('места меряются по видимой области, а не по окну', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 300)
		const plugin = anchorFor(frame, panel.plugin)

		visualViewportOf(1000, 760)
		panel.plugin.element = panel.element
		await nextFrame()

		// Под якорем 320px по окну — панель в 300px влезла бы, — но 280px по
		// видимой области, и сверху места больше
		plugin.setAnchor(anchorAt({ left: 100, top: 400, bottom: 480, right: 220 }))

		expect(frame.dataset.get('placement')).toBe('top-start')
		expect(frame.y).toBe(100) // 400 - 300
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

	/**
	 * Полоса прокрутки рисуется поверх страницы, а `innerWidth` считает её
	 * своей: по краю окна панель пряталась бы под полосой полоской в её
	 * ширину. Границей служит видимая область.
	 */
	it('краем служит видимая область, а не окно: полоса прокрутки не съедает панель', async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 60)
		const plugin = anchorFor(frame, panel.plugin)

		visualViewportOf(985, 800)
		panel.plugin.element = panel.element
		await nextFrame()

		plugin.setAnchor(anchorAt({ left: 950, bottom: 250, right: 1050 }))

		expect(frame.x).toBe(865) // 985 - 120, а не 1000 - 120
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

/**
 * Колбэк наблюдателя якоря пишет во Frame `x`, `y` и `width`, адаптер тут же
 * перерисовывает панель, и её размер меняется в том же шаге наблюдения, где
 * браузер её уведомление уже не доставит. Поэтому на уведомление якоря плагин
 * снимает наблюдение панели и возвращает его следующим кадром.
 *
 * Заглушка сама ничего не присылает: срабатывание вызывает `triggerResize`, а
 * снято ли наблюдение, видно по `observerCount`.
 */
describe('пауза наблюдения панели на уведомление якоря', () => {
	/** Панель объявлена, якорь назначен: за каждым следит свой наблюдатель. */
	const anchored = async () => {
		const frame = new TFrame({ position: 'fixed' })
		const panel = panelOf(120, 60)
		const anchor = anchorAt({ left: 100, bottom: 250, right: 300 })
		const plugin = anchorFor(frame, panel.plugin)

		panel.plugin.element = panel.element
		await nextFrame()
		plugin.setAnchor(anchor)

		return { frame, panel, anchor, plugin }
	}

	it('уведомление якоря пересчитывает координаты и снимает наблюдение панели до следующего кадра', async () => {
		const { frame, panel, anchor } = await anchored()

		anchor.getBoundingClientRect = () => new DOMRect(40, 0, 200, 250)
		triggerResize(anchor)

		expect(frame.x).toBe(40)
		expect(observerCount(panel.element)).toBe(0)

		await nextFrame()

		expect(observerCount(panel.element)).toBe(1)
	})

	/** `observe()` сразу присылает уведомление: пауза на нём зациклилась бы. */
	it('уведомление панели её наблюдение не снимает', async () => {
		const { panel } = await anchored()

		triggerResize(panel.element)

		expect(observerCount(panel.element)).toBe(1)
	})

	/** Без возврата панель осталась бы без наблюдателя, хотя сама никуда не делась. */
	it('removeAnchor до кадра возврат не отменяет: панель снова наблюдается', async () => {
		const { panel, anchor, plugin } = await anchored()

		triggerResize(anchor)
		plugin.removeAnchor()
		await nextFrame()

		expect(observerCount(panel.element)).toBe(1)
	})

	it('removed до кадра: за панелью не остаётся наблюдателя', async () => {
		const { panel, anchor } = await anchored()

		triggerResize(anchor)
		panel.plugin.element = null
		await nextFrame()

		expect(observerCount(panel.element)).toBe(0)
	})

	it('destroy до кадра: за панелью не остаётся наблюдателя', async () => {
		const { panel, anchor, plugin } = await anchored()

		triggerResize(anchor)
		plugin.destroy()
		await nextFrame()

		expect(observerCount(panel.element)).toBe(0)
	})

	/**
	 * Новый узел приходит прямым эмитом `ready`, без `removed` — как в тесте
	 * наблюдателя панели выше: проверяется сам плагин.
	 */
	it('новый ready до кадра: прежний узел не наблюдается, новый — одним наблюдателем', async () => {
		const { panel, anchor } = await anchored()
		const next = panelOf(120, 60)

		triggerResize(anchor)
		panel.plugin.events.emit('ready', next.element)
		await nextFrame()

		expect(observerCount(panel.element)).toBe(0)
		expect(observerCount(next.element)).toBe(1)
	})

	/** Второе уведомление до кадра не заводит второго возврата, который `removed` не отменил бы. */
	it('повторное уведомление якоря до кадра: removed всё равно отменяет возврат', async () => {
		const { panel, anchor } = await anchored()

		triggerResize(anchor)
		triggerResize(anchor)
		panel.plugin.element = null
		await nextFrame()

		expect(observerCount(panel.element)).toBe(0)
	})
})

describe('нажатие мимо', () => {
	const setup = async (uid: number, options?: IDismissPluginOptions) => {
		const element = document.createElement('div')

		document.body.appendChild(element)

		const elementPlugin = new TElementPlugin()
		const dismiss = new TDismissPlugin()

		dismiss.install(createPluginContext({ uid }, [elementPlugin]), options)

		elementPlugin.element = element
		await nextFrame()

		return { dismiss, element, elementPlugin }
	}

	/** Мышь: решение принимается на самом нажатии. */
	const press = (target: Element) =>
		target.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
		)

	/**
	 * Совместимый `mousedown`. Браузер шлёт его вслед за нажатием: у мыши и
	 * пера планшета — сразу за `pointerdown`, у касания и стилуса на экране —
	 * после `pointerup`. jsdom его не шлёт, поэтому тест ставит его сам, туда,
	 * где он пришёл бы на устройстве.
	 */
	const mouseDown = (target: Element): MouseEvent => {
		const event = new MouseEvent('mousedown', { bubbles: true })

		target.dispatchEvent(event)

		return event
	}

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

	/**
	 * Шаг пера. Какое перед нами устройство, браузер выражает только порядком
	 * событий, а его jsdom не воспроизводит: `pointercancel` и совместимый
	 * `mousedown` тест ставит сам. Отдаёт событие — по нему видно, что именно
	 * решило закрытие.
	 */
	const pen = (
		type: 'pointerdown' | 'pointerup' | 'pointercancel',
		target: Element,
		pointerId = 1,
	): PointerEvent => {
		const event = new PointerEvent(type, { bubbles: true, pointerType: 'pen', pointerId })

		target.dispatchEvent(event)

		return event
	}

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

	it('мышь: pointerdown и совместимый mousedown мимо закрывают один раз', async () => {
		// Мышь решена на pointerdown, mousedown ей ничего не добавляет. У инстанса
		// здесь нет `open`, слушатели после закрытия не снимаются, и второе
		// закрытие на mousedown было бы видно
		const { dismiss } = await setup(8)
		const handler = vi.fn<(event: MouseEvent | FocusEvent) => void>()

		dismiss.events.on('dismiss', handler)
		dismiss.enabled = true
		press(document.body)
		mouseDown(document.body)

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.lastCall?.[0]).toBeInstanceOf(PointerEvent)
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

		it('совместимый mousedown ожидание касания не решает', async () => {
			// Решает только pointerup: прослойки, которые шлют mousedown на
			// touchstart, иначе вернули бы закрытие в начале прокрутки
			const { dismiss } = await setup(16)
			const handler = vi.fn()

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			touch('pointerdown', document.body)
			mouseDown(document.body)

			expect(handler).not.toHaveBeenCalled()

			// И не снимает: отпускание того же касания закрывает, как обычно
			touch('pointerup', document.body)

			expect(handler).toHaveBeenCalledTimes(1)
		})
	})

	describe('перо', () => {
		it('pointerdown мимо не закрывает — стилус на экране с него начинает прокрутку', async () => {
			const { dismiss } = await setup(17)
			const handler = vi.fn()

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			pen('pointerdown', document.body)

			expect(handler).not.toHaveBeenCalled()
		})

		it('планшет: mousedown сразу за pointerdown закрывает, pointerup не повторяет', async () => {
			// Перо планшета шлёт mousedown, а с ним и смену фокуса, сразу за
			// pointerdown: панель закрывается на нём, до смены фокуса
			const { dismiss } = await setup(18)
			const handler = vi.fn<(event: MouseEvent | FocusEvent) => void>()

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			pen('pointerdown', document.body)
			const mouse = mouseDown(document.body)
			pen('pointerup', document.body)

			expect(handler).toHaveBeenCalledTimes(1)
			expect(handler.mock.lastCall?.[0]).toBe(mouse)
		})

		it('экран: pointerup закрывает, совместимый mousedown после него не повторяет', async () => {
			// Стилусу на экране совместимые события мыши приходят только после отпускания
			const { dismiss } = await setup(19)
			const handler = vi.fn<(event: MouseEvent | FocusEvent) => void>()

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			pen('pointerdown', document.body)
			const up = pen('pointerup', document.body)
			mouseDown(document.body)

			expect(handler).toHaveBeenCalledTimes(1)
			expect(handler.mock.lastCall?.[0]).toBe(up)
		})

		it('после pointercancel не закрывают ни pointerup, ни mousedown — стилус ушёл в прокрутку', async () => {
			const { dismiss } = await setup(20)
			const handler = vi.fn()

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			pen('pointerdown', document.body)
			pen('pointercancel', document.body)
			// После отмены браузер не шлёт ни того, ни другого. Здесь они
			// проверяют, что ожидание сброшено, а не просто не дождалось
			pen('pointerup', document.body)
			mouseDown(document.body)

			expect(handler).not.toHaveBeenCalled()
		})

		it('перо внутрь владельца не закрывает', async () => {
			const { dismiss, element } = await setup(21)
			const handler = vi.fn()
			const inner = document.createElement('span')

			element.appendChild(inner)

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			pen('pointerdown', inner)
			mouseDown(inner)
			pen('pointerup', inner)

			expect(handler).not.toHaveBeenCalled()
		})

		it('мышь, нажатая внутрь, пока перо лежит мимо, не закрывает', async () => {
			// Ожидание одно — для последнего нажатия. Иначе mousedown мыши
			// засчитался бы за перо
			const { dismiss, element } = await setup(22)
			const handler = vi.fn()
			const inner = document.createElement('span')

			element.appendChild(inner)

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			pen('pointerdown', document.body)
			press(inner)
			mouseDown(inner)
			pen('pointerup', document.body)

			expect(handler).not.toHaveBeenCalled()
		})

		it('выключение сбрасывает ожидание пера', async () => {
			// Панель закрыли и открыли снова, пока перо лежало на странице:
			// ни его mousedown, ни отпускание к новому открытию не относятся
			const { dismiss } = await setup(23)
			const handler = vi.fn()

			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			pen('pointerdown', document.body)
			dismiss.enabled = false
			dismiss.enabled = true
			mouseDown(document.body)
			pen('pointerup', document.body)

			expect(handler).not.toHaveBeenCalled()
		})
	})

	/** Панель владельца так, как её рисует разметка: пометка владельцем и слой Frame. */
	const ownPanel = (dismiss: TDismissPlugin, layer: number | null): HTMLElement => {
		const panel = document.createElement('div')

		for (const [name, value] of Object.entries(dismiss.ownerAttribute)) {
			panel.setAttribute(name, value)
		}

		if (layer !== null) panel.setAttribute(FRAME_LAYER_ATTRIBUTE, String(layer))

		document.body.appendChild(panel)

		return panel
	}

	/** Чужая панель — соседка своей в `body`, со своим слоем. Отдаёт узел внутри неё. */
	const layerAt = (layer: number): HTMLElement => {
		const panel = document.createElement('div')
		const inner = document.createElement('button')

		panel.setAttribute(FRAME_LAYER_ATTRIBUTE, String(layer))
		panel.appendChild(inner)
		document.body.appendChild(panel)

		return inner
	}

	/** `focusin` так, как его шлёт браузер: всплывает от получившего фокус. */
	const focusIn = (target: Element) =>
		target.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

	/**
	 * Панели телепортированы в `body` соседями: вложенность «список Select в
	 * поповере» видна только по номеру слоя Frame.
	 */
	describe('слои', () => {
		it('нажатие в панель слоя выше своей — внутри', async () => {
			const { dismiss } = await setup(30)
			const handler = vi.fn()

			ownPanel(dismiss, 1001)
			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			press(layerAt(1002))

			expect(handler).not.toHaveBeenCalled()
		})

		it('нажатие в панель слоя ниже своей — мимо', async () => {
			const { dismiss } = await setup(31)
			const handler = vi.fn()

			ownPanel(dismiss, 1002)
			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			press(layerAt(1001))

			expect(handler).toHaveBeenCalledTimes(1)
		})

		it('нажатие в узел без слоя — мимо', async () => {
			const { dismiss } = await setup(32)
			const handler = vi.fn()
			const plain = document.createElement('button')

			document.body.appendChild(plain)
			ownPanel(dismiss, 1001)
			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			press(plain)

			expect(handler).toHaveBeenCalledTimes(1)
		})

		it('у своей панели слоя нет — чужой слой не в счёт, нажатие мимо', async () => {
			const { dismiss } = await setup(33)
			const handler = vi.fn()

			ownPanel(dismiss, null)
			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			press(layerAt(1002))

			expect(handler).toHaveBeenCalledTimes(1)
		})
	})

	describe('уход фокуса', () => {
		it('focusOutside по умолчанию выключен: фокус мимо не закрывает', async () => {
			const { dismiss } = await setup(40)
			const handler = vi.fn()
			const outside = document.createElement('button')

			document.body.appendChild(outside)
			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			focusIn(outside)

			expect(handler).not.toHaveBeenCalled()
		})

		it('с focusOutside фокус мимо даёт dismiss с FocusEvent', async () => {
			const { dismiss } = await setup(41, { focusOutside: true })
			const handler = vi.fn<(event: MouseEvent | FocusEvent) => void>()
			const outside = document.createElement('button')

			document.body.appendChild(outside)
			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			focusIn(outside)

			expect(handler).toHaveBeenCalledTimes(1)
			expect(handler.mock.lastCall?.[0]).toBeInstanceOf(FocusEvent)
		})

		it('фокус внутрь владельца и в его панель — не мимо', async () => {
			const { dismiss, element } = await setup(42, { focusOutside: true })
			const handler = vi.fn()
			const inner = document.createElement('button')
			const panel = ownPanel(dismiss, 1001)
			const inPanel = document.createElement('button')

			element.appendChild(inner)
			panel.appendChild(inPanel)
			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			focusIn(inner)
			focusIn(inPanel)
			focusIn(panel)

			expect(handler).not.toHaveBeenCalled()
		})

		it('фокус в слой выше своей панели — внутри, в слой ниже — мимо', async () => {
			const { dismiss } = await setup(43, { focusOutside: true })
			const handler = vi.fn()

			ownPanel(dismiss, 1002)
			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			focusIn(layerAt(1003))

			expect(handler).not.toHaveBeenCalled()

			focusIn(layerAt(1001))

			expect(handler).toHaveBeenCalledTimes(1)
		})

		it('выключенный фокус не слушает', async () => {
			const { dismiss } = await setup(44, { focusOutside: true })
			const handler = vi.fn()
			const outside = document.createElement('button')

			document.body.appendChild(outside)
			dismiss.events.on('dismiss', handler)
			dismiss.enabled = true
			dismiss.enabled = false
			focusIn(outside)

			expect(handler).not.toHaveBeenCalled()
		})
	})

	describe('панель владельца', () => {
		it('findPanel находит узел с ownerAttribute в документе корня', async () => {
			const { dismiss } = await setup(50)
			const panel = ownPanel(dismiss, 1001)

			expect(dismiss.findPanel()).toBe(panel)
		})

		it('до объявления корня панели нет', () => {
			const dismiss = new TDismissPlugin()

			dismiss.install(createPluginContext({ uid: 51 }, [new TElementPlugin()]))
			ownPanel(dismiss, 1001)

			expect(dismiss.findPanel()).toBeNull()
		})
	})

	/**
	 * Владельца закрывает сам плагин — после подписчиков `dismiss`. Иначе они
	 * узнавали бы о нажатии мимо уже закрытыми и не отличали его от закрытия
	 * по другой причине: плагин фокуса Popover по нему не возвращает фокус.
	 */
	describe('порядок: сообщить, потом закрыть', () => {
		const bound = async () => {
			const owner = new TPopover({ open: true })
			const element = document.createElement('div')
			const elementPlugin = new TElementPlugin()
			const dismiss = new TDismissPlugin()

			document.body.appendChild(element)
			dismiss.install(createPluginContext(owner, [elementPlugin]))
			elementPlugin.element = element
			await nextFrame()

			return { owner, dismiss }
		}

		it('подписчик dismiss застаёт владельца открытым, закрывается владелец после', async () => {
			const { owner, dismiss } = await bound()
			const seen: boolean[] = []

			dismiss.events.on('dismiss', () => seen.push(owner.open))
			press(document.body)

			expect(seen).toEqual([true])
			expect(owner.open).toBe(false)
		})

		it('закрытый владелец снимает слушателя: второе нажатие ничего не шлёт', async () => {
			const { dismiss } = await bound()
			const handler = vi.fn()

			dismiss.events.on('dismiss', handler)
			press(document.body)
			press(document.body)

			expect(handler).toHaveBeenCalledTimes(1)
			expect(dismiss.enabled).toBe(false)
		})
	})

	/**
	 * Свой `ctrl` приложения переживает перемонтирование: набор уничтожен, а
	 * владелец живёт дальше и открывается снова. Уничтоженный плагин подписку
	 * на его открытость снимает — иначе на владельце копились бы обработчики
	 * мёртвых плагинов.
	 */
	describe('уничтожение', () => {
		it('владелец, переживший набор, уничтоженный плагин не включает', () => {
			const owner = new TPopover()
			const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TDismissPlugin)
			const dismiss = required(bundle.get(TDismissPlugin), 'TDismissPlugin')
			const seen: boolean[] = []

			dismiss.events.on('change:enabled', (value) => seen.push(value))

			owner.open = true
			bundle.destroy()
			owner.open = false
			owner.open = true

			expect(seen).toEqual([true])
		})
	})
})
