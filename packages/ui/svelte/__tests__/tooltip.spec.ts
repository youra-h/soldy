/**
 * Tooltip в Svelte — проводка целиком, на настоящей разметке.
 *
 * Правила показа — задержки, причины, нажатие, Escape, одна подсказка на
 * документ — проверяет плагин (`plugins/__tests__/tooltip-trigger.plugin.spec.ts`),
 * эвристику фокуса и курсор через зазор — браузер
 * (`playground/vue/browser/tooltip.spec.ts`). Здесь важно, что они сходятся:
 * панель телепортирована и помечена владельцем, якорь панели — корень
 * подсказки, триггер получает ссылку на неё через scope, `open` доходит до
 * разметки в обе стороны, а Escape у подсказки в открытом поповере закрывает
 * только её. Сценарии — те же, что у Vue (`tooltip.spec.ts`); открытость,
 * которую Vue держит `v-model`, здесь возвращает пропом колбэк `onChangeOpen`.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { TTooltip } from '@soldy-ui/core'
import type { TooltipProps } from '@soldy-ui/svelte'
import Harness from './Tooltip.test.svelte'
import Popover from './Popover.test.svelte'
import { find, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'

/**
 * Смонтировать подсказку и дождаться кадра: корень плагины получают через
 * `requestAnimationFrame`. Отдаёт пропсы подсказки — их можно менять.
 */
async function render(tooltip: TooltipProps = {}) {
	const props = reactiveProps<TooltipProps>(tooltip)

	mount(Harness, { tooltip: props })
	await nextFrame()

	return props
}

const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

const root = () => node('.so-tooltip')
const trigger = () => node('.so-test-trigger')
const panel = () => node('.so-tooltip__panel')
const isOpen = (element: HTMLElement = panel()) => element.style.display !== 'none'

function enter(target: Element): void {
	target.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
	flushSync()
}

function leave(target: Element): void {
	target.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
	flushSync()
}

/** Нажатие мышью — `pointerdown`, как его слушают плагины. */
function pointerDown(target: Element): void {
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
	flushSync()
}

/** Клавиша на элементе под фокусом. Отдаёт событие: по нему видно, погашена ли она. */
function press(key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	;(document.activeElement ?? document.body).dispatchEvent(event)
	flushSync()

	return event
}

describe('разметка', () => {
	it('корень — span с триггером, панель телепортирована в body и скрыта', async () => {
		await render()

		expect(root().localName).toBe('span')
		expect(root().contains(trigger())).toBe(true)
		expect(root().contains(panel())).toBe(false)
		expect(document.body.contains(panel())).toBe(true)
		expect(isOpen()).toBe(false)
	})

	it('панель — подсказка, не фокусируется, помечена владельцем, текст — в обёртке', async () => {
		await render()

		expect(panel().getAttribute('role')).toBe('tooltip')
		expect(panel().hasAttribute('tabindex')).toBe(false)
		expect(panel().hasAttribute('aria-hidden')).toBe(false)
		// Пометка — от id монтирования подсказки (`$props.id()`), а не от счётчика процесса
		expect(panel().dataset.owner).toBeTruthy()
		expect(node('.so-tooltip__content', panel()).textContent).toBe('Сохранить черновик')
	})

	it('aria-describedby триггера ведёт на панель — и у закрытой подсказки', async () => {
		await render()

		expect(isOpen()).toBe(false)
		expect(document.getElementById(trigger().getAttribute('aria-describedby') ?? '')).toBe(
			panel(),
		)
	})

	it('ARIA — на панели и триггере, не на корне', async () => {
		await render()

		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-describedby')).toBe(false)
	})
})

/**
 * `type="label"`: подсказка — имя триггера. Нужна кнопке-иконке: с
 * `aria_label` и подсказкой-описанием скринридер прочёл бы один текст дважды.
 * Меняется только ссылка триггера — панель та же и так же всегда в документе.
 */
describe('подсказка-имя', () => {
	it('aria-labelledby триггера ведёт на панель, aria-describedby нет — и у закрытой', async () => {
		await render({ type: 'label' })

		expect(isOpen()).toBe(false)
		expect(document.getElementById(trigger().getAttribute('aria-labelledby') ?? '')).toBe(
			panel(),
		)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)
		expect(panel().getAttribute('role')).toBe('tooltip')
	})

	it('смена type из разметки переключает атрибут ссылки — и обратно', async () => {
		const props = await render({ type: 'description' })
		const id = panel().id

		expect(trigger().getAttribute('aria-describedby')).toBe(id)
		expect(trigger().hasAttribute('aria-labelledby')).toBe(false)

		props.type = 'label'
		flushSync()

		expect(trigger().getAttribute('aria-labelledby')).toBe(id)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)

		props.type = 'description'
		flushSync()

		expect(trigger().getAttribute('aria-describedby')).toBe(id)
		expect(trigger().hasAttribute('aria-labelledby')).toBe(false)
	})

	it('снятый type возвращает подсказку к описанию', async () => {
		const props = await render({ type: 'label' })

		props.type = undefined
		flushSync()

		expect(trigger().getAttribute('aria-describedby')).toBe(panel().id)
		expect(trigger().hasAttribute('aria-labelledby')).toBe(false)
	})

	it('type из инстанса доходит до триггера так же, как из разметки', async () => {
		const ctrl = new TTooltip({ openDelay: 0, closeDelay: 0 })

		await render({ ctrl })

		ctrl.type = 'label'
		flushSync()

		expect(trigger().getAttribute('aria-labelledby')).toBe(panel().id)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)
	})
})

describe('показ и скрытие', () => {
	it('курсор на корне показывает, уход — прячет', async () => {
		await render()

		enter(root())

		expect(isOpen()).toBe(true)
		expect(panel().dataset.layer).toMatch(/^\d+$/)

		leave(root())

		expect(isOpen()).toBe(false)
	})

	it('нажатие на триггер прячет', async () => {
		await render()

		enter(root())
		pointerDown(trigger())

		expect(isOpen()).toBe(false)
	})

	it('Escape прячет, фокус остаётся на месте', async () => {
		await render()

		trigger().focus()
		enter(root())

		const event = press('Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('open из инстанса показывает так же, как наведение; onChangeOpen видит оба пути', async () => {
		const ctrl = new TTooltip({ openDelay: 0, closeDelay: 0 })
		const opens: boolean[] = []
		const props = reactiveProps<TooltipProps>({
			ctrl,
			onChangeOpen: (value) => {
				opens.push(value)
				props.open = value
			},
		})

		mount(Harness, { tooltip: props })
		await nextFrame()

		ctrl.open = true
		flushSync()

		expect(isOpen()).toBe(true)

		leave(root())
		enter(root())
		leave(root())

		expect(ctrl.open).toBe(false)
		expect(isOpen()).toBe(false)
		expect(opens).toEqual([true, false, true, false])
	})

	it('open из разметки показывает и прячет', async () => {
		const props = await render({ open: false })

		props.open = true
		flushSync()

		expect(isOpen()).toBe(true)

		props.open = false
		flushSync()

		expect(isOpen()).toBe(false)
	})

	/** Сторону панели пишет плагин якоря: якорь панели — корень подсказки. */
	it('placement доходит до якоря: сторона панели — в data-placement', async () => {
		await render({ open: true, placement: 'bottom-end' })
		await nextFrame()

		expect(panel().dataset.placement).toBe('bottom-end')
	})

	it('центр доходит до якоря: data-placement без суффикса', async () => {
		await render({ open: true, placement: 'bottom' })
		await nextFrame()

		expect(panel().dataset.placement).toBe('bottom')
	})
})

describe('в открытом поповере', () => {
	const popoverPanel = () => node('.so-popover__panel')
	const tooltipTrigger = () => node('.so-test-tooltip-trigger')

	/** Поповер, в панели которого — кнопка с подсказкой; открыт кликом, фокус — в панели. */
	async function openPopover(): Promise<void> {
		mount(Popover, { case: 'tooltip', popover: { closable: false } })
		await nextFrame()

		const target = node('.so-test-trigger')

		target.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
		)
		target.focus()
		target.click()
		flushSync()
		await nextFrame()
	}

	it('Escape закрывает только подсказку, второй — уже поповер', async () => {
		await openPopover()

		expect(document.activeElement).toBe(tooltipTrigger())

		enter(root())

		expect(isOpen()).toBe(true)

		press('Escape')

		expect(isOpen()).toBe(false)
		expect(isOpen(popoverPanel())).toBe(true)

		press('Escape')

		expect(isOpen(popoverPanel())).toBe(false)
	})

	it('подсказка — слой выше панели поповера: нажатие в неё поповер не закрывает', async () => {
		await openPopover()

		enter(root())

		expect(Number(panel().dataset.layer)).toBeGreaterThan(Number(popoverPanel().dataset.layer))

		pointerDown(panel())

		expect(isOpen(popoverPanel())).toBe(true)
	})
})
