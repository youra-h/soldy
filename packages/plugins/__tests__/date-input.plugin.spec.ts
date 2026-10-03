// @vitest-environment jsdom

/**
 * Плагины поля даты — клавиши, указатель, буфер обмена, сенсорный ввод и `id`
 * частей — над настоящим ядром.
 *
 * Разметку тест рисует сам, как фреймворк: корень, ряд частей и по узлу на
 * часть и разделитель из выхода `segments`, с их наборами. Узел части — по её
 * типу: при смене локали он меняет место, но остаётся тем же. Перерисовка идёт
 * по `change:segments` и `change:locale` синхронно — в браузере её сделал бы
 * фреймворк. Текст узла перерисовка пишет, как фреймворк, только когда сменился
 * текст ядра: что браузер написал в часть сам, она не видит.
 *
 * jsdom не выполняет действий браузера: события буфера обмена приходят без
 * своего класса (`ClipboardEvent` и `DataTransfer` в нём не реализованы), и
 * тест кладёт данные в событие сам; правку редактируемой части и композицию
 * тест пишет в узел сам, как их написал бы браузер. Раскладку, протяжку мышью,
 * настоящие Ctrl+C и Ctrl+X, касание и ввод без клавиш проверяет
 * `playground/vue/browser/date-input.spec.ts`.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { TDateInput } from '@soldy-ui/core'
import type { IDateInputProps, TDateFieldPart } from '@soldy-ui/core'
import {
	TDateInputClipboardPlugin,
	TDateInputIdsPlugin,
	TDateInputKeyboardPlugin,
	TDateInputPointerPlugin,
	TDateInputTouchPlugin,
	TElementPlugin,
	TPluginBundle,
} from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(2026, 8, 26, 12))
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
	Reflect.deleteProperty(navigator, 'maxTouchPoints')
	document.body.innerHTML = ''
})

/** Данные буфера обмена — как у `DataTransfer`, которого в jsdom нет. */
class TTransfer {
	readonly data = new Map<string, string>()

	setData(type: string, value: string): void {
		this.data.set(type, value)
	}

	getData(type: string): string {
		return this.data.get(type) ?? ''
	}

	clearData(): void {
		this.data.clear()
	}
}

/** Событие буфера обмена или перетаскивания с данными в нужном поле. */
function transferEvent(
	type: string,
	field: 'clipboardData' | 'dataTransfer',
	transfer = new TTransfer(),
): { event: Event; transfer: TTransfer } {
	const event = new Event(type, { bubbles: true, cancelable: true })

	Object.defineProperty(event, field, { value: transfer })

	return { event, transfer }
}

/** Поле в документе с плагинами — как его собирает адаптер. */
async function mount(props: Partial<IDateInputProps> = {}) {
	const owner = new TDateInput({ locale: 'ru-RU', ...props })
	const root = document.createElement('div')
	const leading = document.createElement('div')
	const row = document.createElement('span')
	const nodes = new Map<string, HTMLElement>()
	/** Текст ядра, который перерисовка написала в узел последним */
	const texts = new Map<string, string>()

	root.className = 's-date-input'
	leading.className = 's-date-input__leading'
	leading.append(document.createElement('button'))
	row.className = 's-date-input__segments'
	root.append(leading, row)
	document.body.append(document.createElement('button'), root)

	/** Разметка по выходу ядра: узел — по ключу, атрибуты — наборы. */
	const render = (): void => {
		for (const [name, value] of Object.entries(owner.segmentsAttrs)) {
			if (value !== null) row.setAttribute(name, value)
		}

		const keys = owner.segments.map((segment) => segment.key)

		for (const [key, node] of nodes) {
			if (!keys.includes(key)) {
				node.remove()
				nodes.delete(key)
			}
		}

		owner.segments.forEach((segment, index) => {
			const node = nodes.get(segment.key) ?? document.createElement('span')
			const attributes =
				segment.type === 'literal'
					? segment.aria
					: { ...segment.attrs, ...segment.aria, ...segment.dataset }

			node.className =
				segment.type === 'literal' ? 's-date-input__literal' : 's-date-input__segment'

			for (const name of node.getAttributeNames()) {
				if (name !== 'class') node.removeAttribute(name)
			}

			for (const [name, value] of Object.entries(attributes)) {
				if (value !== null) node.setAttribute(name, value)
			}

			if (texts.get(segment.key) !== segment.text) {
				node.textContent = segment.text
				texts.set(segment.key, segment.text)
			}

			nodes.set(segment.key, node)

			// Узел переставляется, только если стоит не на своём месте: перестановка
			// узла с фокусом снимает с него фокус, как у фреймворка
			if (row.children[index] !== node) row.insertBefore(node, row.children[index] ?? null)
		})
	}

	render()
	owner.events.on('change:segments', render)
	owner.events.on('change:locale', render)
	owner.events.on('change:kind', render)
	owner.events.on('change:disabled', render)

	const bundle = new TPluginBundle(owner, 'f1')
		.use(TElementPlugin)
		.use(TDateInputKeyboardPlugin)
		.use(TDateInputPointerPlugin)
		.use(TDateInputClipboardPlugin)
		.use(TDateInputTouchPlugin)
		.use(TDateInputIdsPlugin)

	const element = bundle.get(TElementPlugin)

	if (!element) throw new Error('TElementPlugin не установлен')

	element.element = root
	await nextFrame()

	/** Узел части по типу; нет его — тест падает здесь. */
	const segment = (part: TDateFieldPart): HTMLElement => {
		const node = row.querySelector(`[data-type="${part}"]`)

		if (!(node instanceof HTMLElement)) throw new Error(`части ${part} нет`)

		return node
	}

	/** Нажатие с узла, как у пользователя: событие всплывает до корня. */
	const press = (from: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
		const event = new KeyboardEvent('keydown', {
			key,
			bubbles: true,
			cancelable: true,
			...init,
		})

		from.dispatchEvent(event)

		return event
	}

	/** Набрать строку с части под фокусом документа. */
	const type = (keys: string): void => {
		for (const key of keys) press(activeElement(), key)
	}

	/** Выделить знаки от узла и смещения до узла и смещения. */
	const select = (from: Node, start: number, to: Node, end: number): Range => {
		const range = document.createRange()

		range.setStart(from, start)
		range.setEnd(to, end)
		document.getSelection()?.removeAllRanges()
		document.getSelection()?.addRange(range)

		return range
	}

	/** Текст узла части или разделителя — сам текстовый узел. */
	const textOf = (node: Element): Text => {
		const text = node.firstChild

		if (!(text instanceof Text)) throw new Error('у узла нет текста')

		return text
	}

	return { owner, root, row, leading, bundle, segment, press, type, select, textOf }
}

/** Узел под фокусом документа. */
function activeElement(): Element {
	const active = document.activeElement

	if (!active) throw new Error('фокуса нет')

	return active
}

/** Нажатие указателем — пальцем, пером или мышью, как его шлёт браузер. */
function pointerDown(from: Element, pointerType: string): void {
	from.dispatchEvent(new PointerEvent('pointerdown', { pointerType, bubbles: true }))
}

/**
 * Правка браузера в редактируемой части — `beforeinput`, как от экранной
 * клавиатуры: без клавиши. Правку композиции браузер отменить не даёт.
 */
function beforeInput(from: Element, inputType: string, data: string | null = null): InputEvent {
	const event = new InputEvent('beforeinput', {
		inputType,
		data,
		bubbles: true,
		cancelable: inputType !== 'insertCompositionText',
	})

	from.dispatchEvent(event)

	return event
}

/** Браузер правил текст части сам и сообщил об этом: `input`. */
function inputDone(from: Element, inputType: string, isComposing = false): void {
	from.dispatchEvent(new InputEvent('input', { inputType, isComposing, bubbles: true }))
}

/** Композиция в части от начала до конца — так её шлёт IME. */
function compose(from: Element, steps: readonly string[]): void {
	from.dispatchEvent(new CompositionEvent('compositionstart', { data: '', bubbles: true }))

	for (const step of steps) {
		beforeInput(from, 'insertCompositionText', step)
		// Текст композиции браузер пишет в часть сам, мимо фреймворка
		const text = from.firstChild

		if (text instanceof Text) text.appendData(step.slice(-1))

		inputDone(from, 'insertCompositionText', true)
	}

	from.dispatchEvent(
		new CompositionEvent('compositionend', { data: steps.at(-1) ?? '', bubbles: true }),
	)
}

/**
 * Платформа устройства на время теста: `navigator.platform` и число точек
 * касания. У jsdom `maxTouchPoints` нет вовсе.
 */
function emulatePlatform(platform: string, maxTouchPoints = 0): void {
	vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)
	Object.defineProperty(navigator, 'maxTouchPoints', {
		value: maxTouchPoints,
		configurable: true,
	})
}

describe('фокус', () => {
	it('focusin на части — часть под фокусом ядра; уход из поля — фокуса нет', async () => {
		const { owner, segment } = await mount()

		segment('month').focus()
		expect(owner.focusedSegment).toBe('month')

		segment('year').focus()
		expect(owner.focusedSegment).toBe('year')

		segment('year').blur()
		expect(owner.focusedSegment).toBeUndefined()
	})

	it('ядро перевело фокус — DOM-фокус идёт за ним', async () => {
		const { segment, type } = await mount()

		segment('day').focus()
		type('12')

		expect(document.activeElement).toBe(segment('month'))
	})

	it('фокус вне ряда ядро не забирает', async () => {
		const { owner, leading } = await mount()
		const button = leading.querySelector('button')

		button?.focus()
		owner.focusSegment('year')

		expect(document.activeElement).toBe(button)
	})
})

describe('клавиши', () => {
	it('цифры набирают дату и гасятся', async () => {
		const { owner, segment, press, type } = await mount()

		segment('day').focus()

		expect(press(segment('day'), '1').defaultPrevented).toBe(true)
		type('2052026')

		expect(owner.value).toBe('2026-05-12')
	})

	it('стрелки ↑/↓ и Home/End — число части', async () => {
		const { owner, segment, press } = await mount({ value: '2026-05-12' })

		segment('month').focus()
		press(segment('month'), 'ArrowUp')
		expect(owner.value).toBe('2026-06-12')

		press(segment('month'), 'ArrowDown')
		press(segment('month'), 'ArrowDown')
		expect(owner.value).toBe('2026-04-12')

		press(segment('month'), 'End')
		expect(owner.value).toBe('2026-12-12')

		expect(press(segment('month'), 'Home').defaultPrevented).toBe(true)
		expect(owner.value).toBe('2026-01-12')
	})

	it('←/→ — соседняя часть по направлению ряда', async () => {
		const { segment, press } = await mount()

		segment('day').focus()
		press(segment('day'), 'ArrowRight')
		expect(document.activeElement).toBe(segment('month'))

		press(segment('month'), 'ArrowLeft')
		expect(document.activeElement).toBe(segment('day'))
	})

	it('ряд справа налево (ar-EG): ← ведёт к следующей части формата', async () => {
		const { owner, row, segment, press } = await mount({ locale: 'ar-EG' })

		expect(row.getAttribute('dir')).toBe('rtl')
		expect(owner.segmentsDirection).toBe('rtl')

		segment('day').focus()
		press(segment('day'), 'ArrowLeft')
		expect(document.activeElement).toBe(segment('month'))

		press(segment('month'), 'ArrowRight')
		expect(document.activeElement).toBe(segment('day'))
	})

	it('Backspace стирает цифру, на пустой части — фокус на предыдущую; Delete очищает', async () => {
		const { owner, segment, press } = await mount({ value: '2026-05-12' })

		segment('day').focus()
		press(segment('day'), 'Backspace')
		expect(segment('day').textContent).toBe('01')

		press(segment('day'), 'Delete')
		expect(segment('day').dataset.placeholder).toBe('true')

		segment('month').focus()
		press(segment('month'), 'Delete')
		press(segment('month'), 'Backspace')
		expect(document.activeElement).toBe(segment('day'))
		expect(owner.value).toBeUndefined()
	})

	it('Ctrl+A и Cmd+A — выделение браузера на весь ряд, фокус на месте', async () => {
		const { row, segment, press } = await mount({ value: '2026-05-12' })

		segment('month').focus()

		// Русская раскладка: `key` — «ф», `code` — KeyA
		expect(press(segment('month'), 'ф', { code: 'KeyA', ctrlKey: true }).defaultPrevented).toBe(
			true,
		)

		const range = document.getSelection()?.getRangeAt(0)

		expect(range?.toString()).toBe('12.05.2026')
		expect(range?.commonAncestorContainer).toBe(row)
		expect(document.activeElement).toBe(segment('month'))

		document.getSelection()?.removeAllRanges()
		press(segment('month'), 'a', { code: 'KeyA', metaKey: true })
		expect(document.getSelection()?.toString()).toBe('12.05.2026')
	})

	it('выделение задело части: Delete очищает их, цифра — очищает и набирается в первую', async () => {
		const { owner, segment, press, select, textOf } = await mount({ value: '2026-05-12' })

		segment('year').focus()
		select(textOf(segment('month')), 1, textOf(segment('year')), 4)

		expect(press(segment('year'), '7').defaultPrevented).toBe(true)
		expect(segment('month').textContent).toBe('07')
		expect(segment('year').dataset.placeholder).toBe('true')
		expect(segment('day').textContent).toBe('12')
		// «7» — месяц набран, фокус ушёл дальше, выделение снято
		expect(document.activeElement).toBe(segment('year'))
		expect(document.getSelection()?.isCollapsed).toBe(true)

		select(textOf(segment('day')), 0, textOf(segment('month')), 2)
		press(segment('year'), 'Delete')
		expect(owner.value).toBeUndefined()
		expect(segment('day').dataset.placeholder).toBe('true')
		expect(segment('month').dataset.placeholder).toBe('true')
	})

	it('край выделения на границе части её не задевает', async () => {
		const { segment, press, select, textOf } = await mount({ value: '2026-05-12' })

		segment('day').focus()
		// От начала дня до начала года: год не выделен ни одним знаком
		select(textOf(segment('day')), 0, textOf(segment('year')), 0)
		press(segment('day'), 'Backspace')

		expect(segment('day').dataset.placeholder).toBe('true')
		expect(segment('month').dataset.placeholder).toBe('true')
		expect(segment('year').textContent).toBe('2026')
	})

	it('клавиши с модификаторами, композиция IME и клавиши слотов — не поля', async () => {
		const { owner, leading, segment, press } = await mount({ value: '2026-05-12' })

		segment('day').focus()

		expect(press(segment('day'), 'ArrowUp', { altKey: true }).defaultPrevented).toBe(false)
		expect(press(segment('day'), 'c', { ctrlKey: true }).defaultPrevented).toBe(false)
		expect(press(segment('day'), '3', { isComposing: true }).defaultPrevented).toBe(false)

		const button = leading.querySelector('button')

		if (button) expect(press(button, 'ArrowUp').defaultPrevented).toBe(false)
		expect(owner.value).toBe('2026-05-12')
	})

	it('время: час и минута цифрами, буква выбирает период суток, регистр не важен', async () => {
		const { owner, segment, press, type } = await mount({
			locale: 'en-US',
			kind: 'datetime',
		})

		segment('month').focus()
		type('05122026')
		expect(document.activeElement).toBe(segment('hour'))

		type('0230')
		expect(document.activeElement).toBe(segment('dayPeriod'))
		expect(owner.value).toBeUndefined()

		expect(press(segment('dayPeriod'), 'p').defaultPrevented).toBe(true)
		expect(owner.value).toBe('2026-05-12T14:30')

		press(segment('dayPeriod'), 'A', { shiftKey: true })
		expect(owner.value).toBe('2026-05-12T02:30')
		expect(segment('dayPeriod').dataset.placeholder).toBe('false')
	})

	it('↑/↓ у периода суток — другой период, час переезжает за ним', async () => {
		const { owner, segment, press } = await mount({
			locale: 'en-US',
			kind: 'datetime',
			value: '2026-05-12T14:30',
		})

		segment('dayPeriod').focus()
		expect(press(segment('dayPeriod'), 'ArrowUp').defaultPrevented).toBe(true)
		expect(owner.value).toBe('2026-05-12T02:30')

		press(segment('dayPeriod'), 'ArrowDown')
		expect(owner.value).toBe('2026-05-12T14:30')
	})

	it('буква не периода — не поля; с которой начинаются оба имени — период не меняет', async () => {
		const en = await mount({
			locale: 'en-US',
			kind: 'datetime',
			value: '2026-05-12T14:30',
		})

		en.segment('dayPeriod').focus()
		expect(en.press(en.segment('dayPeriod'), 'x').defaultPrevented).toBe(false)
		expect(en.owner.value).toBe('2026-05-12T14:30')

		document.body.innerHTML = ''

		// ko-KR: «오전» и «오후» — оба с одной буквы
		const ko = await mount({
			locale: 'ko-KR',
			kind: 'datetime',
			value: '2026-05-12T14:30',
		})
		const first = ko.segment('dayPeriod').textContent?.[0] ?? ''

		ko.segment('dayPeriod').focus()
		ko.press(ko.segment('dayPeriod'), first)
		expect(ko.owner.value).toBe('2026-05-12T14:30')
	})

	it('смена вида — части времени появляются и пропадают, фокус с пропавшей части снят', async () => {
		const { owner, row, segment } = await mount({ value: '2026-05-12' })

		owner.kind = 'datetime'
		expect(row.querySelectorAll('.s-date-input__segment')).toHaveLength(5)

		segment('minute').focus()
		expect(owner.focusedSegment).toBe('minute')

		owner.kind = 'date'
		expect(row.querySelectorAll('.s-date-input__segment')).toHaveLength(3)
		expect(owner.focusedSegment).toBeUndefined()
	})

	it('Tab и Enter — не поля: остановки Tab у частей свои', async () => {
		const { segment, press } = await mount()

		segment('day').focus()

		expect(press(segment('day'), 'Tab').defaultPrevented).toBe(false)
		expect(press(segment('day'), 'Enter').defaultPrevented).toBe(false)
		// Пробел страницу не прокручивает
		expect(press(segment('day'), ' ').defaultPrevented).toBe(true)
	})
})

describe('указатель', () => {
	it('нажатие мимо частей — фокус ближайшей; по слоту — нет', async () => {
		const { root, row, leading, segment } = await mount()

		row.querySelector('.s-date-input__literal')?.dispatchEvent(
			new MouseEvent('click', { bubbles: true }),
		)
		expect(document.activeElement).toBe(segment('day'))

		segment('day').blur()
		leading.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		expect(document.activeElement).not.toBe(segment('day'))

		root.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		expect(document.activeElement).toBe(segment('day'))
	})

	it('нажатие мимо частей не снимает протянутое выделение', async () => {
		const { root, segment, select, textOf } = await mount({ value: '2026-05-12' })

		select(textOf(segment('day')), 0, textOf(segment('year')), 4)
		root.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		expect(document.activeElement).toBe(document.body)
		expect(document.getSelection()?.isCollapsed).toBe(false)
	})

	it('contextmenu делает ряд редактируемым, нажатие и клавиша — обратно', async () => {
		const { row, segment, press } = await mount({ value: '2026-05-12' })

		segment('day').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
		expect(row.getAttribute('contenteditable')).toBe('true')

		segment('day').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
		expect(row.hasAttribute('contenteditable')).toBe(false)

		segment('day').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
		press(segment('day'), 'Escape')
		expect(row.hasAttribute('contenteditable')).toBe(false)

		segment('day').focus()
		segment('day').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
		segment('day').blur()
		expect(row.hasAttribute('contenteditable')).toBe(false)
	})

	it('у поля только для чтения меню не правит: ряд не становится редактируемым', async () => {
		const { row, segment } = await mount({ value: '2026-05-12', readonly: true })

		segment('day').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))

		expect(row.hasAttribute('contenteditable')).toBe(false)
	})

	it('правка браузера в редактируемом ряду гасится, удаление из меню очищает части', async () => {
		const { owner, row, segment, select, textOf } = await mount({ value: '2026-05-12' })

		segment('day').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))

		const insert = new InputEvent('beforeinput', {
			inputType: 'insertText',
			data: 'x',
			bubbles: true,
			cancelable: true,
		})

		segment('day').dispatchEvent(insert)
		expect(insert.defaultPrevented).toBe(true)
		expect(row.getAttribute('contenteditable')).toBe('true')

		select(textOf(segment('month')), 0, textOf(segment('year')), 4)

		const remove = new InputEvent('beforeinput', {
			inputType: 'deleteContentBackward',
			bubbles: true,
			cancelable: true,
		})

		segment('month').dispatchEvent(remove)
		expect(remove.defaultPrevented).toBe(true)
		expect(owner.value).toBeUndefined()
		expect(segment('day').textContent).toBe('12')
		expect(segment('month').dataset.placeholder).toBe('true')
		expect(row.hasAttribute('contenteditable')).toBe(false)
	})

	it('вне редактируемого ряда beforeinput не трогают', async () => {
		const { segment } = await mount()
		const event = new InputEvent('beforeinput', { bubbles: true, cancelable: true })

		segment('day').dispatchEvent(event)

		expect(event.defaultPrevented).toBe(false)
	})
})

describe('буфер обмена', () => {
	it('copy кладёт текст выделенного в ряду — без переносов строк', async () => {
		const { segment, select, textOf } = await mount({ value: '2026-05-12' })

		select(textOf(segment('month')), 0, textOf(segment('year')), 4)

		const { event, transfer } = transferEvent('copy', 'clipboardData')

		document.body.dispatchEvent(event)

		expect(event.defaultPrevented).toBe(true)
		expect(transfer.getData('text/plain')).toBe('05.2026')
	})

	it('cut копирует и очищает задетые части; у readonly — только копирует', async () => {
		const { owner, segment, select, textOf } = await mount({ value: '2026-05-12' })

		select(textOf(segment('day')), 0, textOf(segment('year')), 4)

		const cut = transferEvent('cut', 'clipboardData')

		segment('day').dispatchEvent(cut.event)
		expect(cut.transfer.getData('text/plain')).toBe('12.05.2026')
		expect(owner.value).toBeUndefined()

		owner.value = '2026-05-12'
		owner.readonly = true
		select(textOf(segment('day')), 0, textOf(segment('year')), 4)

		const copy = transferEvent('cut', 'clipboardData')

		segment('day').dispatchEvent(copy.event)
		expect(copy.transfer.getData('text/plain')).toBe('12.05.2026')
		expect(owner.value).toBe('2026-05-12')
	})

	it('выделение не в ряду поля — буфер браузера', async () => {
		const { segment, textOf } = await mount({ value: '2026-05-12' })
		const outside = document.createElement('p')

		outside.textContent = 'Дата рождения'
		document.body.prepend(outside)

		const range = document.createRange()

		range.setStart(textOf(outside), 0)
		range.setEnd(textOf(segment('day')), 2)
		document.getSelection()?.removeAllRanges()
		document.getSelection()?.addRange(range)

		const { event, transfer } = transferEvent('copy', 'clipboardData')

		document.body.dispatchEvent(event)

		expect(event.defaultPrevented).toBe(false)
		expect(transfer.data.size).toBe(0)
	})

	it('paste в часть: дата заменяет всю дату, не дата — ничего, гасится всегда', async () => {
		const { owner, segment } = await mount({ value: '2020-01-01' })

		const date = transferEvent('paste', 'clipboardData')

		date.transfer.setData('text/plain', '12.05.2026')
		segment('month').dispatchEvent(date.event)
		expect(date.event.defaultPrevented).toBe(true)
		expect(owner.value).toBe('2026-05-12')

		const text = transferEvent('paste', 'clipboardData')

		text.transfer.setData('text/plain', 'завтра')
		segment('day').dispatchEvent(text.event)
		expect(text.event.defaultPrevented).toBe(true)
		expect(owner.value).toBe('2026-05-12')
	})

	it('paste и cut возвращают ряд из редактируемого', async () => {
		const { row, segment } = await mount({ value: '2026-05-12' })

		segment('day').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
		segment('day').dispatchEvent(transferEvent('paste', 'clipboardData').event)
		expect(row.hasAttribute('contenteditable')).toBe(false)

		segment('day').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
		segment('day').dispatchEvent(transferEvent('cut', 'clipboardData').event)
		expect(row.hasAttribute('contenteditable')).toBe(false)
	})

	it('dragstart выделенной даты кладёт тот же текст', async () => {
		const { segment, select, textOf } = await mount({ value: '2026-05-12' })

		select(textOf(segment('day')), 0, textOf(segment('year')), 4)

		const drag = new TTransfer()

		drag.setData('text/html', '<span>12</span>')

		const { event } = transferEvent('dragstart', 'dataTransfer', drag)

		segment('day').dispatchEvent(event)

		expect(drag.getData('text/plain')).toBe('12.05.2026')
		expect(drag.getData('text/html')).toBe('')
	})
})

describe('сенсорный режим', () => {
	it('палец и перо делают части редактируемыми, мышь — снова нет', async () => {
		const { root, segment } = await mount()
		const editable = () =>
			(['day', 'month', 'year'] as const).map((part) => [
				segment(part).getAttribute('contenteditable'),
				segment(part).getAttribute('inputmode'),
			])

		// Сервер и компьютер рисуют часть нередактируемой
		expect(editable()).toEqual([
			[null, null],
			[null, null],
			[null, null],
		])

		pointerDown(segment('day'), 'touch')
		expect(editable()).toEqual([
			['true', 'numeric'],
			['true', 'numeric'],
			['true', 'numeric'],
		])
		expect(segment('day').getAttribute('spellcheck')).toBe('false')
		expect(segment('day').getAttribute('autocorrect')).toBe('off')

		pointerDown(segment('month'), 'mouse')
		expect(segment('month').hasAttribute('contenteditable')).toBe(false)
		expect(segment('month').hasAttribute('inputmode')).toBe(false)

		// Нажатие пером мимо частей — по пустому месту поля — тоже касание
		pointerDown(root, 'pen')
		expect(segment('year').getAttribute('contenteditable')).toBe('true')

		// Нажатие без указателя режим не меняет
		pointerDown(segment('day'), '')
		expect(segment('year').getAttribute('contenteditable')).toBe('true')
	})

	it('выключенное поле и поле только для чтения на касание не редактируются', async () => {
		const { owner, segment } = await mount({ readonly: true })

		pointerDown(segment('day'), 'touch')
		expect(segment('day').hasAttribute('contenteditable')).toBe(false)

		owner.readonly = false
		expect(segment('day').getAttribute('contenteditable')).toBe('true')

		owner.disabled = true
		expect(segment('day').hasAttribute('contenteditable')).toBe(false)

		owner.disabled = false
		expect(segment('day').getAttribute('contenteditable')).toBe('true')
	})

	it('время: клавиатура цифр у часа и минуты, букв — у периода суток', async () => {
		const { owner, segment } = await mount({
			locale: 'en-US',
			kind: 'datetime',
			value: '2026-05-12T09:05',
		})

		pointerDown(segment('hour'), 'touch')
		expect(
			(['hour', 'minute', 'dayPeriod'] as const).map((part) =>
				segment(part).getAttribute('inputmode'),
			),
		).toEqual(['numeric', 'numeric', 'text'])

		// Период суток набирают буквой — с экранной клавиатуры букв
		segment('dayPeriod').focus()
		beforeInput(segment('dayPeriod'), 'insertText', 'p')
		expect(owner.value).toBe('2026-05-12T21:05')
	})

	it('смена вида и локали: новые части получают наборы сенсорного режима и id', async () => {
		const { owner, segment } = await mount()

		pointerDown(segment('day'), 'touch')

		owner.kind = 'datetime'
		expect(segment('hour').getAttribute('contenteditable')).toBe('true')
		expect(segment('minute').getAttribute('inputmode')).toBe('numeric')
		expect(segment('hour').getAttribute('id')).toBe('f1-hour')

		// 12-часовой цикл добавляет период суток
		owner.locale = 'en-US'
		expect(segment('dayPeriod').getAttribute('contenteditable')).toBe('true')
		expect(segment('dayPeriod').getAttribute('inputmode')).toBe('text')
		expect(segment('dayPeriod').getAttribute('id')).toBe('f1-dayPeriod')
	})

	it('ввод экранной клавиатуры гасится и набирает дату командами ядра', async () => {
		const { owner, segment } = await mount()

		pointerDown(segment('day'), 'touch')
		segment('day').focus()

		expect(beforeInput(segment('day'), 'insertText', '1').defaultPrevented).toBe(true)
		beforeInput(segment('day'), 'insertText', '2')
		expect(document.activeElement).toBe(segment('month'))

		// Несколько знаков сразу — по одному, как клавиши: «05» дописал месяц,
		// «2026» — год
		beforeInput(segment('month'), 'insertText', '05')
		beforeInput(segment('year'), 'insertText', '2026')

		expect(owner.value).toBe('2026-05-12')
		expect(segment('year').textContent).toBe('2026')
	})

	it('стирание назад — цифра, с пустой части — фокус на предыдущую; другое удаление — часть', async () => {
		const { owner, segment } = await mount({ value: '2026-05-12' })

		pointerDown(segment('day'), 'touch')
		segment('day').focus()

		expect(beforeInput(segment('day'), 'deleteContentBackward').defaultPrevented).toBe(true)
		expect(segment('day').textContent).toBe('01')

		segment('month').focus()
		beforeInput(segment('month'), 'deleteContentBackward')
		expect(segment('month').dataset.placeholder).toBe('true')

		beforeInput(segment('month'), 'deleteContentBackward')
		expect(document.activeElement).toBe(segment('day'))

		beforeInput(segment('day'), 'deleteWordBackward')
		expect(segment('day').dataset.placeholder).toBe('true')
		expect(owner.value).toBeUndefined()
		expect(segment('year').textContent).toBe('2026')
	})

	it('выделение в части: удаление очищает её, знак набирается вместо неё', async () => {
		const { owner, segment, select, textOf } = await mount({ value: '2026-05-12' })

		pointerDown(segment('month'), 'touch')
		segment('month').focus()
		select(textOf(segment('month')), 0, textOf(segment('month')), 2)

		beforeInput(segment('month'), 'insertText', '7')
		expect(owner.value).toBe('2026-07-12')
		// «7» — месяц набран, фокус ушёл дальше, выделение схлопнулось в каретку
		expect(document.activeElement).toBe(segment('year'))
		expect(document.getSelection()?.isCollapsed).toBe(true)

		segment('day').focus()
		select(textOf(segment('day')), 0, textOf(segment('day')), 2)
		beforeInput(segment('day'), 'deleteContentBackward')

		expect(segment('day').dataset.placeholder).toBe('true')
		expect(segment('month').textContent).toBe('07')
	})

	it('правки без данных — перевод строки, отмена — гасятся и ничего не меняют', async () => {
		const { owner, segment } = await mount({ value: '2026-05-12' })

		pointerDown(segment('day'), 'touch')
		segment('day').focus()

		for (const inputType of [
			'insertParagraph',
			'insertLineBreak',
			'historyUndo',
			'formatBold',
		]) {
			expect(beforeInput(segment('day'), inputType).defaultPrevented, inputType).toBe(true)
		}

		expect(owner.value).toBe('2026-05-12')
	})

	it('композиция: её текст часть показывает, а по окончании набранное — в ядро', async () => {
		const { owner, segment, textOf } = await mount()

		pointerDown(segment('month'), 'touch')
		segment('month').focus()

		const month = segment('month')

		month.dispatchEvent(new CompositionEvent('compositionstart', { data: '', bubbles: true }))

		const step = beforeInput(month, 'insertCompositionText', '０')

		// Композицию не погасить, и её текст в части не трогают, пока она идёт
		expect(step.defaultPrevented).toBe(false)
		textOf(month).appendData('０')
		inputDone(month, 'insertCompositionText', true)
		expect(month.textContent).toBe('мм０')

		textOf(month).appendData('５')
		inputDone(month, 'insertCompositionText', true)
		month.dispatchEvent(new CompositionEvent('compositionend', { data: '０５', bubbles: true }))

		// Полноширинные цифры — тоже цифры: месяц набран, фокус ушёл дальше
		expect(month.textContent).toBe('05')
		expect(owner.focusedSegment).toBe('year')
		expect(document.activeElement).toBe(segment('year'))
	})

	it('композиция не цифр — часть получает текст ядра обратно, тем же узлом', async () => {
		const { owner, segment, textOf } = await mount()

		pointerDown(segment('day'), 'touch')
		segment('day').focus()

		const text = textOf(segment('day'))

		// Текст ядра не сменился — перерисовка его не тронет, вернуть его должен плагин
		compose(segment('day'), ['あ', 'あい'])

		expect(segment('day').textContent).toBe('дд')
		expect(segment('day').firstChild).toBe(text)
		expect(owner.focusedSegment).toBe('day')
		expect(owner.value).toBeUndefined()
	})

	it('Safari: правки конца композиции гасятся без набора — набранное приходит на compositionend', async () => {
		const { owner, segment } = await mount()

		pointerDown(segment('day'), 'touch')
		segment('day').focus()

		expect(beforeInput(segment('day'), 'deleteCompositionText').defaultPrevented).toBe(true)
		expect(beforeInput(segment('day'), 'insertFromComposition', '12').defaultPrevented).toBe(
			true,
		)
		expect(segment('day').dataset.placeholder).toBe('true')

		segment('day').dispatchEvent(
			new CompositionEvent('compositionend', { data: '12', bubbles: true }),
		)

		expect(segment('day').textContent).toBe('12')
		expect(owner.focusedSegment).toBe('month')
	})

	it('клавиатура стёрла знак и после погашенного Backspace — часть получает текст ядра обратно', async () => {
		const { segment, textOf } = await mount({ value: '2026-05-12' })

		pointerDown(segment('day'), 'touch')
		segment('day').focus()
		beforeInput(segment('day'), 'deleteContentBackward')
		expect(segment('day').textContent).toBe('01')

		// Клавиатура, которая отмену не уважает, стёрла знак сама
		textOf(segment('day')).deleteData(1, 1)
		inputDone(segment('day'), 'deleteContentBackward')

		expect(segment('day').textContent).toBe('01')
	})

	it('меню над редактируемой частью ряд не трогает: ввод идёт в часть', async () => {
		const { owner, row, segment } = await mount({ value: '2026-05-12' })
		const day = segment('day')

		// `isContentEditable` jsdom не считает вовсе — здесь он по атрибуту узла,
		// как его посчитал бы браузер у части без редактируемого предка
		Object.defineProperty(day, 'isContentEditable', {
			get: () => day.getAttribute('contenteditable') === 'true',
		})

		pointerDown(day, 'touch')
		day.focus()
		// Двойное касание и долгое нажатие открывают меню над частью
		day.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))

		expect(row.hasAttribute('contenteditable')).toBe(false)

		beforeInput(day, 'insertText', '3')

		expect(owner.value).toBe('2026-05-03')
	})
})

describe('сенсорные устройства Apple', () => {
	/** Имя части по `Intl.DisplayNames`, как его пишет ядро. */
	const partName = (locale: string, part: TDateFieldPart): string | undefined =>
		new Intl.DisplayNames([locale, 'en-US'], { type: 'dateTimeField' }).of(part)

	it('iPhone: роль частей — textbox, значения счётчика нет', async () => {
		emulatePlatform('iPhone')

		const { segment } = await mount({ value: '2026-05-12' })

		expect(segment('day').getAttribute('role')).toBe('textbox')
		expect(segment('day').hasAttribute('aria-valuenow')).toBe(false)
		expect(segment('day').hasAttribute('aria-valuemax')).toBe(false)
		expect(segment('day').getAttribute('tabindex')).toBe('0')
	})

	it('подпись поля по id — в имени каждой части: ссылкой на себя и на подпись', async () => {
		emulatePlatform('iPhone')

		const { owner, segment } = await mount({ value: '2026-05-12' })

		owner.aria.add('aria-labelledby', 'birthday-label')

		expect(segment('day').getAttribute('id')).toBe('f1-day')
		expect(segment('day').getAttribute('aria-labelledby')).toBe('f1-day birthday-label')
		expect(segment('year').getAttribute('aria-labelledby')).toBe('f1-year birthday-label')
		expect(segment('day').getAttribute('aria-label')).toBe(partName('ru-RU', 'day'))
	})

	it('имя поля строкой — строкой после имени части; смена локали — новое имя части', async () => {
		emulatePlatform('iPhone')

		const { owner, segment } = await mount()

		owner.aria.add('aria-label', 'Дата рождения')

		expect(segment('month').getAttribute('aria-label')).toBe(
			`${partName('ru-RU', 'month')}, Дата рождения`,
		)
		expect(segment('month').hasAttribute('aria-labelledby')).toBe(false)

		owner.locale = 'en-US'
		expect(segment('month').getAttribute('aria-label')).toBe(
			`${partName('en-US', 'month')}, Дата рождения`,
		)

		// Подпись по id сильнее строки — как в имени самого поля
		owner.aria.add('aria-labelledby', 'birthday-label')
		expect(segment('month').getAttribute('aria-label')).toBe(partName('en-US', 'month'))
		expect(segment('month').getAttribute('aria-labelledby')).toBe('f1-month birthday-label')
	})

	it('iPad называет себя Mac, но у него сенсорный экран; у Mac — счётчик', async () => {
		emulatePlatform('MacIntel', 5)
		expect((await mount()).segment('day').getAttribute('role')).toBe('textbox')

		document.body.innerHTML = ''
		emulatePlatform('MacIntel', 0)
		expect((await mount()).segment('day').getAttribute('role')).toBe('spinbutton')
	})

	it('другие устройства — роль и имя части свои', async () => {
		emulatePlatform('Linux armv81', 5)

		const { owner, segment } = await mount({ value: '2026-05-12' })

		owner.aria.add('aria-label', 'Дата рождения')

		expect(segment('day').getAttribute('role')).toBe('spinbutton')
		expect(segment('day').getAttribute('aria-valuenow')).toBe('12')
		expect(segment('day').getAttribute('aria-label')).toBe(partName('ru-RU', 'day'))
	})
})

describe('уничтожение', () => {
	it('сенсорный плагин уносит записанное в наборы частей', async () => {
		emulatePlatform('iPhone')

		const { owner, bundle, segment } = await mount({ value: '2026-05-12' })

		owner.aria.add('aria-label', 'Дата рождения')
		pointerDown(segment('day'), 'touch')
		bundle.destroy()

		expect(segment('day').hasAttribute('contenteditable')).toBe(false)
		expect(segment('day').getAttribute('role')).toBe('spinbutton')
		expect(segment('day').getAttribute('aria-label')).toBe(
			new Intl.DisplayNames(['ru-RU', 'en-US'], { type: 'dateTimeField' }).of('day'),
		)
	})

	it('destroy снимает слушатели с корня и документа', async () => {
		const { owner, bundle, segment, select, textOf } = await mount({ value: '2026-05-12' })

		bundle.destroy()
		segment('day').focus()
		select(textOf(segment('day')), 0, textOf(segment('year')), 4)

		const { event } = transferEvent('copy', 'clipboardData')

		document.body.dispatchEvent(event)

		expect(owner.focusedSegment).toBeUndefined()
		expect(event.defaultPrevented).toBe(false)
	})
})
