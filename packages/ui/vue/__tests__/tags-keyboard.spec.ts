/**
 * Клавиатура Tags в разметке — APG Listbox на roving tabindex.
 *
 * Ядро пишет `tabindex` строк и крестика в наборы, `TTagsKeyboardPlugin`
 * ловит клавиши и `focusin` на корне; по отдельности это проверяют
 * `core/__tests__/tags.spec.ts` и `plugins/__tests__/tags-keyboard.plugin.spec.ts`.
 * Здесь — что наборы доехали до своих элементов и перекрыли собственную
 * остановку строки-`Button` на `div`, а плагин ходит по настоящей разметке:
 * фокус уходит на строку с `role="option"`, а не на пилюлю.
 *
 * Что Tab и в самом деле входит в набор один раз, проверяет браузерный прогон
 * (`playground/vue/browser/tags-keyboard.spec.ts`): jsdom порядок Tab не ведёт.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { Select, SelectItem, Tags, TagsItem } from '@soldy/ui-vue'

/**
 * Слушатели плагин вешает по `ready` узла, а `TElementPlugin` отдаёт его
 * через `requestAnimationFrame`, — ждём кадр, а не `nextTick`.
 */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Теги из слота — строковым шаблоном: точка в нём не работает, берём плоские имена. */
const render = async (template: string) => {
	wrapper = mount({ components: { Tags, TagsItem }, template }, { attachTo: document.body })

	await nextTick()
	await nextFrame()
}

const ABC = `
	<TagsItem value="a" text="A" />
	<TagsItem value="b" text="B" selected />
	<TagsItem value="c" text="C" />
`

/** Элемент тега по тексту строки; нет его — тест падает здесь. */
const item = (text: string, root: ParentNode = document): Element => {
	const found = [...root.querySelectorAll('.s-tags-item')].find(
		(candidate) => candidate.firstElementChild?.textContent?.trim() === text,
	)

	if (!found) throw new Error(`тега «${text}» нет`)

	return found
}

/** Строка тега — носитель роли и остановки Tab. */
const row = (text: string, root?: ParentNode): HTMLElement => {
	const found = item(text, root).firstElementChild

	if (!(found instanceof HTMLElement)) throw new Error(`у тега «${text}» нет строки`)

	return found
}

const close = (text: string, root?: ParentNode): HTMLElement => {
	const found = item(text, root).querySelector('.s-tags-item__close')

	if (!(found instanceof HTMLElement)) throw new Error(`у тега «${text}» нет кнопки закрытия`)

	return found
}

/** `tabindex` строк набора по порядку. */
const rowTabindex = (texts: string[], root?: ParentNode) =>
	texts.map((text) => row(text, root).getAttribute('tabindex'))

const press = (target: Element, key: string) =>
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

describe('с выбором — одна остановка Tab на весь набор', () => {
	it('tabindex="0" ровно у одной строки — у выбранной', async () => {
		await render(`<Tags closable mode="multiple">${ABC}</Tags>`)

		const stops = document.querySelectorAll('[role="option"][tabindex="0"]')

		expect(stops).toHaveLength(1)
		expect(stops[0]).toBe(row('B'))
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '0', '-1'])
	})

	it('без выбранного — у первой строки', async () => {
		await render(`
			<Tags mode="single">
				<TagsItem value="a" text="A" />
				<TagsItem value="b" text="B" />
			</Tags>
		`)

		expect(rowTabindex(['A', 'B'])).toEqual(['0', '-1'])
	})

	it('кнопка закрытия — не остановка Tab: тег закрывает Delete', async () => {
		await render(`<Tags closable mode="multiple">${ABC}</Tags>`)

		expect(['A', 'B', 'C'].map((text) => close(text).getAttribute('tabindex'))).toEqual([
			'-1',
			'-1',
			'-1',
		])
	})

	it('набор объявляет горизонтальный listbox с множественным выбором', async () => {
		await render(`<Tags mode="multiple">${ABC}</Tags>`)

		const set = document.querySelector('.s-tags')

		expect(set?.getAttribute('role')).toBe('listbox')
		expect(set?.getAttribute('aria-orientation')).toBe('horizontal')
		expect(set?.getAttribute('aria-multiselectable')).toBe('true')
	})
})

/**
 * Без выбора у строки нет действия: остановка ей не нужна, а крестик —
 * единственный путь закрыть тег с клавиатуры.
 */
describe('без выбора строки Tab не ловят, крестик ловит', () => {
	it('у строк -1, у крестика tabindex нет — он нативная остановка', async () => {
		await render(`<Tags closable>${ABC}</Tags>`)

		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '-1'])
		expect(['A', 'B', 'C'].map((text) => close(text).hasAttribute('tabindex'))).toEqual([
			false,
			false,
			false,
		])
		expect(document.querySelector('.s-tags')?.hasAttribute('aria-orientation')).toBe(false)
	})

	it('теги в поле Select — так же', async () => {
		wrapper = mount(
			() =>
				h(Select, { mode: 'multiple', value: ['msk', 'tver'] }, () => [
					h(SelectItem, { value: 'msk', text: 'Москва' }),
					h(SelectItem, { value: 'tver', text: 'Тверь' }),
				]),
			{ attachTo: document.body },
		)

		await nextTick()
		await nextFrame()

		const field = document.querySelector('.s-select__tags')

		if (!field) throw new Error('тегов в поле нет')

		expect(rowTabindex(['Москва', 'Тверь'], field)).toEqual(['-1', '-1'])
		expect(close('Москва', field).hasAttribute('tabindex')).toBe(false)
		expect(row('Москва', field).getAttribute('role')).toBe('listitem')
	})

	it('включили выбор — остановка появилась, выключили — ушла', async () => {
		const mounted = mount(
			{
				components: { Tags, TagsItem },
				props: { mode: { type: String, default: 'none' } },
				template: `<Tags closable :mode="mode">${ABC}</Tags>`,
			},
			{ attachTo: document.body },
		)

		wrapper = mounted
		await nextTick()

		await mounted.setProps({ mode: 'single' })

		// `selected` у «B» пришёл, пока выбора не было, и не записался — выбранного нет
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['0', '-1', '-1'])
		expect(close('A').getAttribute('tabindex')).toBe('-1')

		await mounted.setProps({ mode: 'none' })

		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '-1'])
		expect(close('A').hasAttribute('tabindex')).toBe(false)
	})
})

describe('клавиатура', () => {
	it('→ переносит фокус на строку следующего тега и остановку вместе с ним', async () => {
		await render(`<Tags mode="multiple">${ABC}</Tags>`)

		row('B').focus()
		press(row('B'), 'ArrowRight')
		await nextTick()

		expect(document.activeElement).toBe(row('C'))
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '0'])
		expect(row('C').getAttribute('aria-selected')).toBe('false')
	})

	it('пробел выбирает тег под фокусом, остановка остаётся на нём', async () => {
		await render(`<Tags mode="multiple">${ABC}</Tags>`)

		row('B').focus()
		press(row('B'), 'ArrowRight')
		press(row('C'), ' ')
		await nextTick()

		expect(row('C').getAttribute('aria-selected')).toBe('true')
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '0'])
	})

	it('фокус на строке — кликом или из кода — переносит остановку на неё', async () => {
		await render(`<Tags mode="multiple">${ABC}</Tags>`)

		row('A').focus()
		await nextTick()

		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['0', '-1', '-1'])
	})

	it('Delete закрывает тег, фокус остаётся в наборе — на соседе', async () => {
		wrapper = mount(Tags, {
			props: {
				closable: true,
				mode: 'multiple',
				items: [
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B' },
					{ value: 'c', text: 'C' },
				],
			},
			attachTo: document.body,
		})

		await nextTick()
		await nextFrame()

		row('B').focus()
		press(row('B'), 'Delete')
		await nextTick()

		expect([...document.querySelectorAll('.s-tags-item')]).toHaveLength(2)
		expect(document.activeElement).toBe(row('C'))
		expect(rowTabindex(['A', 'C'])).toEqual(['-1', '0'])
	})
})
