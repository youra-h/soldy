// @vitest-environment jsdom

/**
 * Остановка Tab, в которой лежит узел, — `closestTabStop` (`utils/tabStops.ts`):
 * ближайший кандидат между узлом и `scope`, который и есть остановка. Об этом
 * спрашивает поле Select: нажатие мимо его остановок гасится, и фокус
 * остаётся в поле (`TSelectPointerPlugin`, `setup/__tests__/select-pointer.spec.ts`).
 *
 * Кандидат, который остановкой не бывает, — строка с `tabindex="-1"`,
 * выключенная кнопка — пропускается. `closestControl` его вернул бы: так
 * строка тега в поле Select считалась контролом, нажатие по ней не гасилось, и
 * фокус уходил с поля на строку.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { closestControl, closestTabStop } from '../src/utils'

afterEach(() => {
	document.body.innerHTML = ''
})

/** Корень с разметкой на странице — `scope` поиска. */
function mount(html: string): HTMLElement {
	const root = document.createElement('div')

	root.innerHTML = html
	document.body.append(root)

	return root
}

/** Узел по селектору; нет его — тест падает здесь, а не на поиске. */
function find(root: ParentNode, selector: string): Element {
	const node = root.querySelector(selector)

	if (!node) throw new Error(`${selector}: узла нет`)

	return node
}

describe('closestTabStop', () => {
	it('узел в кнопке — кнопка', () => {
		const root = mount('<button><span class="text">Готово</span></button>')

		expect(closestTabStop(find(root, '.text'), root)).toBe(find(root, 'button'))
	})

	it('узел — сама остановка', () => {
		const root = mount('<input>')

		expect(closestTabStop(find(root, 'input'), root)).toBe(find(root, 'input'))
	})

	it('в строке с tabindex="-1" без остановки выше — null', () => {
		const root = mount('<div class="row" tabindex="-1"><span class="text">Москва</span></div>')
		const text = find(root, '.text')

		// Кандидат есть — строка фокус принимает, — но остановкой она не бывает
		expect(closestControl(text, root), 'кандидат').toBe(find(root, '.row'))
		expect(closestTabStop(text, root), 'остановка').toBeNull()
	})

	it('строка с tabindex="-1" внутри остановки — остановка', () => {
		const root = mount(
			'<div class="list" tabindex="0">' +
				'<div class="row" tabindex="-1"><span class="text">Москва</span></div>' +
				'</div>',
		)

		expect(closestTabStop(find(root, '.text'), root)).toBe(find(root, '.list'))
	})

	it('выключенная кнопка — не остановка', () => {
		const root = mount('<button disabled><span class="text">Готово</span></button>')

		expect(closestTabStop(find(root, '.text'), root)).toBeNull()
	})

	it('scope не в счёт, даже когда он сам остановка', () => {
		const root = mount('<span class="text">Москва</span>')

		root.tabIndex = 0

		expect(closestTabStop(find(root, '.text'), root)).toBeNull()
	})

	it('остановка над scope не в счёт', () => {
		const root = mount('<span class="text">Москва</span>')
		const outer = document.createElement('div')

		outer.tabIndex = 0
		document.body.append(outer)
		outer.append(root)

		expect(closestTabStop(find(root, '.text'), root)).toBeNull()
	})
})
