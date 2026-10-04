// @vitest-environment jsdom

/**
 * TSwipePlugin — жест слоя: смахнуть панель, чтобы закрыть. Выезжающая
 * панель уходит к своему краю, поповер — от триггера, а внутри контейнера —
 * вниз.
 *
 * Разметку тест строит сам — у выезжающей панели корень с полосой, заголовком
 * и телом, у поповера корень с триггером и панель с пометкой владельцем, наборы
 * ядра на узлах, как их кладёт Vue, — а плагины собраны настоящим набором.
 * Коробку панели задаёт тест: jsdom раскладку не считает. Время событий тоже
 * задаёт тест — по нему плагин считает скорость в конце жеста. Захвата
 * указателя в jsdom нет, поэтому события тест шлёт прямо в узлы; настоящий
 * ввод — `playground/vue/browser/drawer.spec.ts` и
 * `playground/vue/browser/popover.spec.ts`.
 */

import { describe, it, expect, expectTypeOf, afterEach, vi } from 'vitest'
import { TButton, TDrawer, TLayer, TPopover, isSwipeable } from '@soldy-ui/core'
import type { IDrawerProps, IPopoverProps, TCloseReason, TDrawerPlacement } from '@soldy-ui/core'
import { TDismissPlugin, TElementPlugin, TPluginBundle, TSwipePlugin } from '../src'
import type { IPlugin, IPluginConstructor, ISwipeOwner } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Переменная сдвига панели во время жеста — контракт плагина с темой. */
const SWIPE_VARIABLE = '--s-swipe-offset'

/**
 * Указатель: событие с точкой и временем, всплывает до панели. Отдаёт
 * событие — по нему видно, погашено ли.
 */
function pointer(
	type: string,
	target: Element,
	x: number,
	y: number,
	time: number,
	init: PointerEventInit = {},
): PointerEvent {
	const event = new PointerEvent(type, {
		bubbles: true,
		cancelable: true,
		clientX: x,
		clientY: y,
		pointerId: 1,
		pointerType: 'mouse',
		button: 0,
		isPrimary: true,
		...init,
	})

	Object.defineProperty(event, 'timeStamp', { value: time })
	target.dispatchEvent(event)

	return event
}

/**
 * Жест по панели: нажатие на `target`, протяжка по точкам через `step` мс и
 * отпускание в последней — протяжка и отпускание приходят панели, как с
 * захватом указателя. Точки — `[x, y]`.
 */
const swipeOn =
	(panel: Element) =>
	(target: Element, path: [number, number][], step = 16): void => {
		const [start, ...rest] = path

		pointer('pointerdown', target, start[0], start[1], 0)
		rest.forEach(([x, y], index) => pointer('pointermove', panel, x, y, (index + 1) * step))

		const [x, y] = rest[rest.length - 1] ?? start

		pointer('pointerup', panel, x, y, rest.length * step)
	}

/** Плагин, который тест поставил сам: без него дальше проверять нечего. */
function pluginOf<P extends IPlugin<any, any>>(
	bundle: TPluginBundle,
	ctor: IPluginConstructor<any, any, P>,
): P {
	const plugin = bundle.get(ctor)

	if (!plugin) throw new Error(`${ctor.name} не установлен в bundle`)

	return plugin
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function nodeOf(selector: string, scope: ParentNode = document): HTMLElement {
	const node = scope.querySelector(selector)

	if (!(node instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return node
}

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	document.getSelection()?.removeAllRanges()
	document.body.innerHTML = ''
	TLayer.resetZIndexCounter()
})

/**
 * Коробка панели у своего края окна 1000 × 800: боковая — 300 px шириной,
 * верхняя и нижняя — 400 px высотой.
 */
const BOXES: Record<TDrawerPlacement, DOMRect> = {
	end: new DOMRect(700, 0, 300, 800),
	start: new DOMRect(0, 0, 300, 800),
	top: new DOMRect(0, 0, 1000, 400),
	bottom: new DOMRect(0, 400, 1000, 400),
}

/** Наборы ядра — на узел, как их раскладывает разметка. */
function applyDataset(root: HTMLElement, drawer: TDrawer): void {
	for (const [name, value] of Object.entries(drawer.dataset.toObject())) {
		if (value !== null) root.setAttribute(name, value)
	}
}

type TMountOptions = { dir?: 'ltr' | 'rtl' }

/**
 * Открытая панель на странице: полоса, заголовок и тело с текстом и кнопкой.
 * Жест по умолчанию — за полосу.
 */
async function mount(props: Partial<IDrawerProps> = {}, { dir = 'ltr' }: TMountOptions = {}) {
	const drawer = new TDrawer({ visible: true, swipe: 'handle', ...props })
	// Открытость модального слоя — `visible`, как в дескрипторе Drawer
	const bundle = new TPluginBundle(drawer)
		.use(TElementPlugin)
		.use(TSwipePlugin, { property: 'visible' })

	bundles.push(bundle)

	const root = document.createElement('div')

	root.dir = dir
	root.tabIndex = -1
	root.className = drawer.classes.base
	root.innerHTML = [
		`<div class="${drawer.classes.resolve('__handle')}"></div>`,
		'<h2 class="s-test-title">Заголовок</h2>',
		'<div class="s-test-body"><p class="s-test-text">Текст</p><button class="s-test-button">Действие</button></div>',
	].join('')

	applyDataset(root, drawer)
	document.body.append(root)
	vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(BOXES[drawer.placement])

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	const handle = nodeOf(`.${drawer.classes.resolve('__handle')}`, root)
	const reasons: TCloseReason[] = []

	drawer.events.on('close:before', (event) => reasons.push(event.reason))

	/** Жест по корню: у выезжающей панели корень и есть панель. */
	const swipe = swipeOn(root)

	/** Сдвиг панели во время жеста: переменная темы на корне. */
	const offset = () => root.style.getPropertyValue(SWIPE_VARIABLE)

	return { drawer, bundle, root, handle, reasons, pointer, swipe, offset }
}

describe('когда жест включён', () => {
	it('за полосу — касание вдоль оси забирает жест: touch-action на корне', async () => {
		const { root } = await mount()

		expect(root.style.touchAction).toBe('pan-y pinch-zoom')
	})

	it('у верхнего и нижнего края — вертикальная ось', async () => {
		const { root } = await mount({ placement: 'bottom' })

		expect(root.style.touchAction).toBe('pan-x pinch-zoom')
	})

	it('без жеста и у закрытой панели корень не тронут и нажатия не слушаются', async () => {
		const { drawer, root, handle, pointer } = await mount({ swipe: 'none' })

		expect(root.style.touchAction).toBe('')

		pointer('pointerdown', handle, 700, 400, 0)
		pointer('pointermove', root, 900, 400, 16)

		expect(drawer.swiping).toBe(false)
	})

	it('выключили жест и закрыли панель — touch-action возвращается прежний', async () => {
		const { drawer, root } = await mount()

		drawer.swipe = 'none'

		expect(root.style.touchAction).toBe('')

		drawer.swipe = 'panel'

		expect(root.style.touchAction).toBe('pan-y pinch-zoom')

		drawer.hide()

		expect(root.style.touchAction).toBe('')
	})

	it('смена края меняет ось касания', async () => {
		const { drawer, root } = await mount()

		drawer.placement = 'top'

		expect(root.style.touchAction).toBe('pan-x pinch-zoom')
	})
})

describe('нажатие становится жестом', () => {
	it('за полосу: нажатие погашено, до порога жеста ещё нет', async () => {
		const { drawer, root, handle, pointer } = await mount()

		const down = pointer('pointerdown', handle, 705, 400, 0)

		expect(down.defaultPrevented).toBe(true)

		pointer('pointermove', root, 709, 400, 16)

		expect(drawer.swiping).toBe(false)

		pointer('pointermove', root, 720, 400, 32)

		expect(drawer.swiping).toBe(true)
		expect(drawer.dataset.get('swiping')).toBe('true')
	})

	it('за полосу: нажатие мимо неё жеста не начинает', async () => {
		const { drawer, root, pointer } = await mount()

		pointer('pointerdown', nodeOf('.s-test-title'), 750, 100, 0)
		pointer('pointermove', root, 900, 100, 16)

		expect(drawer.swiping).toBe(false)
	})

	it('поперёк оси — не жест панели: нажатие отпускается', async () => {
		const { drawer, root, handle, pointer } = await mount()

		pointer('pointerdown', handle, 705, 400, 0)
		pointer('pointermove', root, 710, 440, 16)
		pointer('pointermove', root, 800, 440, 32)

		expect(drawer.swiping).toBe(false)
	})

	it('не основная кнопка и второй палец жеста не начинают', async () => {
		const { drawer, root, handle, pointer } = await mount()

		pointer('pointerdown', handle, 705, 400, 0, { button: 2 })
		pointer('pointermove', root, 800, 400, 16)

		expect(drawer.swiping).toBe(false)

		pointer('pointerdown', handle, 705, 400, 32, { isPrimary: false, pointerId: 2 })
		pointer('pointermove', root, 800, 400, 48, { pointerId: 2 })

		expect(drawer.swiping).toBe(false)
	})

	describe('за всю панель', () => {
		it('с любого места, кроме контролов, нажатие своего действия не теряет', async () => {
			const { drawer, root, pointer } = await mount({ swipe: 'panel' })

			const down = pointer('pointerdown', nodeOf('.s-test-text'), 750, 300, 0)

			expect(down.defaultPrevented).toBe(false)

			pointer('pointermove', root, 800, 300, 16)

			expect(drawer.swiping).toBe(true)
		})

		it('с кнопки внутри — нет: с контролом работают сами', async () => {
			const { drawer, root, pointer } = await mount({ swipe: 'panel' })

			pointer('pointerdown', nodeOf('.s-test-button'), 750, 300, 0)
			pointer('pointermove', root, 800, 300, 16)

			expect(drawer.swiping).toBe(false)
		})

		it('из области, которая прокручивается вдоль оси, — нет', async () => {
			const { drawer, root, pointer } = await mount({ swipe: 'panel' })
			const body = nodeOf('.s-test-body')

			body.style.overflowX = 'auto'
			Object.defineProperty(body, 'scrollWidth', { value: 600 })
			Object.defineProperty(body, 'clientWidth', { value: 300 })

			pointer('pointerdown', nodeOf('.s-test-text'), 750, 300, 0)
			pointer('pointermove', root, 800, 300, 16)

			expect(drawer.swiping).toBe(false)
		})

		it('когда в панели выделен текст — нет: тянут выделение', async () => {
			const { drawer, root, pointer } = await mount({ swipe: 'panel' })
			const range = document.createRange()

			range.selectNodeContents(nodeOf('.s-test-text'))
			document.getSelection()?.addRange(range)

			pointer('pointerdown', nodeOf('.s-test-title'), 750, 100, 0)
			pointer('pointermove', root, 800, 100, 16)

			expect(drawer.swiping).toBe(false)
		})

		it('жест гасит выделение до конца и возвращает его после', async () => {
			const { root, pointer } = await mount({ swipe: 'panel' })

			pointer('pointerdown', nodeOf('.s-test-text'), 750, 300, 0)
			pointer('pointermove', root, 800, 300, 16)

			expect(root.style.userSelect).toBe('none')

			pointer('pointerup', root, 800, 300, 400)

			expect(root.style.userSelect).toBe('')
		})
	})

	it('в панели, открытой внутри этой, жест — её, а не этой', async () => {
		const { drawer, root, pointer } = await mount({ swipe: 'panel' })
		const nested = document.createElement('div')

		// Вложенная панель — свой слой: номер у неё свой
		nested.setAttribute('data-layer', '9999')
		nested.innerHTML = '<p class="s-test-nested">Вложенная</p>'
		root.append(nested)

		pointer('pointerdown', nodeOf('.s-test-nested'), 750, 300, 0)
		pointer('pointermove', root, 800, 300, 16)

		expect(drawer.swiping).toBe(false)
	})
})

describe('панель идёт за указателем', () => {
	it('к краю — сдвиг со знаком оси окна: у правого края вправо', async () => {
		const { root, handle, pointer, offset } = await mount()

		pointer('pointerdown', handle, 705, 400, 0)
		pointer('pointermove', root, 785, 400, 16)

		expect(offset()).toBe('80px')
	})

	it.each<[TDrawerPlacement, 'ltr' | 'rtl', [number, number], [number, number], string]>([
		['start', 'ltr', [295, 400], [215, 400], '-80px'],
		['end', 'rtl', [5, 400], [-75, 400], '-80px'],
		['start', 'rtl', [705, 400], [785, 400], '80px'],
		['bottom', 'ltr', [500, 405], [500, 485], '80px'],
		['top', 'ltr', [500, 395], [500, 315], '-80px'],
	])('%s в %s — к своему краю', async (placement, dir, from, to, expected) => {
		const { root, handle, pointer, offset } = await mount({ placement }, { dir })

		pointer('pointerdown', handle, from[0], from[1], 0)
		pointer('pointermove', root, to[0], to[1], 16)

		expect(offset()).toBe(expected)
	})

	it('к краю — не дальше своего размера', async () => {
		const { root, handle, pointer, offset } = await mount()

		pointer('pointerdown', handle, 705, 400, 0)
		pointer('pointermove', root, 1400, 400, 16)

		expect(offset()).toBe('300px')
	})

	it('от края — с сопротивлением: отходит, но не дальше предела', async () => {
		const { root, handle, pointer, offset } = await mount()

		pointer('pointerdown', handle, 705, 400, 0)
		pointer('pointermove', root, 681, 400, 16)

		// 24 px от края — половина предела
		expect(offset()).toBe('-12px')

		pointer('pointermove', root, 0, 400, 32)

		const pulled = Number.parseFloat(offset())

		expect(pulled).toBeLessThan(0)
		expect(pulled).toBeGreaterThan(-24)
	})
})

describe('отпустили', () => {
	it('дальше четверти размера — закрытие запросом с причиной swipe', async () => {
		const { drawer, handle, swipe, reasons } = await mount()

		// Медленно: 90 px за 600 мс — дело в пути, а не в скорости
		swipe(
			handle,
			[
				[705, 400],
				[735, 400],
				[765, 400],
				[795, 400],
			],
			200,
		)

		expect(reasons).toEqual(['swipe'])
		expect(drawer.visible).toBe(false)
		expect(drawer.swiping).toBe(false)
	})

	it('ближе четверти и медленно — панель возвращается: сдвиг уходит кадром позже', async () => {
		const { drawer, handle, swipe, reasons, offset } = await mount()

		swipe(
			handle,
			[
				[705, 400],
				[725, 400],
				[745, 400],
			],
			200,
		)

		expect(reasons).toEqual([])
		expect(drawer.visible).toBe(true)
		// Признак «тянут» снят сразу — переход у темы снова включён
		expect(drawer.swiping).toBe(false)
		expect(offset()).toBe('40px')

		await nextFrame()

		expect(offset()).toBe('')
	})

	it('быстро к краю — закрытие, как ни мал путь', async () => {
		const { drawer, handle, swipe, reasons } = await mount()

		// 40 px за 32 мс — больше 0,4 px/мс
		swipe(handle, [
			[705, 400],
			[725, 400],
			[745, 400],
		])

		expect(reasons).toEqual(['swipe'])
		expect(drawer.visible).toBe(false)
	})

	it('быстро, но от края — не закрытие', async () => {
		const { drawer, handle, swipe } = await mount()

		swipe(handle, [
			[705, 400],
			[685, 400],
			[665, 400],
		])

		expect(drawer.visible).toBe(true)
	})

	it('остановился перед отпусканием — скорость не в счёт', async () => {
		const { drawer, root, handle, pointer } = await mount()

		pointer('pointerdown', handle, 705, 400, 0)
		pointer('pointermove', root, 725, 400, 16)
		pointer('pointermove', root, 745, 400, 32)
		pointer('pointerup', root, 745, 400, 500)

		expect(drawer.visible).toBe(true)
	})

	it('отменённое close:before — панель остаётся и возвращается', async () => {
		const { drawer, handle, swipe, offset } = await mount()

		drawer.events.on('close:before', (event) => event.preventDefault())

		swipe(
			handle,
			[
				[705, 400],
				[805, 400],
				[905, 400],
			],
			200,
		)

		expect(drawer.visible).toBe(true)
		expect(drawer.swiping).toBe(false)

		await nextFrame()

		expect(offset()).toBe('')
	})

	it('жест закрывает и при dismissible: false', async () => {
		const { drawer, handle, swipe, reasons } = await mount({ dismissible: false })

		swipe(
			handle,
			[
				[705, 400],
				[805, 400],
				[905, 400],
			],
			200,
		)

		expect(reasons).toEqual(['swipe'])
		expect(drawer.visible).toBe(false)
	})

	it('браузер отнял указатель — не решение пользователя: панель возвращается', async () => {
		const { drawer, root, handle, pointer, reasons } = await mount()

		pointer('pointerdown', handle, 705, 400, 0)
		pointer('pointermove', root, 905, 400, 16)
		pointer('pointercancel', root, 905, 400, 32)

		expect(reasons).toEqual([])
		expect(drawer.visible).toBe(true)
		expect(drawer.swiping).toBe(false)
	})

	it('click, которым кончается жест, погашен; следующий — нет', async () => {
		const { root, handle, swipe } = await mount()
		const click = () =>
			root.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

		swipe(
			handle,
			[
				[705, 400],
				[725, 400],
				[745, 400],
			],
			200,
		)

		expect(click()).toBe(false)
		expect(click()).toBe(true)
	})

	it('нажатие без жеста click не гасит', async () => {
		const { root, handle, pointer } = await mount()

		pointer('pointerdown', handle, 705, 400, 0)
		pointer('pointerup', root, 706, 400, 16)

		expect(
			root.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
		).toBe(true)
	})
})

describe('жест выключили посреди жеста', () => {
	it('закрыли панель — жест кончен, сдвига и следов на корне нет', async () => {
		const { drawer, root, handle, pointer, offset } = await mount({ swipe: 'panel' })

		pointer('pointerdown', handle, 705, 400, 0)
		pointer('pointermove', root, 805, 400, 16)

		drawer.visible = false

		expect(drawer.swiping).toBe(false)
		expect(offset()).toBe('')
		expect(root.style.userSelect).toBe('')
		expect(root.style.touchAction).toBe('')
	})

	it('после destroy плагин владельца не слушает: жест не включается', async () => {
		const { drawer, bundle, root } = await mount({ swipe: 'none' })
		const plugin = pluginOf(bundle, TSwipePlugin)

		plugin.destroy()
		drawer.swipe = 'handle'

		expect(root.style.touchAction).toBe('')
	})
})

/** Коробка панели поповера: 300 × 200, под триггером, в окне 1000 × 800. */
const POPOVER_BOX = new DOMRect(100, 300, 300, 200)

type TPopoverMountOptions = {
	/**
	 * Сторона панели после flip — `data-placement`, который плагин якоря пишет
	 * в саму панель; `null` — атрибута нет
	 */
	placement?: string | null
}

/**
 * Открытый поповер: корень с триггером и панель с пометкой владельцем — в
 * конце `body`, а внутри контейнера (`contained`) — в самом корне. На панели —
 * номер слоя, как у Frame, полоса и содержимое с текстом и кнопкой. Жест по
 * умолчанию — за полосу.
 */
async function mountPopover(
	props: Partial<IPopoverProps> = {},
	{ placement = 'bottom-start' }: TPopoverMountOptions = {},
) {
	const popover = new TPopover({ open: true, swipe: 'handle', ...props })
	const bundle = new TPluginBundle(popover)
		.use(TElementPlugin)
		.use(TDismissPlugin)
		.use(TSwipePlugin)

	bundles.push(bundle)

	const root = document.createElement('span')
	const panel = document.createElement('div')

	root.className = popover.classes.base
	root.innerHTML = '<button class="s-test-trigger">Открыть</button>'

	for (const [name, value] of Object.entries(pluginOf(bundle, TDismissPlugin).ownerAttribute)) {
		panel.setAttribute(name, value)
	}

	// Панель — Frame, свой слой
	panel.setAttribute('data-layer', '1001')

	if (placement !== null) panel.setAttribute('data-placement', placement)

	panel.tabIndex = -1
	panel.innerHTML = [
		`<div class="${popover.classes.resolve('__handle')}"></div>`,
		'<div class="s-test-content"><p class="s-test-text">Текст</p><button class="s-test-button">Действие</button></div>',
	].join('')

	document.body.append(root)

	if (popover.contained) {
		root.append(panel)
	} else {
		document.body.append(panel)
	}

	vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(POPOVER_BOX)

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	const handle = nodeOf(`.${popover.classes.resolve('__handle')}`, panel)
	const changes: boolean[] = []

	popover.events.on('change:open', (value) => changes.push(value))

	/** Сдвиг панели во время жеста: переменная темы на панели. */
	const offset = () => panel.style.getPropertyValue(SWIPE_VARIABLE)

	return { popover, bundle, root, panel, handle, changes, swipe: swipeOn(panel), offset }
}

describe('поповер', () => {
	it('тянут панель, а не корень: касание вдоль оси забирает жест на панели', async () => {
		const { root, panel } = await mountPopover()

		expect(panel.style.touchAction).toBe('pan-x pinch-zoom')
		expect(root.style.touchAction).toBe('')
	})

	it('закрытый жест не слушает; открытие и выключенный жест — по подписке', async () => {
		const { popover, panel } = await mountPopover({ open: false })

		expect(panel.style.touchAction).toBe('')

		popover.open = true

		expect(panel.style.touchAction).toBe('pan-x pinch-zoom')

		popover.swipe = 'none'

		expect(panel.style.touchAction).toBe('')
	})

	it('под триггером — вниз от него, к триггеру — с сопротивлением', async () => {
		const { panel, handle, offset } = await mountPopover()

		pointer('pointerdown', handle, 250, 305, 0)
		pointer('pointermove', panel, 250, 385, 16)

		expect(offset()).toBe('80px')

		pointer('pointermove', panel, 250, 281, 32)

		// 24 px к триггеру — половина предела
		expect(offset()).toBe('-12px')
	})

	it('смахнули дальше четверти — закрыта записью open, жест кончен', async () => {
		const { popover, handle, swipe, changes } = await mountPopover()

		// Медленно: 60 px из 200 за 600 мс — дело в пути, а не в скорости
		swipe(
			handle,
			[
				[250, 305],
				[250, 325],
				[250, 345],
				[250, 365],
			],
			200,
		)

		expect(popover.open).toBe(false)
		expect(changes).toEqual([false])
		expect(popover.swiping).toBe(false)
	})

	it('ближе четверти и медленно — панель на месте: сдвиг уходит кадром позже', async () => {
		const { popover, handle, swipe, offset } = await mountPopover()

		swipe(
			handle,
			[
				[250, 305],
				[250, 325],
				[250, 345],
			],
			200,
		)

		expect(popover.open).toBe(true)
		expect(popover.swiping).toBe(false)
		expect(offset()).toBe('40px')

		await nextFrame()

		expect(offset()).toBe('')
	})

	it('над триггером (flip) — вверх: сторону плагин берёт с узла панели', async () => {
		const { popover, panel, handle, offset } = await mountPopover({}, { placement: 'top-end' })

		pointer('pointerdown', handle, 250, 495, 0)
		pointer('pointermove', panel, 250, 415, 16)

		expect(offset()).toBe('-80px')

		pointer('pointerup', panel, 250, 415, 400)

		expect(popover.open).toBe(false)
	})

	it('flip между жестами — сторона читается заново в начале жеста', async () => {
		const { popover, panel, handle, swipe } = await mountPopover()

		panel.setAttribute('data-placement', 'top-start')

		// Вниз — к триггеру, который теперь под панелью: не закрытие
		swipe(
			handle,
			[
				[250, 495],
				[250, 535],
				[250, 575],
			],
			200,
		)

		expect(popover.open).toBe(true)

		swipe(
			handle,
			[
				[250, 495],
				[250, 455],
				[250, 415],
			],
			200,
		)

		expect(popover.open).toBe(false)
	})

	it('внутри контейнера — вниз, стороны на узле не нужно', async () => {
		const { popover, root, panel, handle, swipe } = await mountPopover(
			{ contained: true },
			{ placement: null },
		)

		expect(root.contains(panel)).toBe(true)
		expect(popover.swipeSide).toBe('bottom')

		swipe(
			handle,
			[
				[250, 305],
				[250, 345],
				[250, 385],
			],
			200,
		)

		expect(popover.open).toBe(false)
	})

	it('у триггера без стороны на узле жест не начинается: уходить некуда', async () => {
		const { popover, panel, handle } = await mountPopover({}, { placement: null })

		pointer('pointerdown', handle, 250, 305, 0)
		pointer('pointermove', panel, 250, 385, 16)

		expect(popover.swiping).toBe(false)

		pointer('pointerup', panel, 250, 385, 400)

		expect(popover.open).toBe(true)
	})

	it('за всю панель — с текста, но не с кнопки', async () => {
		const { popover, panel } = await mountPopover({ swipe: 'panel' })

		pointer('pointerdown', nodeOf('.s-test-button', panel), 250, 400, 0)
		pointer('pointermove', panel, 250, 480, 16)

		expect(popover.swiping).toBe(false)

		pointer('pointerup', panel, 250, 480, 32)
		pointer('pointerdown', nodeOf('.s-test-text', panel), 250, 400, 48)
		pointer('pointermove', panel, 250, 480, 64)

		expect(popover.swiping).toBe(true)
	})

	it('закрыли посреди жеста — жест кончен, следов на панели нет', async () => {
		const { popover, panel, handle, offset } = await mountPopover()

		pointer('pointerdown', handle, 250, 305, 0)
		pointer('pointermove', panel, 250, 385, 16)

		expect(popover.swiping).toBe(true)

		popover.open = false

		expect(popover.swiping).toBe(false)
		expect(offset()).toBe('')
		expect(panel.style.touchAction).toBe('')
	})
})

describe('контракт жеста', () => {
	it('выезжающая панель и поповер — владельцы жеста', () => {
		expectTypeOf<TDrawer>().toExtend<ISwipeOwner>()
		expectTypeOf<TPopover>().toExtend<ISwipeOwner>()

		expect(isSwipeable(new TDrawer())).toBe(true)
		expect(isSwipeable(new TPopover())).toBe(true)
	})

	it('владельца без контракта плагин не трогает', async () => {
		const button = new TButton()
		const bundle = new TPluginBundle(button).use(TElementPlugin).use(TSwipePlugin)
		const root = document.createElement('button')

		bundles.push(bundle)
		document.body.append(root)

		pluginOf(bundle, TElementPlugin).element = root
		await nextFrame()

		expect(isSwipeable(button)).toBe(false)
		expect(root.style.touchAction).toBe('')
	})
})
