/**
 * Tooltip в Solid — проводка целиком, на настоящей разметке.
 *
 * Правила показа — задержки, причины, нажатие, Escape, одна подсказка на
 * документ — проверяет плагин (`plugins/__tests__/tooltip-trigger.plugin.spec.ts`),
 * эвристику фокуса и курсор через зазор — браузер
 * (`playground/vue/browser/tooltip.spec.ts`). Здесь важно, что они сходятся:
 * панель телепортирована и помечена владельцем, триггер получает ссылку на
 * неё через scope, `open` доходит до разметки в обе стороны, а Escape у
 * подсказки в открытом поповере закрывает только её. Сценарии — те же, что у
 * Vue (`ui/vue/__tests__/tooltip.spec.ts`); открытость, которую у Vue слышит
 * `v-model`, потребитель Solid слышит колбэком `onChangeOpen`.
 *
 * Своё у Solid — живой scope триггера: ссылка на панель меняется со сменой
 * `type`, а триггер остаётся тем же узлом.
 */

import { describe, it, expect, vi } from 'vitest'
import { createSignal, type JSX } from 'solid-js'
import { TTooltip, type TTooltipType } from '@soldy-ui/core'
import type { DescriptorSlots, PopoverDescriptor, TooltipDescriptor } from '@soldy-ui/setup'
import { Button, Popover, Tooltip, type TooltipProps } from '@soldy-ui/solid'
import { find, mount, nextFrame } from './mount'

type TTriggerScope = DescriptorSlots<typeof TooltipDescriptor>['trigger']
type TPopoverTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/** Триггер так, как его кладёт потребитель: Button со ссылкой из scope, прочитанного в разметке. */
const triggerOf = (scope: TTriggerScope) => (
	<Button text="Сохранить" class="so-test-trigger" {...scope.triggerAria} />
)

/**
 * Подсказка у кнопки. Задержки сняты: их отсчёт проверяет плагин, здесь —
 * что показ и скрытие доходят до разметки. Пропсы — постоянные, объектом:
 * проп, который тест меняет, читает сигнал в разметке самого теста.
 */
const tooltip = (props: Partial<TooltipProps> = {}) => (
	<Tooltip openDelay={0} closeDelay={0} {...props} trigger={triggerOf}>
		Сохранить черновик
	</Tooltip>
)

/** Смонтировать разметку и дождаться кадра: корень плагины получают через `requestAnimationFrame`. */
async function render(code: () => JSX.Element): Promise<void> {
	mount(code)

	await nextFrame()
}

/** Узел по селектору в документе: панель телепортирована мимо контейнера. */
const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

const root = () => node('.so-tooltip')
const trigger = () => node('.so-test-trigger')
const panel = () => node('.so-tooltip__panel')
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
		expect(document.body.contains(panel())).toBe(true)
		expect(isOpen()).toBe(false)
	})

	it('панель — подсказка, не фокусируется, помечена владельцем, текст — в обёртке', async () => {
		await render(() => tooltip())

		expect(panel().getAttribute('role')).toBe('tooltip')
		expect(panel().hasAttribute('tabindex')).toBe(false)
		expect(panel().hasAttribute('aria-hidden')).toBe(false)
		// Пометка — от id монтирования подсказки (`createUniqueId`), а не от счётчика процесса
		expect(panel().dataset.owner).toBeTruthy()
		expect(node('.so-tooltip__content', panel()).textContent).toBe('Сохранить черновик')
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

/**
 * `type="label"`: подсказка — имя триггера. Нужна кнопке-иконке: с
 * `aria_label` и подсказкой-описанием скринридер прочёл бы один текст дважды.
 * Меняется только ссылка триггера — панель та же и так же всегда в документе.
 */
describe('подсказка-имя', () => {
	it('aria-labelledby триггера ведёт на панель, aria-describedby нет — и у закрытой', async () => {
		await render(() => tooltip({ type: 'label' }))

		expect(isOpen()).toBe(false)
		expect(document.getElementById(trigger().getAttribute('aria-labelledby') ?? '')).toBe(
			panel(),
		)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)
		expect(panel().getAttribute('role')).toBe('tooltip')
	})

	it('смена type из разметки переключает атрибут ссылки — и обратно', async () => {
		const [type, setType] = createSignal<TTooltipType>('description')

		await render(() => (
			<Tooltip type={type()} trigger={triggerOf}>
				Сохранить черновик
			</Tooltip>
		))

		const id = panel().id

		expect(trigger().getAttribute('aria-describedby')).toBe(id)
		expect(trigger().hasAttribute('aria-labelledby')).toBe(false)

		setType('label')

		expect(trigger().getAttribute('aria-labelledby')).toBe(id)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)

		setType('description')

		expect(trigger().getAttribute('aria-describedby')).toBe(id)
		expect(trigger().hasAttribute('aria-labelledby')).toBe(false)
	})

	it('снятый type возвращает подсказку к описанию', async () => {
		const [type, setType] = createSignal<TTooltipType | undefined>('label')

		await render(() => (
			<Tooltip type={type()} trigger={triggerOf}>
				Сохранить черновик
			</Tooltip>
		))

		setType(undefined)

		expect(trigger().getAttribute('aria-describedby')).toBe(panel().id)
		expect(trigger().hasAttribute('aria-labelledby')).toBe(false)
	})

	it('type из инстанса доходит до триггера так же, как из разметки', async () => {
		const ctrl = new TTooltip({ openDelay: 0, closeDelay: 0 })

		await render(() => tooltip({ ctrl }))

		ctrl.type = 'label'

		expect(trigger().getAttribute('aria-labelledby')).toBe(panel().id)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)
	})
})

/**
 * Ссылка на панель — scope триггера, и меняется она со сменой `type`, а
 * триггер — тот же узел: scope живой, и прочитанное в разметке слота
 * обновляется на месте. Показ ссылку не меняет, и узел тоже остаётся.
 */
describe('триггер — тот же узел', () => {
	it('после показа и после смены type', async () => {
		const ctrl = new TTooltip({ openDelay: 0, closeDelay: 0 })

		await render(() => tooltip({ ctrl }))

		const first = trigger()

		first.focus()
		enter(root())

		expect(isOpen()).toBe(true)
		expect(trigger()).toBe(first)

		ctrl.type = 'label'

		expect(trigger()).toBe(first)
		expect(first.getAttribute('aria-labelledby')).toBe(panel().id)
		expect(document.activeElement).toBe(first)
	})
})

describe('показ и скрытие', () => {
	it('курсор на корне показывает, уход — прячет', async () => {
		await render(() => tooltip())

		enter(root())

		expect(isOpen()).toBe(true)
		expect(panel().dataset.layer).toMatch(/^\d+$/)

		leave(root())

		expect(isOpen()).toBe(false)
	})

	it('нажатие на триггер прячет', async () => {
		await render(() => tooltip())

		enter(root())
		pointerDown(trigger())

		expect(isOpen()).toBe(false)
	})

	it('Escape прячет, фокус остаётся на месте', async () => {
		await render(() => tooltip())

		trigger().focus()
		enter(root())

		const event = press('Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('open из инстанса показывает так же, как наведение; onChangeOpen слышит оба пути', async () => {
		const ctrl = new TTooltip({ openDelay: 0, closeDelay: 0 })
		const onChangeOpen = vi.fn()

		await render(() => tooltip({ ctrl, onChangeOpen }))

		ctrl.open = true

		expect(isOpen()).toBe(true)

		// Открытую из кода курсор не держит: уход закрывает, только если он пришёл
		enter(root())
		leave(root())
		enter(root())
		leave(root())

		expect(ctrl.open).toBe(false)
		expect(isOpen()).toBe(false)
		expect(onChangeOpen.mock.calls).toEqual([[true], [false], [true], [false]])
	})

	it('open из разметки показывает и прячет', async () => {
		const [opened, setOpened] = createSignal(false)

		await render(() => (
			<Tooltip open={opened()} trigger={triggerOf}>
				Сохранить черновик
			</Tooltip>
		))

		setOpened(true)

		expect(isOpen()).toBe(true)

		setOpened(false)

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
	const page = () => (
		<div>
			<Popover
				closable={false}
				trigger={(scope: TPopoverTriggerScope) => (
					<Button
						text="Открыть"
						class="so-test-popover-trigger"
						{...scope.triggerAria}
						{...scope.triggerDataset}
					/>
				)}
			>
				{tooltip()}
			</Popover>
		</div>
	)

	const popoverPanel = () => node('.so-popover__panel')

	/** Открыть поповер кликом и дождаться, пока фокус уйдёт в панель. */
	async function openPopover(): Promise<void> {
		const target = node('.so-test-popover-trigger')

		pointerDown(target)
		target.focus()
		target.click()
		await nextFrame()
	}

	it('Escape закрывает только подсказку, второй — уже поповер', async () => {
		await render(page)
		await openPopover()

		expect(document.activeElement).toBe(trigger())

		enter(root())

		expect(isOpen()).toBe(true)

		press('Escape')

		expect(isOpen()).toBe(false)
		expect(isOpen(popoverPanel())).toBe(true)

		press('Escape')

		expect(isOpen(popoverPanel())).toBe(false)
	})

	it('подсказка — слой выше панели поповера: нажатие в неё поповер не закрывает', async () => {
		await render(page)
		await openPopover()

		enter(root())

		expect(Number(panel().dataset.layer)).toBeGreaterThan(Number(popoverPanel().dataset.layer))

		pointerDown(panel())

		expect(isOpen(popoverPanel())).toBe(true)
	})
})
