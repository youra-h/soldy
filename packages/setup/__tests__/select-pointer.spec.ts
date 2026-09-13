// @vitest-environment jsdom

/**
 * Клик по полю Select — `TSelectPointerPlugin`.
 *
 * Два режима, два обработчика: select-only тумблит панель кликом по всему
 * полю, `editable` — только кликом по `.s-select__arrow`. Выбор между ними —
 * подписка на `change:editable`, поэтому проверяется и переключение на лету.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TSelect } from '@soldy/core'
import { TSelectPointerPlugin, TElementPlugin } from '@soldy/plugins'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

async function setup(props: Record<string, unknown> = {}) {
	const owner = new TSelect({ ...props } as any)

	const root = document.createElement('div')
	const field = document.createElement('input')
	const arrow = document.createElement('span')

	arrow.className = 's-select__arrow'
	root.appendChild(field)
	root.appendChild(arrow)
	document.body.appendChild(root)

	const rootElement = new TElementPlugin()
	const pointer = new TSelectPointerPlugin()

	const ctx = {
		getInstance: () => owner,
		get: (ctor: unknown) => (ctor === TElementPlugin ? rootElement : undefined),
	} as any

	pointer.install(ctx)

	rootElement.element = root
	await nextFrame()

	return { owner, root, field, arrow }
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

	it('mousedown по стрелке гасится — не уводит фокус с input', async () => {
		const { arrow } = await setup({ editable: true })

		const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })

		arrow.dispatchEvent(event)

		expect(event.defaultPrevented).toBe(true)
	})

	it('mousedown по тексту поля не гасится', async () => {
		const { field } = await setup({ editable: true })

		const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })

		field.dispatchEvent(event)

		expect(event.defaultPrevented).toBe(false)
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
