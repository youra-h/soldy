/**
 * Клавиатура Tags в настоящем браузере — APG Listbox на roving tabindex.
 *
 * С выбором весь набор — одна остановка Tab: Tab входит в него один раз, на
 * выбранный тег, и следующим Tab уходит дальше. По тегам ходят стрелки,
 * пробел выбирает тег под фокусом, Delete закрывает его и оставляет фокус в
 * наборе. Без выбора у строки нет действия — Tab её пропускает, а крестик
 * остаётся остановкой: так устроены теги в поле Select.
 *
 * Спек браузерный, потому что порядок Tab ведёт браузер: jsdom его не
 * считает, и `tabindex` в разметке (`ui/vue/__tests__/tags-keyboard.spec.ts`)
 * ещё не значит, что остановка одна.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
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
		h('button', { class: 's-test-before' }, 'До'),
		content,
		h('button', { class: 's-test-after' }, 'После'),
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
	const found = [...document.querySelectorAll('.s-tags-item > .s-button:first-child')].find(
		(candidate) => candidate.textContent?.trim() === text,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`строки тега «${text}» нет`)

	return found
}

/** Тексты тегов на странице — по их строкам. */
const texts = () =>
	[...document.querySelectorAll('.s-tags-item > .s-button:first-child')].map((candidate) =>
		candidate.textContent?.trim(),
	)

const tab = () => userEvent.keyboard('{Tab}')

const shiftTab = () => userEvent.keyboard('{Shift>}{Tab}{/Shift}')

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('с выбором набор — одна остановка Tab', () => {
	it('Tab входит в набор на выбранный тег, следующий Tab из него уходит', async () => {
		await show(selectable)

		find('.s-test-before').focus()
		await tab()

		expect(document.activeElement).toBe(row('Почта'))

		await tab()

		expect(document.activeElement).toBe(find('.s-test-after'))

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

		find('.s-test-before').focus()
		await tab()

		expect(document.activeElement).toBe(find('.s-tags-item__close[aria-label="Close Москва"]'))

		await tab()

		expect(document.activeElement).toBe(find('.s-tags-item__close[aria-label="Close Тверь"]'))

		await tab()

		expect(document.activeElement).toBe(find('.s-select__field input'))
	})
})
