/**
 * Tooltip во Vue — проводка целиком, на настоящей разметке.
 *
 * Правила показа — задержки, причины, нажатие, Escape, одна подсказка на
 * документ — проверяет плагин (`plugins/__tests__/tooltip-trigger.plugin.spec.ts`),
 * эвристику фокуса и курсор через зазор — браузер
 * (`playground/vue/browser/tooltip.spec.ts`). Здесь важно, что они сходятся:
 * панель телепортирована и помечена владельцем, триггер получает ссылку на
 * неё через scope, `open` доходит до разметки в обе стороны, а Escape у
 * подсказки в открытом поповере закрывает только её.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { Button, Popover, Tooltip } from '@soldy-ui/vue'
import { TTooltip } from '@soldy-ui/core'
import type { ITooltipProps } from '@soldy-ui/core'
import type { DescriptorSlots, PopoverDescriptor, TooltipDescriptor } from '@soldy-ui/setup'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

type TTriggerScope = DescriptorSlots<typeof TooltipDescriptor>['trigger']
type TPopoverTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

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

/**
 * Подсказка у кнопки. Задержки сняты: их отсчёт проверяет плагин, здесь —
 * что показ и скрытие доходят до разметки.
 */
const tooltip = (props: Partial<ITooltipProps> & Record<string, unknown> = {}) =>
	h(
		Tooltip,
		{ openDelay: 0, closeDelay: 0, ...props },
		{
			trigger: ({ triggerAria }: TTriggerScope) =>
				h(Button, { text: 'Сохранить', class: 's-test-trigger', ...triggerAria }),
			default: () => 'Сохранить черновик',
		},
	)

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, scope: ParentNode = document): HTMLElement {
	const element = scope.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const root = () => find('.s-tooltip')
const trigger = () => find('.s-test-trigger')
const panel = () => find('.s-tooltip__panel')
const isOpen = (element: HTMLElement = panel()) => element.style.display !== 'none'

const enter = (target: Element) =>
	target.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))

const leave = (target: Element) =>
	target.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))

/** Нажатие мышью — `pointerdown`, как его слушают плагины. */
const pointerDown = (target: Element) =>
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))

/** Клавиша на элементе под фокусом. Отдаёт событие: по нему видно, погашена ли она. */
function press(key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	;(document.activeElement ?? document.body).dispatchEvent(event)

	return event
}

describe('разметка', () => {
	it('корень — span с триггером, панель телепортирована в body и скрыта', async () => {
		await render(() => tooltip())

		expect(root().localName).toBe('span')
		expect(root().contains(trigger())).toBe(true)
		expect(root().contains(panel())).toBe(false)
		expect(panel().parentElement).toBe(document.body)
		expect(isOpen()).toBe(false)
	})

	it('панель — подсказка, не фокусируется, помечена владельцем, текст — в обёртке', async () => {
		await render(() => tooltip())

		expect(panel().getAttribute('role')).toBe('tooltip')
		expect(panel().hasAttribute('tabindex')).toBe(false)
		expect(panel().hasAttribute('aria-hidden')).toBe(false)
		expect(panel().dataset.owner).toMatch(/^\d+$/)
		expect(find('.s-tooltip__content', panel()).textContent).toBe('Сохранить черновик')
	})

	it('aria-describedby триггера ведёт на панель — и у закрытой подсказки', async () => {
		await render(() => tooltip())

		expect(isOpen()).toBe(false)
		expect(document.getElementById(trigger().getAttribute('aria-describedby') ?? '')).toBe(
			panel(),
		)
	})

	it('ARIA — на панели и триггере, не на корне', async () => {
		await render(() => tooltip())

		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-describedby')).toBe(false)
	})
})

describe('показ и скрытие', () => {
	it('курсор на корне показывает, уход — прячет', async () => {
		await render(() => tooltip())

		enter(root())
		await nextTick()

		expect(isOpen()).toBe(true)
		expect(panel().dataset.layer).toMatch(/^\d+$/)

		leave(root())
		await nextTick()

		expect(isOpen()).toBe(false)
	})

	it('нажатие на триггер прячет', async () => {
		await render(() => tooltip())

		enter(root())
		await nextTick()
		pointerDown(trigger())
		await nextTick()

		expect(isOpen()).toBe(false)
	})

	it('Escape прячет, фокус остаётся на месте', async () => {
		await render(() => tooltip())

		trigger().focus()
		enter(root())
		await nextTick()

		const event = press('Escape')

		await nextTick()

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('open из инстанса показывает так же, как наведение; v-model видит оба пути', async () => {
		const ctrl = new TTooltip({ openDelay: 0, closeDelay: 0 })
		const mounted = await render(() => tooltip({ ctrl }))

		ctrl.open = true
		await nextTick()

		expect(isOpen()).toBe(true)

		leave(root())
		enter(root())
		leave(root())
		await nextTick()

		expect(ctrl.open).toBe(false)
		expect(isOpen()).toBe(false)
		expect(mounted.findComponent(Tooltip).emitted('update:open')).toEqual([
			[true],
			[false],
			[true],
			[false],
		])
	})

	it('open из шаблона показывает и прячет', async () => {
		const mounted = mount(Tooltip, {
			props: { open: false },
			slots: {
				trigger: ({ triggerAria }: TTriggerScope) =>
					h(Button, { text: 'Сохранить', class: 's-test-trigger', ...triggerAria }),
				default: () => 'Сохранить черновик',
			},
			attachTo: document.body,
		})

		wrapper = mounted
		await nextFrame()
		await mounted.setProps({ open: true })

		expect(isOpen()).toBe(true)

		await mounted.setProps({ open: false })

		expect(isOpen()).toBe(false)
	})

	it('placement доходит до якоря: сторона панели — в data-placement', async () => {
		await render(() => tooltip({ open: true, placement: 'bottom-end' }))
		await nextFrame()

		expect(panel().dataset.placement).toBe('bottom-end')
	})

	it('центр доходит до якоря: data-placement без суффикса', async () => {
		await render(() => tooltip({ open: true, placement: 'bottom' }))
		await nextFrame()

		expect(panel().dataset.placement).toBe('bottom')
	})
})

describe('в открытом поповере', () => {
	/** Поповер, в панели которого — кнопка с подсказкой. */
	const page = () =>
		h('div', [
			h(
				Popover,
				{ closable: false },
				{
					trigger: ({ triggerAria, triggerDataset }: TPopoverTriggerScope) =>
						h(Button, {
							text: 'Открыть',
							class: 's-test-popover-trigger',
							...triggerAria,
							...triggerDataset,
						}),
					default: () => tooltip(),
				},
			),
		])

	const popoverPanel = () => find('.s-popover__panel')

	/** Открыть поповер кликом и дождаться, пока фокус уйдёт в панель. */
	async function openPopover(): Promise<void> {
		const target = find('.s-test-popover-trigger')

		pointerDown(target)
		target.focus()
		target.click()
		await nextTick()
		await nextFrame()
	}

	it('Escape закрывает только подсказку, второй — уже поповер', async () => {
		await render(page)
		await openPopover()

		expect(document.activeElement).toBe(trigger())

		enter(root())
		await nextTick()

		expect(isOpen()).toBe(true)

		press('Escape')
		await nextTick()

		expect(isOpen()).toBe(false)
		expect(isOpen(popoverPanel())).toBe(true)

		press('Escape')
		await nextTick()

		expect(isOpen(popoverPanel())).toBe(false)
	})

	it('подсказка — слой выше панели поповера: нажатие в неё поповер не закрывает', async () => {
		await render(page)
		await openPopover()

		enter(root())
		await nextTick()

		expect(Number(panel().dataset.layer)).toBeGreaterThan(Number(popoverPanel().dataset.layer))

		pointerDown(panel())
		await nextTick()

		expect(isOpen(popoverPanel())).toBe(true)
	})
})
