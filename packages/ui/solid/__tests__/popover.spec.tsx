/**
 * Popover в Solid — проводка целиком, на настоящей разметке.
 *
 * Модель проверяет ядро, «мимо» и слои — `setup/__tests__/overlay.spec.ts`;
 * здесь важно, что они сходятся: панель телепортирована и помечена владельцем,
 * триггер получает связку через scope, фокус уходит в панель и возвращается,
 * Escape и Tab закрывают только свой слой. Сценарии — те же, что у Vue
 * (`ui/vue/__tests__/popover.spec.ts`), кроме Select внутри: Select в Solid
 * ещё нет. `v-model` у Solid нет — открытость потребитель слышит колбэком
 * `onChangeOpen`.
 *
 * Своё у Solid — живой scope триггера: связка меняется на каждое открытие, а
 * триггер остаётся тем же узлом, и фокус с него не падает на `body`.
 *
 * Телепорт стоит на `Portal` Solid, а тот кладёт в цель свою обёртку: место
 * панели проверяется тем, в какой цели она лежит (`contains`), а не её
 * родителем.
 *
 * Порядок Tab, который ведёт сам браузер, jsdom не считает: здесь проверены
 * переходы, которые делает плагин (Tab в панель, из неё, Shift+Tab на
 * триггер). Остальное — `playground/vue/browser/popover.spec.ts`.
 */

import { describe, it, expect, vi } from 'vitest'
import { createSignal, type JSX } from 'solid-js'
import { TPopover } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'
import { Button, LocaleProvider, Popover, type PopoverProps } from '@soldy-ui/solid'
import { find, mount, nextFrame, type TMounted } from './mount'

type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/**
 * Триггер так, как его кладёт потребитель: Button со связкой и видом из scope,
 * прочитанного в разметке, — так триггер переживает смену связки тем же узлом.
 */
const triggerOf = (text: string, className: string) => (scope: TTriggerScope) => (
	<Button text={text} class={className} {...scope.triggerAria} {...scope.triggerDataset} />
)

/** Содержимое с двумя остановками Tab. */
const inside = () => (
	<>
		<button class="so-test-first">Первая</button>
		<button class="so-test-second">Вторая</button>
	</>
)

/** Только текст: остановок Tab в панели нет. */
const text = () => <p>Только текст</p>

/**
 * Поповер между двумя кнопками страницы — чтобы было откуда прийти и куда уйти
 * по Tab. Корень плагины получают через `requestAnimationFrame`, поэтому
 * разметка смонтирована и кадр выждан.
 */
async function page(
	props: Partial<PopoverProps> = {},
	content: () => JSX.Element = inside,
): Promise<TMounted> {
	const mounted = mount(() => (
		<div>
			<button class="so-test-before">До</button>
			<Popover {...props} trigger={triggerOf('Открыть', 'so-test-trigger')}>
				{content()}
			</Popover>
			<button class="so-test-after">После</button>
		</div>
	))

	await nextFrame()

	return mounted
}

/** Узел по селектору в документе: панель телепортирована мимо контейнера. */
const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

const trigger = () => node('.so-test-trigger')
const panel = (scope: ParentNode = document) => node('.so-popover__panel', scope)
const isOpen = (element: HTMLElement = panel()) => element.style.display !== 'none'

/** Нажатие мышью — `pointerdown`, как его слушает плагин оверлея. */
const pointerDown = (target: Element) =>
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))

/** Клик мышью целиком: нажатие, фокус от `mousedown`, клик. */
function click(target: HTMLElement): void {
	pointerDown(target)
	target.focus()
	target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

/** Клавиша на элементе под фокусом. Отдаёт событие: по нему видно, погашена ли она. */
function press(key: string, options: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options })

	;(document.activeElement ?? document.body).dispatchEvent(event)

	return event
}

/** Открыть кликом по триггеру и дождаться, пока фокус уйдёт в панель. */
async function open(target: HTMLElement = trigger()): Promise<void> {
	click(target)
	await nextFrame()
}

describe('разметка', () => {
	it('корень — span с триггером, панель телепортирована в body и скрыта', async () => {
		const { container } = await page()
		const root = node('.so-popover')

		expect(root.localName).toBe('span')
		expect(root.contains(trigger())).toBe(true)
		expect(root.contains(panel())).toBe(false)
		expect(container.contains(panel())).toBe(false)
		expect(document.body.contains(panel())).toBe(true)
		expect(isOpen()).toBe(false)
	})

	/**
	 * Внутри контейнера панель не телепортирована: она в корне, сразу за
	 * триггером, и накрывает ближайший позиционированный предок — раскладка
	 * ставит её `absolute` без координат, место задаёт тема.
	 */
	it('contained: панель в корне, без телепорта и координат; нажатие в ней не закрывает', async () => {
		await page({ contained: true })

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
		await page()

		expect(panel().getAttribute('role')).toBe('dialog')
		expect(panel().getAttribute('tabindex')).toBe('-1')
		expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
		expect(trigger().getAttribute('aria-expanded')).toBe('false')
		expect(document.getElementById(trigger().getAttribute('aria-controls') ?? '')).toBe(panel())
	})

	it('ARIA и data-* стоят на своих элементах', async () => {
		await page()
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

		await page({ ctrl: popover })

		expect(panel().dataset.open).toBe('false')

		await open()

		expect(panel().dataset.open).toBe('true')

		popover.open = false

		expect(panel().dataset.open).toBe('false')

		popover.open = true

		expect(panel().dataset.open).toBe('true')

		click(node('.so-popover__close'))

		expect(popover.open).toBe(false)
		expect(panel().dataset.open).toBe('false')
	})

	it('aria_label даёт диалогу имя', async () => {
		await page({ aria_label: 'Фильтры' })

		expect(panel().getAttribute('aria-label')).toBe('Фильтры')
	})

	it('крестик назван локалью поддерева, closable: false его убирает', () => {
		mount(() => (
			<LocaleProvider locale={ruRU}>
				<div>
					<Popover>{inside()}</Popover>
					<Popover closable={false} class="so-test-bare">
						{inside()}
					</Popover>
				</div>
			</LocaleProvider>
		))

		const [named, bare] = [...document.querySelectorAll('.so-popover__panel')]

		expect(named.querySelector('.so-popover__close')?.getAttribute('aria-label')).toBe(
			'Закрыть',
		)
		expect(bare.querySelector('.so-popover__close')).toBeNull()
	})
})

describe('открытие и закрытие', () => {
	it('клик по триггеру открывает', async () => {
		await page()

		click(trigger())

		expect(isOpen()).toBe(true)
	})

	it('клик в панель не закрывает', async () => {
		await page()
		await open()

		click(node('.so-test-first'))

		expect(isOpen()).toBe(true)
	})

	it('клик по открытому триггеру закрывает, панель не мигает', async () => {
		const popover = new TPopover()
		const changes: boolean[] = []

		popover.events.on('change:open', (value: boolean) => changes.push(value))

		await page({ ctrl: popover })
		await open()

		click(trigger())

		expect(isOpen()).toBe(false)
		// Нажатие по триггеру — внутри владельца: закрытия нажатием мимо и
		// повторного открытия кликом не было
		expect(changes).toEqual([true, false])
	})

	it('нажатие мимо закрывает', async () => {
		await page()
		await open()

		pointerDown(node('.so-test-after'))

		expect(isOpen()).toBe(false)
	})

	it('open из инстанса открывает так же, как из разметки; onChangeOpen слышит оба пути', async () => {
		const popover = new TPopover()
		const onChangeOpen = vi.fn()

		await page({ ctrl: popover, onChangeOpen })

		popover.open = true
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-first'))

		click(trigger())

		expect(popover.open).toBe(false)
		expect(onChangeOpen.mock.calls).toEqual([[true], [false]])
	})

	it('open из разметки открывает и закрывает', async () => {
		const [opened, setOpened] = createSignal(false)

		mount(() => (
			<Popover open={opened()} trigger={triggerOf('Открыть', 'so-test-trigger')}>
				{inside()}
			</Popover>
		))
		await nextFrame()

		setOpened(true)
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-first'))

		setOpened(false)

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})
})

/**
 * Связка триггера меняется на каждое открытие (`aria-expanded`,
 * `data-selected`), а триггер — тот же узел: scope живой, и прочитанное в
 * разметке слота обновляется на месте. Свежий объект scope перезапускал бы
 * функцию слота, и Solid рисовал бы новый триггер: фокус, стоявший на
 * прежнем, падал бы на `body`.
 */
describe('триггер — тот же узел', () => {
	it('после открытия и закрытия — тот же узел с новой связкой', async () => {
		await page()

		const first = trigger()

		await open()

		expect(trigger()).toBe(first)
		expect(first.getAttribute('aria-expanded')).toBe('true')
		expect(first.dataset.selected).toBe('true')

		press('Escape')

		expect(trigger()).toBe(first)
		expect(first.getAttribute('aria-expanded')).toBe('false')
		expect(first.dataset.selected).toBe('false')
	})

	it('после закрытия кликом по триггеру фокус остаётся на нём', async () => {
		await page()
		await open()

		click(trigger())

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	/**
	 * Деструктуризация читает scope при вызове функции слота, и смена связки её
	 * перезапускает: триггер рисуется заново — но со связкой, верной на каждом
	 * шаге. Узел при этом новый, и фокус, стоявший на прежнем, он не держит —
	 * поэтому scope читают в разметке.
	 */
	it('с деструктурированным scope связка всё равно верна', async () => {
		mount(() => (
			<Popover
				trigger={({ triggerAria, triggerDataset }: TTriggerScope) => (
					<Button
						text="Открыть"
						class="so-test-trigger"
						{...triggerAria}
						{...triggerDataset}
					/>
				)}
			>
				{inside()}
			</Popover>
		))
		await nextFrame()
		await open()

		expect(isOpen()).toBe(true)
		expect(trigger().getAttribute('aria-expanded')).toBe('true')
		expect(trigger().dataset.selected).toBe('true')
		expect(document.getElementById(trigger().getAttribute('aria-controls') ?? '')).toBe(panel())

		press('Escape')

		expect(isOpen()).toBe(false)
		expect(trigger().getAttribute('aria-expanded')).toBe('false')
		expect(trigger().dataset.selected).toBe('false')
		expect(document.getElementById(trigger().getAttribute('aria-controls') ?? '')).toBe(panel())
	})
})

describe('фокус', () => {
	it('при открытии уходит на первую остановку панели — кадром позже', async () => {
		await page()

		click(trigger())

		expect(document.activeElement).toBe(trigger())

		await nextFrame()

		expect(document.activeElement).toBe(node('.so-test-first'))
	})

	it('без остановок в панели — на саму панель', async () => {
		await page({ closable: false }, text)
		await open()

		expect(document.activeElement).toBe(panel())
	})

	it('Escape закрывает и возвращает фокус на триггер', async () => {
		await page()
		await open()

		const event = press('Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('Escape на триггере открытого поповера тоже закрывает', async () => {
		await page()
		await open()

		trigger().focus()
		press('Escape')

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('крестик закрывает и возвращает фокус на триггер', async () => {
		await page()
		await open()

		click(node('.so-popover__close'))

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('нажатие мимо фокус не возвращает', async () => {
		await page()
		await open()

		pointerDown(node('.so-test-after'))

		expect(isOpen()).toBe(false)
		expect(document.activeElement).not.toBe(trigger())
	})

	it('фокус, ушедший мимо, закрывает и не возвращается', async () => {
		await page()
		await open()

		node('.so-test-after').focus()

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(node('.so-test-after'))
	})

	it('открытый со старта уводит фокус в панель, закрытие возвращает его на триггер', async () => {
		await page({ open: true })
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
		await page({ ctrl: popover })

		outside.focus()
		popover.open = true
		await nextFrame()
		outside.remove()

		press('Escape')

		expect(document.activeElement).toBe(trigger())
	})
})

describe('Tab', () => {
	it('Tab с триггера при открытой панели — в панель', async () => {
		await page()
		await open()

		trigger().focus()

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-first'))
	})

	it('Shift+Tab с первой остановки панели — на триггер, панель остаётся открытой', async () => {
		await page()
		await open()

		const event = press('Tab', { shiftKey: true })

		expect(event.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(trigger())
		expect(isOpen()).toBe(true)
	})

	it('Shift+Tab с самой панели — тоже на триггер', async () => {
		await page({ closable: false }, text)
		await open()

		press('Tab', { shiftKey: true })

		expect(document.activeElement).toBe(trigger())
	})

	it('Tab с последней остановки панели — к остановке после поповера, панель закрыта', async () => {
		await page()
		await open()

		node('.so-popover__close').focus()

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(node('.so-test-after'))
	})

	it('Tab с самой панели без остановок — к остановке после поповера', async () => {
		await page({ closable: false }, text)
		await open()

		expect(document.activeElement).toBe(panel())

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(node('.so-test-after'))
	})

	it('Tab с середины панели не трогает: порядок ведёт браузер', async () => {
		await page()
		await open()

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(false)
		expect(isOpen()).toBe(true)
	})

	it('после поповера остановок нет — закрыть, Tab не гасить', async () => {
		mount(() => (
			<div>
				<Popover trigger={triggerOf('Открыть', 'so-test-trigger')}>{inside()}</Popover>
			</div>
		))
		await nextFrame()
		await open()

		node('.so-popover__close').focus()

		const event = press('Tab')

		expect(event.defaultPrevented).toBe(false)
		expect(isOpen()).toBe(false)
	})
})

describe('вложенные слои', () => {
	/** Внешний поповер, в панели которого — внутренний. */
	const nested = () =>
		page({ class: 'so-test-outer' }, () => (
			<>
				<button class="so-test-first">Первая</button>
				<Popover class="so-test-inner" trigger={triggerOf('Ещё', 'so-test-inner-trigger')}>
					<button class="so-test-inner-first">Внутри</button>
				</Popover>
			</>
		))

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
})

describe('lazyMount', () => {
	it('содержимое монтируется при первом открытии и остаётся после закрытия', async () => {
		await page({ lazyMount: true })

		expect(document.querySelector('.so-test-first')).toBeNull()
		expect(document.querySelector('.so-popover__content')).not.toBeNull()

		await open()

		expect(document.activeElement).toBe(node('.so-test-first'))

		press('Escape')

		expect(document.querySelector('.so-test-first')).not.toBeNull()
	})

	it('без lazyMount содержимое в документе с самого начала', async () => {
		await page()

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

		await page({ ctrl: popover })

		expect(handle()).toBeNull()

		popover.swipe = 'handle'

		expect(handle()).toBe(panel().firstElementChild)
		expect(handle()?.getAttribute('aria-hidden')).toBe('true')

		popover.swipe = 'panel'

		expect(handle()).not.toBeNull()
	})

	/**
	 * Коробку панели задаёт тест: jsdom раскладку не считает. Сторону после
	 * flip плагин якоря пишет в панель и в jsdom — под триггером. Жест мышью
	 * по полосе вниз — дальше четверти высоты панели.
	 */
	it('смахнули вниз от триггера — закрыта, onChangeOpen слышит закрытие, фокус — на триггер', async () => {
		const onChangeOpen = vi.fn()

		await page({ swipe: 'handle', onChangeOpen })
		await open()

		expect(panel().dataset.placement).toBe('bottom-start')
		expect(panel().dataset.swiping).toBe('false')

		vi.spyOn(panel(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 8, 300, 200))

		const grip = node('.so-popover__handle')

		pointer('pointerdown', grip, 13)
		pointer('pointermove', panel(), 108)

		expect(panel().style.getPropertyValue('--so-swipe-offset')).toBe('95px')
		expect(panel().dataset.swiping).toBe('true')

		pointer('pointerup', panel(), 113)

		expect(isOpen()).toBe(false)
		expect(panel().dataset.swiping).toBe('false')
		expect(onChangeOpen.mock.calls).toEqual([[true], [false]])
		expect(document.activeElement).toBe(trigger())
	})
})
