/**
 * Клавиатура Tags в настоящем браузере — APG Listbox на roving tabindex.
 *
 * С выбором весь набор — одна остановка Tab: Tab входит в него один раз, на
 * выбранный тег, и следующим Tab уходит дальше. По тегам ходят стрелки,
 * пробел выбирает тег под фокусом, Delete закрывает его и оставляет фокус в
 * наборе. Без выбора у строки нет действия — `tabindex` у неё нет, и ни Tab,
 * ни клик фокус на неё не ставят, а крестик остаётся остановкой: так устроены
 * и теги в поле Select.
 *
 * Спек браузерный, потому что порядок Tab и фокус от нажатия ведёт браузер:
 * jsdom их не считает, и `tabindex` в разметке
 * (`ui/vue/__tests__/tags-keyboard.spec.ts`) ещё не значит, что остановка одна.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import type { VNode } from 'vue'
import { Select, SelectItem, Tags, TagsItem } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Разметка на странице, слушатели плагинов — на узлах: `TElementPlugin`
 * объявляет узел через кадр после привязки, а элементы коллекции
 * привязываются позже владельца.
 */
const show = async (content: () => VNode) => {
	render(defineComponent({ render: content }))

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Кнопки до и после набора — чтобы было откуда войти и куда уйти по Tab. */
const around = (content: VNode) =>
	h('div', [
		h('button', { class: 'so-test-before' }, 'До'),
		content,
		h('button', { class: 'so-test-after' }, 'После'),
	])

/** Набор с выбором: «Почта» выбрана, закрыть можно любой тег. */
const selectable = () =>
	around(
		h(Tags, { closable: true, mode: 'multiple' }, () => [
			h(TagsItem, { key: 'a', value: 'a', text: 'Настройки' }),
			h(TagsItem, { key: 'b', value: 'b', text: 'Почта', selected: true }),
			h(TagsItem, { key: 'c', value: 'c', text: 'Архив' }),
		]),
	)

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string, root: ParentNode = document): HTMLElement => {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Строка тега по тексту — носитель роли и остановки Tab. */
const row = (text: string): HTMLElement => {
	const found = [...document.querySelectorAll('.so-tags-item > .so-button:first-child')].find(
		(candidate) => candidate.textContent?.trim() === text,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`строки тега «${text}» нет`)

	return found
}

/** Тексты тегов на странице — по их строкам. */
const texts = () =>
	[...document.querySelectorAll('.so-tags-item > .so-button:first-child')].map((candidate) =>
		candidate.textContent?.trim(),
	)

const tab = () => userEvent.keyboard('{Tab}')

const shiftTab = () => userEvent.keyboard('{Shift>}{Tab}{/Shift}')

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('с выбором набор — одна остановка Tab', () => {
	it('Tab входит в набор на выбранный тег, следующий Tab из него уходит', async () => {
		await show(selectable)

		find('.so-test-before').focus()
		await tab()

		expect(document.activeElement).toBe(row('Почта'))

		await tab()

		expect(document.activeElement).toBe(find('.so-test-after'))

		await shiftTab()

		expect(document.activeElement).toBe(row('Почта'))
	})

	it('стрелка переносит фокус, и набор запоминает, где он был', async () => {
		await show(selectable)

		row('Почта').focus()
		await userEvent.keyboard('{ArrowRight}')

		expect(document.activeElement).toBe(row('Архив'))

		await userEvent.keyboard('{ArrowRight}')

		expect(document.activeElement).toBe(row('Настройки'))

		await tab()
		await shiftTab()

		expect(document.activeElement).toBe(row('Настройки'))
	})

	it('пробел выбирает тег под фокусом, фокус остаётся на нём', async () => {
		await show(selectable)

		row('Почта').focus()
		await userEvent.keyboard('{ArrowLeft}')
		await userEvent.keyboard(' ')

		await expect.poll(() => row('Настройки').getAttribute('aria-selected')).toBe('true')
		expect(document.activeElement).toBe(row('Настройки'))
		expect(row('Почта').getAttribute('aria-selected')).toBe('true')
	})

	it('Delete закрывает тег, фокус остаётся в наборе — на соседе', async () => {
		await show(selectable)

		row('Почта').focus()
		await userEvent.keyboard('{Delete}')

		await expect.poll(texts).toEqual(['Настройки', 'Архив'])
		expect(document.activeElement).toBe(row('Архив'))

		await tab()
		await shiftTab()

		expect(document.activeElement).toBe(row('Архив'))
	})
})

/** Набор без выбора: строки — `listitem` без действия, закрыть можно любой тег. */
const plain = () =>
	around(
		h(Tags, { closable: true }, () => [
			h(TagsItem, { key: 'a', value: 'a', text: 'Настройки' }),
			h(TagsItem, { key: 'b', value: 'b', text: 'Почта' }),
			h(TagsItem, { key: 'c', value: 'c', text: 'Архив' }),
		]),
	)

/** Крестик тега по тексту — по его имени от локали. */
const closeOf = (text: string): HTMLElement =>
	find(`.so-tags-item__close[aria-label="Close ${text}"]`)

/**
 * Без выбора строка — `listitem` без действия, и `tabindex` у неё нет: строка
 * — кнопка, чью роль и остановку пишет тег (`TItemRow`), а не `Button` на
 * `div`, чья остановка, погашенная `-1`, всё равно принимала фокус от клика.
 */
describe('без выбора строка фокус не берёт, Tab идёт по крестикам', () => {
	it('клик по строке фокус на неё не ставит', async () => {
		await show(plain)

		find('.so-test-before').focus()
		await userEvent.click(row('Почта'))

		expect(document.activeElement).not.toBe(row('Почта'))
		expect(document.activeElement).toBe(document.body)
	})

	it('Tab — «До», крестики по порядку, «После»; Shift+Tab — обратно на крестик', async () => {
		await show(plain)

		find('.so-test-before').focus()

		for (const text of ['Настройки', 'Почта', 'Архив']) {
			await tab()

			expect(document.activeElement).toBe(closeOf(text))
		}

		await tab()

		expect(document.activeElement).toBe(find('.so-test-after'))

		await shiftTab()

		expect(document.activeElement).toBe(closeOf('Архив'))
	})
})

/**
 * Без выбора строка — `listitem` без действия: Tab её пропускает. Крестик —
 * единственный путь закрыть тег с клавиатуры, и он остаётся остановкой.
 */
describe('теги в поле Select: строки Tab не ловят, крестик ловит', () => {
	it('Tab идёт по крестикам тегов, минуя строки, и дальше — в поле', async () => {
		await show(() =>
			around(
				h(Select, { mode: 'multiple', value: ['msk', 'tver'] }, () => [
					h(SelectItem, { key: 'msk', value: 'msk', text: 'Москва' }),
					h(SelectItem, { key: 'tver', value: 'tver', text: 'Тверь' }),
				]),
			),
		)

		await expect.poll(texts).toEqual(['Москва', 'Тверь'])

		find('.so-test-before').focus()
		await tab()

		expect(document.activeElement).toBe(find('.so-tags-item__close[aria-label="Close Москва"]'))

		await tab()

		expect(document.activeElement).toBe(find('.so-tags-item__close[aria-label="Close Тверь"]'))

		await tab()

		expect(document.activeElement).toBe(find('.so-select__field input'))
	})
})
