// @vitest-environment jsdom

/**
 * Плагины поля даты — клавиши, указатель и буфер обмена — над настоящим ядром.
 *
 * Разметку тест рисует сам, как фреймворк: корень, ряд частей и по узлу на
 * часть и разделитель из выхода `segments`, с их наборами. Узел части — по её
 * типу: при смене локали он меняет место, но остаётся тем же. Перерисовка идёт
 * по `change:segments` и `change:locale` синхронно — в браузере её сделал бы
 * фреймворк.
 *
 * jsdom не выполняет действий браузера: события буфера обмена приходят без
 * своего класса (`ClipboardEvent` и `DataTransfer` в нём не реализованы), и
 * тест кладёт данные в событие сам. Раскладку, протяжку мышью и настоящие
 * Ctrl+C и Ctrl+X проверяет `playground/vue/browser/date-input.spec.ts`.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { TDateInput } from '@soldy-ui/core'
import type { IDateInputProps, TDateFieldPart } from '@soldy-ui/core'
import {
	TDateInputClipboardPlugin,
	TDateInputKeyboardPlugin,
	TDateInputPointerPlugin,
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
				segment.type === 'literal' ? segment.aria : { ...segment.aria, ...segment.dataset }

			node.className =
				segment.type === 'literal' ? 's-date-input__literal' : 's-date-input__segment'

			for (const name of node.getAttributeNames()) {
				if (name !== 'class') node.removeAttribute(name)
			}

			for (const [name, value] of Object.entries(attributes)) {
				if (value !== null) node.setAttribute(name, value)
			}

			if (node.textContent !== segment.text) node.textContent = segment.text

			nodes.set(segment.key, node)

			// Узел переставляется, только если стоит не на своём месте: перестановка
			// узла с фокусом снимает с него фокус, как у фреймворка
			if (row.children[index] !== node) row.insertBefore(node, row.children[index] ?? null)
		})
	}

	render()
	owner.events.on('change:segments', render)
	owner.events.on('change:locale', render)
	owner.events.on('change:granularity', render)
	owner.events.on('change:disabled', render)

	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TDateInputKeyboardPlugin)
		.use(TDateInputPointerPlugin)
		.use(TDateInputClipboardPlugin)

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
			granularity: 'minute',
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
			granularity: 'minute',
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
			granularity: 'minute',
			value: '2026-05-12T14:30',
		})

		en.segment('dayPeriod').focus()
		expect(en.press(en.segment('dayPeriod'), 'x').defaultPrevented).toBe(false)
		expect(en.owner.value).toBe('2026-05-12T14:30')

		document.body.innerHTML = ''

		// ko-KR: «오전» и «오후» — оба с одной буквы
		const ko = await mount({
			locale: 'ko-KR',
			granularity: 'minute',
			value: '2026-05-12T14:30',
		})
		const first = ko.segment('dayPeriod').textContent?.[0] ?? ''

		ko.segment('dayPeriod').focus()
		ko.press(ko.segment('dayPeriod'), first)
		expect(ko.owner.value).toBe('2026-05-12T14:30')
	})

	it('смена точности — части времени появляются и пропадают, фокус с пропавшей части снят', async () => {
		const { owner, row, segment } = await mount({ value: '2026-05-12' })

		owner.granularity = 'minute'
		expect(row.querySelectorAll('.s-date-input__segment')).toHaveLength(5)

		segment('minute').focus()
		expect(owner.focusedSegment).toBe('minute')

		owner.granularity = 'day'
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

describe('уничтожение', () => {
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
