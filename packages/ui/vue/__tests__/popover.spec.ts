/**
 * Popover во Vue — проводка целиком, на настоящей разметке.
 *
 * Модель проверяет ядро, «мимо» и слои — `setup/__tests__/overlay.spec.ts`;
 * здесь важно, что они сходятся: панель телепортирована и помечена владельцем,
 * триггер получает связку через scope, фокус уходит в панель и возвращается,
 * Escape и Tab закрывают только свой слой.
 *
 * Порядок Tab, который ведёт сам браузер, jsdom не считает: здесь проверены
 * переходы, которые делает плагин (Tab в панель, из неё, Shift+Tab на
 * триггер). Остальное — `playground/vue/browser/popover.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { Button, Popover, Select, SelectItem } from '@soldy-ui/vue'
import { TPopover } from '@soldy-ui/core'
import type { IPopoverProps } from '@soldy-ui/core'
import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/**
 * Смонтировать разметку в документ и дождаться кадра: корень плагины получают
 * через `requestAnimationFrame`.
 */
async function render(content: () => VNode): Promise<ReturnType<typeof mount>> {
	const mounted = mount(defineComponent({ render: content }), { attachTo: document.body })

	wrapper = mounted

	await nextTick()
	await nextFrame()

	return mounted
}

/** Триггер так, как его кладёт потребитель: Button со связкой и видом из scope. */
const triggerOf =
	(text: string, className: string) =>
	({ triggerAria, triggerDataset }: TTriggerScope) =>
		h(Button, { text, class: className, ...triggerAria, ...triggerDataset })

/** Поповер между двумя кнопками страницы — чтобы было откуда прийти и куда уйти по Tab. */
const page = (props: Partial<IPopoverProps> & Record<string, unknown> = {}, content = inside) =>
	h('div', [
		h('button', { class: 's-test-before' }, 'До'),
		h(Popover, props, { trigger: triggerOf('Открыть', 's-test-trigger'), default: content }),
		h('button', { class: 's-test-after' }, 'После'),
	])

/** Содержимое с двумя остановками Tab. */
const inside = () => [
	h('button', { class: 's-test-first' }, 'Первая'),
	h('button', { class: 's-test-second' }, 'Вторая'),
]

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, scope: ParentNode = document): HTMLElement {
	const element = scope.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const trigger = () => find('.s-test-trigger')
const panel = (scope: ParentNode = document) => find('.s-popover__panel', scope)
const isOpen = (element: HTMLElement = panel()) => element.style.display !== 'none'

/** Нажатие мышью — `pointerdown`, как его слушает плагин оверлея. */
const pointerDown = (target: Element) =>
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))

/** Клик мышью целиком: нажатие, фокус от `mousedown`, клик. */
async function click(target: HTMLElement): Promise<void> {
	pointerDown(target)
	target.focus()
	target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

	await nextTick()
}

/** Клавиша на элементе под фокусом. Отдаёт событие: по нему видно, погашена ли она. */
function press(key: string, options: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options })

	;(document.activeElement ?? document.body).dispatchEvent(event)

	return event
}

/** Открыть кликом по триггеру и дождаться, пока фокус уйдёт в панель. */
async function open(target: HTMLElement = trigger()): Promise<void> {
	await click(target)
	await nextFrame()
}

describe('разметка', () => {
	it('корень — span с триггером, панель телепортирована в body и скрыта', async () => {
		await render(() => page())

		const root = find('.s-popover')

		expect(root.localName).toBe('span')
		expect(root.contains(trigger())).toBe(true)
		expect(root.contains(panel())).toBe(false)
		expect(panel().parentElement).toBe(document.body)
		expect(isOpen()).toBe(false)
	})

	it('панель — диалог, aria-controls триггера ведёт на неё', async () => {
		await render(() => page())

		expect(panel().getAttribute('role')).toBe('dialog')
		expect(panel().getAttribute('tabindex')).toBe('-1')
		expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
		expect(trigger().getAttribute('aria-expanded')).toBe('false')
		expect(document.getElementById(trigger().getAttribute('aria-controls') ?? '')).toBe(panel())
	})

	it('ARIA и data-* стоят на своих элементах', async () => {
		await render(() => page())
		await open()

		const root = find('.s-popover')

		expect(root.dataset.open).toBe('true')
		expect(trigger().dataset.selected).toBe('true')
		expect(trigger().getAttribute('aria-expanded')).toBe('true')
		// ARIA панели — на панели, не на корне; data-* корня — не на панели
		expect(root.hasAttribute('role')).toBe(false)
		expect(panel().hasAttribute('data-open')).toBe(false)
		expect(panel().dataset.layer).toMatch(/^\d+$/)
	})

	it('aria_label даёт диалогу имя', async () => {
		await render(() => page({ aria_label: 'Фильтры' }))

		expect(panel().getAttribute('aria-label')).toBe('Фильтры')
	})

	it('крестик назван closeLabel, closable: false его убирает', async () => {
		await render(() =>
			h('div', [
				h(Popover, { closeLabel: 'Закрыть' }, { default: inside }),
				h(Popover, { closable: false, class: 's-test-bare' }, { default: inside }),
			]),
		)

		const [named, bare] = [...document.querySelectorAll('.s-popover__panel')]

		expect(named.querySelector('.s-popover__close')?.getAttribute('aria-label')).toBe('Закрыть')
		expect(bare.querySelector('.s-popover__close')).toBeNull()
	})
})

describe('открытие и закрытие', () => {
	it('клик по триггеру открывает', async () => {
		await render(() => page())
		await click(trigger())

		expect(isOpen()).toBe(true)
	})

	it('клик в панель не закрывает', async () => {
		await render(() => page())
		await open()
		await click(find('.s-test-first'))

		expect(isOpen()).toBe(true)
	})

	it('клик по открытому триггеру закрывает, панель не мигает', async () => {
		const popover = new TPopover()
		const changes: boolean[] = []

		popover.events.on('change:open', (value: boolean) => changes.push(value))

		await render(() => page({ ctrl: popover }))
		await open()
		await click(trigger())

		expect(isOpen()).toBe(false)
		// Нажатие по триггеру — внутри владельца: закрытия нажатием мимо и
		// повторного открытия кликом не было
		expect(changes).toEqual([true, false])
	})

	it('нажатие мимо закрывает', async () => {
		await render(() => page())
		await open()

		pointerDown(find('.s-test-after'))
		await nextTick()

		expect(isOpen()).toBe(false)
	})

	it('open из инстанса открывает так же, как из шаблона; v-model видит оба пути', async () => {
		const popover = new TPopover()
		const mounted = await render(() => page({ ctrl: popover }))

		popover.open = true
		await nextTick()
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(document.activeElement).toBe(find('.s-test-first'))

		await click(trigger())

		expect(popover.open).toBe(false)
		expect(mounted.findComponent(Popover).emitted('update:open')).toEqual([[true], [false]])
	})

	it('open из шаблона открывает и закрывает', async () => {
		const mounted = mount(Popover, {
			props: { open: false },
			slots: { trigger: triggerOf('Открыть', 's-test-trigger'), default: inside },
			attachTo: document.body,
		})

		wrapper = mounted
		await nextFrame()
		await mounted.setProps({ open: true })
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(document.activeElement).toBe(find('.s-test-first'))

		await mounted.setProps({ open: false })

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})
})

describe('фокус', () => {
	it('при открытии уходит на первую остановку панели — кадром позже', async () => {
		await render(() => page())
		await click(trigger())

		expect(document.activeElement).toBe(trigger())

		await nextFrame()

		expect(document.activeElement).toBe(find('.s-test-first'))
	})

	it('без остановок в панели — на саму панель', async () => {
		await render(() => page({ closable: false }, () => [h('p', 'Только текст')]))
		await open()

		expect(document.activeElement).toBe(panel())
	})

	it('Escape закрывает и возвращает фокус на триггер', async () => {
		await render(() => page())
		await open()

		const event = press('Escape')

		await nextTick()

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('Escape на триггере открытого поповера тоже закрывает', async () => {
		await render(() => page())
		await open()

		trigger().focus()
		press('Escape')
		await nextTick()

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('крестик закрывает и возвращает фокус на триггер', async () => {
		await render(() => page())
		await open()
		await click(find('.s-popover__close'))

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('нажатие мимо фокус не возвращает', async () => {
		await render(() => page())
		await open()

		pointerDown(find('.s-test-after'))
		await nextTick()

		expect(isOpen()).toBe(false)
		expect(document.activeElement).not.toBe(trigger())
	})

	it('фокус, ушедший мимо, закрывает и не возвращается', async () => {
		await render(() => page())
		await open()

		find('.s-test-after').focus()
		await nextTick()

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(find('.s-test-after'))
	})

	it('открытый со старта уводит фокус в панель, закрытие возвращает его на триггер', async () => {
		await render(() => page({ open: true }))
		await nextFrame()

		expect(document.activeElement).toBe(find('.s-test-first'))

		press('Escape')
		await nextTick()

		// Запомнен был `body` — фокус уходит на первую остановку корня
		expect(document.activeElement).toBe(trigger())
	})

	it('отсоединённый элемент возврата — фокус на триггер', async () => {
		const outside = document.createElement('button')
		const popover = new TPopover()

		document.body.appendChild(outside)
		await render(() => page({ ctrl: popover }))

		outside.focus()
		popover.open = true
		await nextTick()
		await nextFrame()
		outside.remove()

		press('Escape')
		await nextTick()

		expect(document.activeElement).toBe(trigger())
	})
})

describe('Tab', () => {
	it('Tab с триггера при открытой панели — в панель', async () => {
		await render(() => page())
		await open()

		trigger().focus()

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(find('.s-test-first'))
	})

	it('Shift+Tab с первой остановки панели — на триггер, панель остаётся открытой', async () => {
		await render(() => page())
		await open()

		const event = press('Tab', { shiftKey: true })

		await nextTick()

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(trigger())
		expect(isOpen()).toBe(true)
	})

	it('Shift+Tab с самой панели — тоже на триггер', async () => {
		await render(() => page({ closable: false }, () => [h('p', 'Только текст')]))
		await open()

		press('Tab', { shiftKey: true })

		expect(document.activeElement).toBe(trigger())
	})

	it('Tab с последней остановки панели — к остановке после поповера, панель закрыта', async () => {
		await render(() => page())
		await open()

		find('.s-popover__close').focus()

		const event = press('Tab')

		await nextTick()

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(find('.s-test-after'))
	})

	it('Tab с самой панели без остановок — к остановке после поповера', async () => {
		await render(() => page({ closable: false }, () => [h('p', 'Только текст')]))
		await open()

		expect(document.activeElement).toBe(panel())

		const event = press('Tab')

		await nextTick()

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(find('.s-test-after'))
	})

	it('Tab с середины панели не трогает: порядок ведёт браузер', async () => {
		await render(() => page())
		await open()

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(false)
		expect(isOpen()).toBe(true)
	})

	it('после поповера остановок нет — закрыть, Tab не гасить', async () => {
		await render(() =>
			h('div', [
				h(Popover, null, {
					trigger: triggerOf('Открыть', 's-test-trigger'),
					default: inside,
				}),
			]),
		)
		await open()

		find('.s-popover__close').focus()

		const event = press('Tab')

		await nextTick()

		expect(event.defaultPrevented).toBe(false)
		expect(isOpen()).toBe(false)
	})
})

describe('вложенные слои', () => {
	/** Внешний поповер, в панели которого — внутренний. */
	const nested = () =>
		page({ class: 's-test-outer' }, () => [
			h('button', { class: 's-test-first' }, 'Первая'),
			h(
				Popover,
				{ class: 's-test-inner' },
				{
					trigger: triggerOf('Ещё', 's-test-inner-trigger'),
					default: () => h('button', { class: 's-test-inner-first' }, 'Внутри'),
				},
			),
		])

	/** Панели в порядке открытия не лежат: ищем по связке с триггером. */
	const panelOf = (triggerElement: HTMLElement) =>
		find(`#${triggerElement.getAttribute('aria-controls') ?? ''}`)

	it('Escape во вложенном закрывает только его, фокус — на его триггер', async () => {
		await render(nested)
		await open()
		await open(find('.s-test-inner-trigger'))

		expect(document.activeElement).toBe(find('.s-test-inner-first'))

		press('Escape')
		await nextTick()

		expect(isOpen(panelOf(find('.s-test-inner-trigger')))).toBe(false)
		expect(isOpen(panelOf(trigger()))).toBe(true)
		expect(document.activeElement).toBe(find('.s-test-inner-trigger'))
	})

	it('клик во вложенную панель внешний не закрывает', async () => {
		await render(nested)
		await open()
		await open(find('.s-test-inner-trigger'))
		await click(find('.s-test-inner-first'))

		expect(isOpen(panelOf(find('.s-test-inner-trigger')))).toBe(true)
		expect(isOpen(panelOf(trigger()))).toBe(true)
	})

	it('клик во внешнюю панель закрывает вложенный, внешний остаётся', async () => {
		await render(nested)
		await open()
		await open(find('.s-test-inner-trigger'))
		await click(find('.s-test-first'))

		expect(isOpen(panelOf(find('.s-test-inner-trigger')))).toBe(false)
		expect(isOpen(panelOf(trigger()))).toBe(true)
	})
})

describe('Select внутри', () => {
	const withSelect = () =>
		page({}, () => [
			h(Select, { class: 's-test-select' }, () => [
				h(SelectItem, { key: 'a', value: 'a', text: 'Первый' }),
				h(SelectItem, { key: 'b', value: 'b', text: 'Второй' }),
			]),
		])

	const field = () => find('.s-test-select input')
	const selectPanel = () => find('.s-select__panel')

	it('Escape в открытом Select закрывает только Select', async () => {
		await render(withSelect)
		await open()
		await click(field())

		expect(isOpen(selectPanel())).toBe(true)

		press('Escape')
		await nextTick()

		expect(isOpen(selectPanel())).toBe(false)
		expect(isOpen()).toBe(true)

		// Второй Escape — уже поповеру: Select закрыт и клавишу не тратит
		press('Escape')
		await nextTick()

		expect(isOpen()).toBe(false)
	})

	it('клик в список Select поповер не закрывает', async () => {
		await render(withSelect)
		await open()
		await click(field())

		const option = find('.s-select__panel [role="option"]')

		pointerDown(option)
		option.click()
		await nextTick()

		expect(isOpen()).toBe(true)
		expect(field().getAttribute('aria-expanded')).toBe('false')
	})
})

describe('lazyMount', () => {
	it('содержимое монтируется при первом открытии и остаётся после закрытия', async () => {
		await render(() => page({ lazyMount: true }))

		expect(document.querySelector('.s-test-first')).toBeNull()
		expect(document.querySelector('.s-popover__content')).not.toBeNull()

		await open()

		expect(document.activeElement).toBe(find('.s-test-first'))

		press('Escape')
		await nextTick()

		expect(document.querySelector('.s-test-first')).not.toBeNull()
	})

	it('без lazyMount содержимое в документе с самого начала', async () => {
		await render(() => page())

		expect(document.querySelector('.s-test-first')).not.toBeNull()
	})
})
