// @vitest-environment jsdom

/**
 * Плагины DatePicker: модель фокуса панели и то, что её открывает.
 *
 * Фокус — APG Date Picker Dialog: первый фокус на дне сетки, Tab замкнут в
 * панели, как у модального окна, а нажатие мимо фокус отпускает, как у
 * немодального поповера: подложки нет, и соседнее поле получает фокус с
 * первого нажатия. Возврат — в поле: туда, откуда открыли (Alt+↓ на части),
 * а с кнопки календаря и с `body` — на первую часть поля, у диапазона — поля
 * начала. Открывают панель кнопка календаря и Alt+↓ на поле.
 *
 * Разметку тест строит сам — корень с частями поля и кнопкой календаря и
 * телепортированную панель с кнопками листания и сеткой, как их рисует
 * разметка DatePicker, DateInput и Calendar, — а плагины собирает настоящим
 * набором над настоящим `TDatePicker`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TDatePicker } from '@soldy-ui/core'
import type { IDatePickerProps, TDatePickerMode } from '@soldy-ui/core'
import {
	TDatePickerFocusPlugin,
	TDatePickerTriggerPlugin,
	TDismissPlugin,
	TElementPlugin,
	TPluginBundle,
} from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

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

/** Часть поля по типу — первая такая в `scope`; по умолчанию — в корне. */
const part = (type: string, scope = '.so-date-picker') =>
	nodeOf(`${scope} .so-date-input__segment[data-type="${type}"]`)

const trigger = () => nodeOf('.so-date-picker__trigger')

/** Календарь панели: кнопки листания до сетки, остановка сетки — день с `tabindex="0"`. */
const CALENDAR = `
	<div class="so-calendar">
		<button class="so-calendar__prev">Назад</button>
		<button class="so-calendar__next">Вперёд</button>
		<table class="so-calendar__grid">
			<tbody>
				<tr>
					<td class="day-1" tabindex="-1">1</td>
					<td class="day-2" tabindex="0">2</td>
				</tr>
			</tbody>
		</table>
	</div>
`

/** Части поля, как их рисует DateInput: у `en-US` — месяц, день, год. */
const PARTS = ['month', 'day', 'year']
	.map(
		(type) =>
			`<span class="so-date-input__segment" data-type="${type}" tabindex="0">${type}</span>`,
	)
	.join('')

const TRIGGER = '<button class="so-date-picker__trigger">Календарь</button>'

/**
 * Корень по режиму, как его рисует разметка DatePicker: у одной даты кнопка
 * календаря — в слоте у конца поля, у диапазона — после поля конца.
 */
function rootMarkup(mode: TDatePickerMode): string {
	if (mode === 'range') {
		return (
			`<div class="so-date-picker__start">${PARTS}</div>` +
			`<div class="so-date-picker__end">${PARTS}</div>${TRIGGER}`
		)
	}

	return `<div class="so-date-picker__field">${PARTS}<span class="so-date-input__trailing">${TRIGGER}</span></div>`
}

const bundles: TPluginBundle[] = []

/**
 * Корень — части поля и кнопка календаря, панель телепортирована и помечена
 * владельцем; за корнем на странице — соседнее поле.
 */
async function setup(props: Partial<IDatePickerProps> = {}, content = CALENDAR) {
	const owner = new TDatePicker(props)
	const root = document.createElement('div')
	const panel = document.createElement('div')

	root.className = 'so-date-picker'
	root.innerHTML = rootMarkup(owner.mode)
	document.body.appendChild(root)
	document.body.insertAdjacentHTML('beforeend', '<input class="outside" />')

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TDismissPlugin)
		.use(TDatePickerTriggerPlugin)
		.use(TDatePickerFocusPlugin)

	bundles.push(bundle)

	for (const [name, value] of Object.entries(pluginOf(bundle, TDismissPlugin).ownerAttribute)) {
		panel.setAttribute(name, value)
	}

	panel.tabIndex = -1
	panel.innerHTML = content
	document.body.appendChild(panel)

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	return { owner, root, panel, bundle }
}

/**
 * Открыть Alt+↓ с части дня — не первой: так видно, что фокус вернулся
 * туда, откуда открыли, а не на первую часть поля. Ждёт, пока фокус уйдёт в
 * панель.
 */
async function openFromPart(): Promise<void> {
	part('day').focus()
	press('ArrowDown', { altKey: true })
	await nextFrame()
}

/** Открыть кнопкой календаря, как Enter на ней: фокус на кнопке, её клик. */
async function openFromTrigger(): Promise<void> {
	trigger().focus()
	trigger().click()
	await nextFrame()
}

/** Клавиша на элементе под фокусом. Отдаёт событие: по нему видно, погашено ли оно. */
function press(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {
		key,
		bubbles: true,
		cancelable: true,
		...init,
	})

	;(document.activeElement ?? document.body).dispatchEvent(event)

	return event
}

/** Нажатие мышью: `pointerdown`, как его слушает `TDismissPlugin`. */
function pointerDown(target: Element): void {
	target.dispatchEvent(
		new PointerEvent('pointerdown', {
			bubbles: true,
			cancelable: true,
			pointerType: 'mouse',
			pointerId: 1,
		}),
	)
}

/** Совместимый `mousedown`: по нему видно, погашено ли действие нажатия. */
function mouseDown(target: Element): MouseEvent {
	const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })

	target.dispatchEvent(event)

	return event
}

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	document.body.innerHTML = ''
})

describe('фокус панели', () => {
	it('при открытии — на остановку сетки, а не на кнопку листания', async () => {
		await setup()

		await openFromPart()

		expect(document.activeElement).toBe(nodeOf('.day-2'))
	})

	it('сетки в панели нет — на её первую остановку', async () => {
		await setup({}, '<button class="first">Раз</button>')

		await openFromPart()

		expect(document.activeElement).toBe(nodeOf('.first'))
	})

	it('Tab замкнут: с последней остановки — на первую, Shift+Tab — обратно', async () => {
		await setup()

		await openFromPart()

		const forward = press('Tab')

		expect(forward.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(nodeOf('.so-calendar__prev'))

		const back = press('Tab', { shiftKey: true })

		expect(back.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(nodeOf('.day-2'))
	})

	it('Escape, который погасил календарь (начатый диапазон), панель не закрывает', async () => {
		const { owner, panel } = await setup()

		await openFromPart()

		panel.addEventListener('keydown', (event) => event.preventDefault(), { capture: true })
		press('Escape')

		expect(owner.open).toBe(true)
	})

	it('нажатие мимо закрывает, фокус не возвращает и mousedown не гасит', async () => {
		const { owner, root } = await setup()
		const outside = nodeOf('.outside')

		await openFromPart()
		pointerDown(outside)

		expect(owner.open).toBe(false)
		expect(root.contains(document.activeElement)).toBe(false)
		expect(mouseDown(outside).defaultPrevented).toBe(false)
	})

	it('нажатие в корень — не мимо: панель открыта', async () => {
		const { owner } = await setup()

		await openFromPart()
		pointerDown(part('month'))

		expect(owner.open).toBe(true)
	})
})

/**
 * Возврат — в поле. Открыли с части (Alt+↓) — на неё; открыли кнопкой
 * календаря или фокуса не было (`body`) — на первую часть поля: кнопка
 * местом возврата не считается.
 */
describe('возврат фокуса', () => {
	it('открыли с части — Escape закрывает и возвращает фокус на неё', async () => {
		const { owner } = await setup()

		await openFromPart()

		const event = press('Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(part('day'))
	})

	it('открыли с части — выбор закрыл панель, фокус на ней', async () => {
		const { owner } = await setup()

		await openFromPart()
		owner.engine.extensions.selection.chooseDate('2026-09-12')

		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(part('day'))
	})

	it('открыли кнопкой — Escape возвращает фокус на первую часть поля, а не на кнопку', async () => {
		const { owner } = await setup()

		await openFromTrigger()
		expect(document.activeElement).toBe(nodeOf('.day-2'))

		press('Escape')

		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(part('month'))
	})

	it('открыли кнопкой — выбор закрыл панель, фокус на первой части поля', async () => {
		const { owner } = await setup()

		await openFromTrigger()
		owner.engine.extensions.selection.chooseDate('2026-09-12')

		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(part('month'))
	})

	it('открыли с body — фокус на первую часть поля', async () => {
		const { owner } = await setup()

		owner.open = true
		await nextFrame()
		press('Escape')

		expect(document.activeElement).toBe(part('month'))
	})

	it('диапазон, открыли кнопкой — фокус на первую часть поля начала', async () => {
		const { owner } = await setup({ mode: 'range' })

		await openFromTrigger()
		press('Escape')

		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(part('month', '.so-date-picker__start'))
	})
})

describe('что открывает панель', () => {
	it('клик по кнопке календаря — тумблер', async () => {
		const { owner } = await setup()

		trigger().click()
		expect(owner.open).toBe(true)

		trigger().click()
		expect(owner.open).toBe(false)
	})

	it('клик по полю панель не открывает', async () => {
		const { owner } = await setup()

		part('month').click()

		expect(owner.open).toBe(false)
	})

	it('Alt+↓ на поле открывает и гасится; открытую не закрывает', async () => {
		const { owner } = await setup()

		part('month').focus()

		const event = press('ArrowDown', { altKey: true })

		expect(event.defaultPrevented).toBe(true)
		expect(owner.open).toBe(true)

		await nextFrame()
		part('month').focus()
		press('ArrowDown', { altKey: true })

		expect(owner.open).toBe(true)
	})

	it('↓ без Alt, погашенная клавиша и Alt+↓ у выключенного — не наши', async () => {
		const { owner } = await setup()
		const month = part('month')

		month.focus()
		press('ArrowDown')
		expect(owner.open).toBe(false)

		month.addEventListener('keydown', (event) => event.preventDefault())
		press('ArrowDown', { altKey: true })
		expect(owner.open).toBe(false)
	})

	it('у выключенного Alt+↓ не гасится и ничего не открывает', async () => {
		const { owner } = await setup({ disabled: true })

		part('month').focus()

		const event = press('ArrowDown', { altKey: true })

		expect(event.defaultPrevented).toBe(false)
		expect(owner.open).toBe(false)
	})
})
