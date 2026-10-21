/**
 * Popover в Svelte — проводка целиком, на настоящей разметке.
 *
 * Модель проверяет ядро, «мимо» и слои — `setup/__tests__/overlay.spec.ts`;
 * здесь важно, что они сходятся: панель телепортирована и помечена владельцем,
 * якорь панели — корень поповера, триггер получает связку через scope, фокус
 * уходит в панель и возвращается, Escape и Tab закрывают только свой слой.
 * Сценарии — те же, что у Vue (`popover.spec.ts`); открытость, которую Vue
 * держит `v-model`, здесь возвращает пропом колбэк `onChangeOpen`.
 *
 * Сценарии Vue с Select внутри — здесь те же, и рядом — те же с вложенным
 * поповером: правило слоёв одно — список Select и вложенная панель тоже слои
 * в `body` выше панели владельца.
 *
 * Порядок Tab, который ведёт сам браузер, jsdom не считает: здесь проверены
 * переходы, которые делает плагин (Tab в панель, из неё, Shift+Tab на
 * триггер). Остальное — `playground/vue/browser/popover.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushSync } from 'svelte'
import { TPopover } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import type { PopoverProps } from '@soldy-ui/svelte'
import Harness, { type TPopoverCase } from './Popover.test.svelte'
import { find, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'

afterEach(() => {
	vi.restoreAllMocks()
})

/**
 * Смонтировать страницу с поповером и дождаться кадра: корень плагины получают
 * через `requestAnimationFrame`. Отдаёт пропсы поповера — их можно менять.
 */
async function render(popover: PopoverProps = {}, kind: TPopoverCase = 'page') {
	const props = reactiveProps<PopoverProps>(popover)

	mount(Harness, { case: kind, popover: props })
	await nextFrame()

	return props
}

/**
 * Открытость возвращается пропом, как привязка: колбэк `onChangeOpen` пишет её
 * в пропсы поповера. Отдаёт пропсы и журнал открытости, которую получил
 * потребитель.
 */
async function renderModel(popover: PopoverProps = {}) {
	const opens: boolean[] = []
	const props = reactiveProps<PopoverProps>({
		...popover,
		onChangeOpen: (value) => {
			opens.push(value)
			props.open = value
		},
	})

	mount(Harness, { case: 'page', popover: props })
	await nextFrame()

	return { props, opens }
}

const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

const trigger = () => node('.so-test-trigger')
const panel = () => node('.so-popover__panel')
const isOpen = (element: HTMLElement = panel()) => element.style.display !== 'none'

/** Нажатие мышью — `pointerdown`, как его слушает плагин оверлея. */
const pointerDown = (target: Element) =>
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))

/** Клик мышью целиком: нажатие, фокус от `mousedown`, клик. */
function click(target: HTMLElement): void {
	pointerDown(target)
	target.focus()
	target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
	flushSync()
}

/** Клавиша на элементе под фокусом. Отдаёт событие: по нему видно, погашена ли она. */
function press(key: string, options: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options })

	;(document.activeElement ?? document.body).dispatchEvent(event)
	flushSync()

	return event
}

/** Открыть кликом по триггеру и дождаться, пока фокус уйдёт в панель. */
async function open(target: HTMLElement = trigger()): Promise<void> {
	click(target)
	await nextFrame()
}

describe('разметка', () => {
	it('корень — span с триггером, панель телепортирована в body и скрыта', async () => {
		await render()

		const root = node('.so-popover')

		expect(root.localName).toBe('span')
		expect(root.contains(trigger())).toBe(true)
		expect(root.contains(panel())).toBe(false)
		expect(document.body.contains(panel())).toBe(true)
		expect(isOpen()).toBe(false)
	})

	/**
	 * Внутри контейнера панель не телепортирована: она в корне, сразу за
	 * триггером, и накрывает ближайший позиционированный предок — раскладка
	 * ставит её `absolute` без координат, место задаёт тема.
	 */
	it('contained: панель в корне, без телепорта и координат; нажатие в ней не закрывает', async () => {
		await render({ contained: true })

		const root = node('.so-popover')

		expect(root.contains(panel())).toBe(true)
		expect(panel().dataset.contained).toBe('true')
		expect(panel().style.position).toBe('absolute')
		expect(panel().style.left).toBe('')
		expect(panel().style.top).toBe('')

		await open()

		expect(isOpen()).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-first'))

		click(node('.so-test-first'))

		expect(isOpen()).toBe(true)
	})

	it('панель — диалог, aria-controls триггера ведёт на неё', async () => {
		await render()

		expect(panel().getAttribute('role')).toBe('dialog')
		expect(panel().getAttribute('tabindex')).toBe('-1')
		expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
		expect(trigger().getAttribute('aria-expanded')).toBe('false')
		expect(document.getElementById(trigger().getAttribute('aria-controls') ?? '')).toBe(panel())
	})

	it('ARIA и data-* стоят на своих элементах', async () => {
		await render()
		await open()

		const root = node('.so-popover')

		expect(root.dataset.open).toBe('true')
		expect(trigger().dataset.selected).toBe('true')
		expect(trigger().getAttribute('aria-expanded')).toBe('true')
		// ARIA панели — на панели, не на корне. `data-open` у панели свой, от её
		// слоя (Frame): корень телепортированной панели его не отдаёт
		expect(root.hasAttribute('role')).toBe(false)
		expect(panel().dataset.open).toBe('true')
		expect(panel().dataset.layer).toMatch(/^\d+$/)
		expect(root.hasAttribute('data-layer')).toBe(false)
	})

	/**
	 * Открытость панели для темы — `data-open` её слоя: по нему тема проявляет и
	 * гасит панель. Писатель у атрибута один — Frame, чья видимость и есть
	 * `open`, — поэтому он идёт за `open`, как бы его ни меняли: кликом по
	 * триггеру, из инстанса, крестиком.
	 */
	it('data-open панели идёт за open', async () => {
		const popover = new TPopover()

		await render({ ctrl: popover })

		expect(panel().dataset.open).toBe('false')

		await open()

		expect(panel().dataset.open).toBe('true')

		popover.open = false
		flushSync()

		expect(panel().dataset.open).toBe('false')

		popover.open = true
		flushSync()

		expect(panel().dataset.open).toBe('true')

		click(node('.so-popover__close'))

		expect(popover.open).toBe(false)
		expect(panel().dataset.open).toBe('false')
	})

	it('aria_label даёт диалогу имя', async () => {
		await render({ aria_label: 'Фильтры' })

		expect(panel().getAttribute('aria-label')).toBe('Фильтры')
	})

	it('крестик назван локалью поддерева, closable: false его убирает', async () => {
		mount(Harness, { case: 'locale', locale: ruRU })
		await nextFrame()

		const [named, bare] = [...document.querySelectorAll('.so-popover__panel')]

		expect(named?.querySelector('.so-popover__close')?.getAttribute('aria-label')).toBe(
			'Закрыть',
		)
		expect(bare?.querySelector('.so-popover__close')).toBeNull()
	})
})

describe('открытие и закрытие', () => {
	it('клик по триггеру открывает', async () => {
		await render()

		click(trigger())

		expect(isOpen()).toBe(true)
	})

	it('клик в панель не закрывает', async () => {
		await render()
		await open()

		click(node('.so-test-first'))

		expect(isOpen()).toBe(true)
	})

	it('клик по открытому триггеру закрывает, панель не мигает', async () => {
		const popover = new TPopover()
		const changes: boolean[] = []

		popover.events.on('change:open', (value: boolean) => changes.push(value))

		await render({ ctrl: popover })
		await open()

		click(trigger())

		expect(isOpen()).toBe(false)
		// Нажатие по триггеру — внутри владельца: закрытия нажатием мимо и
		// повторного открытия кликом не было
		expect(changes).toEqual([true, false])
	})

	it('нажатие мимо закрывает', async () => {
		await render()
		await open()

		pointerDown(node('.so-test-after'))
		flushSync()

		expect(isOpen()).toBe(false)
	})

	it('open из инстанса открывает так же, как из разметки; onChangeOpen видит оба пути', async () => {
		const popover = new TPopover()
		const { opens } = await renderModel({ ctrl: popover })

		popover.open = true
		flushSync()
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-first'))

		click(trigger())

		expect(popover.open).toBe(false)
		expect(opens).toEqual([true, false])
	})

	it('open из разметки открывает и закрывает', async () => {
		const props = await render({ open: false })

		props.open = true
		flushSync()
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-first'))

		props.open = false
		flushSync()

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})
})

describe('фокус', () => {
	it('при открытии уходит на первую остановку панели — кадром позже', async () => {
		await render()

		click(trigger())

		expect(document.activeElement).toBe(trigger())

		await nextFrame()

		expect(document.activeElement).toBe(node('.so-test-first'))
	})

	it('без остановок в панели — на саму панель', async () => {
		await render({ closable: false }, 'text')
		await open()

		expect(document.activeElement).toBe(panel())
	})

	it('Escape закрывает и возвращает фокус на триггер', async () => {
		await render()
		await open()

		const event = press('Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('Escape на триггере открытого поповера тоже закрывает', async () => {
		await render()
		await open()

		trigger().focus()
		press('Escape')

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('крестик закрывает и возвращает фокус на триггер', async () => {
		await render()
		await open()

		click(node('.so-popover__close'))

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('нажатие мимо фокус не возвращает', async () => {
		await render()
		await open()

		pointerDown(node('.so-test-after'))
		flushSync()

		expect(isOpen()).toBe(false)
		expect(document.activeElement).not.toBe(trigger())
	})

	it('фокус, ушедший мимо, закрывает и не возвращается', async () => {
		await render()
		await open()

		node('.so-test-after').focus()
		flushSync()

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(node('.so-test-after'))
	})

	it('открытый со старта уводит фокус в панель, закрытие возвращает его на триггер', async () => {
		await render({ open: true })
		await nextFrame()

		expect(document.activeElement).toBe(node('.so-test-first'))

		press('Escape')

		// Запомнен был `body` — фокус уходит на первую остановку корня
		expect(document.activeElement).toBe(trigger())
	})

	it('отсоединённый элемент возврата — фокус на триггер', async () => {
		const outside = document.createElement('button')
		const popover = new TPopover()

		document.body.appendChild(outside)
		await render({ ctrl: popover })

		outside.focus()
		popover.open = true
		flushSync()
		await nextFrame()
		outside.remove()

		press('Escape')

		expect(document.activeElement).toBe(trigger())
	})
})

describe('Tab', () => {
	it('Tab с триггера при открытой панели — в панель', async () => {
		await render()
		await open()

		trigger().focus()

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-first'))
	})

	it('Shift+Tab с первой остановки панели — на триггер, панель остаётся открытой', async () => {
		await render()
		await open()

		const event = press('Tab', { shiftKey: true })

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(trigger())
		expect(isOpen()).toBe(true)
	})

	it('Shift+Tab с самой панели — тоже на триггер', async () => {
		await render({ closable: false }, 'text')
		await open()

		press('Tab', { shiftKey: true })

		expect(document.activeElement).toBe(trigger())
	})

	it('Tab с последней остановки панели — к остановке после поповера, панель закрыта', async () => {
		await render()
		await open()

		node('.so-popover__close').focus()

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(node('.so-test-after'))
	})

	it('Tab с самой панели без остановок — к остановке после поповера', async () => {
		await render({ closable: false }, 'text')
		await open()

		expect(document.activeElement).toBe(panel())

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(node('.so-test-after'))
	})

	it('Tab с середины панели не трогает: порядок ведёт браузер', async () => {
		await render()
		await open()

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(false)
		expect(isOpen()).toBe(true)
	})

	it('после поповера остановок нет — закрыть, Tab не гасить', async () => {
		await render({}, 'alone')
		await open()

		node('.so-popover__close').focus()

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(false)
		expect(isOpen()).toBe(false)
	})
})

describe('вложенные слои', () => {
	/** Внешний поповер, в панели которого — внутренний. */
	const nested = () => render({ class: 'so-test-outer' }, 'nested')

	/** Панели в порядке открытия не лежат: ищем по связке с триггером. */
	const panelOf = (triggerElement: HTMLElement) =>
		node(`#${triggerElement.getAttribute('aria-controls') ?? ''}`)

	it('Escape во вложенном закрывает только его, фокус — на его триггер', async () => {
		await nested()
		await open()
		await open(node('.so-test-inner-trigger'))

		expect(document.activeElement).toBe(node('.so-test-inner-first'))

		press('Escape')

		expect(isOpen(panelOf(node('.so-test-inner-trigger')))).toBe(false)
		expect(isOpen(panelOf(trigger()))).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-inner-trigger'))
	})

	it('клик во вложенную панель внешний не закрывает', async () => {
		await nested()
		await open()
		await open(node('.so-test-inner-trigger'))

		click(node('.so-test-inner-first'))

		expect(isOpen(panelOf(node('.so-test-inner-trigger')))).toBe(true)
		expect(isOpen(panelOf(trigger()))).toBe(true)
	})

	it('клик во внешнюю панель закрывает вложенный, внешний остаётся', async () => {
		await nested()
		await open()
		await open(node('.so-test-inner-trigger'))

		click(node('.so-test-first'))

		expect(isOpen(panelOf(node('.so-test-inner-trigger')))).toBe(false)
		expect(isOpen(panelOf(trigger()))).toBe(true)
	})

	/**
	 * Escape закрывает сперва вложенный слой, и только второй — сам поповер, —
	 * внешний слой клавишу с `defaultPrevented` пропускает, как у Select внутри.
	 */
	it('Escape во вложенном не доходит до внешнего, второй Escape — уже внешнему', async () => {
		await nested()
		await open()
		await open(node('.so-test-inner-trigger'))

		press('Escape')

		expect(isOpen(panelOf(trigger()))).toBe(true)

		press('Escape')

		expect(isOpen(panelOf(trigger()))).toBe(false)
	})
})

describe('Select внутри', () => {
	const field = () => node('.so-test-select input')
	const selectPanel = () => node('.so-select__panel')

	it('Escape в открытом Select закрывает только Select', async () => {
		await render({}, 'select')
		await open()
		click(field())
		await nextFrame()

		expect(isOpen(selectPanel())).toBe(true)

		press('Escape')

		expect(isOpen(selectPanel())).toBe(false)
		expect(isOpen()).toBe(true)

		// Второй Escape — уже поповеру: Select закрыт и клавишу не тратит
		press('Escape')

		expect(isOpen()).toBe(false)
	})

	it('клик в список Select поповер не закрывает', async () => {
		await render({}, 'select')
		await open()
		click(field())
		await nextFrame()

		const option = node('.so-select__panel [role="option"]')

		pointerDown(option)
		option.click()
		flushSync()

		expect(isOpen()).toBe(true)
		expect(field().getAttribute('aria-expanded')).toBe('false')
	})
})

describe('lazyMount', () => {
	it('содержимое монтируется при первом открытии и остаётся после закрытия', async () => {
		await render({ lazyMount: true })

		expect(document.querySelector('.so-test-first')).toBeNull()
		expect(document.querySelector('.so-popover__content')).not.toBeNull()

		await open()

		expect(document.activeElement).toBe(node('.so-test-first'))

		press('Escape')

		expect(document.querySelector('.so-test-first')).not.toBeNull()
	})

	it('без lazyMount содержимое в документе с самого начала', async () => {
		await render()

		expect(document.querySelector('.so-test-first')).not.toBeNull()
	})
})

describe('жест', () => {
	const handle = () => document.querySelector('.so-popover__handle')

	/** Указатель мышью в точке по вертикали — как его слушает плагин жеста. */
	const pointer = (type: string, target: Element, y: number) =>
		target.dispatchEvent(
			new PointerEvent(type, {
				bubbles: true,
				cancelable: true,
				clientX: 100,
				clientY: y,
				pointerId: 1,
				pointerType: 'mouse',
				button: 0,
				isPrimary: true,
			}),
		)

	it('без жеста полосы нет; с жестом — первая в панели, немая для скринридера', async () => {
		const popover = new TPopover()

		await render({ ctrl: popover })

		expect(handle()).toBeNull()

		popover.swipe = 'handle'
		flushSync()

		expect(handle()).toBe(panel().firstElementChild)
		expect(handle()?.getAttribute('aria-hidden')).toBe('true')

		popover.swipe = 'panel'
		flushSync()

		expect(handle()).not.toBeNull()
	})

	/**
	 * Коробку панели задаёт тест: jsdom раскладку не считает. Сторону после
	 * flip плагин якоря пишет в панель и в jsdom — под триггером: якорь панели —
	 * корень поповера. Жест мышью по полосе вниз — дальше четверти высоты
	 * панели.
	 */
	it('смахнули вниз от триггера — закрыта, onChangeOpen видит закрытие, фокус — на триггер', async () => {
		const { opens } = await renderModel({ swipe: 'handle' })

		await open()

		expect(panel().dataset.placement).toBe('bottom-start')
		expect(panel().dataset.swiping).toBe('false')

		vi.spyOn(panel(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 8, 300, 200))

		const grip = node('.so-popover__handle')

		pointer('pointerdown', grip, 13)
		pointer('pointermove', panel(), 108)

		expect(panel().style.getPropertyValue('--so-swipe-offset')).toBe('95px')

		flushSync()

		expect(panel().dataset.swiping).toBe('true')
		// Сдвиг плагин пишет в узел сам, мимо разметки, и смена набора панели его
		// не стирает: стиль корня ставится на узел по свойствам
		expect(panel().style.getPropertyValue('--so-swipe-offset')).toBe('95px')

		pointer('pointerup', panel(), 113)
		flushSync()

		expect(isOpen()).toBe(false)
		expect(panel().dataset.swiping).toBe('false')
		expect(opens).toEqual([true, false])
		expect(document.activeElement).toBe(trigger())
	})
})
