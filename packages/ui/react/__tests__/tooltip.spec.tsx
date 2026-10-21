/**
 * Tooltip в React — проводка целиком, на настоящей разметке.
 *
 * Правила показа — задержки, причины, нажатие, Escape, одна подсказка на
 * документ — проверяет плагин (`plugins/__tests__/tooltip-trigger.plugin.spec.ts`),
 * эвристику фокуса и курсор через зазор — браузер
 * (`playground/vue/browser/tooltip.spec.ts`). Здесь важно, что они сходятся:
 * панель телепортирована и помечена владельцем, триггер получает ссылку на
 * неё через scope, `open` доходит до разметки в обе стороны, а Escape у
 * подсказки в открытом поповере закрывает только её. Сценарии — те же, что у
 * Vue (`ui/vue/__tests__/tooltip.spec.ts`).
 *
 * Своё у React — якорь панели: корень значением рендера (`useRootElement`), —
 * портал, которого на сервере нет, и `act`: показ и скрытие меняют состояние
 * компонента, и сдвиг таймеров задержки тоже идёт внутри `act`.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { StrictMode, act, type ReactElement, type ReactNode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { TTooltip } from '@soldy-ui/core'
import type { DescriptorSlots, PopoverDescriptor, TooltipDescriptor } from '@soldy-ui/setup'
import { Button, Popover, Tooltip, type TooltipProps } from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

type TTriggerScope = DescriptorSlots<typeof TooltipDescriptor>['trigger']
type TPopoverTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

const root = () => node('.so-tooltip')
const trigger = () => node('.so-test-trigger')
const panel = () => node('.so-tooltip__panel')
const isOpen = (element: HTMLElement = panel()) => element.style.display !== 'none'

/** Триггер так, как его кладёт потребитель: Button со ссылкой на панель из scope. */
const saveButton = ({ triggerAria }: TTriggerScope): ReactNode => (
	<Button text="Сохранить" className="so-test-trigger" {...triggerAria} />
)

/**
 * Подсказка у кнопки. Задержки сняты: их отсчёт проверяет плагин и группа
 * «задержки», здесь — что показ и скрытие доходят до разметки.
 */
const tooltip = (props: TooltipProps = {}): ReactElement => (
	<Tooltip openDelay={0} closeDelay={0} trigger={saveButton} {...props}>
		Сохранить черновик
	</Tooltip>
)

/** Смонтировать и дождаться кадра: корень плагины получают через `requestAnimationFrame`. */
async function render(element: ReactElement) {
	const mounted = mount(element)

	await nextFrame()

	return mounted
}

/** Событие на узле — внутри `act`: показ и скрытие меняют состояние компонента. */
function dispatch(target: Element, event: Event): void {
	act(() => {
		target.dispatchEvent(event)
	})
}

const enter = (target: Element) =>
	dispatch(target, new PointerEvent('pointerenter', { pointerType: 'mouse' }))

const leave = (target: Element) =>
	dispatch(target, new PointerEvent('pointerleave', { pointerType: 'mouse' }))

/** Нажатие мышью — `pointerdown`, как его слушают плагины. */
const pointerDown = (target: Element) =>
	dispatch(target, new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))

/** Клавиша на элементе под фокусом. Отдаёт событие: по нему видно, погашена ли она. */
function press(key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	dispatch(document.activeElement ?? document.body, event)

	return event
}

/**
 * Задержки — таймеры плагина. Группа первая в файле: подсказка, закрытая
 * меньше 300 мс назад, показывает следующую без задержки — состояние
 * документа, — а в начале файла закрытых подсказок нет. Подменены только
 * таймеры: кадр, которым корень приходит плагинам, остаётся настоящим.
 */
describe('задержки', () => {
	afterEach(() => {
		// Окно «без задержки» после закрытия — тоже таймер: доигрывается здесь
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	it('курсор на корне — показ через openDelay, уход — скрытие через closeDelay', async () => {
		await render(<Tooltip trigger={saveButton}>Сохранить черновик</Tooltip>)

		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

		enter(root())
		act(() => vi.advanceTimersByTime(399))

		expect(isOpen()).toBe(false)

		act(() => vi.advanceTimersByTime(1))

		expect(isOpen()).toBe(true)

		leave(root())
		act(() => vi.advanceTimersByTime(149))

		expect(isOpen()).toBe(true)

		act(() => vi.advanceTimersByTime(1))

		expect(isOpen()).toBe(false)
	})
})

describe('разметка', () => {
	it('корень — span с триггером, панель телепортирована в body и скрыта', async () => {
		await render(tooltip())

		expect(root().localName).toBe('span')
		expect(root().contains(trigger())).toBe(true)
		expect(root().contains(panel())).toBe(false)
		expect(document.body.contains(panel())).toBe(true)
		expect(isOpen()).toBe(false)
	})

	it('панель — подсказка, не фокусируется, помечена владельцем, текст — в обёртке', async () => {
		await render(tooltip())

		expect(panel().getAttribute('role')).toBe('tooltip')
		expect(panel().hasAttribute('tabindex')).toBe(false)
		expect(panel().hasAttribute('aria-hidden')).toBe(false)
		// Пометка — от id монтирования подсказки (`useId`), а не от счётчика процесса
		expect(panel().dataset.owner).toBeTruthy()
		expect(node('.so-tooltip__content', panel()).textContent).toBe('Сохранить черновик')
	})

	it('aria-describedby триггера ведёт на панель — и у закрытой подсказки', async () => {
		await render(tooltip())

		expect(isOpen()).toBe(false)
		expect(document.getElementById(trigger().getAttribute('aria-describedby') ?? '')).toBe(
			panel(),
		)
	})

	it('ARIA — на панели и триггере, не на корне', async () => {
		await render(tooltip())

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
		await render(tooltip({ type: 'label' }))

		expect(isOpen()).toBe(false)
		expect(document.getElementById(trigger().getAttribute('aria-labelledby') ?? '')).toBe(
			panel(),
		)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)
		expect(panel().getAttribute('role')).toBe('tooltip')
	})

	it('смена type из пропа переключает атрибут ссылки — и обратно', async () => {
		const { render: rerender } = await render(tooltip({ type: 'description' }))
		const id = panel().id

		expect(trigger().getAttribute('aria-describedby')).toBe(id)
		expect(trigger().hasAttribute('aria-labelledby')).toBe(false)

		rerender(tooltip({ type: 'label' }))

		expect(trigger().getAttribute('aria-labelledby')).toBe(id)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)

		rerender(tooltip({ type: 'description' }))

		expect(trigger().getAttribute('aria-describedby')).toBe(id)
		expect(trigger().hasAttribute('aria-labelledby')).toBe(false)
	})

	it('снятый type возвращает подсказку к описанию', async () => {
		const { render: rerender } = await render(tooltip({ type: 'label' }))

		rerender(tooltip())

		expect(trigger().getAttribute('aria-describedby')).toBe(panel().id)
		expect(trigger().hasAttribute('aria-labelledby')).toBe(false)
	})

	it('type из инстанса доходит до триггера так же, как из пропа', async () => {
		const ctrl = new TTooltip({ openDelay: 0, closeDelay: 0 })

		await render(tooltip({ ctrl }))

		act(() => {
			ctrl.type = 'label'
		})

		expect(trigger().getAttribute('aria-labelledby')).toBe(panel().id)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)
	})
})

describe('показ и скрытие', () => {
	it('курсор на корне показывает, уход — прячет', async () => {
		await render(tooltip())

		enter(root())

		expect(isOpen()).toBe(true)
		expect(panel().dataset.layer).toMatch(/^\d+$/)

		leave(root())

		expect(isOpen()).toBe(false)
	})

	it('нажатие на триггер прячет', async () => {
		await render(tooltip())

		enter(root())
		pointerDown(trigger())

		expect(isOpen()).toBe(false)
	})

	it('Escape прячет, фокус остаётся на месте', async () => {
		await render(tooltip())

		act(() => trigger().focus())
		enter(root())

		const event = press('Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('open из инстанса показывает так же, как наведение; onChangeOpen видит оба пути', async () => {
		const ctrl = new TTooltip({ openDelay: 0, closeDelay: 0 })
		const changes: boolean[] = []

		await render(tooltip({ ctrl, onChangeOpen: (value) => changes.push(value) }))

		act(() => {
			ctrl.open = true
		})

		expect(isOpen()).toBe(true)

		// Открытую из кода курсор не держит: уход закрывает, только если он пришёл
		enter(root())
		leave(root())
		enter(root())
		leave(root())

		expect(ctrl.open).toBe(false)
		expect(isOpen()).toBe(false)
		expect(changes).toEqual([true, false, true, false])
	})

	it('open из пропа показывает и прячет', async () => {
		const { render: rerender } = await render(tooltip({ open: false }))

		rerender(tooltip({ open: true }))

		expect(isOpen()).toBe(true)

		rerender(tooltip({ open: false }))

		expect(isOpen()).toBe(false)
	})

	it('placement доходит до якоря: сторона панели — в data-placement', async () => {
		await render(tooltip({ open: true, placement: 'bottom-end' }))
		await nextFrame()

		expect(panel().dataset.placement).toBe('bottom-end')
	})

	it('центр доходит до якоря: data-placement без суффикса', async () => {
		await render(tooltip({ open: true, placement: 'bottom' }))
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
				trigger={({ triggerAria, triggerDataset }: TPopoverTriggerScope) => (
					<Button
						text="Открыть"
						className="so-test-popover-trigger"
						{...triggerAria}
						{...triggerDataset}
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
		act(() => {
			target.focus()
			target.click()
		})
		await nextFrame()
	}

	it('Escape закрывает только подсказку, второй — уже поповер', async () => {
		await render(page())
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
		await render(page())
		await openPopover()

		enter(root())

		expect(Number(panel().dataset.layer)).toBeGreaterThan(Number(popoverPanel().dataset.layer))

		pointerDown(panel())

		expect(isOpen(popoverPanel())).toBe(true)
	})
})

/**
 * Своё у React: якорь панели — корень значением рендера (`useRootElement`), а
 * портала на сервере нет.
 */
describe('React', () => {
	it('StrictMode: одна панель в цели, у открытой — сторона от якоря', async () => {
		await render(<StrictMode>{tooltip({ placement: 'bottom-end' })}</StrictMode>)

		expect(document.querySelectorAll('.so-tooltip__panel')).toHaveLength(1)

		enter(root())
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(panel().dataset.placement).toBe('bottom-end')
	})

	it('серверная разметка — корень с триггером и его ссылкой, панели нет', () => {
		const host = document.createElement('div')

		host.innerHTML = renderToString(tooltip())

		const button = host.querySelector('.so-tooltip .so-test-trigger')

		expect(button?.getAttribute('aria-describedby')).toBeTruthy()
		expect(host.querySelector('.so-tooltip__panel')).toBeNull()
	})

	it('гидратация без расхождений; панель и якорь — после неё', async () => {
		const element = tooltip({ placement: 'bottom-end' })
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(element)
		document.body.append(container)

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})
		await nextFrame()

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(document.body.contains(panel())).toBe(true)
		expect(container.contains(panel())).toBe(false)
		expect(document.getElementById(trigger().getAttribute('aria-describedby') ?? '')).toBe(
			panel(),
		)

		enter(root())
		await nextFrame()

		expect(panel().dataset.placement).toBe('bottom-end')
	})
})
