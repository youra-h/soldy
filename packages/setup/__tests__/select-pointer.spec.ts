// @vitest-environment jsdom

/**
 * Указатель на поле Select — `TSelectPointerPlugin`.
 *
 * Клик: select-only тумблит панель кликом по всему полю, `editable` — только
 * кликом по `.so-select__arrow`. Режим плагин узнаёт по `change:editable`,
 * поэтому проверяется и переключение на лету.
 *
 * Нажатие — одно правило в обоих режимах: мимо контролов поля (стрелка,
 * коробка) оно гасится, и фокус встаёт в поле; нажатие по самому полю и по
 * кнопке в корне плагин не трогает. Что погашенное нажатие не уносит фокус на
 * `body`, jsdom не покажет — действия `mousedown` он не выполняет; это
 * сторожит «нажатие по стрелке» в `playground/vue/browser/select.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import type { ISelectProps } from '@soldy-ui/core'
import { createPluginContext } from './helpers'
import { TSelect } from '@soldy-ui/core'
import { TSelectPointerPlugin, TElementPlugin } from '@soldy-ui/plugins'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

async function setup(props: Partial<ISelectProps> = {}) {
	const owner = new TSelect({ ...props })

	const root = document.createElement('div')
	const field = document.createElement('input')
	const arrow = document.createElement('span')
	// Контрол в корне со своим нажатием — заглушка кнопки очистки
	const clear = document.createElement('button')
	// Контрол снаружи Select: на нём фокус до нажатия
	const outside = document.createElement('button')

	arrow.className = 'so-select__arrow'
	root.append(field, clear, arrow)
	document.body.append(outside, root)

	const rootElement = new TElementPlugin()
	const pointer = new TSelectPointerPlugin()

	const ctx = createPluginContext(owner, [rootElement])

	pointer.install(ctx)

	rootElement.element = root
	await nextFrame()

	return { owner, root, field, arrow, clear, outside, rootElement }
}

/** `mousedown`, которое можно погасить; `button` — 0 основная, 2 правая. */
function mousedown(target: Element, button = 0): MouseEvent {
	const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button })

	target.dispatchEvent(event)

	return event
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('select-only', () => {
	it('клик по полю тумблит панель', async () => {
		const { owner, field } = await setup()

		field.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		expect(owner.open).toBe(true)

		field.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		expect(owner.open).toBe(false)
	})

	it('клик по стрелке тоже тумблит — она часть поля', async () => {
		const { owner, arrow } = await setup()

		arrow.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(owner.open).toBe(true)
	})
})

describe('editable', () => {
	it('клик по тексту поля не открывает панель', async () => {
		const { owner, field } = await setup({ editable: true })

		field.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(owner.open).toBe(false)
	})

	it('клик по стрелке открывает и закрывает', async () => {
		const { owner, arrow } = await setup({ editable: true })

		arrow.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		expect(owner.open).toBe(true)

		arrow.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		expect(owner.open).toBe(false)
	})
})

/**
 * DOM-фокус комбобокса — на поле, и части поля без своего контрола его не
 * забирают: иначе клавиши с `body` до корня не дошли бы, и стрелки после
 * открытия кликом по стрелке прокручивали бы страницу.
 */
describe.each<[string, Partial<ISelectProps>]>([
	['select-only', {}],
	['editable', { editable: true }],
])('нажатие · %s', (_, props) => {
	it('по стрелке гасится, и фокус встаёт в поле', async () => {
		const { field, arrow, outside } = await setup(props)

		outside.focus()

		expect(mousedown(arrow).defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(field)
	})

	it('по коробке поля гасится, и фокус встаёт в поле', async () => {
		const { root, field, outside } = await setup(props)

		outside.focus()

		expect(mousedown(root).defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(field)
	})

	it('по самому полю не гасится', async () => {
		const { field } = await setup(props)

		expect(mousedown(field).defaultPrevented).toBe(false)
	})

	it('по кнопке в корне не гасится, и фокус остаётся, где был', async () => {
		const { clear, outside } = await setup(props)

		outside.focus()

		expect(mousedown(clear).defaultPrevented).toBe(false)
		expect(document.activeElement).toBe(outside)
	})

	it('правой кнопкой не гасится, и фокус остаётся, где был', async () => {
		const { arrow, outside } = await setup(props)

		outside.focus()

		expect(mousedown(arrow, 2).defaultPrevented).toBe(false)
		expect(document.activeElement).toBe(outside)
	})
})

describe('корень', () => {
	it('снятый корень плагин не слушает', async () => {
		const { owner, arrow, rootElement } = await setup()

		rootElement.element = null

		arrow.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(mousedown(arrow).defaultPrevented).toBe(false)
		expect(owner.open).toBe(false)
	})

	it('новый корень — слушатели на нём, прежний отпущен', async () => {
		const { owner, root, arrow, rootElement } = await setup()
		const next = root.cloneNode(true)

		if (!(next instanceof Element)) throw new Error('копия корня — не элемент')

		document.body.append(next)
		rootElement.element = next
		await nextFrame()

		expect(mousedown(arrow).defaultPrevented, 'стрелка прежнего корня').toBe(false)

		const nextArrow = next.querySelector('.so-select__arrow')

		if (!nextArrow) throw new Error('стрелки в новом корне нет')

		expect(mousedown(nextArrow).defaultPrevented, 'стрелка нового корня').toBe(true)
		expect(document.activeElement).toBe(next.querySelector('input'))

		nextArrow.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		expect(owner.open).toBe(true)
	})
})

describe('смена editable на лету переключает обработчик', () => {
	it('select-only → editable: клик по полю перестаёт открывать, по стрелке — работает', async () => {
		const { owner, field, arrow } = await setup()

		owner.editable = true

		field.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		expect(owner.open).toBe(false)

		arrow.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		expect(owner.open).toBe(true)
	})

	it('editable → select-only: клик по полю снова тумблит', async () => {
		const { owner, field } = await setup({ editable: true })

		owner.editable = false

		field.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(owner.open).toBe(true)
	})
})
