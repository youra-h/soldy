// @vitest-environment jsdom

/**
 * TPopoverFocusPlugin — модель фокуса Popover: какие элементы считаются
 * остановками Tab.
 *
 * Разметку тест строит сам — корень с триггером и телепортированная панель с
 * пометкой владельцем, как их рисует Vue, — а плагины собраны настоящим
 * набором. Проводка целиком на настоящей разметке —
 * `ui/vue/__tests__/popover.spec.ts`; здесь — правила поиска остановок,
 * которые браузер наружу не отдаёт: выключенное, `tabindex="-1"`, `inert` и
 * группа радио как одна остановка.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TPopover } from '@soldy/core'
import {
	TDismissPlugin,
	TElementPlugin,
	TPluginBundle,
	TPopoverFocusPlugin,
	TPopoverPointerPlugin,
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

/**
 * Страница: кнопка до, корень с триггером, кнопка после — и панель в конце
 * `body` с разметкой содержимого.
 */
async function setup(content: string) {
	const owner = new TPopover()
	const root = document.createElement('span')
	const panel = document.createElement('div')

	root.innerHTML = '<button class="trigger">Открыть</button>'
	document.body.insertAdjacentHTML('beforeend', '<button class="before">До</button>')
	document.body.appendChild(root)
	document.body.insertAdjacentHTML('beforeend', '<button class="after">После</button>')

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TDismissPlugin, { focusOutside: true })
		.use(TPopoverPointerPlugin)
		.use(TPopoverFocusPlugin)

	for (const [name, value] of Object.entries(pluginOf(bundle, TDismissPlugin).ownerAttribute)) {
		panel.setAttribute(name, value)
	}

	panel.tabIndex = -1
	panel.innerHTML = content
	document.body.appendChild(panel)

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	owner.open = true
	await nextFrame()

	return { owner, panel, bundle }
}

/** Tab на элементе под фокусом. Отдаёт событие: по нему видно, погашен ли он. */
function tab(shiftKey = false): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {
		key: 'Tab',
		shiftKey,
		bubbles: true,
		cancelable: true,
	})

	;(document.activeElement ?? document.body).dispatchEvent(event)

	return event
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('остановки Tab в панели', () => {
	it('выключенное и tabindex="-1" — не остановки: фокус встаёт на первую настоящую', async () => {
		await setup(`
			<button class="off" disabled>Выкл</button>
			<span class="skip" tabindex="-1">Мимо</span>
			<a class="link" href="#x">Ссылка</a>
		`)

		expect(document.activeElement).toBe(nodeOf('.link'))
	})

	it('содержимое под inert — не остановки', async () => {
		await setup(`
			<div inert><button class="inert">Спит</button></div>
			<input class="field">
		`)

		expect(document.activeElement).toBe(nodeOf('.field'))
	})

	it('div с tabindex="0" — остановка, как у элемента с ролью', async () => {
		await setup('<div class="custom" tabindex="0">Своя</div>')

		expect(document.activeElement).toBe(nodeOf('.custom'))
	})

	it('последняя выключенная кнопка не мешает Tab уйти из панели', async () => {
		const { owner } = await setup(`
			<button class="only">Одна</button>
			<button disabled>Выкл</button>
		`)

		const event = tab()

		expect(event.defaultPrevented).toBe(true)
		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(nodeOf('.after'))
	})
})

describe('группа радио — одна остановка', () => {
	const radios = (checked: 'a' | 'b' | 'c' | null) =>
		['a', 'b', 'c']
			.map(
				(value) =>
					`<input type="radio" name="size" class="radio-${value}" value="${value}"${
						value === checked ? ' checked' : ''
					}>`,
			)
			.join('')

	it('Tab с выбранного первого радио уходит из панели, а не к следующему радио группы', async () => {
		const { owner } = await setup(radios('a'))

		expect(document.activeElement).toBe(nodeOf('.radio-a'))

		tab()

		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(nodeOf('.after'))
	})

	it('остановка группы — выбранное радио, а не первое', async () => {
		await setup(`<button class="first">Кнопка</button>${radios('c')}`)

		nodeOf('.radio-c').focus()

		const event = tab(true)

		// Shift+Tab с выбранного радио — это не первая остановка панели:
		// порядок ведёт браузер, плагин не вмешивается
		expect(event.defaultPrevented).toBe(false)

		nodeOf('.first').focus()
		tab(true)

		expect(document.activeElement).toBe(nodeOf('.trigger'))
	})

	it('без выбранного остановка — первое радио группы', async () => {
		await setup(radios(null))

		expect(document.activeElement).toBe(nodeOf('.radio-a'))
	})
})

describe('остановки после корня', () => {
	it('выключенная кнопка за корнем пропускается', async () => {
		const { owner } = await setup('<button class="only">Одна</button>')

		nodeOf('.after').setAttribute('disabled', '')
		document.body.insertAdjacentHTML('beforeend', '<button class="later">Дальше</button>')

		tab()

		expect(owner.open).toBe(false)
		expect(document.activeElement).toBe(nodeOf('.later'))
	})

	it('содержимое самой панели в «после корня» не входит', async () => {
		const { owner } = await setup('<button class="only">Одна</button>')

		nodeOf('.after').remove()

		const event = tab()

		// Панель лежит в документе после корня, но Tab из неё к ней же не ведёт
		expect(event.defaultPrevented).toBe(false)
		expect(owner.open).toBe(false)
	})
})
