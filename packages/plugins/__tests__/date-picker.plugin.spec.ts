// @vitest-environment jsdom

/**
 * Плагины DatePicker: модель фокуса панели и то, что её открывает.
 *
 * Фокус — APG Date Picker Dialog: первый фокус на дне сетки, Tab замкнут в
 * панели, как у модального окна, а нажатие мимо фокус отпускает, как у
 * немодального поповера: подложки нет, и соседнее поле получает фокус с
 * первого нажатия. Открывают панель кнопка календаря и Alt+↓ на поле.
 *
 * Разметку тест строит сам — корень с частью поля и кнопкой календаря и
 * телепортированную панель с кнопками листания и сеткой, как их рисует
 * разметка DatePicker и Calendar, — а плагины собирает настоящим набором
 * над настоящим `TDatePicker`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TDatePicker } from '@soldy-ui/core'
import type { IDatePickerProps } from '@soldy-ui/core'
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

/** Календарь панели: кнопки листания до сетки, остановка сетки — день с `tabindex="0"`. */
const CALENDAR = `
	<div class="s-calendar">
		<button class="s-calendar__prev">Назад</button>
		<button class="s-calendar__next">Вперёд</button>
		<table class="s-calendar__grid">
			<tbody>
				<tr>
					<td class="day-1" tabindex="-1">1</td>
					<td class="day-2" tabindex="0">2</td>
				</tr>
			</tbody>
		</table>
	</div>
`

const bundles: TPluginBundle[] = []

/**
 * Корень — часть поля и кнопка календаря, панель телепортирована и помечена
 * владельцем; за корнем на странице — соседнее поле.
 */
async function setup(props: Partial<IDatePickerProps> = {}, content = CALENDAR) {
	const owner = new TDatePicker(props)
	const root = document.createElement('div')
	const panel = document.createElement('div')

	root.innerHTML =
		'<span class="part" tabindex="0">mm</span>' +
		'<button class="s-date-picker__trigger">Календарь</button>'
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

/** Открыть с фокусом на части поля и дождаться, пока фокус уйдёт в панель. */
async function openFromPart(owner: TDatePicker): Promise<void> {
	nodeOf('.part').focus()
	owner.open = true
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
		const { owner } = await setup()

		await openFromPart(owner)

		expect(document.activeElement).toBe(nodeOf('.day-2'))
	})

	it('сетки в панели нет — на её первую остановку', async () => {
		const { owner } = await setup({}, '<button class="first">Раз</button>')

		await openFromPart(owner)

		expect(document.activeElement).toBe(nodeOf('.first'))
	})

	it('Tab замкнут: с последней остановки — на первую, Shift+Tab — обратно', async () => {
		const { owner } = await setup()

		await openFromPart(owner)

		const forward = press('Tab')

		expect(forward.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(nodeOf('.s-calendar__prev'))

		const back = press('Tab', { shiftKey: true })

		expect(back.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(nodeOf('.day-2'))
	})

	it('Escape закрывает и возвращает фокус туда, откуда открыли', async () => {
		const { owner } = await setup()

		await openFromPart(owner)

		const event = press('Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(nodeOf('.part'))
	})

	it('Escape, который погасил календарь (начатый диапазон), панель не закрывает', async () => {
		const { owner, panel } = await setup()

		await openFromPart(owner)

		panel.addEventListener('keydown', (event) => event.preventDefault(), { capture: true })
		press('Escape')

		expect(owner.open).toBe(true)
	})

	it('выбор закрыл панель — фокус туда, откуда открыли', async () => {
		const { owner } = await setup()

		await openFromPart(owner)
		owner.engine.extensions.selection.chooseDate('2026-09-12')

		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(nodeOf('.part'))
	})

	it('открыли с body — фокус возвращается на кнопку календаря', async () => {
		const { owner } = await setup()

		owner.open = true
		await nextFrame()
		press('Escape')

		expect(document.activeElement).toBe(nodeOf('.s-date-picker__trigger'))
	})

	it('нажатие мимо закрывает, фокус не возвращает и mousedown не гасит', async () => {
		const { owner } = await setup()
		const outside = nodeOf('.outside')

		await openFromPart(owner)
		pointerDown(outside)

		expect(owner.open).toBe(false)
		expect(document.activeElement).not.toBe(nodeOf('.part'))
		expect(mouseDown(outside).defaultPrevented).toBe(false)
	})

	it('нажатие в корень — не мимо: панель открыта', async () => {
		const { owner } = await setup()

		await openFromPart(owner)
		pointerDown(nodeOf('.part'))

		expect(owner.open).toBe(true)
	})
})

describe('что открывает панель', () => {
	it('клик по кнопке календаря — тумблер', async () => {
		const { owner } = await setup()
		const trigger = nodeOf('.s-date-picker__trigger')

		trigger.click()
		expect(owner.open).toBe(true)

		trigger.click()
		expect(owner.open).toBe(false)
	})

	it('клик по полю панель не открывает', async () => {
		const { owner } = await setup()

		nodeOf('.part').click()

		expect(owner.open).toBe(false)
	})

	it('Alt+↓ на поле открывает и гасится; открытую не закрывает', async () => {
		const { owner } = await setup()

		nodeOf('.part').focus()

		const event = press('ArrowDown', { altKey: true })

		expect(event.defaultPrevented).toBe(true)
		expect(owner.open).toBe(true)

		await nextFrame()
		nodeOf('.part').focus()
		press('ArrowDown', { altKey: true })

		expect(owner.open).toBe(true)
	})

	it('↓ без Alt, погашенная клавиша и Alt+↓ у выключенного — не наши', async () => {
		const { owner } = await setup()
		const part = nodeOf('.part')

		part.focus()
		press('ArrowDown')
		expect(owner.open).toBe(false)

		part.addEventListener('keydown', (event) => event.preventDefault())
		press('ArrowDown', { altKey: true })
		expect(owner.open).toBe(false)
	})

	it('у выключенного Alt+↓ не гасится и ничего не открывает', async () => {
		const { owner } = await setup({ disabled: true })

		nodeOf('.part').focus()

		const event = press('ArrowDown', { altKey: true })

		expect(event.defaultPrevented).toBe(false)
		expect(owner.open).toBe(false)
	})
})
