// @vitest-environment jsdom

/**
 * TTooltipTriggerPlugin — когда подсказка показывается и когда прячется.
 *
 * Разметку тест строит сам — корень с триггером и телепортированная панель с
 * пометкой владельцем, как их рисует Vue, — а плагины собраны настоящим
 * набором. Время — поддельные таймеры: задержки проверяются по миллисекундам,
 * а не ожиданием. Видим ли фокус (`:focus-visible`), тоже задаёт тест (см.
 * `focusWith`). Проводка целиком — `ui/vue/__tests__/tooltip.spec.ts`,
 * эвристика `:focus-visible` настоящего браузера —
 * `playground/vue/browser/tooltip.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TTooltip } from '@soldy-ui/core'
import type { ITooltipProps } from '@soldy-ui/core'
import { TDismissPlugin, TElementPlugin, TPluginBundle, TTooltipTriggerPlugin } from '../src'
import type { IPlugin, IPluginConstructor } from '../src'
import { TOOLTIP_SKIP_DELAY_MS } from '../src/custom/tooltip/trigger/document-state'

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
function nodeOf(selector: string): HTMLElement {
	const node = document.querySelector(selector)

	if (!(node instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return node
}

/**
 * Наборы, созданные тестом. Состояние подсказок документа переживает тест,
 * поэтому набор уничтожается, а окно без задержки, которое открывает его
 * закрытие, прогоняется до конца: иначе следующий тест увидел бы прогретый
 * документ.
 */
const bundles: TPluginBundle[] = []

/**
 * Подсказка на странице: корень с кнопкой-триггером и панель в конце `body`,
 * помеченная владельцем, — как их рисует Vue. `name` различает подсказки
 * одного теста.
 */
function mountTooltip(props: Partial<ITooltipProps> = {}, name = 'a') {
	const owner = new TTooltip(props)
	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TDismissPlugin)
		.use(TTooltipTriggerPlugin)

	bundles.push(bundle)

	document.body.insertAdjacentHTML(
		'beforeend',
		`<span class="root-${name}"><button class="trigger-${name}">Триггер</button><button class="inner-${name}">Ещё</button></span>`,
	)

	const panel = document.createElement('div')

	for (const [attribute, value] of Object.entries(
		pluginOf(bundle, TDismissPlugin).ownerAttribute,
	)) {
		panel.setAttribute(attribute, value)
	}

	panel.className = `panel-${name}`
	panel.textContent = 'Подсказка'
	document.body.appendChild(panel)

	const root = nodeOf(`.root-${name}`)

	pluginOf(bundle, TElementPlugin).element = root
	// Корень плагины получают кадром позже
	vi.advanceTimersToNextFrame()

	return { owner, root, panel, bundle, trigger: nodeOf(`.trigger-${name}`) }
}

const enter = (target: Element, pointerType = 'mouse') =>
	target.dispatchEvent(new PointerEvent('pointerenter', { pointerType }))

const leave = (target: Element, pointerType = 'mouse') =>
	target.dispatchEvent(new PointerEvent('pointerleave', { pointerType }))

const press = (target: Element) =>
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))

/**
 * Фокус, который браузер счёл бы видимым (`:focus-visible`) или нет.
 *
 * Видимость задаёт тест, а не jsdom: эвристика jsdom своя и с браузером
 * расходится — фокус, пришедший Tab-ом с элемента, у которого он уже был
 * видимым, она видимым не считает. Плагину важен только ответ на
 * `:focus-visible`; как его даёт настоящий браузер (Tab — да, нажатие на
 * кнопку — нет), проверяет `playground/vue/browser/tooltip.spec.ts`.
 */
function focusWith(target: HTMLElement, visible: boolean): void {
	vi.spyOn(target, 'matches').mockImplementation((selector: string) =>
		selector === ':focus-visible' ? visible : Element.prototype.matches.call(target, selector),
	)
	target.focus()
}

/** Фокус с клавиатуры — Tab. */
const keyboardFocus = (target: HTMLElement) => focusWith(target, true)

/** Фокус от нажатия мышью на кнопку. */
const pointerFocus = (target: HTMLElement) => focusWith(target, false)

/** Escape на элементе под фокусом. Отдаёт событие: по нему видно, погашен ли он. */
function escape(target: Element = document.activeElement ?? document.body): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })

	target.dispatchEvent(event)

	return event
}

beforeEach(() => {
	vi.useFakeTimers()
})

afterEach(() => {
	for (const bundle of bundles.reverse()) bundle.destroy()

	bundles.length = 0
	vi.runOnlyPendingTimers()
	vi.useRealTimers()
	vi.restoreAllMocks()

	document.body.innerHTML = ''
})

describe('курсор', () => {
	it('на корне — показ через openDelay, не раньше', () => {
		const { owner, root } = mountTooltip()

		enter(root)
		vi.advanceTimersByTime(399)

		expect(owner.open).toBe(false)

		vi.advanceTimersByTime(1)

		expect(owner.open).toBe(true)
	})

	it('ушёл раньше задержки — показа нет', () => {
		const { owner, root } = mountTooltip()

		enter(root)
		vi.advanceTimersByTime(200)
		leave(root)
		vi.advanceTimersByTime(1000)

		expect(owner.open).toBe(false)
	})

	it('ушёл с корня — скрытие через closeDelay, не раньше', () => {
		const { owner, root } = mountTooltip({ openDelay: 0 })

		enter(root)
		leave(root)
		vi.advanceTimersByTime(149)

		expect(owner.open).toBe(true)

		vi.advanceTimersByTime(1)

		expect(owner.open).toBe(false)
	})

	it('openDelay 0 — показ сразу, без таймера', () => {
		const { owner, root } = mountTooltip({ openDelay: 0 })

		enter(root)

		expect(owner.open).toBe(true)
	})

	it('касание не показывает: наведения у пальца нет', () => {
		const { owner, root } = mountTooltip({ openDelay: 0 })

		enter(root, 'touch')
		vi.advanceTimersByTime(1000)

		expect(owner.open).toBe(false)
	})

	it('перо наводится, как мышь', () => {
		const { owner, root } = mountTooltip({ openDelay: 0 })

		enter(root, 'pen')

		expect(owner.open).toBe(true)
	})

	it('курсор через зазор на панель подсказку держит, уход с панели — скрытие через closeDelay', () => {
		const { owner, root, panel } = mountTooltip({ openDelay: 0 })

		enter(root)
		leave(root)
		vi.advanceTimersByTime(100)
		enter(panel)
		vi.advanceTimersByTime(1000)

		expect(owner.open).toBe(true)

		leave(panel)
		vi.advanceTimersByTime(149)

		expect(owner.open).toBe(true)

		vi.advanceTimersByTime(1)

		expect(owner.open).toBe(false)
	})

	it('курсор с панели обратно на корень — подсказка держится', () => {
		const { owner, root, panel } = mountTooltip({ openDelay: 0 })

		enter(root)
		leave(root)
		enter(panel)
		leave(panel)
		enter(root)
		vi.advanceTimersByTime(1000)

		expect(owner.open).toBe(true)
	})

	it('задержки читаются при заводе таймера: новое значение — со следующего наведения', () => {
		const { owner, root } = mountTooltip()

		enter(root)
		owner.openDelay = 1000
		vi.advanceTimersByTime(400)

		expect(owner.open).toBe(true)

		leave(root)
		owner.closeDelay = 0
		// Скрытие уже заведено на 150 мс
		expect(owner.open).toBe(true)

		vi.advanceTimersByTime(150 + TOOLTIP_SKIP_DELAY_MS)
		enter(root)
		vi.advanceTimersByTime(999)

		expect(owner.open).toBe(false)

		vi.advanceTimersByTime(1)

		expect(owner.open).toBe(true)

		leave(root)

		expect(owner.open).toBe(false)
	})
})

describe('фокус', () => {
	it('с клавиатуры показывает сразу', () => {
		const { owner, trigger } = mountTooltip()

		keyboardFocus(trigger)

		expect(owner.open).toBe(true)
	})

	it('от нажатия мышью не показывает', () => {
		const { owner, trigger } = mountTooltip()

		pointerFocus(trigger)
		vi.advanceTimersByTime(1000)

		expect(owner.open).toBe(false)
	})

	it('ушёл из корня — скрытие сразу', () => {
		const { owner, trigger } = mountTooltip()

		keyboardFocus(trigger)
		trigger.blur()

		expect(owner.open).toBe(false)
	})

	it('перешёл внутри корня — подсказка остаётся', () => {
		const { owner, trigger } = mountTooltip()

		keyboardFocus(trigger)
		nodeOf('.inner-a').focus()

		expect(owner.open).toBe(true)
	})

	it('ушёл курсор — держит фокус; ушёл фокус — держит курсор', () => {
		const { owner, root, trigger } = mountTooltip({ openDelay: 0 })

		keyboardFocus(trigger)
		enter(root)
		leave(root)
		vi.advanceTimersByTime(1000)

		expect(owner.open).toBe(true)

		enter(root)
		trigger.blur()
		vi.advanceTimersByTime(1000)

		expect(owner.open).toBe(true)
	})

	it('фокус с клавиатуры не ждёт задержки, начатой курсором', () => {
		const { owner, root, trigger } = mountTooltip()

		enter(root)
		vi.advanceTimersByTime(100)
		keyboardFocus(trigger)

		expect(owner.open).toBe(true)
	})
})

describe('нажатие', () => {
	it('на корень закрывает открытую', () => {
		const { owner, root, trigger } = mountTooltip({ openDelay: 0 })

		enter(root)
		press(trigger)

		expect(owner.open).toBe(false)
	})

	it('гасит отложенный показ', () => {
		const { owner, root, trigger } = mountTooltip()

		enter(root)
		vi.advanceTimersByTime(100)
		press(trigger)
		vi.advanceTimersByTime(1000)

		expect(owner.open).toBe(false)
	})

	it('гасит причины: курсор, оставшийся на корне, не показывает; новый заход — показывает', () => {
		const { owner, root, trigger } = mountTooltip()

		keyboardFocus(trigger)
		enter(root)
		press(trigger)
		vi.advanceTimersByTime(1000)

		expect(owner.open).toBe(false)

		leave(root)
		vi.advanceTimersByTime(TOOLTIP_SKIP_DELAY_MS)
		enter(root)
		vi.advanceTimersByTime(400)

		expect(owner.open).toBe(true)
	})

	it('нажатие мимо закрывает', () => {
		const { owner, trigger } = mountTooltip()

		keyboardFocus(trigger)
		press(document.body)

		expect(owner.open).toBe(false)
	})

	it('нажатие в панель — не мимо', () => {
		const { owner, trigger, panel } = mountTooltip()

		keyboardFocus(trigger)
		press(panel)

		expect(owner.open).toBe(true)
	})
})

describe('Escape', () => {
	it('закрывает, где бы ни был фокус, и гасится preventDefault, а не stopPropagation', () => {
		const { owner, root } = mountTooltip({ openDelay: 0 })
		const bubbled = vi.fn()

		document.body.insertAdjacentHTML('beforeend', '<button class="elsewhere">Там</button>')
		nodeOf('.elsewhere').focus()
		document.body.addEventListener('keydown', bubbled)
		enter(root)

		const event = escape()

		document.body.removeEventListener('keydown', bubbled)

		expect(owner.open).toBe(false)
		expect(event.defaultPrevented).toBe(true)
		// Клавиша дошла дальше: погашена, а не остановлена
		expect(bubbled).toHaveBeenCalledOnce()
	})

	it('у закрытой подсказки клавишу не трогает', () => {
		mountTooltip()

		expect(escape().defaultPrevented).toBe(false)
	})

	it('потраченную раньше клавишу не трогает', () => {
		const { owner, trigger } = mountTooltip()
		const spend = (event: KeyboardEvent) => event.preventDefault()

		keyboardFocus(trigger)
		window.addEventListener('keydown', spend, true)
		escape()
		window.removeEventListener('keydown', spend, true)

		expect(owner.open).toBe(true)
	})

	it('гасит причины: фокус, оставшийся на триггере, не показывает; новый фокус — показывает', () => {
		const { owner, root, trigger } = mountTooltip()

		keyboardFocus(trigger)
		enter(root)
		escape()
		vi.advanceTimersByTime(1000)

		expect(owner.open).toBe(false)

		keyboardFocus(nodeOf('.inner-a'))

		expect(owner.open).toBe(true)
	})
})

describe('закрытие снаружи', () => {
	it('open = false сбрасывает причины и таймеры: курсор на корне снова не показывает', () => {
		const { owner, root } = mountTooltip({ openDelay: 0 })

		enter(root)
		owner.open = false
		vi.advanceTimersByTime(1000)

		expect(owner.open).toBe(false)
	})

	it('отложенное скрытие не срабатывает на открытой снова', () => {
		const { owner, root } = mountTooltip({ openDelay: 0 })
		const changes: boolean[] = []

		owner.events.on('change:open', (value: boolean) => changes.push(value))
		enter(root)
		leave(root)
		owner.open = false
		owner.open = true
		vi.advanceTimersByTime(1000)

		expect(changes).toEqual([true, false, true])
		expect(owner.open).toBe(true)
	})

	it('открытая из кода закрывается Escape и нажатием, как открытая наведением', () => {
		const { owner, trigger } = mountTooltip()

		owner.open = true
		escape()

		expect(owner.open).toBe(false)

		owner.open = true
		press(trigger)

		expect(owner.open).toBe(false)
	})

	it('открытая со старта слушает Escape, как только корень объявлен', () => {
		const { owner } = mountTooltip({ open: true })

		expect(escape().defaultPrevented).toBe(true)
		expect(owner.open).toBe(false)
	})
})

describe('снятие', () => {
	it('после destroy ни курсор, ни фокус, ни Escape подсказку не трогают', () => {
		const { owner, root, trigger, bundle } = mountTooltip({ openDelay: 0 })

		enter(root)
		bundle.destroy()

		const event = escape()

		expect(event.defaultPrevented).toBe(false)
		expect(owner.open).toBe(true)

		owner.open = false
		enter(root)
		keyboardFocus(trigger)

		expect(owner.open).toBe(false)
	})

	it('отложенный показ после destroy не срабатывает', () => {
		const { owner, root, bundle } = mountTooltip()

		enter(root)
		bundle.destroy()
		vi.advanceTimersByTime(1000)

		expect(owner.open).toBe(false)
	})

	it('removed снимает слушатели корня; новый корень — снова работает', () => {
		const { owner, root, bundle } = mountTooltip({ openDelay: 0 })
		const element = pluginOf(bundle, TElementPlugin)

		element.element = null
		enter(root)

		expect(owner.open).toBe(false)

		const next = document.createElement('span')

		document.body.appendChild(next)
		element.element = next
		vi.advanceTimersToNextFrame()
		enter(next)

		expect(owner.open).toBe(true)
	})
})

describe('подсказки документа', () => {
	it('открывшаяся сразу закрывает прежнюю, хотя ту ещё держит курсор', () => {
		const first = mountTooltip({ openDelay: 0 }, 'a')
		const second = mountTooltip({}, 'b')

		enter(first.root)
		keyboardFocus(second.trigger)

		expect(second.owner.open).toBe(true)
		expect(first.owner.open).toBe(false)
	})

	it('открытая из кода тоже закрывает прежнюю: поверхности управления равны', () => {
		const first = mountTooltip({}, 'a')
		const second = mountTooltip({}, 'b')

		first.owner.open = true
		second.owner.open = true

		expect(first.owner.open).toBe(false)
	})

	it('пока другая открыта — показ без задержки', () => {
		const first = mountTooltip({}, 'a')
		const second = mountTooltip({}, 'b')

		keyboardFocus(first.trigger)
		enter(second.root)

		expect(second.owner.open).toBe(true)
		expect(first.owner.open).toBe(false)
	})

	it(`закрылась меньше ${TOOLTIP_SKIP_DELAY_MS} мс назад — без задержки, позже — снова с задержкой`, () => {
		const first = mountTooltip({ openDelay: 0 }, 'a')
		const second = mountTooltip({}, 'b')

		enter(first.root)
		leave(first.root)
		vi.advanceTimersByTime(150)

		expect(first.owner.open).toBe(false)

		vi.advanceTimersByTime(TOOLTIP_SKIP_DELAY_MS - 1)
		enter(second.root)

		expect(second.owner.open).toBe(true)

		leave(second.root)
		vi.advanceTimersByTime(150 + TOOLTIP_SKIP_DELAY_MS)
		enter(second.root)

		expect(second.owner.open).toBe(false)

		vi.advanceTimersByTime(400)

		expect(second.owner.open).toBe(true)
	})

	it('уничтоженная открытая подсказка не остаётся «открытой» для документа', () => {
		const first = mountTooltip({ openDelay: 0 }, 'a')
		const second = mountTooltip({}, 'b')

		enter(first.root)
		first.bundle.destroy()
		vi.advanceTimersByTime(TOOLTIP_SKIP_DELAY_MS)
		enter(second.root)

		// Документ не считает её открытой — вторая ждёт свою задержку
		expect(second.owner.open).toBe(false)

		vi.advanceTimersByTime(400)

		expect(second.owner.open).toBe(true)
		// И закрывать чужой инстанс ей нечем: прежний набор уничтожен
		expect(first.owner.open).toBe(true)
	})
})
