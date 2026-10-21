/**
 * Popover в React — проводка целиком, на настоящей разметке.
 *
 * Модель проверяет ядро, «мимо» и слои — `setup/__tests__/overlay.spec.ts`;
 * здесь важно, что они сходятся: панель телепортирована и помечена владельцем,
 * триггер получает связку через scope, фокус уходит в панель и возвращается,
 * Escape и Tab закрывают только свой слой. Сценарии — те же, что у Vue
 * (`ui/vue/__tests__/popover.spec.ts`); Select внутри поповера проверит порт
 * Select, а слой выше панели здесь — вложенный поповер.
 *
 * Своё у React — корень значением рендера: якорь панели — корень, а в React
 * он приходит только в ref-функцию при коммите. Его отдаёт хук адаптера
 * `useRootElement`: `null` на сервере и до коммита, узел после, новый — после
 * смены `tag`. Отсюда группа «React»: StrictMode, серверная разметка и
 * гидратация, смена тега. Обновления — внутри `act`: событие, сменившее
 * состояние мимо него, роняет тест сторожем консоли.
 *
 * Порядок Tab, который ведёт сам браузер, jsdom не считает: здесь проверены
 * переходы, которые делает плагин (Tab в панель, из неё, Shift+Tab на
 * триггер). Остальное — `playground/vue/browser/popover.spec.ts`.
 */

import { describe, it, expect, vi } from 'vitest'
import { StrictMode, act, type ReactElement, type ReactNode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { TPopover } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'
import { Button, LocaleProvider, Popover, type PopoverProps } from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

const trigger = () => node('.so-test-trigger')
const panel = (scope: ParentNode = document) => node('.so-popover__panel', scope)
const isOpen = (element: HTMLElement = panel()) => element.style.display !== 'none'

/** Триггер так, как его кладёт потребитель: Button со связкой и видом из scope. */
const triggerOf =
	(text: string, className: string) =>
	({ triggerAria, triggerDataset }: TTriggerScope): ReactNode => (
		<Button text={text} className={className} {...triggerAria} {...triggerDataset} />
	)

/** Содержимое с двумя остановками Tab. */
const inside = (
	<>
		<button className="so-test-first">Первая</button>
		<button className="so-test-second">Вторая</button>
	</>
)

/** Только текст: остановок Tab в панели нет. */
const textOnly = <p>Только текст</p>

/** Поповер между двумя кнопками страницы — чтобы было откуда прийти и куда уйти по Tab. */
function page(props: PopoverProps = {}, content: ReactNode = inside): ReactElement {
	return (
		<div>
			<button className="so-test-before">До</button>
			<Popover trigger={triggerOf('Открыть', 'so-test-trigger')} {...props}>
				{content}
			</Popover>
			<button className="so-test-after">После</button>
		</div>
	)
}

/** Смонтировать и дождаться кадра: корень плагины получают через `requestAnimationFrame`. */
async function render(element: ReactElement) {
	const mounted = mount(element)

	await nextFrame()

	return mounted
}

/** Нажатие мышью — `pointerdown`, как его слушает плагин оверлея. */
function pointerDown(target: Element): void {
	act(() => {
		target.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
		)
	})
}

/** Клик мышью целиком: нажатие, фокус от `mousedown`, клик. */
function click(target: HTMLElement): void {
	act(() => {
		target.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
		)
		target.focus()
		target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
	})
}

/** Клавиша на элементе под фокусом. Отдаёт событие: по нему видно, погашена ли она. */
function press(key: string, options: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options })

	act(() => {
		;(document.activeElement ?? document.body).dispatchEvent(event)
	})

	return event
}

/** Фокус меняет состояние плагинов — внутри `act`. */
function focus(target: HTMLElement): void {
	act(() => target.focus())
}

/** Открыть кликом по триггеру и дождаться, пока фокус уйдёт в панель. */
async function open(target: HTMLElement = trigger()): Promise<void> {
	click(target)
	await nextFrame()
}

/** Панель по связке с триггером: `id` из `useId`, и селектором `#…` его не взять. */
function panelOf(triggerElement: HTMLElement): HTMLElement {
	const found = document.getElementById(triggerElement.getAttribute('aria-controls') ?? '')

	if (!(found instanceof HTMLElement)) throw new Error('у триггера нет панели')

	return found
}

describe('разметка', () => {
	it('корень — span с триггером, панель телепортирована в body и скрыта', async () => {
		await render(page())

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
		await render(page({ contained: true }))

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
		await render(page())

		expect(panel().getAttribute('role')).toBe('dialog')
		expect(panel().getAttribute('tabindex')).toBe('-1')
		expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
		expect(trigger().getAttribute('aria-expanded')).toBe('false')
		expect(panelOf(trigger())).toBe(panel())
	})

	it('ARIA и data-* стоят на своих элементах', async () => {
		await render(page())
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

		await render(page({ ctrl: popover }))

		expect(panel().dataset.open).toBe('false')

		await open()

		expect(panel().dataset.open).toBe('true')

		act(() => {
			popover.open = false
		})

		expect(panel().dataset.open).toBe('false')

		act(() => {
			popover.open = true
		})

		expect(panel().dataset.open).toBe('true')

		click(node('.so-popover__close'))

		expect(popover.open).toBe(false)
		expect(panel().dataset.open).toBe('false')
	})

	it('aria_label даёт диалогу имя', async () => {
		await render(page({ aria_label: 'Фильтры' }))

		expect(panel().getAttribute('aria-label')).toBe('Фильтры')
	})

	/**
	 * Панель — в `body`, вне поддерева провайдера в документе, но в дереве React
	 * она под ним: имя крестика — от локали вокруг компонента.
	 */
	it('крестик назван локалью поддерева, closable: false его убирает', async () => {
		await render(
			<LocaleProvider locale={ruRU}>
				<div>
					<Popover>{inside}</Popover>
					<Popover closable={false} className="so-test-bare">
						{inside}
					</Popover>
				</div>
			</LocaleProvider>,
		)

		const [named, bare] = [...document.querySelectorAll('.so-popover__panel')]

		expect(document.body.contains(named)).toBe(true)
		expect(named.closest('.so-popover')).toBeNull()
		expect(named.querySelector('.so-popover__close')?.getAttribute('aria-label')).toBe(
			'Закрыть',
		)
		expect(bare.querySelector('.so-popover__close')).toBeNull()
	})
})

describe('открытие и закрытие', () => {
	it('клик по триггеру открывает', async () => {
		await render(page())

		click(trigger())

		expect(isOpen()).toBe(true)
	})

	it('клик в панель не закрывает', async () => {
		await render(page())
		await open()

		click(node('.so-test-first'))

		expect(isOpen()).toBe(true)
	})

	it('клик по открытому триггеру закрывает, панель не мигает', async () => {
		const popover = new TPopover()
		const changes: boolean[] = []

		popover.events.on('change:open', (value: boolean) => changes.push(value))

		await render(page({ ctrl: popover }))
		await open()

		click(trigger())

		expect(isOpen()).toBe(false)
		// Нажатие по триггеру — внутри владельца: закрытия нажатием мимо и
		// повторного открытия кликом не было
		expect(changes).toEqual([true, false])
	})

	it('нажатие мимо закрывает', async () => {
		await render(page())
		await open()

		pointerDown(node('.so-test-after'))

		expect(isOpen()).toBe(false)
	})

	it('open из инстанса открывает так же, как клик; onChangeOpen видит оба пути', async () => {
		const popover = new TPopover()
		const changes: boolean[] = []

		await render(page({ ctrl: popover, onChangeOpen: (value) => changes.push(value) }))

		act(() => {
			popover.open = true
		})
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-first'))

		click(trigger())

		expect(popover.open).toBe(false)
		expect(changes).toEqual([true, false])
	})

	it('open из пропа открывает и закрывает', async () => {
		const { render: rerender } = await render(page({ open: false }))

		rerender(page({ open: true }))
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-first'))

		rerender(page({ open: false }))

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})
})

describe('фокус', () => {
	it('при открытии уходит на первую остановку панели — кадром позже', async () => {
		await render(page())

		click(trigger())

		expect(document.activeElement).toBe(trigger())

		await nextFrame()

		expect(document.activeElement).toBe(node('.so-test-first'))
	})

	it('без остановок в панели — на саму панель', async () => {
		await render(page({ closable: false }, textOnly))
		await open()

		expect(document.activeElement).toBe(panel())
	})

	it('Escape закрывает и возвращает фокус на триггер', async () => {
		await render(page())
		await open()

		const event = press('Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('Escape на триггере открытого поповера тоже закрывает', async () => {
		await render(page())
		await open()

		focus(trigger())
		press('Escape')

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('крестик закрывает и возвращает фокус на триггер', async () => {
		await render(page())
		await open()

		click(node('.so-popover__close'))

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('нажатие мимо фокус не возвращает', async () => {
		await render(page())
		await open()

		pointerDown(node('.so-test-after'))

		expect(isOpen()).toBe(false)
		expect(document.activeElement).not.toBe(trigger())
	})

	it('фокус, ушедший мимо, закрывает и не возвращается', async () => {
		await render(page())
		await open()

		focus(node('.so-test-after'))

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(node('.so-test-after'))
	})

	it('открытый со старта уводит фокус в панель, закрытие возвращает его на триггер', async () => {
		await render(page({ open: true }))
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
		await render(page({ ctrl: popover }))

		outside.focus()
		act(() => {
			popover.open = true
		})
		await nextFrame()
		outside.remove()

		press('Escape')

		expect(document.activeElement).toBe(trigger())
	})
})

describe('Tab', () => {
	it('Tab с триггера при открытой панели — в панель', async () => {
		await render(page())
		await open()

		focus(trigger())

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-first'))
	})

	it('Shift+Tab с первой остановки панели — на триггер, панель остаётся открытой', async () => {
		await render(page())
		await open()

		const event = press('Tab', { shiftKey: true })

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(trigger())
		expect(isOpen()).toBe(true)
	})

	it('Shift+Tab с самой панели — тоже на триггер', async () => {
		await render(page({ closable: false }, textOnly))
		await open()

		press('Tab', { shiftKey: true })

		expect(document.activeElement).toBe(trigger())
	})

	it('Tab с последней остановки панели — к остановке после поповера, панель закрыта', async () => {
		await render(page())
		await open()

		focus(node('.so-popover__close'))

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(node('.so-test-after'))
	})

	it('Tab с самой панели без остановок — к остановке после поповера', async () => {
		await render(page({ closable: false }, textOnly))
		await open()

		expect(document.activeElement).toBe(panel())

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(node('.so-test-after'))
	})

	it('Tab с середины панели не трогает: порядок ведёт браузер', async () => {
		await render(page())
		await open()

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(false)
		expect(isOpen()).toBe(true)
	})

	it('после поповера остановок нет — закрыть, Tab не гасить', async () => {
		await render(
			<div>
				<Popover trigger={triggerOf('Открыть', 'so-test-trigger')}>{inside}</Popover>
			</div>,
		)
		await open()

		focus(node('.so-popover__close'))

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(false)
		expect(isOpen()).toBe(false)
	})
})

describe('вложенные слои', () => {
	/** Внешний поповер, в панели которого — внутренний. */
	const nested = () =>
		page(
			{ className: 'so-test-outer' },
			<>
				<button className="so-test-first">Первая</button>
				<Popover
					className="so-test-inner"
					trigger={triggerOf('Ещё', 'so-test-inner-trigger')}
				>
					<button className="so-test-inner-first">Внутри</button>
				</Popover>
			</>,
		)

	const innerTrigger = () => node('.so-test-inner-trigger')

	it('внутренняя панель — слой выше внешней', async () => {
		await render(nested())
		await open()
		await open(innerTrigger())

		expect(Number(panelOf(innerTrigger()).dataset.layer)).toBeGreaterThan(
			Number(panelOf(trigger()).dataset.layer),
		)
	})

	it('Escape во вложенном закрывает только его, фокус — на его триггер', async () => {
		await render(nested())
		await open()
		await open(innerTrigger())

		expect(document.activeElement).toBe(node('.so-test-inner-first'))

		press('Escape')

		expect(isOpen(panelOf(innerTrigger()))).toBe(false)
		expect(isOpen(panelOf(trigger()))).toBe(true)
		expect(document.activeElement).toBe(innerTrigger())
	})

	it('клик во вложенную панель внешний не закрывает', async () => {
		await render(nested())
		await open()
		await open(innerTrigger())

		click(node('.so-test-inner-first'))

		expect(isOpen(panelOf(innerTrigger()))).toBe(true)
		expect(isOpen(panelOf(trigger()))).toBe(true)
	})

	it('клик во внешнюю панель закрывает вложенный, внешний остаётся', async () => {
		await render(nested())
		await open()
		await open(innerTrigger())

		click(node('.so-test-first'))

		expect(isOpen(panelOf(innerTrigger()))).toBe(false)
		expect(isOpen(panelOf(trigger()))).toBe(true)
	})
})

describe('lazyMount', () => {
	it('содержимое монтируется при первом открытии и остаётся после закрытия', async () => {
		await render(page({ lazyMount: true }))

		expect(document.querySelector('.so-test-first')).toBeNull()
		expect(document.querySelector('.so-popover__content')).not.toBeNull()

		await open()

		expect(document.activeElement).toBe(node('.so-test-first'))

		press('Escape')

		expect(document.querySelector('.so-test-first')).not.toBeNull()
	})

	it('без lazyMount содержимое в документе с самого начала', async () => {
		await render(page())

		expect(document.querySelector('.so-test-first')).not.toBeNull()
	})
})

describe('жест', () => {
	const handle = () => document.querySelector('.so-popover__handle')

	/** Указатель мышью в точке по вертикали — как его слушает плагин жеста. */
	function pointer(type: string, target: Element, y: number): void {
		act(() => {
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
		})
	}

	it('без жеста полосы нет; с жестом — первая в панели, немая для скринридера', async () => {
		const popover = new TPopover()

		await render(page({ ctrl: popover }))

		expect(handle()).toBeNull()

		act(() => {
			popover.swipe = 'handle'
		})

		expect(handle()).toBe(panel().firstElementChild)
		expect(handle()?.getAttribute('aria-hidden')).toBe('true')

		act(() => {
			popover.swipe = 'panel'
		})

		expect(handle()).not.toBeNull()
	})

	/**
	 * Коробку панели задаёт тест: jsdom раскладку не считает. Сторону после
	 * flip плагин якоря пишет в панель и в jsdom — под триггером. Жест мышью
	 * по полосе вниз — дальше четверти высоты панели.
	 */
	it('смахнули вниз от триггера — закрыта, onChangeOpen видит закрытие, фокус — на триггер', async () => {
		const changes: boolean[] = []

		await render(page({ swipe: 'handle', onChangeOpen: (value) => changes.push(value) }))
		await open()

		expect(panel().dataset.placement).toBe('bottom-start')
		expect(panel().dataset.swiping).toBe('false')

		vi.spyOn(panel(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 8, 300, 200))

		pointer('pointerdown', node('.so-popover__handle'), 13)
		pointer('pointermove', panel(), 108)

		// Сдвиг плагин пишет в узел сам, и перерисовка React его не снимает
		expect(panel().style.getPropertyValue('--so-swipe-offset')).toBe('95px')
		expect(panel().dataset.swiping).toBe('true')

		pointer('pointerup', panel(), 113)

		expect(isOpen()).toBe(false)
		expect(panel().dataset.swiping).toBe('false')
		expect(changes).toEqual([true, false])
		expect(document.activeElement).toBe(trigger())
	})
})

/**
 * Своё у React: якорь панели — корень значением рендера (`useRootElement`), а
 * портала на сервере нет.
 */
describe('React', () => {
	/**
	 * StrictMode пересобирает контекст поповера, а с ним его ref корня: якорем
	 * панели становится корень пересобранного, и она встаёт у триггера.
	 */
	it('StrictMode: одна панель в цели, у открытой — сторона от якоря', async () => {
		await render(<StrictMode>{page()}</StrictMode>)

		expect(document.querySelectorAll('.so-popover__panel')).toHaveLength(1)

		await open()

		expect(isOpen()).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-first'))
		expect(panel().dataset.placement).toBe('bottom-start')
	})

	it('серверная разметка — корень с триггером, панели нет: портала на сервере нет', () => {
		const host = document.createElement('div')

		host.innerHTML = renderToString(page())

		expect(host.querySelector('.so-popover .so-test-trigger')).not.toBeNull()
		expect(host.querySelector('.so-popover__panel')).toBeNull()
	})

	it('серверная разметка с contained — панель на месте, в корне', () => {
		const host = document.createElement('div')

		host.innerHTML = renderToString(page({ contained: true }))

		expect(host.querySelector('.so-popover > .so-popover__panel')).not.toBeNull()
	})

	it('гидратация без расхождений; панель и якорь — после неё', async () => {
		const element = page()
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(element)
		document.body.append(container)

		const serverTrigger = trigger()

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})
		await nextFrame()

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(trigger()).toBe(serverTrigger)
		expect(document.body.contains(panel())).toBe(true)
		expect(container.contains(panel())).toBe(false)
		expect(panelOf(trigger())).toBe(panel())

		await open()

		expect(panel().dataset.placement).toBe('bottom-start')
	})

	/**
	 * Смена тега рисует корень заново: якорем панели становится новый узел.
	 * Место якоря задаёт тест — jsdom раскладку не считает: панель встаёт под
	 * новым корнем, в 8 px от него. Клик по триггеру слушает плагин на корне —
	 * новый корень он получает кадром позже, как любой.
	 */
	it('смена tag — якорь на новом корне', async () => {
		const popover = new TPopover()

		await render(page({ ctrl: popover }))

		const first = node('.so-popover')

		act(() => {
			popover.tag = 'div'
		})
		await nextFrame()

		const root = node('.so-popover')

		expect(root).not.toBe(first)
		expect(root.localName).toBe('div')

		vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 80, 20))

		await open()

		expect(isOpen()).toBe(true)
		expect(panel().style.left).toBe('100px')
		expect(panel().style.top).toBe('78px')
	})
})
