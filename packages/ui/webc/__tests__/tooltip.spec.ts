/**
 * `<span is="so-tooltip">` — Tooltip в Web Components, проводка целиком, на
 * настоящей разметке.
 *
 * Правила показа — задержки, причины, нажатие, Escape, одна подсказка на
 * документ — проверяет плагин (`plugins/__tests__/tooltip-trigger.plugin.spec.ts`),
 * эвристику фокуса и курсор через зазор — браузер
 * (`playground/vue/browser/tooltip.spec.ts`). Здесь важно, что они сходятся:
 * панель — деталь Frame, уехала в `body` и помечена владельцем, `open` доходит
 * до разметки в обе стороны, а Escape у подсказки в открытом поповере
 * закрывает только её. Сценарии — те же, что у Vue
 * (`ui/vue/__tests__/tooltip.spec.ts`); открытость, которую Vue держит
 * `v-model`, здесь видна событиями `so:change:open`.
 *
 * Своё у Web Components — триггер без scope: ссылку на панель
 * (`aria-describedby`, при `type="label"` — `aria-labelledby`) шаблон кладёт
 * на первый элемент слота `trigger` сам, и она сменяется на том же узле.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TTooltip } from '@soldy-ui/core'
import { TooltipDescriptor } from '@soldy-ui/setup'
import {
	TPopoverElement,
	TTooltipElement,
	type TPopoverElementProps,
	type TTooltipElementProps,
} from '@soldy-ui/webc'
import { tooltipTemplate } from '../src/components/tooltip/tooltip.template'
import { bareContext } from './template-context'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

function isTooltip(node: Element | null): node is TTooltipElementProps {
	return node instanceof TTooltipElement
}

function isPopover(node: Element | null): node is TPopoverElementProps {
	return node instanceof TPopoverElement
}

/**
 * Подсказка у кнопки — разметкой, как её пишет потребитель. Задержки сняты:
 * их отсчёт проверяет плагин, здесь — что показ и скрытие доходят до
 * разметки.
 */
const TOOLTIP = (attrs = '') => `<span is="so-tooltip" open-delay="0" close-delay="0" ${attrs}>
	<button is="so-button" slot="trigger" class="so-test-trigger" text="Сохранить"></button>
	Сохранить черновик
</span>`

/**
 * Разметка на странице. Элементы живые уже до вставки (`innerHTML` в
 * неподключённом узле): инстанс и свойства ставит `prepare` до подключения.
 * После вставки — микрозадача отрисовки и кадр: корень плагины получают через
 * `requestAnimationFrame`.
 */
async function mount(html: string, prepare: (page: HTMLElement) => void = () => {}) {
	const page = document.createElement('div')

	page.innerHTML = html
	prepare(page)
	document.body.appendChild(page)
	await flush()
	await nextFrame()

	return page
}

/** Подсказка на странице; `ctrl` — до вставки. */
async function render(attrs = '', ctrl?: TTooltip): Promise<TTooltipElementProps> {
	const page = await mount(TOOLTIP(attrs), (node) => {
		const tooltip = node.querySelector('span')

		if (ctrl && isTooltip(tooltip)) tooltip.ctrl = ctrl
	})
	const tooltip = page.querySelector('span')

	if (!isTooltip(tooltip)) throw new Error('<span is="so-tooltip"> нет')

	return tooltip
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, scope: ParentNode = document): HTMLElement {
	const element = scope.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const root = () => find('.so-tooltip')
const trigger = () => find('.so-test-trigger')
const panel = () => find('.so-tooltip__panel')
const isOpen = (element: HTMLElement = panel()) => element.style.display !== 'none'

/** Значения `detail` событий с этим именем на элементе. */
function collect(el: Element, name: string): unknown[] {
	const seen: unknown[] = []

	el.addEventListener(name, (event) => {
		if (event instanceof CustomEvent) seen.push(event.detail)
	})

	return seen
}

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
	it('корень — span с триггером, панель уехала в body и скрыта', async () => {
		await render()

		expect(root().localName).toBe('span')
		expect(root().contains(trigger())).toBe(true)
		expect(root().contains(panel())).toBe(false)
		expect(panel().parentElement).toBe(document.body)
		expect(isOpen()).toBe(false)
	})

	it('панель — подсказка, не фокусируется, помечена владельцем, текст — в обёртке', async () => {
		await render()

		expect(panel().getAttribute('role')).toBe('tooltip')
		expect(panel().hasAttribute('tabindex')).toBe(false)
		expect(panel().hasAttribute('aria-hidden')).toBe(false)
		expect(panel().dataset.owner).toBeTruthy()
		expect(find('.so-tooltip__content', panel()).textContent?.trim()).toBe('Сохранить черновик')
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

	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const node = document.createElement('span')
		const targets = tooltipTemplate.create(node, () => false, bareContext(node)).slots

		expect(Object.keys(targets).sort()).toEqual(
			TooltipDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

/**
 * `type="label"`: подсказка — имя триггера. Нужна кнопке-иконке: с
 * `aria_label` и подсказкой-описанием скринридер прочёл бы один текст дважды.
 * Меняется только ссылка триггера — панель та же и так же всегда в документе,
 * а триггер — тот же узел.
 */
describe('подсказка-имя', () => {
	it('aria-labelledby триггера ведёт на панель, aria-describedby нет — и у закрытой', async () => {
		await render('type="label"')

		expect(isOpen()).toBe(false)
		expect(document.getElementById(trigger().getAttribute('aria-labelledby') ?? '')).toBe(
			panel(),
		)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)
		expect(panel().getAttribute('role')).toBe('tooltip')
	})

	it('смена type свойством переключает атрибут ссылки на том же узле — и обратно', async () => {
		const el = await render('type="description"')
		const button = trigger()
		const id = panel().id

		expect(button.getAttribute('aria-describedby')).toBe(id)
		expect(button.hasAttribute('aria-labelledby')).toBe(false)

		el.type = 'label'
		await flush()

		expect(trigger()).toBe(button)
		expect(button.getAttribute('aria-labelledby')).toBe(id)
		expect(button.hasAttribute('aria-describedby')).toBe(false)

		el.type = 'description'
		await flush()

		expect(button.getAttribute('aria-describedby')).toBe(id)
		expect(button.hasAttribute('aria-labelledby')).toBe(false)
	})

	it('снятый атрибут type возвращает подсказку к описанию', async () => {
		const el = await render('type="label"')

		el.removeAttribute('type')
		await flush()

		expect(trigger().getAttribute('aria-describedby')).toBe(panel().id)
		expect(trigger().hasAttribute('aria-labelledby')).toBe(false)
	})

	it('type из инстанса доходит до триггера так же, как из разметки', async () => {
		const ctrl = new TTooltip({ openDelay: 0, closeDelay: 0 })

		await render('', ctrl)

		ctrl.type = 'label'
		await flush()

		expect(trigger().getAttribute('aria-labelledby')).toBe(panel().id)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)
	})
})

describe('показ и скрытие', () => {
	it('курсор на корне показывает, уход — прячет', async () => {
		await render()

		enter(root())
		await flush()

		expect(isOpen()).toBe(true)
		expect(panel().dataset.layer).toMatch(/^\d+$/)

		leave(root())
		await flush()

		expect(isOpen()).toBe(false)
	})

	it('нажатие на триггер прячет', async () => {
		await render()

		enter(root())
		await flush()
		pointerDown(trigger())
		await flush()

		expect(isOpen()).toBe(false)
	})

	it('Escape прячет, фокус остаётся на месте', async () => {
		await render()

		trigger().focus()
		enter(root())
		await flush()

		const event = press('Escape')

		await flush()

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('open из инстанса показывает так же, как наведение; события видят оба пути', async () => {
		const ctrl = new TTooltip({ openDelay: 0, closeDelay: 0 })
		const el = await render('', ctrl)
		const opens = collect(el, 'so:change:open')

		ctrl.open = true
		await flush()

		expect(isOpen()).toBe(true)

		// Открытую из кода курсор не держит: уход закрывает, только если он пришёл
		enter(root())
		leave(root())
		enter(root())
		leave(root())
		await flush()

		expect(ctrl.open).toBe(false)
		expect(isOpen()).toBe(false)
		expect(opens).toEqual([true, false, true, false])
	})

	it('open свойством элемента показывает и прячет', async () => {
		const el = await render()

		el.open = true
		await flush()

		expect(isOpen()).toBe(true)

		el.open = false
		await flush()

		expect(isOpen()).toBe(false)
	})

	/**
	 * Корень — элемент потребителя, и `rendered=false` его прячет, а не
	 * снимает. Панель уехала в `body`, и скрытие корня до неё не доходит:
	 * прячется она своим `rendered`, который ей пишет шаблон. Открытость при
	 * этом не меняется — показанная снова подсказка открыта, как была.
	 */
	it('rendered=false прячет корень и открытую панель в body, rendered=true — панель снова открыта', async () => {
		const el = await render('open')

		expect(isOpen()).toBe(true)

		el.rendered = false
		await flush()

		expect(root().style.display).toBe('none')
		expect(panel().parentElement).toBe(document.body)
		expect(isOpen()).toBe(false)
		expect(el.open).toBe(true)

		el.rendered = true
		await flush()

		expect(root().style.display).toBe('')
		expect(isOpen()).toBe(true)
		expect(panel().dataset.open).toBe('true')
	})

	it('placement доходит до якоря: сторона панели — в data-placement', async () => {
		await render('open placement="bottom-end"')
		await nextFrame()

		expect(panel().dataset.placement).toBe('bottom-end')
	})

	it('центр доходит до якоря: data-placement без суффикса', async () => {
		await render('open placement="bottom"')
		await nextFrame()

		expect(panel().dataset.placement).toBe('bottom')
	})
})

describe('в открытом поповере', () => {
	/** Поповер без крестика, в панели которого — кнопка с подсказкой. */
	const page = () =>
		mount(
			`<span is="so-popover">
				<button is="so-button" slot="trigger" class="so-test-popover-trigger" text="Открыть"></button>
				${TOOLTIP()}
			</span>`,
			(node) => {
				const popover = node.querySelector('span')

				if (isPopover(popover)) popover.closable = false
			},
		)

	const popoverPanel = () => find('.so-popover__panel')

	/** Открыть поповер кликом и дождаться, пока фокус уйдёт в панель. */
	async function openPopover(): Promise<void> {
		const target = find('.so-test-popover-trigger')

		pointerDown(target)
		target.focus()
		target.click()
		await flush()
		await nextFrame()
	}

	it('Escape закрывает только подсказку, второй — уже поповер', async () => {
		await page()
		await openPopover()

		expect(document.activeElement).toBe(trigger())

		enter(root())
		await flush()

		expect(isOpen()).toBe(true)

		press('Escape')
		await flush()

		expect(isOpen()).toBe(false)
		expect(isOpen(popoverPanel())).toBe(true)

		press('Escape')
		await flush()

		expect(isOpen(popoverPanel())).toBe(false)
	})

	it('подсказка — слой выше панели поповера: нажатие в неё поповер не закрывает', async () => {
		await page()
		await openPopover()

		enter(root())
		await flush()

		expect(Number(panel().dataset.layer)).toBeGreaterThan(Number(popoverPanel().dataset.layer))

		pointerDown(panel())
		await flush()

		expect(isOpen(popoverPanel())).toBe(true)
	})
})
